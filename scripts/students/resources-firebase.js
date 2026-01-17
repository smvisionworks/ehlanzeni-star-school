// resources-firebase.js
import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { initStudentSubmissionSystem } from './student-assignment-submission.js';

let currentUser = null;
let currentUserData = null;
let fetchedResources = [];
let enrolledCourses = [];
let allResources = [];
let selectedCourseId = null;
let userSubmissions = {};

/* ---------------------------
   Bootstrapping: auth + init
   --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showToast('Please log in to access this page', 'error');
            setTimeout(() => window.location.href = '../landing/login.html', 3000);
            return;
        }

        currentUser = user;
        await checkUserStatus(user.uid);
        await init();
    });
});

async function checkUserStatus(uid) {
    try {
        const pendingRef = ref(database, `application/pending/${uid}`);
        const pendingSnap = await get(pendingRef);

        if (pendingSnap.exists()) {
            const applicationData = pendingSnap.val();
            const isApplicationComplete = applicationData.status === 'approved' &&
                applicationData.payment &&
                applicationData.payment.registrationFee === 'paid';

            if (!isApplicationComplete) {
                showToast('Your application is not yet fully approved', 'error');
                setTimeout(() => window.location.href = '../unverifiedstudents/student-dashboard.html', 3000);
                return false;
            }

            // Check monthly payment status
            if (applicationData.monthlyPayment && applicationData.monthlyPayment.status === 'pending') {
                console.log('Monthly payment pending for month:', applicationData.monthlyPayment.month);
                window.location.href = '../students/payment-pending.html';
                return false;
            }

            currentUserData = applicationData;
            return true;
        }

        showToast('No complete application found', 'error');
        setTimeout(() => window.location.href = '../landing/login.html', 3000);
        return false;
    } catch (error) {
        console.error('Error checking user status:', error);
        showToast('Error verifying application status', 'error');
        return false;
    }
}

async function init() {
    if (!currentUserData) {
        console.error('No user data available');
        return;
    }

    // Update UI
    const fullName = `${currentUserData.firstName} ${currentUserData.lastName}`;
    document.getElementById('studentName').textContent = fullName;

    // Initialize the single submission system (Option A)
    initStudentSubmissionSystem({
        uid: currentUser.uid,
        firstName: currentUserData.firstName,
        lastName: currentUserData.lastName
    });

    initModalListeners();
    initSidebarListeners();
    initFilters();

    await loadStudentCourses();
    await loadUserSubmissions();
    await setupResourcesListener();
}

/* ---------------------------
   Modal & sidebar listeners
   --------------------------- */
function initModalListeners() {
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const logoutTriggerBtn = document.getElementById('logoutBtn');

    // Open modal
    logoutTriggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logoutModal.classList.add('active');
    });

    // Close modal
    cancelLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('active');
    });

    // Confirm logout
    confirmLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('active');
        handleLogout();
    });
}

function initSidebarListeners() {
    const closeSidebarBtn = document.getElementById('closeSidebar');
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
}

function closeSidebar() {
    const sidebar = document.getElementById('resourcesSidebar');
    sidebar?.classList.remove('active');

    document.querySelectorAll('.course-card').forEach(card => card.classList.remove('active'));
    selectedCourseId = null;
}

/* ---------------------------
   Courses loading and display
   --------------------------- */
async function loadStudentCourses() {
    try {
        const enrollmentsRef = ref(database, `enrollments/${currentUser.uid}`);
        const enrollmentsSnapshot = await get(enrollmentsRef);
        const coursesGrid = document.getElementById('coursesGrid');
        const courseFilter = document.getElementById('courseFilter');

        if (!enrollmentsSnapshot.exists()) {
            coursesGrid.innerHTML = '<div class="no-courses">No enrolled courses found</div>';
            enrolledCourses = [];
            return [];
        }

        const enrollments = enrollmentsSnapshot.val();
        enrolledCourses = Object.keys(enrollments)
            .filter(courseId => enrollments[courseId]?.status === 'active')
            .map(courseId => ({ courseId, ...enrollments[courseId] }));

        if (enrolledCourses.length === 0) {
            coursesGrid.innerHTML = '<div class="no-courses">No active enrollments</div>';
            return [];
        }

        const coursesRef = ref(database, 'courses');
        const coursesSnapshot = await get(coursesRef);
        if (!coursesSnapshot.exists()) {
            coursesGrid.innerHTML = '<div class="no-courses">Courses not found</div>';
            return [];
        }

        const allCourses = coursesSnapshot.val();

        enrolledCourses = enrolledCourses.map(enrollment => {
            const details = allCourses[enrollment.courseId] || {};
            return {
                ...enrollment,
                displayName: details.name || enrollment.courseName || 'Unnamed Course',
                courseCode: details.code || 'N/A',
                teacherName: details.teacherName || enrollment.teacherName || 'Staff'
            };
        });

        // Render course cards
        coursesGrid.innerHTML = '';
        enrolledCourses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.setAttribute('data-course-id', course.courseId);
            courseCard.innerHTML = `
                <div class="course-icon"><i class="fas fa-book"></i></div>
                <h3>${escapeHtml(course.displayName)}</h3>
                <p class="course-code">${escapeHtml(course.courseCode)}</p>
                <div class="course-meta">
                    <span class="teacher-name">${escapeHtml(course.teacherName)}</span>
                    <span class="resource-badge" id="badge-${course.courseId}">0 resources</span>
                </div>
            `;

            courseCard.addEventListener('click', () => showCourseResources(course.courseId));
            coursesGrid.appendChild(courseCard);
        });

        // Populate filter
        if (courseFilter) {
            courseFilter.innerHTML = '<option value="all">All Courses</option>';
            enrolledCourses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.courseId;
                option.textContent = course.displayName;
                courseFilter.appendChild(option);
            });
        }

        return enrolledCourses;
    } catch (error) {
        console.error('Error loading courses:', error);
        showToast('Error loading courses', 'error');
        return [];
    }
}

/* ---------------------------
   Resources listener & display
   --------------------------- */
async function setupResourcesListener() {
    try {
        const resourcesRef = ref(database, 'resources');

        onValue(resourcesRef, (snapshot) => {
            if (!snapshot.exists()) {
                updateResourceBadges([]);
                return;
            }

            const data = snapshot.val();
            allResources = Object.entries(data)
                .filter(([id, r]) => r && typeof r === 'object')
                .map(([id, r]) => ({ id, ...r }));

            const enrolledCourseIds = enrolledCourses.map(c => c.courseId);
            fetchedResources = allResources.filter(r => enrolledCourseIds.includes(r.courseId));

            updateResourceBadges(fetchedResources);

            if (selectedCourseId) showCourseResources(selectedCourseId);
        }, (error) => {
            console.error('Error listening to resources:', error);
            showToast('Error loading resources', 'error');
        });
    } catch (error) {
        console.error('Error setting up resources listener:', error);
        showToast('Error loading resources', 'error');
    }
}

function updateResourceBadges(resources) {
    const resourceCounts = {};
    resources.forEach(resource => {
        resourceCounts[resource.courseId] = (resourceCounts[resource.courseId] || 0) + 1;
    });

    enrolledCourses.forEach(course => {
        const badge = document.getElementById(`badge-${course.courseId}`);
        if (badge) {
            const count = resourceCounts[course.courseId] || 0;
            badge.textContent = `${count} resource${count !== 1 ? 's' : ''}`;
        }
    });
}

function showCourseResources(courseId) {
    const course = enrolledCourses.find(c => c.courseId === courseId);
    if (!course) return;

    selectedCourseId = courseId;
    document.querySelectorAll('.course-card').forEach(card => card.classList.remove('active'));
    const targetCard = document.querySelector(`.course-card[data-course-id="${courseId}"]`);
    targetCard?.classList.add('active');

    const sidebar = document.getElementById('resourcesSidebar');
    sidebar?.classList.add('active');

    document.getElementById('sidebarCourseTitle').textContent = course.displayName;

    const courseResources = fetchedResources.filter(r => r.courseId === courseId);

    // No longer filtering by type, just pass the course's resources directly
    displayResourcesInSidebar(courseResources, course);
}

async function loadUserSubmissions() {
    if (!currentUser?.uid) return;
    try {
        const submissionsRef = ref(database, `submissions/${currentUser.uid}`);
        
        // 1. Await the initial fetch of submission data to prevent race conditions on page load.
        const snapshot = await get(submissionsRef);
        userSubmissions = snapshot.val() || {};

        // 2. Set up the listener for subsequent real-time updates.
        onValue(submissionsRef, (snapshot) => {
            userSubmissions = snapshot.val() || {};
            
            // If a course's resources are currently displayed, refresh them to reflect any live changes.
            if (selectedCourseId) {
                showCourseResources(selectedCourseId);
            }
        });

    } catch (error) {
        console.error('Error loading user submissions:', error);
        showToast('Could not load submission statuses.', 'error');
    }
}

function displayResourcesInSidebar(resources, course) {
    const assignmentsList = document.getElementById('assignmentsList');
    const resourcesList = document.getElementById('resourcesList');
    const resourceCount = document.getElementById('resourceCount');

    // Clear previous content
    assignmentsList.innerHTML = '';
    resourcesList.innerHTML = '';

    const count = resources.length;
    if (resourceCount) {
        resourceCount.innerHTML = `<i class="fas fa-file-alt"></i><span>${count} resource${count !== 1 ? 's' : ''} available</span>`;
    }

    if (resources.length === 0) {
        // Display a general "no resources" message if the parent container for it exists
        const coursesSection = document.querySelector('.courses-section');
        if(coursesSection) {
            coursesSection.innerHTML = `
                <div class="no-resources">
                    <i class="fas fa-inbox"></i>
                    <p>No resources found for ${escapeHtml(course.displayName)}</p>
                    <small>Try changing the filter or check back later</small>
                </div>
            `;
        }
        // Also add placeholders to the specific lists
        assignmentsList.innerHTML = '<div class="no-resources"><p>No assignments found.</p></div>';
        resourcesList.innerHTML = '<div class="no-resources"><p>No course materials found.</p></div>';
        return;
    }

    const sortedResources = resources.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let assignmentCount = 0;
    let materialCount = 0;

    sortedResources.forEach(resource => {
        if (resource.resourceType === 'assignment') {
            const submissionData = userSubmissions[resource.id];
            let status = null;

            if (typeof submissionData === 'string') {
                // Handles case: "submissions": { "assignment123": "submitted" }
                status = submissionData;
            } else if (submissionData && typeof submissionData.status === 'string') {
                // Handles case: "submissions": { "assignment123": { "status": "submitted" } }
                status = submissionData.status;
            }

            assignmentsList.appendChild(createResourceListItem(resource, status));
            assignmentCount++;
        } else {
            resourcesList.appendChild(createResourceListItem(resource, null));
            materialCount++;
        }
    });

    if (assignmentCount === 0) {
        assignmentsList.innerHTML = '<div class="no-resources"><p>No assignments found.</p></div>';
    }
    if (materialCount === 0) {
        resourcesList.innerHTML = '<div class="no-resources"><p>No course materials found.</p></div>';
    }
}

function createResourceListItem(resource, submissionStatus) {
    const item = document.createElement('div');
    item.className = 'resource-item';

    const iconClass = getResourceIcon(resource.fileType || resource.mimetype);
    const fileType = resource.fileType || getFileTypeFromMime(resource.mimetype);
    const fileSize = resource.fileSize ? formatFileSize(resource.fileSize) : 'Unknown size';
    const uploadDate = resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'Unknown date';
    const isAssignment = resource.resourceType === 'assignment';

    let actionContent = '';

    if (isAssignment) {
        const normalizedStatus = submissionStatus ? submissionStatus.trim().toLowerCase() : null;

        if (normalizedStatus === 'submitted') {
            actionContent = `
                <button class="submit-assignment-btn submitted" disabled>
                    <i class="fas fa-check"></i> You have already submitted
                </button>
            `;
        } else if (normalizedStatus === 'graded') {
            actionContent = `
                <button class="submit-assignment-btn graded" disabled>
                    <i class="fas fa-user-check"></i> Graded
                </button>
            `;
        } else {
            actionContent = `
                <button class="submit-assignment-btn" 
                        data-assignment-id="${resource.id}"
                        data-assignment-title="${escapeHtml(resource.title || 'Untitled Resource')}"
                        data-course-id="${resource.courseId}"
                        data-course-name="${escapeHtml(resource.courseName || 'Unknown Course')}">
                    <i class="fas fa-paper-plane"></i> Submit Assignment
                </button>
            `;
        }
    }

    item.innerHTML = `
        <div class="resource-icon"><i class="${iconClass}"></i></div>
        <div class="resource-info">
            <h4>${escapeHtml(resource.title || 'Untitled Resource')}</h4>
            <div class="resource-meta">
                <span>${fileType}</span>
                <span>${fileSize}</span>
                <span>${uploadDate}</span>
            </div>
            ${actionContent}
        </div>
        <span class="resource-type">${(resource.resourceType || 'general').replace('_',' ')}</span>
    `;

    // open resource modal when clicking anywhere except the submission button
    item.addEventListener('click', (e) => {
        // Prevent modal opening if the submission button (even disabled) is clicked
        if (!e.target.closest('.submit-assignment-btn')) {
            openModal(resource);
        }
    });

    return item;
}

/* ---------------------------
   Small utilities & modal helpers
   --------------------------- */

function getResourceIcon(fileType) {
    const type = String(fileType || '').toLowerCase();
    if (type.includes('pdf')) return 'fas fa-file-pdf';
    if (type.includes('word') || type.includes('doc')) return 'fas fa-file-word';
    if (type.includes('ppt') || type.includes('powerpoint')) return 'fas fa-file-powerpoint';
    if (type.includes('xls') || type.includes('excel')) return 'fas fa-file-excel';
    if (type.includes('image')) return 'fas fa-file-image';
    if (type.includes('audio')) return 'fas fa-file-audio';
    if (type.includes('video')) return 'fas fa-file-video';
    if (type.includes('text')) return 'fas fa-file-alt';
    if (type.includes('zip') || type.includes('archive')) return 'fas fa-file-archive';
    return 'fas fa-file';
}

function getFileTypeFromMime(mimetype) {
    if (!mimetype) return 'File';
    const type = mimetype.split('/')[0];
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function openModal(resource) {
    console.log("Opening resource:", resource);

    /* ------------------------------
       1. Resolve Course Info
    -------------------------------- */
    const course = enrolledCourses.find(c => c.courseId === resource.courseId);
    const courseName = course ? course.displayName : resource.courseName || "General";

    /* ------------------------------
       2. Assign Basic Fields
    -------------------------------- */
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    set("resourceTitle", resource.title || resource.fileName || "Untitled Resource");
    set("resourceCourse", courseName);
    set("resourceTeacher", resource.teacherName || "Unknown");
    set("resourceType", (resource.resourceType || "general").replace("_", " "));
    set("resourceDate", resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : "Unknown");
    set("resourceSize", resource.fileSize ? formatFileSize(resource.fileSize) : "Unknown");
    set("resourceDescription", resource.description || "No description available.");

    /* ------------------------------
       3. Download Button (Simple & Reliable)
    -------------------------------- */
    const linkEl = document.getElementById("resourceLink");

    // Choose the correct URL
    const downloadUrl =
        resource.fileUrl ||
        resource.finalUrl ||
        resource.url ||
        resource.downloadUrl ||
        null;

    console.log("Resolved download URL:", downloadUrl);

    if (!linkEl) return;

    if (!downloadUrl) {
        linkEl.style.display = "none";
    } else {
        linkEl.style.display = "inline-block";

        // Clean filename
        const safeName =
            (resource.fileName || resource.title || "resource")
                .replace(/[^a-zA-Z0-9.\-_]/g, "_");

        // SIMPLE & RELIABLE DIRECT DOWNLOAD
        linkEl.href = downloadUrl;
        linkEl.setAttribute("download", safeName);
        linkEl.setAttribute("target", "_blank"); // open in new tab for unsupported files
    }

    /* ------------------------------
       4. Show Modal
    -------------------------------- */
    const modal = document.getElementById("resourceModal");
    if (modal) modal.classList.add("active");
}

function closeModal() {
    const modal = document.getElementById("resourceModal");
    if (modal) modal.classList.remove("active");
}


/* ---------------------------
   Small helpers
   --------------------------- */

function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null) return 'Unknown';
    const b = Number(bytes);
    if (b < 1024) return `${b} bytes`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ---------------------------
   Logout / misc
   --------------------------- */
async function handleLogout() {
    try {
        await signOut(auth);
        showToast('Logged out successfully!', 'success');
        setTimeout(() => window.location.href = '../landing/login.html', 1000);
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '../landing/login.html';
    }
}

/* ---------------------------
   Filter handlers & init
   --------------------------- */
function filterByCourse() {
    // This is called when the course filter dropdown changes.
    const courseFilterSelect = document.getElementById('courseFilter');
    const selectedValue = courseFilterSelect ? courseFilterSelect.value : 'all';
    
    if (selectedValue === 'all') {
        // If "All Courses" is selected, hide the sidebar and de-select course cards.
        closeSidebar();
    } else {
        // Otherwise, show the resources for the selected course.
        showCourseResources(selectedValue);
    }
}

function initFilters() {
    const courseFilter = document.getElementById('courseFilter');
    if (courseFilter) {
        courseFilter.addEventListener('change', filterByCourse);
    }
}

/* Expose some utilities used in HTML */
window.closeModal = closeModal;

// display toast function (kept same behavior)
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.className = `toast ${type}`, 3000);
}
