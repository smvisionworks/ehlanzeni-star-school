import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let currentUser = null;
let currentUserData = null;

// Check authentication and load courses
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

    // Load courses based on student's subjects
    await fetchStudentCourses(currentUser.uid);
 
}

async function fetchStudentCourses(userId) {
    const loading = document.getElementById('loading');
    const coursesContainer = document.getElementById('coursesContainer');
    loading.style.display = 'flex';
    coursesContainer.innerHTML = '';

    try {
        // Get student's enrolled subjects from application data
        const studentSubjects = currentUserData.subjects || [];
        
        if (studentSubjects.length === 0) {
            coursesContainer.innerHTML = '<p style="color: #555; font-size: 1.2rem; text-align: center;">No subjects registered in your application.</p>';
            loading.style.display = 'none';
            return;
        }

        // Fetch all courses to match with student's subjects
        const coursesRef = ref(database, 'courses');
        const coursesSnapshot = await get(coursesRef);
        
        if (!coursesSnapshot.exists()) {
            // If no courses exist, create course cards based on student's subjects
            displaySubjectCards(studentSubjects);
            loading.style.display = 'none';
            return;
        }

        const allCourses = coursesSnapshot.val();
        
        // Filter courses that match student's subjects
        const enrolledCourses = Object.entries(allCourses)
            .filter(([courseId, course]) => 
                studentSubjects.includes(course.name) || 
                studentSubjects.includes(course.subject)
            )
            .map(([courseId, course]) => ({
                id: courseId,
                ...course
            }));

        // Create enrollments for matched courses
        await createStudentEnrollments(userId, enrolledCourses);

        // Display the enrolled courses
        if (enrolledCourses.length === 0) {
            // If no courses match, show subjects as pending enrollment
            displaySubjectCards(studentSubjects, true);
        } else {
            displayEnrolledCourses(enrolledCourses);
        }

    } catch (error) {
        console.error('Error fetching courses:', error);
        showToast('Failed to load courses: ' + error.message, 'error');
        coursesContainer.innerHTML = '<p style="color: #555; font-size: 1.2rem; text-align: center;">Error loading courses. Please try again later.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

async function createStudentEnrollments(userId, courses) {
    try {
        const enrollmentsRef = ref(database, `enrollments/${userId}`);
        
        for (const course of courses) {
            const enrollmentData = {
                courseId: course.id,
                courseName: course.name,
                enrolledAt: new Date().toISOString(),
                status: 'active',
                studentName: `${currentUserData.firstName} ${currentUserData.lastName}`,
                studentId: userId
            };
            
            // Set enrollment for this course
            await set(ref(database, `enrollments/${userId}/${course.id}`), enrollmentData);
        }
        
        console.log('Enrollments created for student:', userId);
    } catch (error) {
        console.error('Error creating enrollments:', error);
    }
}

function displayEnrolledCourses(courses) {
    const coursesContainer = document.getElementById('coursesContainer');
    coursesContainer.innerHTML = '';

    courses.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-card';
        
        card.innerHTML = `
            <i class="fas fa-book-open course-icon"></i>
            <h3>${course.name}</h3>
            <p class="course-description">${course.description || 'Course description not available'}</p>
            <div class="course-meta">
                <span class="course-code">Code: ${course.code || 'N/A'}</span>
                <span class="course-status enrolled">Enrolled</span>
            </div>
            <div class="course-teacher">
                <i class="fas fa-chalkboard-teacher"></i>
                Teacher: ${course.teacherName || 'Not assigned'}
            </div>
            <button onclick="window.location.href='resources.html?course=${course.id}'" class="enrolled-overlay">
                View Course Resources <i class="fas fa-arrow-right"></i>
            </button>
        `;
        coursesContainer.appendChild(card);
    });
}

function displaySubjectCards(subjects, isPending = false) {
    const coursesContainer = document.getElementById('coursesContainer');
    coursesContainer.innerHTML = '';

    subjects.forEach(subject => {
        if (subject === 'N/A') return; // Skip placeholder subjects
        
        const card = document.createElement('div');
        card.className = `course-card ${isPending ? 'pending' : ''}`;
        
        const iconClass = getSubjectIcon(subject);
        const statusText = isPending ? 'Pending Enrollment' : 'Registered';
        const statusClass = isPending ? 'pending' : 'registered';
        
        card.innerHTML = `
            <i class="${iconClass} course-icon"></i>
            <h3>${subject}</h3>
            <p class="course-description">${getSubjectDescription(subject)}</p>
            <div class="course-meta">
                <span class="course-status ${statusClass}">${statusText}</span>
            </div>
            ${isPending ? 
                '<div class="pending-message"><i class="fas fa-clock"></i> Course setup in progress</div>' :
                `<button class="enrolled-overlay" onclick="showSubjectResources('${subject}')">
                    View Subject Materials <i class="fas fa-arrow-right"></i>
                </button>`
            }
        `;
        coursesContainer.appendChild(card);
    });
}

function getSubjectIcon(subject) {
    const iconMap = {
        'English': 'fas fa-language',
        'Afrikaans': 'fas fa-language',
        'IsiZulu': 'fas fa-language',
        'Mathematics': 'fas fa-calculator',
        'Mathematical Literacy': 'fas fa-chart-bar',
        'Physical Sciences': 'fas fa-atom',
        'Chemistry': 'fas fa-flask',
        'Life Sciences': 'fas fa-dna',
        'Geography': 'fas fa-globe-africa',
        'History': 'fas fa-monument',
        'Economics': 'fas fa-chart-line',
        'Accounting': 'fas fa-calculator',
        'Business Studies': 'fas fa-briefcase',
        'Computer Applications Technology': 'fas fa-laptop'
    };
    
    return iconMap[subject] || 'fas fa-book';
}

function getSubjectDescription(subject) {
    const descriptions = {
        'English': 'Language and literature studies',
        'Mathematics': 'Advanced mathematical concepts and problem solving',
        'Physical Sciences': 'Physics and chemistry fundamentals',
        'Life Sciences': 'Biology and life processes',
        'Accounting': 'Financial accounting principles',
        'Business Studies': 'Business management and entrepreneurship'
    };
    
    return descriptions[subject] || 'Academic subject';
}

function showSubjectResources(subject) {
    showToast(`Resources for ${subject} will be available soon`, 'info');
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

// Make function available globally
window.showSubjectResources = showSubjectResources;