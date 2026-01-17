import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let currentUser = null;
let currentUserData = null;
let allGradedSubmissions = [];

// Check authentication and load grades
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

// Check if user has complete application (approved status + paid + monthly payment)
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

        // If no pending application found
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

    // Update student name
    const fullName = `${currentUserData.firstName} ${currentUserData.lastName}`;
    document.getElementById('studentName').textContent = fullName;

    // Load grades and initialize filters
    await fetchGrades(currentUser.uid);
    initFilters();
    initModalListeners();
}

function initFilters() {
    const courseFilter = document.getElementById('courseFilter');
    const searchInput = document.getElementById('searchAssignments');

    if (courseFilter) {
        courseFilter.addEventListener('change', filterGrades);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterGrades);
    }
}

async function fetchGrades(studentId) { 
    const gradesContainer = document.getElementById('grades-container');
    gradesContainer.innerHTML = '<div class="no-grades">Loading grades...</div>';

    try {
        console.log('Fetching grades for student:', studentId);

        // Fetch enrollments
        const enrollmentsRef = ref(database, `enrollments/${studentId}`);
        const enrollmentsSnapshot = await get(enrollmentsRef);

        if (!enrollmentsSnapshot.exists()) {
            console.log('No active enrollments found');
            gradesContainer.innerHTML = '<div class="no-grades">You are not enrolled in any courses with grades.</div>';
            return;
        }

        const enrollmentsData = enrollmentsSnapshot.val();
        const courseIds = Object.keys(enrollmentsData).filter(
            courseId => enrollmentsData[courseId].status === 'active'
        );

        if (courseIds.length === 0) {
            gradesContainer.innerHTML = '<div class="no-grades">You are not enrolled in any courses with grades.</div>';
            return;
        }

        // ✅ Fetch all submissions (nested by assignment → student)
        const submissionsRef = ref(database, 'submissions');
        const submissionsSnap = await get(submissionsRef);

        if (!submissionsSnap.exists()) {
            gradesContainer.innerHTML = '<div class="no-grades">No graded assignments available yet.</div>';
            return;
        }

        // ✅ Extract ONLY this student's submissions
        let studentSubmissions = {};

        submissionsSnap.forEach(assignSnap => {
            const assignmentId = assignSnap.key;
            const students = assignSnap.val();

            if (students[studentId]) {
                studentSubmissions[assignmentId] = students[studentId];
            }
        });

        if (Object.keys(studentSubmissions).length === 0) {
            gradesContainer.innerHTML = '<div class="no-grades">No graded assignments available yet.</div>';
            return;
        }

        // ✅ FIXED: Fetch assignments FROM RESOURCES
        const resourcesRef = ref(database, 'resources');
        const resourcesSnapshot = await get(resourcesRef);

        let allAssignments = {};

        if (resourcesSnapshot.exists()) {
            const resources = resourcesSnapshot.val();

            Object.entries(resources).forEach(([id, res]) => {
                if (res.resourceType === "assignment") {
                    allAssignments[id] = res;
                }
            });
        }

        // Fetch courses
        const coursesRef = ref(database, 'courses');
        const coursesSnapshot = await get(coursesRef);
        const allCourses = coursesSnapshot.exists() ? coursesSnapshot.val() : {};

        // Build graded submissions list
        const gradedSubmissions = Object.entries(studentSubmissions)
            .map(([assignmentId, submission]) => ({
                assignmentId,
                ...submission,
                assignment: allAssignments[assignmentId],                  // ← now exists
                course: allAssignments[assignmentId]
                    ? allCourses[allAssignments[assignmentId].courseId]    // ← now valid
                    : null
            }))
            .filter(submission =>
                submission.grade !== null &&
                submission.grade !== undefined &&
                submission.assignment &&
                courseIds.includes(submission.assignment.courseId)
            );

        console.log('Graded submissions:', gradedSubmissions);

        if (gradedSubmissions.length === 0) {
            gradesContainer.innerHTML = '<div class="no-grades">No graded assignments available yet.</div>';
            return;
        }

        // Store for filtering
        allGradedSubmissions = gradedSubmissions;

        // Populate course filter
        populateCourseFilter(gradedSubmissions);

        // Render graded submissions
        renderGrades(gradedSubmissions);

    } catch (error) {
        console.error('Error fetching grades:', error);
        gradesContainer.innerHTML = '<div class="no-grades">Error loading grades. Please try again later.</div>';
        showToast('Error loading grades: ' + error.message, 'error');
    }
}



function populateCourseFilter(submissions) {
    const courseFilter = document.getElementById('courseFilter');
    if (!courseFilter) return;

    // Get unique courses
    const courses = [...new Set(submissions.map(s => s.course?.name).filter(Boolean))];
    
    courseFilter.innerHTML = '<option value="all">All Courses</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseFilter.appendChild(option);
    });
}

function renderGrades(submissions) {
    const gradesContainer = document.getElementById('grades-container');
    
    if (submissions.length === 0) {
        gradesContainer.innerHTML = '<div class="no-grades">No graded assignments match your filters.</div>';
        return;
    }

    gradesContainer.innerHTML = '';
    submissions.forEach(submission => {
        const assignment = submission.assignment;
        const course = submission.course;
        const grade = `${submission.grade}%`;
        
        // Determine grade class for styling
        const gradeClass = getGradeClass(submission.grade);

        const card = document.createElement('div');
        card.className = `grade-card ${gradeClass}`;
        card.innerHTML = `
            <h3>${submission.assignment?.title || 'N/A'}</h3>
            <p><strong>Subject:</strong> ${submission.course?.name || 'N/A'}</p>
            <p><strong>Assignment Type:</strong> ${submission.assignment?.type || 'N/A'}</p>
            <p><strong>Grade:</strong> <span class="grade-value">${grade}</span></p>
            <div class="grade-meta">
                <span class="submission-date">Submitted: ${formatDate(submission.submittedAt)}</span>
                ${submission.gradedAt ? `<span class="graded-date">Graded: ${formatDate(submission.gradedAt)}</span>` : ''}
            </div>
            <div class="grade-actions">
                <a href="#" class="view" onclick="viewSubmissionDetails('${submission.assignmentId}', '${submission.assignment?.title.replace(/'/g, "\\'")}', '${submission.grade}', '${(submission.feedback || '').replace(/'/g, "\\'")}', '${(submission.course?.name || 'N/A').replace(/'/g, "\\'")}', '${submission.assignment?.type || 'N/A'}', '${submission.submittedAt}', '${submission.gradedAt || ''}')">
                    View Details
                </a>
            </div>
        `;
        gradesContainer.appendChild(card);
    });
}

function getGradeClass(grade) {
    if (grade >= 80) return 'grade-excellent';
    if (grade >= 70) return 'grade-good';
    if (grade >= 50) return 'grade-average';
    return 'grade-poor';
}

function filterGrades() {
    const courseFilter = document.getElementById('courseFilter');
    const searchInput = document.getElementById('searchAssignments');
    
    const selectedCourse = courseFilter ? courseFilter.value : 'all';
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = allGradedSubmissions.filter(submission => {
        const courseMatch = selectedCourse === 'all' || submission.course?.name === selectedCourse;
        const searchMatch = !searchTerm || 
            submission.assignment.title.toLowerCase().includes(searchTerm) ||
            (submission.course?.name && submission.course.name.toLowerCase().includes(searchTerm));
        
        return courseMatch && searchMatch;
    });

    renderGrades(filtered);
}

async function viewSubmissionDetails(submissionId, title, grade, feedback, courseName, assignmentType, submittedAt, gradedAt) {
    try {
        // Fetch the actual submission to get the latest data
        const submissionRef = ref(database, `submissions/${submissionId}`);
        const submissionSnapshot = await get(submissionRef);
        
        let latestFeedback = feedback;
        let latestGrade = grade;
        
        if (submissionSnapshot.exists()) {
            const submissionData = submissionSnapshot.val();
            latestFeedback = submissionData.feedback || feedback;
            latestGrade = submissionData.grade || grade;
        }

        const feedbackContent = `
            <h2>${title}</h2>
            <div class="submission-details">
                <p><strong>Subject:</strong> ${courseName}</p>
                <p><strong>Assignment Type:</strong> ${assignmentType}</p>
                <p><strong>Grade:</strong> <span class="grade-value ${getGradeClass(parseFloat(latestGrade))}">${latestGrade}%</span></p>
                <p><strong>Submitted:</strong> ${formatDate(submittedAt)}</p>
                ${gradedAt ? `<p><strong>Graded:</strong> ${formatDate(gradedAt)}</p>` : ''}
            </div>
            <hr>
            <div class="feedback-section">
                <h3>Feedback</h3>
                <div class="feedback-content">
                    ${latestFeedback && latestFeedback.trim() !== "" ? 
                        `<p style="white-space: pre-wrap;">${latestFeedback}</p>` : 
                        '<p><em>No feedback provided for this submission.</em></p>'
                    }
                </div>
            </div>
        `;
        
        document.getElementById('feedbackContent').innerHTML = feedbackContent;
        document.getElementById('feedbackModal').classList.add('show');
    } catch (error) {
        console.error('Error fetching submission details:', error);
        showToast('Failed to load submission details.', 'error');
    }
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('show');
}

function initModalListeners() {
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const logoutTriggerBtn = document.getElementById('logoutBtn');

    logoutTriggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logoutModal.classList.add('show');
    });

    cancelLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('show');
    });

    confirmLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('show');
        handleLogout();
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const feedbackModal = document.getElementById('feedbackModal');
        if (e.target === feedbackModal) {
            closeFeedbackModal();
        }
        if (e.target === logoutModal) {
            logoutModal.classList.remove('show');
        }
    });
}

async function handleLogout() {
    try {
        await signOut(auth);
        showToast('Logged out successfully!', 'success');
        setTimeout(() => window.location.href = '../landing/login.html', 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout: ' + error.message, 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.className = `toast ${type}`, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

// Make functions available globally for HTML onclick handlers
window.viewSubmissionDetails = viewSubmissionDetails;
window.closeFeedbackModal = closeFeedbackModal;
window.filterGrades = filterGrades;