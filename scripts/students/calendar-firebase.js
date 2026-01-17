import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let currentDate = new Date();
let fetchedEvents = {};
let currentUser = null;
let currentUserData = null;
let currentEventData = null;

// DOM elements
const eventModal = document.getElementById("eventModal");
const eventTitleElement = document.getElementById("eventTitle");
const eventCourseElement = document.getElementById("eventCourse");
const eventDateElement = document.getElementById("eventDate");
const eventTimesElement = document.getElementById("eventTimes");
const lecturerNoteCard = document.getElementById("lecturerNoteCard");
const lecturerNoteText = document.getElementById("lecturerNoteText");

// Check authentication and load calendar
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
    initMobileMenu();
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

  await renderCalendar();
}


// In the fetchEvents function, replace with this:
async function fetchEvents(studentId) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  try {
    // Fetch enrollments
    const enrollmentsRef = ref(database, `enrollments/${studentId}`);
    const enrollmentsSnapshot = await get(enrollmentsRef);
    
    if (!enrollmentsSnapshot.exists()) {
      return {};
    }

    const enrollmentsData = enrollmentsSnapshot.val();
    const courseIds = Object.keys(enrollmentsData);

    if (courseIds.length === 0) {
      return {};
    }

    // Fetch calendar events from ALL teachers
    const eventsRef = ref(database, 'calendar_events');
    const eventsSnapshot = await get(eventsRef);
    
    if (!eventsSnapshot.exists()) {
      return {};
    }

    const allEvents = eventsSnapshot.val();
    const eventsMap = {};

    // Filter events for enrolled courses and current month
    Object.values(allEvents).forEach(teacherEvents => {
      Object.values(teacherEvents).forEach(event => {
        // Check if student is enrolled in this course
        if (courseIds.includes(event.courseId)) {
          const eventDate = new Date(event.date);
          if (eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month) {
            const dateStr = event.date;
            
            eventsMap[dateStr] = {
              title: event.title,
              date: event.date,
              notes: event.notes,
              start_time: event.startTime,
              end_time: event.endTime,
              join_link: event.joinLink,
              course_name: event.courseName || 'N/A',
              teacherName: event.teacherName || 'Teacher'
            };
          }
        }
      });
    });

    return eventsMap;
  } catch (error) {
    console.error("Error fetching events:", error);
    showToast(`Error loading events: ${error.message}`, 'error');
    return {};
  }
}

async function renderCalendar() {
  document.getElementById("calendarTable").innerHTML = '<div>Loading events...</div>';

  if (!currentUser) return;

  fetchedEvents = await fetchEvents(currentUser.uid);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = months[month];
  document.getElementById("monthLabel").textContent = `${monthName} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = "<table><tr>";
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekDays.forEach(d => html += `<th>${d}</th>`);
  html += "</tr><tr>";

  for (let i = 0; i < firstDay; i++) {
    html += "<td></td>";
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const event = fetchedEvents[dateStr];
    
    let cellClass = '';
    const today = new Date();
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cellClass = 'today';
    }

    html += `<td class="${cellClass}">${day}`;
    if (event) {
        html += `
            <div class="calendar-event event-lecture" onclick="openModal('${dateStr}')">
                <div class="event-title">${event.course_name}</div>
                <div class="event-time">${event.start_time} - ${event.end_time}</div>
            </div>
        `;
    }
    html += "</td>";

    if ((day + firstDay) % 7 === 0) html += "</tr><tr>";
  }

  html += "</tr></table>";
  document.getElementById("calendarTable").innerHTML = html;
}

async function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  await renderCalendar();
}

async function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  await renderCalendar();
}

function openModal(date) {
  currentEventData = fetchedEvents[date];

  if (!currentEventData) return;

  eventTitleElement.textContent = currentEventData.title;
  eventCourseElement.textContent = `Course: ${currentEventData.course_name}`;
  eventDateElement.textContent = `Date: ${new Date(currentEventData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  eventTimesElement.textContent = `Time: ${currentEventData.start_time} - ${currentEventData.end_time}`;

  const joinLinkElement = document.getElementById('eventJoinLink');
  if (currentEventData.join_link) {
    joinLinkElement.href = currentEventData.join_link;
    joinLinkElement.style.display = 'inline-block';
  } else {
    joinLinkElement.style.display = 'none';
  }

  lecturerNoteCard.style.display = 'block';
  lecturerNoteText.textContent = currentEventData.notes || 'No additional notes from the lecturer.';

  eventModal.style.display = 'flex';
}

function closeModal() {
  eventModal.style.display = 'none';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.className = `toast ${type}`, 3000);
}

function initMobileMenu() {
  let burgerBtn = document.querySelector('.mobile-burger');
  if (!burgerBtn) {
      burgerBtn = document.createElement('button');
      burgerBtn.className = 'mobile-burger';
      burgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
      document.body.appendChild(burgerBtn);
  }
  
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
  }

  burgerBtn.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}

// Make functions available globally for HTML onclick handlers
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.openModal = openModal;
window.closeModal = closeModal;