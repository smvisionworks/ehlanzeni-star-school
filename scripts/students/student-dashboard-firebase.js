import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, onValue, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let currentUser = null;
let currentUserData = null;

// Check authentication and load dashboard
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showToast('Please log in to access this page', 'error');
            setTimeout(() => window.location.href = '../landing/login.html', 3000);
            return;
        }

        currentUser = user;
        await checkUserStatus(user.uid);
        await loadDashboard(user.uid);
        setupEventListeners();
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
                // Redirect to monthly payment pending page
                setTimeout(() => window.location.href = '../students/payment-pending.html', 500);
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

async function loadDashboard(uid) {
    if (!currentUserData) {
        console.error('No user data available');
        return;
    }

    // Update user info
    const fullName = `${currentUserData.firstName} ${currentUserData.lastName}`;
    document.getElementById('studentName').textContent = fullName;
    document.getElementById('welcomeName').textContent = currentUserData.firstName;

    // Load dashboard data
    await loadDashboardData(uid);
    
    // Remove loading skeletons
    document.querySelectorAll('.loading-skeleton').forEach(el => el.classList.remove('loading-skeleton'));
}

async function loadDashboardData(uid) {
    try {
        // Load enrollments and related data
        const enrollments = await fetchEnrollments(uid);
        
        if (enrollments.length === 0) {
            showPlaceholderData();
            return;
        }

        // Load all dashboard data in parallel for better performance
        await Promise.all([
            loadResourcesSummary(uid, enrollments),
            loadAssignmentsSummary(uid, enrollments),
            loadGradesSummary(uid, enrollments),
            loadCalendarSummary(uid, enrollments),
            loadNotifications(uid)
        ]);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
        showPlaceholderData();
    }
}

async function fetchEnrollments(uid) {
    try {
        const enrollmentsRef = ref(database, `enrollments/${uid}`);
        const snapshot = await get(enrollmentsRef);
        
        if (snapshot.exists()) {
            const enrollmentsData = snapshot.val();
            const activeEnrollments = Object.entries(enrollmentsData)
                .filter(([courseId, enrollment]) => enrollment.status === 'active')
                .map(([courseId, enrollment]) => ({
                    courseId,
                    courseName: enrollment.courseName,
                    enrolledAt: enrollment.enrolledAt
                }));
            return activeEnrollments;
        }
        return [];
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        return [];
    }
}

async function loadResourcesSummary(uid, enrollments) {
    const resourcesGraph = document.getElementById('resourcesGraph');
    resourcesGraph.innerHTML = '';

    if (enrollments.length === 0) {
        resourcesGraph.innerHTML = '<p class="no-data">No active course enrollments found.</p>';
        return;
    }

    try {
        const resourcesRef = ref(database, 'resources');
        const snapshot = await get(resourcesRef);

        if (snapshot.exists()) {
            const allResources = snapshot.val();
            const courseIds = enrollments.map(e => e.courseId);
            
            // Filter resources for enrolled courses from the last 7 days
            const recentResources = Object.values(allResources).filter(resource => 
                courseIds.includes(resource.courseId) && 
                isRecent(resource.createdAt, 7)
            );

            // Group by course and count
            const resourceCounts = {};
            recentResources.forEach(resource => {
                const courseName = resource.courseName || 'Unknown Course';
                resourceCounts[courseName] = (resourceCounts[courseName] || 0) + 1;
            });

            // Display summary
            if (Object.keys(resourceCounts).length > 0) {
                Object.entries(resourceCounts).forEach(([course, count]) => {
                    const barItem = createBarItem(course, count, 'resources');
                    resourcesGraph.appendChild(barItem);
                });
                
                // Add total count
                const totalResources = recentResources.length;
                const summaryText = document.createElement('p');
                summaryText.className = 'summary-text';
                summaryText.innerHTML = `<strong>${totalResources}</strong> new resources available across <strong>${Object.keys(resourceCounts).length}</strong> courses`;
                resourcesGraph.appendChild(summaryText);
            } else {
                resourcesGraph.innerHTML = '<p class="no-data">No new resources in the past week.</p>';
            }
        } else {
            resourcesGraph.innerHTML = '<p class="no-data">No resources available.</p>';
        }
    } catch (error) {
        console.error('Error loading resources:', error);
        resourcesGraph.innerHTML = '<p class="error">Error loading resources</p>';
    }
}

async function loadAssignmentsSummary(uid, enrollments) {
    const assignmentsGraph = document.getElementById('assignmentsGraph');
    assignmentsGraph.innerHTML = '';

    if (enrollments.length === 0) {
        assignmentsGraph.innerHTML = '<p class="no-data">No active course enrollments found.</p>';
        return;
    }

    try {
        // Get assignments from resources (based on your structure)
        const resourcesRef = ref(database, 'resources');
        const snapshot = await get(resourcesRef);

        if (snapshot.exists()) {
            const allResources = snapshot.val();
            const courseIds = enrollments.map(e => e.courseId);
            
            // Filter assignments (resources with assignment type) from the last 7 days
            const recentAssignments = Object.values(allResources).filter(resource => 
                courseIds.includes(resource.courseId) && 
                resource.resourceType === 'assignment' &&
                isRecent(resource.createdAt, 7)
            );

            // Check submission status for each assignment
        const assignmentsWithStatus = await Promise.all(
            recentAssignments.map(async (assignment) => {
                const submissionRef = ref(database, `submissions/${assignment.courseId}/${uid}`);
                const submissionSnap = await get(submissionRef);
                const isSubmitted = submissionSnap.exists();
                return { ...assignment, isSubmitted };
            })
        );

            // Count by status
            const pendingCount = assignmentsWithStatus.filter(a => !a.isSubmitted).length;
            const submittedCount = assignmentsWithStatus.filter(a => a.isSubmitted).length;

            // Display assignment status overview
            if (recentAssignments.length > 0) {
                const pendingItem = createBarItem('Pending', pendingCount, 'assignments-pending');
                const submittedItem = createBarItem('Submitted', submittedCount, 'assignments-submitted');
                
                assignmentsGraph.appendChild(pendingItem);
                assignmentsGraph.appendChild(submittedItem);

                // Add summary
                const summaryText = document.createElement('p');
                summaryText.className = 'summary-text';
                summaryText.innerHTML = `<strong>${recentAssignments.length}</strong> new assignments, <strong>${submittedCount}</strong> submitted`;
                assignmentsGraph.appendChild(summaryText);
            } else {
                assignmentsGraph.innerHTML = '<p class="no-data">No new assignments this week.</p>';
            }
        } else {
            assignmentsGraph.innerHTML = '<p class="no-data">No assignments available.</p>';
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        assignmentsGraph.innerHTML = '<p class="error">Error loading assignments</p>';
    }
}

async function loadGradesSummary(uid, enrollments) {
    const gradesGraph = document.getElementById('gradesGraph');
    gradesGraph.innerHTML = '';

    if (enrollments.length === 0) {
        gradesGraph.innerHTML = '<p class="no-data">No active course enrollments found.</p>';
        return;
    }

    try {
        const submissionsRef = ref(database, 'submissions');
        const snapshot = await get(submissionsRef);

        if (snapshot.exists()) {
            const allSubmissions = snapshot.val();
            const courseIds = enrollments.map(e => e.courseId);
            
            // Get all graded submissions for this student
            let gradedSubmissions = [];
            
            // Flatten submissions structure and filter
            Object.values(allSubmissions).forEach(courseSubmissions => {
                if (typeof courseSubmissions === 'object') {
                    Object.values(courseSubmissions).forEach(submission => {
                        if (submission.studentId === uid && 
                            courseIds.includes(submission.courseId) && 
                            submission.grade !== undefined && 
                            submission.grade !== null) {
                            gradedSubmissions.push(submission);
                        }
                    });
                }
            });

            if (gradedSubmissions.length > 0) {
                // Calculate course averages
                const courseAverages = {};
                gradedSubmissions.forEach(submission => {
                    const courseName = submission.courseName || 'Unknown Course';
                    if (!courseAverages[courseName]) {
                        courseAverages[courseName] = { total: 0, count: 0 };
                    }
                    courseAverages[courseName].total += submission.grade;
                    courseAverages[courseName].count += 1;
                });

                // Display course averages
                Object.entries(courseAverages).forEach(([course, data]) => {
                    const average = (data.total / data.count).toFixed(1);
                    const barItem = createBarItem(course, average, 'grades', '%');
                    gradesGraph.appendChild(barItem);
                });

                // Calculate overall average
                const overallAverage = gradedSubmissions.reduce((sum, sub) => sum + sub.grade, 0) / gradedSubmissions.length;
                
                const summaryText = document.createElement('p');
                summaryText.className = 'summary-text';
                summaryText.innerHTML = `<strong>Overall Average: ${overallAverage.toFixed(1)}%</strong> across ${gradedSubmissions.length} submissions`;
                gradesGraph.appendChild(summaryText);
            } else {
                gradesGraph.innerHTML = '<p class="no-data">No graded submissions yet.</p>';
            }
        } else {
            gradesGraph.innerHTML = '<p class="no-data">No grades available.</p>';
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        gradesGraph.innerHTML = '<p class="error">Error loading grades</p>';
    }
}

async function loadCalendarSummary(uid, enrollments) {
    const calendarGraph = document.getElementById('calendarGraph');
    calendarGraph.innerHTML = '';

    if (enrollments.length === 0) {
        calendarGraph.innerHTML = '<p class="no-data">No active course enrollments found.</p>';
        return;
    }

    try {
        const eventsRef = ref(database, 'calendar_events');
        const snapshot = await get(eventsRef);

        if (snapshot.exists()) {
            const allEvents = snapshot.val();
            const courseIds = enrollments.map(e => e.courseId);
            
            // Flatten events and filter for enrolled courses and upcoming events
            let upcomingEvents = [];
            Object.values(allEvents).forEach(teacherEvents => {
                if (typeof teacherEvents === 'object') {
                    Object.values(teacherEvents).forEach(event => {
                        if (courseIds.includes(event.courseId) && isUpcoming(event.date)) {
                            upcomingEvents.push(event);
                        }
                    });
                }
            });

            // Sort by date and get next 5 events
            upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
            const nextEvents = upcomingEvents.slice(0, 5);

            if (nextEvents.length > 0) {
                // Group by course for summary
                const eventCounts = {};
                nextEvents.forEach(event => {
                    const courseName = event.courseName || 'Unknown Course';
                    eventCounts[courseName] = (eventCounts[courseName] || 0) + 1;
                });

                // Display event counts by course
                Object.entries(eventCounts).forEach(([course, count]) => {
                    const barItem = createBarItem(course, count, 'events');
                    calendarGraph.appendChild(barItem);
                });

                // Add upcoming events summary
                const summaryText = document.createElement('p');
                summaryText.className = 'summary-text';
                const nextEvent = nextEvents[0];
                summaryText.innerHTML = `<strong>${nextEvents.length}</strong> upcoming events. Next: ${formatEventDate(nextEvent.date)}`;
                calendarGraph.appendChild(summaryText);
            } else {
                calendarGraph.innerHTML = '<p class="no-data">No upcoming events.</p>';
            }
        } else {
            calendarGraph.innerHTML = '<p class="no-data">No events available.</p>';
        }
    } catch (error) {
        console.error('Error loading calendar events:', error);
        calendarGraph.innerHTML = '<p class="error">Error loading events</p>';
    }
}

async function loadNotifications(uid) {
    try {
        // Since there's no notifications node in your structure, we'll create relevant notifications
        const notificationBody = document.getElementById('notificationBody');
        notificationBody.innerHTML = '';

        // Create system notifications based on student data
        const notifications = await generateStudentNotifications(uid);
        
        if (notifications.length > 0) {
            notifications.forEach(notification => {
                const item = document.createElement('div');
                item.className = `notification-item ${notification.type || 'info'}`;
                item.innerHTML = `
                    <i class="fas ${notification.icon || 'fa-info-circle'}"></i>
                    <div>
                        <p>${notification.message}</p>
                        <span>${notification.time}</span>
                    </div>
                `;
                notificationBody.appendChild(item);
            });
        } else {
            notificationBody.innerHTML = '<p class="no-data">No notifications at this time.</p>';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notificationBody').innerHTML = '<p class="error">Error loading notifications</p>';
    }
}

async function generateStudentNotifications(uid) {
    const notifications = [];
    const now = new Date();

    // Check for recent grades
    const submissionsRef = ref(database, 'submissions');
    const submissionsSnap = await get(submissionsRef);
    
    if (submissionsSnap.exists()) {
        const allSubmissions = submissionsSnap.val();
        let recentGradedSubmissions = [];

        // Find recently graded submissions for this student
        Object.values(allSubmissions).forEach(courseSubmissions => {
            if (typeof courseSubmissions === 'object') {
                Object.values(courseSubmissions).forEach(submission => {
                    if (submission.studentId === uid && 
                        submission.gradedAt && 
                        isRecent(submission.gradedAt, 2)) {
                        recentGradedSubmissions.push(submission);
                    }
                });
            }
        });

        recentGradedSubmissions.forEach(submission => {
            notifications.push({
                message: `New grade received: ${submission.grade}% in ${submission.courseName || 'Unknown Course'}`,
                icon: 'fa-graduation-cap',
                type: 'success',
                time: formatRelativeTime(submission.gradedAt)
            });
        });
    }

    // Check enrollment status
    if (currentUserData) {
        notifications.push({
            message: `Welcome to Ehlanzeni Star School! You're enrolled in ${currentUserData.subjects?.length || 0} subjects.`,
            icon: 'fa-user-graduate',
            type: 'info',
            time: 'Just now'
        });
    }

    // Add upcoming deadlines notification (placeholder)
    notifications.push({
        message: 'Check your calendar for upcoming classes and deadlines',
        icon: 'fa-calendar-alt',
        type: 'warning',
        time: 'Today'
    });

    return notifications.slice(0, 5); // Limit to 5 notifications
}

// Helper functions
function createBarItem(label, value, type = 'default', suffix = '') {
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    
    // Calculate bar width based on value and type
    let width = 0;
    if (typeof value === 'number') {
        switch(type) {
            case 'grades':
                width = Math.min(value, 100);
                break;
            case 'resources':
            case 'events':
                width = Math.min(value * 20, 100);
                break;
            case 'assignments-pending':
                width = value * 25;
                break;
            case 'assignments-submitted':
                width = value * 25 + 50;
                break;
            default:
                width = Math.min(value * 10, 100);
        }
    }

    barItem.innerHTML = `
        <span class="label">${label}</span>
        <div class="bar">
            <div class="bar-fill ${type}" style="width: ${width}%;"></div>
        </div>
        <span class="bar-value">${value}${suffix}</span>
    `;
    return barItem;
}

function isRecent(dateString, days = 7) {
    const checkDate = new Date(dateString);
    const now = new Date();
    const diffTime = now - checkDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= days;
}

function isUpcoming(dateString) {
    const eventDate = new Date(dateString);
    const now = new Date();
    return eventDate >= now;
}

function formatEventDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-ZA');
}

function showPlaceholderData() {
    const graphs = ['resourcesGraph', 'assignmentsGraph', 'gradesGraph', 'calendarGraph'];
    graphs.forEach(graphId => {
        const graph = document.getElementById(graphId);
        if (graph) {
            graph.innerHTML = '<p class="no-data">No data available. Please check your course enrollments.</p>';
        }
    });
}

function setupEventListeners() {
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const logoutTriggerBtn = document.getElementById('logoutBtn');

    // Open logout modal
    logoutTriggerBtn.addEventListener('click', () => {
        logoutModal.style.display = 'flex';
    });

    // Cancel logout
    cancelLogoutBtn.addEventListener('click', () => {
        logoutModal.style.display = 'none';
    });

    // Confirm logout
    confirmLogoutBtn.addEventListener('click', () => {
        logoutModal.style.display = 'none';
        handleLogout();
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

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('active');
}

function hideLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

// Make functions available globally for HTML onclick handlers
window.toggleNotifications = toggleNotifications;
window.hideLogoutModal = hideLogoutModal;