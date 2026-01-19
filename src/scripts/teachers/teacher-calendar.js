import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, set, push, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let currentUser = null;
let currentTeacherData = null;

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showToast('Please log in to access this page', 'error');
      setTimeout(() => window.location.href = '../landing/login.html', 3000);
      return;
    }

    currentUser = user;
    await checkTeacherStatus(user.uid);
    await init();
  });
});

async function checkTeacherStatus(uid) {
  try {
    const teacherRef = ref(database, `teachers/${uid}`);
    const teacherSnap = await get(teacherRef);

    if (teacherSnap.exists()) {
      currentTeacherData = teacherSnap.val();

      // Check if teacher account is pending approval
      if (currentTeacherData.status === 'pending') {
        showToast('Your teacher account is pending admin approval. You will be notified once approved.', 'error');
        setTimeout(() => window.location.href = '../landing/login.html', 3000);
        return false;
      }

      return true;
    }

    showToast('Teacher profile not found', 'error');
    setTimeout(() => window.location.href = '../landing/login.html', 3000);
    return false;

  } catch (error) {
    console.error('Error checking teacher status:', error);
    showToast('Error verifying teacher status', 'error');
    return false;
  }
}

async function init() {
  if (!currentTeacherData) return;

  // Update teacher name
  const fullName = `${currentTeacherData.personalInfo.firstName} ${currentTeacherData.personalInfo.lastName}`;
  document.getElementById('teacherName').textContent = fullName;

  await loadCourses();
  await loadEvents();
  setupEventListeners();
}

async function loadCourses() {
  try {
    const coursesRef = ref(database, 'courses');
    const snapshot = await get(coursesRef);
    const courseSelect = document.getElementById('courseId');
    
    courseSelect.innerHTML = '<option value="">Select a Course</option>';
    
    if (snapshot.exists()) {
      const allCourses = snapshot.val();
      
      Object.entries(allCourses).forEach(([courseId, course]) => {
        // Only show courses for this teacher
        if (course.teacherId === currentUser.uid && course.status === 'active') {
          const option = document.createElement('option');
          option.value = courseId; // Use the actual course ID
          option.textContent = `${course.name} (${course.code})`;
          courseSelect.appendChild(option);
        }
      });
    }
  } catch (error) {
    console.error('Error loading courses:', error);
    showToast('Error loading courses', 'error');
  }
}

async function loadEvents() {
  const loadingElement = document.getElementById('loading');
  const eventsList = document.getElementById('eventsList');
  
  try {
    const eventsRef = ref(database, `calendar_events/${currentUser.uid}`);
    
    onValue(eventsRef, (snapshot) => {
      eventsList.innerHTML = '';
      
      if (snapshot.exists()) {
        const events = snapshot.val();
        const upcomingEvents = [];
        
        // Convert to array and filter upcoming events
        Object.entries(events).forEach(([eventId, event]) => {
          const eventDate = new Date(event.date);
          if (eventDate >= new Date()) {
            upcomingEvents.push({ id: eventId, ...event });
          }
        });
        
        // Sort by date
        upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Display events
        if (upcomingEvents.length === 0) {
          eventsList.innerHTML = '<div class="no-events">No upcoming classes scheduled</div>';
        } else {
          upcomingEvents.forEach(event => {
            const eventCard = createEventCard(event);
            eventsList.appendChild(eventCard);
          });
        }
      } else {
        eventsList.innerHTML = '<div class="no-events">No classes scheduled yet</div>';
      }
      
      loadingElement.style.display = 'none';
    });
    
  } catch (error) {
    console.error('Error loading events:', error);
    showToast('Error loading events', 'error');
    loadingElement.style.display = 'none';
  }
}

function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  
  card.innerHTML = `
    <h4>${event.title}</h4>
    <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
    <p class="time"><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
    <p><strong>Course:</strong> ${event.courseName || event.courseId}</p>
    <p><strong>Notes:</strong> ${event.notes}</p>
    ${event.joinLink ? `<p><strong>Join Link:</strong> <a href="${event.joinLink}" target="_blank">${event.joinLink}</a></p>` : ''}
    <button class="delete-btn" onclick="deleteEvent('${event.id}')">Delete</button>
  `;
  
  return card;
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  
  try {
    const eventRef = ref(database, `calendar_events/${currentUser.uid}/${eventId}`);
    await set(eventRef, null);
    showToast('Event deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting event:', error);
    showToast('Error deleting event', 'error');
  }
}

function setupEventListeners() {
  const addEventBtn = document.getElementById('addEventBtn');
  addEventBtn.addEventListener('click', addEvent);
  
  // Logout modal listeners
  const logoutModal = document.getElementById('logoutModal');
  const confirmLogout = document.getElementById('confirmLogout');
  const cancelLogout = document.getElementById('cancelLogout');
  const logoutBtn = document.getElementById('logoutBtn');

  logoutBtn.addEventListener('click', () => logoutModal.style.display = 'flex');
  cancelLogout.addEventListener('click', () => logoutModal.style.display = 'none');
  confirmLogout.addEventListener('click', handleLogout);
}

async function addEvent() {
  const title = document.getElementById('title').value;
  const date = document.getElementById('date').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const notes = document.getElementById('notes').value;
  const courseId = document.getElementById('courseId').value;
  const joinLink = document.getElementById('joinLink').value;
  
  if (!title || !date || !startTime || !endTime || !courseId) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Get course details for the selected course ID
  const courseRef = ref(database, `courses/${courseId}`);
  const courseSnap = await get(courseRef);
  
  if (!courseSnap.exists()) {
    showToast('Selected course not found', 'error');
    return;
  }
  
  const courseData = courseSnap.val();
  
  const eventData = {
    title,
    date,
    startTime,
    endTime,
    notes,
    courseId, // Store the actual course ID
    courseName: courseData.name, // Also store course name for easy display
    joinLink,
    teacherId: currentUser.uid,
    teacherName: `${currentTeacherData.personalInfo.firstName} ${currentTeacherData.personalInfo.lastName}`,
    createdAt: new Date().toISOString()
  };
  
  try {
    const eventsRef = ref(database, `calendar_events/${currentUser.uid}`);
    const newEventRef = push(eventsRef);
    await set(newEventRef, eventData);
    
    showToast('Class event added successfully', 'success');
    
    // Clear form
    document.getElementById('title').value = '';
    document.getElementById('date').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('joinLink').value = '';
    
  } catch (error) {
    console.error('Error adding event:', error);
    showToast('Error adding event', 'error');
  }
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
  setTimeout(() => toast.className = 'toast', 3000);
}

// Make functions available globally
window.deleteEvent = deleteEvent;