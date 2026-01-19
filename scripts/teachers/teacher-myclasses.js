import { auth, database } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showToast('Please log in to access this page', 'error');
      setTimeout(() => window.location.href = '../landing/login.html', 3000);
      return;
    }

    currentUser = user;
    await loadTeacherData();
    await loadClasses();
  });
});

async function loadTeacherData() {
  try {
    const teacherRef = ref(database, `teachers/${currentUser.uid}`);
    const teacherSnap = await get(teacherRef);
    
    if (teacherSnap.exists()) {
      const teacherData = teacherSnap.val();
      document.getElementById('teacherName').textContent = 
        `${teacherData.personalInfo?.firstName} ${teacherData.personalInfo?.lastName}`;
    }
  } catch (error) {
    console.error('Error loading teacher data:', error);
  }
}

async function loadClasses() {
  const loadingElement = document.getElementById('loading');
  const classContainer = document.getElementById('classContainer');
  const pastClassContainer = document.getElementById('pastClassContainer');
  
  loadingElement.style.display = 'block';

  try {
    const calendarEventsRef = ref(database, `calendar_events/${currentUser.uid}`);
    
    onValue(calendarEventsRef, (snapshot) => {
      classContainer.innerHTML = '';
      pastClassContainer.innerHTML = '';
      
      const upcomingClasses = [];
      const pastClasses = [];
      const currentDateTime = new Date();

      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const classData = childSnapshot.val();
          classData.id = childSnapshot.key;
          
          // Combine date and time to create full datetime for comparison
          const classDateTime = new Date(`${classData.date}T${classData.startTime}`);
          
          if (classDateTime >= currentDateTime) {
            upcomingClasses.push(classData);
          } else {
            pastClasses.push(classData);
          }
        });

        // Sort upcoming classes by date (soonest first)
        upcomingClasses.sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
        
        // Sort past classes by date (most recent first)
        pastClasses.sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));

        // Display upcoming classes
        if (upcomingClasses.length === 0) {
          classContainer.innerHTML = '<div class="no-classes">No upcoming classes scheduled</div>';
        } else {
          upcomingClasses.forEach(classItem => {
            const classCard = createClassCard(classItem, 'upcoming');
            classContainer.appendChild(classCard);
          });
        }

        // Display past classes
        if (pastClasses.length === 0) {
          pastClassContainer.innerHTML = '<div class="no-classes">No past classes found</div>';
        } else {
          pastClasses.forEach(classItem => {
            const classCard = createClassCard(classItem, 'past');
            pastClassContainer.appendChild(classCard);
          });
        }
      } else {
        classContainer.innerHTML = '<div class="no-classes">No classes scheduled yet</div>';
        pastClassContainer.innerHTML = '<div class="no-classes">No past classes found</div>';
      }

      loadingElement.style.display = 'none';
    });

  } catch (error) {
    console.error('Error loading classes:', error);
    showToast('Error loading classes', 'error');
    loadingElement.style.display = 'none';
  }
}

function createClassCard(classItem, type) {
  const card = document.createElement('div');
  card.className = `class-card ${type}`;
  
  const statusBadge = type === 'upcoming' ? 
    '<span class="status-badge upcoming">Upcoming</span>' : 
    '<span class="status-badge completed">Completed</span>';

  // Format date for display
  const classDate = new Date(classItem.date);
  const formattedDate = classDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time for display
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const notesSection = classItem.notes && classItem.notes !== 'no notes' ? 
    `<div class="class-notes"><strong>Notes:</strong> ${classItem.notes}</div>` : '';

  card.innerHTML = `
    ${statusBadge}
    <h3><i class="fas fa-chalkboard-teacher"></i> ${classItem.title}</h3>
    
    <div class="class-details">
      <div class="class-detail-item">
        <i class="fas fa-book"></i>
        <span><strong>Course:</strong> ${classItem.courseName}</span>
      </div>
      <div class="class-detail-item">
        <i class="fas fa-calendar"></i>
        <span><strong>Date:</strong> ${formattedDate}</span>
      </div>
      <div class="class-detail-item">
        <i class="fas fa-clock"></i>
        <span><strong>Time:</strong> ${formatTime(classItem.startTime)} - ${formatTime(classItem.endTime)}</span>
      </div>
      ${notesSection}
    </div>
    
    <div class="class-actions">
      ${type === 'upcoming' ? 
        `<button class="join-btn" onclick="joinClass('${classItem.joinLink}')">
          <i class="fas fa-video"></i> Join Class
        </button>` : 
        `<button class="join-btn past" onclick="viewClassRecord('${classItem.id}')">
          <i class="fas fa-eye"></i> View Record
        </button>`
      }
      <button class="details-btn" onclick="viewClassDetails('${classItem.id}')">
        <i class="fas fa-info-circle"></i> Details
      </button>
    </div>
  `;
  
  return card;
}

function joinClass(joinLink) {
  if (joinLink && joinLink !== 'no link') {
    window.open(joinLink, '_blank');
  } else {
    showToast('No join link available for this class', 'error');
  }
}

function viewClassRecord(classId) {
  showToast('Viewing class record...', 'success');
  // Implement class record viewing logic here
  console.log('Viewing record for class:', classId);
}

function viewClassDetails(classId) {
  showToast('Opening class details...', 'success');
  // Implement class details viewing logic here
  console.log('Viewing details for class:', classId);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.className = `toast ${type}`, 3000);
}

// Make functions available globally
window.joinClass = joinClass;
window.viewClassRecord = viewClassRecord;
window.viewClassDetails = viewClassDetails;