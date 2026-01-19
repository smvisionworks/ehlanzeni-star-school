import { auth, database } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
 
  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ---------- CHECK IF TEACHER ----------
    const teacherRef = ref(database, `teachers/${user.uid}`);
    const teacherSnap = await get(teacherRef);

    if (teacherSnap.exists()) {
      // User is a teacher - redirect to teacher dashboard
      console.log('Teacher login - redirecting to teacher dashboard');
      window.location.href = '../teachers/teacherdashboard.html';
      return;
    }

    // ---------- CHECK STUDENT APPLICATION STATUS ----------
    const pendingRef = ref(database, `application/pending/${user.uid}`);
    const pendingSnap = await get(pendingRef);

    if (pendingSnap.exists()) {
      const applicationData = pendingSnap.val();
      console.log('Application data found:', applicationData);
      
      // Check if application is complete (approved AND payment done)
      const isApplicationComplete = applicationData.status === 'approved' && 
                                   applicationData.payment && 
                                   applicationData.payment.registrationFee === 'paid';

      if (isApplicationComplete) {
        // Everything is complete - redirect to verified student dashboard
        console.log('Application complete - redirecting to verified dashboard');
        window.location.href = '../students/studentdashboard.html';
      } else {
        // Application pending or incomplete - redirect to unverified dashboard
        console.log('Application incomplete - redirecting to unverified dashboard');
        window.location.href = '../unverifiedstudents/student-dashboard.html';
      }
      return;
    }

    // ---------- CHECK APPROVED NODE (for legacy data) ----------
    const approvedRef = ref(database, `application/approved/${user.uid}`);
    const approvedSnap = await get(approvedRef);

    if (approvedSnap.exists()) {
      // Legacy approved user - redirect to verified dashboard
      console.log('Legacy approved user - redirecting to verified dashboard');
      window.location.href = '../students/studentdashboard.html';
      return;
    }

    // ---------- NO APPLICATION FOUND ----------
    console.log('No application found for user');
    showToast('No application found for this account.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';

  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed: ' + error.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const icon = type === 'error' ? '<i class="fas fa-times"></i>' : '<i class="fas fa-info-circle"></i>';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-body">
      <span class="toast-title">${type === 'error' ? 'Login Failed' : 'Notice'}</span>
      <span>${message}</span>
    </span>
  `;

  toast.className = 'toast ' + type + ' show';

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4500);
}