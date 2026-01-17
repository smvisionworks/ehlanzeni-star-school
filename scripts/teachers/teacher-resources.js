import { auth, database } from '../firebase.js';
import {
    ref,
    get,
    set,
    push,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { initGradingSystem, openGradingModal } from './teacher-grading.js';

import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const storage = getStorage(); // Firebase Storage instance

let currentUser = null;
let currentTeacherData = null;
let teacherCourses = [];
let allResources = [];
let selectedCourseId = null;
let sortNewestFirst = true;

const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    console.log('[INIT] DOM ready — attaching auth listener');
    onAuthStateChanged(auth, async (user) => {
        try {
            if (!user) {
                console.warn('[AUTH] No user — redirecting to login');
                showToast('Please log in to access this page', 'error');
                setTimeout(() => window.location.href = '../landing/login.html', 2500);
                return;
            }

            currentUser = user;
            console.log('[AUTH] User is signed in:', user.uid);

            const ok = await checkTeacherStatus(user.uid);
            if (!ok) return;

            await initPage();
        } catch (err) {
            console.error('[AUTH HANDLER] Unexpected error:', err);
            showToast('Unexpected error during auth', 'error');
        }
    });
});

async function checkTeacherStatus(uid) {
    try {
        console.log(`[TEACHER] Checking teacher profile for UID=${uid}`);
        const teacherRef = ref(database, `teachers/${uid}`);
        const snap = await get(teacherRef);
        if (!snap.exists()) {
            console.warn('[TEACHER] Profile not found');
            showToast('Teacher profile not found', 'error');
            setTimeout(() => window.location.href = '../landing/login.html', 2500);
            return false;
        }
        currentTeacherData = snap.val();
        console.log('[TEACHER] Loaded teacher profile');

        // Check if teacher account is pending approval
        if (currentTeacherData.status === 'pending') {
            showToast('Your teacher account is pending admin approval. You will be notified once approved.', 'error');
            setTimeout(() => window.location.href = '../landing/login.html', 2500);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[TEACHER] Error checking teacher status:', err);
        showToast('Error verifying teacher status', 'error');
        return false;
    }
}

async function initPage() {
    console.log('[PAGE] initPage start');

    if (!currentTeacherData) {
        console.error('[PAGE] No teacher data — aborting init');
        return;
    }

    const fullName = `${currentTeacherData.personalInfo?.firstName || ''} ${currentTeacherData.personalInfo?.lastName || ''}`.trim();
    const teacherNameEl = $id('teacherName');
    if (teacherNameEl) teacherNameEl.textContent = fullName || 'Teacher';

    initGradingSystem();

    await loadTeacherCourses();
    await loadResources();
    setupEventListeners();

    console.log('[PAGE] initPage complete');
}

async function loadTeacherCourses() {
    try {
        console.log('[COURSES] Loading courses for teacher:', currentUser.uid);
        const coursesRef = ref(database, 'courses');
        const snap = await get(coursesRef);
        const select = $id('createResourceCourseId');
        const coursesList = $id('coursesList');

        if (!select || !coursesList) {
            console.warn('[COURSES] required elements not found');
            return;
        }

        select.innerHTML = '<option value="">Select a Course (Required)</option>';
        coursesList.innerHTML = '';

        if (!snap.exists()) {
            console.log('[COURSES] no courses node in database');
            updateTotalResources(0);
            return;
        }

        const all = snap.val();
        teacherCourses = [];

        Object.entries(all).forEach(([id, course]) => {
            if (!course) return;
            if (String(course.teacherId) === String(currentUser.uid) && course.status === 'active') {
                teacherCourses.push({ id, ...course });

                // Add to create modal dropdown
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `${course.name} (${course.code || ''})`;
                select.appendChild(opt);

                // Add to courses sidebar
                const courseItem = createCourseListItem({ id, ...course });
                coursesList.appendChild(courseItem);
            }
        });

        console.log('[COURSES] loaded', teacherCourses.length, 'courses');

        // Update total resources count (will be updated when resources load)
        updateTotalResources(0);

    } catch (err) {
        console.error('[COURSES] failed to load:', err);
        showToast('Error loading courses', 'error');
    }
}

function createCourseListItem(course) {
    const courseItem = document.createElement('div');
    courseItem.className = 'course-item';
    courseItem.setAttribute('data-course-id', course.id);

    courseItem.innerHTML = `
        <div class="course-info">
            <h4>${escapeHtml(course.name)}</h4>
            <span class="course-code">${escapeHtml(course.code || 'N/A')}</span>
        </div>
        <span class="resource-count" id="count-${course.id}">0 resources</span>
    `;

    // Add click event to show course resources
    courseItem.addEventListener('click', () => showCourseResources(course.id));

    return courseItem;
}

async function loadResources() {
    console.log('[RESOURCES] Setting up listener');

    const loadingEl = $id('loadingCircle');
    if (loadingEl) loadingEl.classList.add('show');

    try {
        const resourcesRef = ref(database, 'resources');

        onValue(resourcesRef, (snap) => {
            console.log('[RESOURCES] onValue triggered — exists:', snap.exists());

            if (!snap.exists()) {
                console.log('[RESOURCES] no resources in DB');
                allResources = [];
                updateResourceCounts([]);
                showEmptyState();
                if (loadingEl) loadingEl.classList.remove('show');
                return;
            }

            const all = snap.val();
            console.log('[RESOURCES] snapshot value:', all);

            allResources = [];
            Object.entries(all).forEach(([key, val]) => {
                if (!val || typeof val !== 'object') {
                    console.log('[RESOURCES] skipping non-object resource key=', key);
                    return;
                }

                if (String(val.teacherId) === String(currentUser.uid)) {
                    allResources.push({ id: key, ...val });
                }
            });

            console.log(`[RESOURCES] found ${allResources.length} for current teacher`);

            updateResourceCounts(allResources);

            // If a course is already selected, update its view
            if (selectedCourseId) {
                showCourseResources(selectedCourseId);
            } else {
                showEmptyState();
            }

            if (loadingEl) loadingEl.classList.remove('show');

        }, (err) => {
            console.error('[RESOURCES] onValue error:', err);
            if (loadingEl) loadingEl.classList.remove('show');
            showToast('Error listening for resources', 'error');
        });

    } catch (err) {
        console.error('[RESOURCES] setup failed:', err);
        if (loadingEl) loadingEl.classList.remove('show');
        showToast('Error loading resources', 'error');
    }
}

function updateResourceCounts(resources) {
    // Count resources per course
    const resourceCounts = {};
    let totalResources = 0;
    let uncategorizedCount = 0;

    resources.forEach(resource => {
        totalResources++;

        if (resource.courseId && teacherCourses.find(c => c.id === resource.courseId)) {
            if (!resourceCounts[resource.courseId]) {
                resourceCounts[resource.courseId] = 0;
            }
            resourceCounts[resource.courseId]++;
        } else {
            uncategorizedCount++;
        }
    });

    // Update course counts in sidebar
    teacherCourses.forEach(course => {
        const countElement = $id(`count-${course.id}`);
        if (countElement) {
            const count = resourceCounts[course.id] || 0;
            countElement.textContent = `${count} resource${count !== 1 ? 's' : ''}`;
        }
    });

    // Update uncategorized count
    const uncategorizedElement = $id('uncategorizedCount');
    if (uncategorizedElement) {
        uncategorizedElement.textContent = `${uncategorizedCount} resource${uncategorizedCount !== 1 ? 's' : ''}`;
    }

    // Update total resources
    updateTotalResources(totalResources);
}

function updateTotalResources(count) {
    const totalElement = $id('totalResources');
    if (totalElement) {
        totalElement.textContent = `${count} total resource${count !== 1 ? 's' : ''}`;
    }
}

function showCourseResources(courseId) {
    // Update active state in sidebar
    document.querySelectorAll('.course-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedItem = document.querySelector(`.course-item[data-course-id="${courseId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    selectedCourseId = courseId;

    // Get course info
    const course = teacherCourses.find(c => c.id === courseId);
    const courseTitle = course ? course.name : 'Uncategorized Resources';

    // Update header
    const headerTitle = $id('selectedCourseTitle');
    if (headerTitle) {
        headerTitle.textContent = courseTitle;
    }

    // Filter resources for this course
    let courseResources;
    if (courseId === 'uncategorized') {
        courseResources = allResources.filter(resource =>
            !resource.courseId || !teacherCourses.find(c => c.id === resource.courseId)
        );
    } else {
        courseResources = allResources.filter(resource => resource.courseId === courseId);
    }

    // Apply type filter
    const typeFilter = $id('resourceTypeFilter')?.value || 'all';
    if (typeFilter !== 'all') {
        courseResources = courseResources.filter(resource => resource.resourceType === typeFilter);
    }

    // Apply sorting
    courseResources.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortNewestFirst ? dateB - dateA : dateA - dateB;
    });

    displayResources(courseResources);
}

function displayResources(resources) {
    const container = $id('resourcesContainer');
    const grid = $id('resourcesGrid');
    const emptyState = $id('emptyState');

    if (!container || !grid || !emptyState) return;

    // Hide empty state and clear grid
    emptyState.style.display = 'none';
    grid.innerHTML = '';

    if (resources.length === 0) {
        emptyState.style.display = 'block';
        const message = selectedCourseId === 'uncategorized'
            ? 'No uncategorized resources found.'
            : 'No resources found for this course.';
        emptyState.querySelector('p').textContent = message;
        return;
    }

    // Create resource cards
    resources.forEach(resource => {
        const card = createResourceCard(resource);
        grid.appendChild(card);
    });
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'resource-card';

    const icon = getResourceIcon(resource.fileType || resource.mimetype || '');
    const sizeText = resource.fileSize ? formatFileSize(resource.fileSize) : '';
    const courseName = resource.courseName || getCourseName(resource.courseId) || 'Uncategorized';

    const title = escapeHtml(resource.title || 'Untitled');
    const description = escapeHtml(resource.description || 'No description');

    const gradingButton = resource.resourceType === 'assignment' ? `
        <button class="action-btn grade-btn" data-id="${resource.id}" title="Grade submissions">
            <i class="fas fa-graduation-cap"></i>
        </button>
    ` : '';

    card.innerHTML = `
        <div class="resource-header">
            <div class="resource-icon">
                <i class="${icon}"></i>
            </div>
            <span class="resource-type">${escapeHtml((resource.resourceType || 'general').replace('_', ' '))}</span>
        </div>
        <h3>${title}</h3>
        <p class="resource-description">${description}</p>
        <div class="resource-meta">
            <div class="resource-actions">
                ${resource.fileUrl ? `
                    <a href="${resource.fileUrl}" target="_blank" class="action-btn" title="Download resource">
                        <i class="fas fa-download"></i>
                    </a>
                ` : ''}
                ${gradingButton}
                <button class="action-btn delete-btn" data-id="${resource.id}" title="Delete resource">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="resource-info">
                ${sizeText ? `<span>${sizeText}</span>` : ''}
                <span>${resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : ''}</span>
            </div>
        </div>
    `;

    const gradeBtn = card.querySelector('.grade-btn');
    if (gradeBtn) {
        gradeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openGradingModal(resource);
        });
    }

    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteResource(resource.id);
        });
    }

    // Add click event to view resource details
    card.addEventListener('click', () => {
        openResourcePreview(resource);
    });

    return card;
}

function openResourcePreview(resource) {
    // You can implement a preview modal here if needed
    if (resource.fileUrl) {
        window.open(resource.fileUrl, '_blank');
    }
}

function getCourseName(courseId) {
    const course = teacherCourses.find(c => c.id === courseId);
    return course ? course.name : null;
}

function getResourceIcon(mimetype) {
    const type = String(mimetype).toLowerCase();
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

function setupEventListeners() {
    const form = $id('createResourceForm');
    if (form) form.addEventListener('submit', handleCreateResource);

    const fileInput = $id('createResourceFile');
    if (fileInput) fileInput.addEventListener('change', (e) => {
        const fNameEl = $id('fileName');
        if (!fNameEl) return;
        fNameEl.textContent = e.target.files && e.target.files[0] ? e.target.files[0].name : '';
    });

    // File upload area click handler
    const fileUploadArea = $id('fileUploadArea');
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Resource type filter
    const typeFilter = $id('resourceTypeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            if (selectedCourseId) {
                showCourseResources(selectedCourseId);
            }
        });
    }

    // Sort button
    const sortButton = $id('sortButton');
    if (sortButton) {
        sortButton.addEventListener('click', () => {
            sortNewestFirst = !sortNewestFirst;
            sortButton.innerHTML = sortNewestFirst
                ? '<i class="fas fa-sort-amount-down"></i> Newest First'
                : '<i class="fas fa-sort-amount-up"></i> Oldest First';

            if (selectedCourseId) {
                showCourseResources(selectedCourseId);
            }
        });
    }

    // Uncategorized section
    const uncategorizedItem = document.querySelector('.course-item[data-course-id="uncategorized"]');
    if (uncategorizedItem) {
        uncategorizedItem.addEventListener('click', () => showCourseResources('uncategorized'));
    }

    // Logout handlers
    const logoutBtn = $id('logoutBtn');
    const confirmLogout = $id('confirmLogout');
    const cancelLogout = $id('cancelLogout');
    const logoutModal = $id('logoutModal');

    if (logoutBtn) logoutBtn.addEventListener('click', () => { if (logoutModal) logoutModal.style.display = 'flex'; });
    if (cancelLogout) cancelLogout.addEventListener('click', () => { if (logoutModal) logoutModal.style.display = 'none'; });
    if (confirmLogout) confirmLogout.addEventListener('click', handleLogout);
}

async function handleCreateResource(e) {
    e.preventDefault();
    console.log('[UPLOAD] form submit (Firebase Storage)');

    const title = $id('createResourceTitle')?.value?.trim();
    const courseId = $id('createResourceCourseId')?.value;
    const resourceType = $id('createResourceType')?.value;
    const description = $id('createResourceDescription')?.value;
    const fileInput = $id('createResourceFile');

    if (!title) return showToast('Please enter a title', 'error');
    if (!courseId) return showToast('Please select a course', 'error');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return showToast('Please select a file', 'error');

    const btn = $id('createResourceBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }

    try {
        // Create a new database entry for this resource to get a unique ID
        const newDbRef = push(ref(database, 'resources'));
        const resourceId = newDbRef.key;

        // Prepare Firebase Storage path: /resources/teacherId/resourceId/fileName
        const file = fileInput.files[0];
        const storagePath = `resources/${currentUser.uid}/${resourceId}/${file.name}`;
        const fileRef = storageRef(storage, storagePath);

        // Upload the file to Firebase Storage
        console.log('[UPLOAD] Uploading file to Firebase Storage:', storagePath);
        const snapshot = await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(snapshot.ref);

        // Prepare resource object with Firebase Storage URL
        const course = teacherCourses.find(c => c.id === courseId);
        const resource = {
            id: resourceId,
            title,
            description: description || '',
            courseId: courseId,
            courseName: course ? course.name : 'Unknown Course',
            resourceType: resourceType || 'general',
            fileUrl,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size || null,
            teacherId: currentUser?.uid,
            teacherName: `${currentTeacherData?.personalInfo?.firstName || ''} ${currentTeacherData?.personalInfo?.lastName || ''}`.trim(),
            createdAt: new Date().toISOString(),
            storagePath: storagePath // Store the path for easier deletion later
        };

        // Save metadata to Realtime Database
        await set(newDbRef, resource);
        console.log('[UPLOAD] Resource saved to Firebase:', resourceId);

        showToast('Resource uploaded successfully', 'success');
        closeCreateModal();
        if ($id('createResourceForm')) $id('createResourceForm').reset();
        if ($id('fileName')) $id('fileName').textContent = '';

        // Refresh the course view
        showCourseResources(courseId);

    } catch (err) {
        console.error('[UPLOAD] error:', err);
        showToast('Error uploading resource: ' + (err.message || err), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Create Resource';
        }
    }
}

async function deleteResource(resourceId) {
    if (!resourceId) return;
    if (!confirm('Are you sure you want to delete this resource? This will remove the file from storage and the database entry.')) return;

    try {
        // Get resource info from DB to know file path
        const resourceRef = ref(database, `resources/${resourceId}`);
        const resourceSnap = await get(resourceRef);
        
        if (!resourceSnap.exists()) {
            showToast('Resource not found', 'error');
            return;
        }
        
        const resource = resourceSnap.val();

        // Delete the file from Firebase Storage if it exists
        if (resource.fileUrl && resource.storagePath) {
            try {
                const fileRef = storageRef(storage, resource.storagePath);
                await deleteObject(fileRef);
                console.log('[DELETE] File deleted from Firebase Storage:', resource.storagePath);
            } catch (storageErr) {
                console.warn('[DELETE] Could not delete file from storage:', storageErr);
                // Continue with database deletion even if storage delete fails
            }
        }

        // Remove from Realtime Database
        await remove(resourceRef);
        console.log('[DELETE] Resource deleted from database:', resourceId);
        showToast('Resource deleted successfully', 'success');

    } catch (err) {
        console.error('[DELETE] failed:', err);
        showToast('Error deleting resource: ' + (err.message || err), 'error');
    }
}

function showEmptyState() {
    const container = $id('resourcesContainer');
    const grid = $id('resourcesGrid');
    const emptyState = $id('emptyState');

    if (container && grid && emptyState) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = 'Select a course from the sidebar to view resources, or create a new resource.';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'success');
        setTimeout(() => window.location.href = '../landing/login.html', 800);
    } catch (err) {
        console.error('[LOGOUT] failed:', err);
        showToast('Failed to logout: ' + (err.message || err), 'error');
    }
}

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    const b = Number(bytes);
    if (b < 1024) return `${b} bytes`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function showToast(message, type = 'success') {
    const toast = $id('toast');
    if (!toast) {
        console.log(`[TOAST:${type}] ${message}`);
        return;
    }
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function openCreateModal() {
    const modal = $id('createModal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateModal() {
    const modal = $id('createModal');
    if (modal) modal.style.display = 'none';
}

function escapeHtml(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;