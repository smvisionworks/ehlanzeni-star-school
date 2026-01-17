import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let classesChart, assignmentsChart, resourcesChart;
let currentUser = null;
let currentTeacherData = null;

// Check authentication and load dashboard
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showError('Please log in to access this page');
            setTimeout(() => window.location.href = '../landing/login.html', 3000);
            return;
        }

        currentUser = user;
        await checkTeacherStatus(user.uid);
        await initDashboard();
    });
});

// Check if user is a registered teacher
async function checkTeacherStatus(uid) {
    try {
        const teacherRef = ref(database, `teachers/${uid}`);
        const teacherSnap = await get(teacherRef);

        if (!teacherSnap.exists()) {
            showError('Teacher profile not found. Please register as a teacher first.');
            setTimeout(() => window.location.href = '../landing/login.html', 3000);
            return false;
        }

        currentTeacherData = teacherSnap.val();
        console.log('Teacher data loaded:', currentTeacherData);

        // Check if teacher account is pending approval
        if (currentTeacherData.status === 'pending') {
            showError('Your teacher account is pending admin approval. You will be notified once approved. Please check back later.');
            setTimeout(() => window.location.href = '../landing/login.html', 5000);
            return false;
        }

        return true;

    } catch (error) {
        console.error('Error checking teacher status:', error);
        showError('Error verifying teacher status');
        return false;
    }
}

async function initDashboard() {
    showLoading();
    
    if (!currentTeacherData) {
        showError('No teacher data available');
        return;
    }

    // Update teacher info
    const fullName = `${currentTeacherData.personalInfo.firstName} ${currentTeacherData.personalInfo.lastName}`;
    document.getElementById('teacherName').textContent = fullName;
    document.getElementById('welcomeText').textContent = `Welcome back, ${currentTeacherData.personalInfo.firstName}!`;

    try {
        // Get teacher's subjects
        const teacherSubjects = currentTeacherData.teachingInfo?.subjects || [];
        console.log('Teacher subjects:', teacherSubjects);

        if (teacherSubjects.length === 0) {
            showError('No subjects found in your teacher profile. Please update your profile.');
            return;
        }

        // Ensure courses exist for teacher's subjects
        const teacherCourses = await ensureTeacherCourses(teacherSubjects);
        console.log('Teacher courses after ensuring:', teacherCourses);

        if (teacherCourses.length === 0) {
            showError('No courses could be created or found for your subjects.');
            return;
        }

        const courseIds = teacherCourses.map(course => course.id);

        // Get current week (Monday to Sunday)
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6));
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);
        const today = new Date().toISOString().split('T')[0];

        console.log('Week range:', startOfWeek.toISOString(), 'to', endOfWeek.toISOString());
        console.log('Course IDs for teacher:', courseIds);

        let upcomingClasses = 0, totalAssignments = 0, totalResources = 0;

        // Fetch upcoming classes for the week
        upcomingClasses = await fetchUpcomingClasses(courseIds, today, endOfWeek);
        
        // Fetch weekly assignments
        totalAssignments = await fetchWeeklyAssignments(currentUser.uid, startOfWeek, endOfWeek);
        
        // Fetch weekly resources
        totalResources = await fetchWeeklyResources(courseIds, startOfWeek, endOfWeek);

        // Update UI
        updateDashboardCharts(upcomingClasses, totalAssignments, totalResources);
        
        // Calculate and display weekly overall score
        calculateWeeklyScore(upcomingClasses, totalAssignments, totalResources);

        hideLoading();
        showDashboard();

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Error loading dashboard data: ' + error.message);
    }
}

async function ensureTeacherCourses(subjects) {
    try {
        const coursesRef = ref(database, 'courses');
        const coursesSnapshot = await get(coursesRef);
        const existingCourses = coursesSnapshot.exists() ? coursesSnapshot.val() : {};
        
        console.log('Existing courses in database:', existingCourses);

        const teacherCourses = [];
        const creationPromises = [];

        for (const subject of subjects) {
            if (subject === 'N/A' || !subject.trim()) continue;
            
            // Check if course already exists for this teacher and subject
            const existingCourse = Object.entries(existingCourses).find(([courseId, course]) => 
                course.teacherId === currentUser.uid && 
                (course.name === subject || course.subject === subject)
            );

            if (existingCourse) {
                // Course exists, add to teacher's courses
                teacherCourses.push({
                    id: existingCourse[0],
                    ...existingCourse[1]
                });
                console.log(`Found existing course for ${subject}:`, existingCourse[0]);
            } else {
                // Create new course
                const newCourseId = generateCourseId(subject);
                const newCourseData = {
                    name: subject,
                    description: `${subject} - Course for ${currentTeacherData.personalInfo.firstName} ${currentTeacherData.personalInfo.lastName}`,
                    code: generateCourseCode(subject),
                    teacherId: currentUser.uid,
                    teacherName: `${currentTeacherData.personalInfo.firstName} ${currentTeacherData.personalInfo.lastName}`,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    subject: subject
                };
                
                const newCourseRef = ref(database, `courses/${newCourseId}`);
                creationPromises.push(set(newCourseRef, newCourseData));
                
                teacherCourses.push({
                    id: newCourseId,
                    ...newCourseData
                });
                
                console.log(`Creating new course for ${subject}:`, newCourseId);
            }
        }

        // Wait for all course creations to complete
        if (creationPromises.length > 0) {
            await Promise.all(creationPromises);
            console.log(`Created ${creationPromises.length} new courses`);
        }

        console.log('Final teacher courses:', teacherCourses);
        return teacherCourses;

    } catch (error) {
        console.error('Error ensuring teacher courses:', error);
        throw error;
    }
}

function generateCourseId(subject) {
    // Create a safe ID by removing special characters and adding timestamp
    const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `course-${safeSubject}-${currentUser.uid}-${Date.now()}`;
}

function generateCourseCode(subject) {
    const prefix = subject.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
}

async function fetchUpcomingClasses(courseIds, today, endOfWeek) {
    try {
        const eventsRef = ref(database, 'calendar_events');
        const eventsSnapshot = await get(eventsRef);
        
        if (!eventsSnapshot.exists()) {
            console.log('No calendar events found in database');
            return 0;
        }

        const allEvents = eventsSnapshot.val();
        console.log('All calendar events:', allEvents);

        const upcomingEvents = Object.values(allEvents).filter(event => {
            const matchesCourse = courseIds.includes(event.courseId);
            const inDateRange = event.date >= today && event.date <= endOfWeek.toISOString().split('T')[0];
            
            if (matchesCourse && inDateRange) {
                console.log('Found upcoming event:', event);
            }
            
            return matchesCourse && inDateRange;
        });

        console.log('Upcoming classes fetched:', upcomingEvents.length, upcomingEvents);
        return upcomingEvents.length;
    } catch (error) {
        console.error('Error fetching upcoming classes:', error);
        return 0;
    }
}

async function fetchWeeklyAssignments(teacherId, startOfWeek, endOfWeek) {
    try {
        const assignmentsRef = ref(database, 'assignments');
        const assignmentsSnapshot = await get(assignmentsRef);
        
        if (!assignmentsSnapshot.exists()) {
            console.log('No assignments found in database');
            return 0;
        }

        const allAssignments = assignmentsSnapshot.val();
        console.log('All assignments:', allAssignments);

        const weeklyAssignments = Object.values(allAssignments).filter(assignment => {
            const matchesTeacher = assignment.teacherId === teacherId;
            const assignmentDate = new Date(assignment.createdAt || assignment.created_at);
            const inDateRange = assignmentDate >= startOfWeek && assignmentDate <= endOfWeek;
            
            return matchesTeacher && inDateRange;
        });

        console.log('Weekly assignments fetched:', weeklyAssignments.length, weeklyAssignments);
        return weeklyAssignments.length;
    } catch (error) {
        console.error('Error fetching weekly assignments:', error);
        return 0;
    }
}

async function fetchWeeklyResources(courseIds, startOfWeek, endOfWeek) {
    try {
        const resourcesRef = ref(database, 'resources');
        const resourcesSnapshot = await get(resourcesRef);
        
        if (!resourcesSnapshot.exists()) {
            console.log('No resources found in database');
            return 0;
        }

        const allResources = resourcesSnapshot.val();
        console.log('All resources:', allResources);

        const weeklyResources = Object.values(allResources).filter(resource => {
            const matchesCourse = courseIds.includes(resource.courseId);
            const resourceDate = new Date(resource.createdAt || resource.created_at);
            const inDateRange = resourceDate >= startOfWeek && resourceDate <= endOfWeek;
            
            return matchesCourse && inDateRange;
        });

        console.log('Weekly resources fetched:', weeklyResources.length, weeklyResources);
        return weeklyResources.length;
    } catch (error) {
        console.error('Error fetching weekly resources:', error);
        return 0;
    }
}

function updateDashboardCharts(upcomingClasses, totalAssignments, totalResources) {
    // Update counts
    document.getElementById('classesCount').textContent = upcomingClasses;
    document.getElementById('assignmentsCount').textContent = totalAssignments;
    document.getElementById('resourcesCount').textContent = totalResources;

    // Classes Chart
    const classesCanvas = document.getElementById('classesChart');
    if (classesChart) classesChart.destroy();
    classesChart = new Chart(classesCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Upcoming Classes', 'Remaining'],
            datasets: [{ 
                data: [upcomingClasses, Math.max(5 - upcomingClasses, 0)], 
                backgroundColor: ['#007bff', '#d3e3f8'] 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom', labels: { color: '#003087', font: { size: 14 } } },
                tooltip: { enabled: true, bodyFont: { size: 14 } },
                datalabels: { 
                    color: '#fff', 
                    font: { weight: 'bold', size: 16 }, 
                    formatter: (value) => value > 0 ? value : '' 
                }
            }
        }
    });

    // Assignments Chart
    const assignmentsCanvas = document.getElementById('assignmentsChart');
    if (assignmentsChart) assignmentsChart.destroy();
    assignmentsChart = new Chart(assignmentsCanvas, {
        type: 'bar',
        data: {
            labels: ['Assignments Created'],
            datasets: [{
                data: [totalAssignments],
                backgroundColor: totalAssignments > 0 ? ['#007bff'] : ['#d3e3f8'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true, bodyFont: { size: 14 } },
                datalabels: { 
                    color: '#fff', 
                    font: { weight: 'bold', size: 16 }, 
                    anchor: 'end', 
                    align: 'top' 
                }
            },
            scales: {
                y: { beginAtZero: true, max: Math.max(totalAssignments + 2, 5), ticks: { color: '#003087', font: { size: 12 } } }
            }
        }
    });

    // Resources Chart
    const resourcesCanvas = document.getElementById('resourcesChart');
    if (resourcesChart) resourcesChart.destroy();
    resourcesChart = new Chart(resourcesCanvas, {
        type: 'bar',
        data: {
            labels: ['Resources'],
            datasets: [{ 
                data: [totalResources], 
                backgroundColor: totalResources > 0 ? ['#007bff'] : ['#d3e3f8'] 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, 
                tooltip: { enabled: true, bodyFont: { size: 14 } } 
            },
            scales: { 
                y: { beginAtZero: true, max: Math.max(totalResources + 2, 5), ticks: { color: '#003087', font: { size: 12 } } } 
            }
        }
    });
}

function calculateWeeklyScore(upcomingClasses, totalAssignments, totalResources) {
    try {
        const score = Math.min((upcomingClasses * 10) + (totalAssignments * 15) + (totalResources * 10), 100);
        document.getElementById('scoreValue').textContent = Math.round(score);
        document.getElementById('weeklyScore').style.display = 'block';
    } catch (error) {
        console.error('Weekly score calculation error:', error);
        document.getElementById('weeklyScore').style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('cardContainer').style.display = 'none';
    document.getElementById('weeklyScore').style.display = 'none';
    console.error('Error:', message);
}

function showLoading() {
    document.getElementById('loadingMessage').style.display = 'flex';
    document.getElementById('cardContainer').style.display = 'none';
    document.getElementById('weeklyScore').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingMessage').style.display = 'none';
}

function showDashboard() {
    document.getElementById('cardContainer').style.display = 'grid';
    document.getElementById('weeklyScore').style.display = 'block';
}

function showLogoutModal() {
    document.getElementById('logoutModal').style.display = 'flex';
}

function hideLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = '../landing/login.html';
    } catch (error) {
        showError('Logout failed: ' + error.message);
    }
    hideLogoutModal();
}

// Event Listeners
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    showLogoutModal();
});

document.getElementById('confirmLogout').addEventListener('click', handleLogout);

document.getElementById('cancelLogout').addEventListener('click', () => {
    hideLogoutModal();
});