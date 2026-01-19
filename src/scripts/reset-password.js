// reset-password.js
// Make sure this file is loaded as a module: <script type="module" src="/scripts/reset-password.js"></script>

import { auth } from './firebase.js'; // adjust path if firebase.js lives elsewhere
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';



console.log('✅ reset-password.js loaded');

window.addEventListener('error', e => {
  console.error('🔥 Global error:', e.error);
});


const form = document.getElementById('reset-form');
const emailInput = document.getElementById('reset-email');
const submitBtn = form.querySelector('button[type="submit"]');

function showToast(message, type = 'info') {
  // very small toast implementation; replace with your own if you have one
  const toastEl = document.getElementById('toast');
  if (!toastEl) return alert(message); // fallback
  toastEl.textContent = message;
  toastEl.className = `toast toast-${type}`;
  toastEl.style.opacity = '1';
  setTimeout(() => {
    toastEl.style.opacity = '0';
  }, 3500);
}


const modal = document.getElementById('reset-success-modal');
const modalEmail = document.getElementById('reset-email-display');
const modalBtn = document.getElementById('reset-modal-btn');

function showSuccessModal(email) {
  modalEmail.textContent = email;
  modal.classList.remove('hidden');

  // auto redirect after 5s
  setTimeout(() => {
    window.location.href = '/landing/login.html';
  }, 5000);
}

modalBtn.addEventListener('click', () => {
  window.location.href = '/landing/login.html';
});


form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value?.trim();
  if (!email) {
    showToast('Please enter your email address.', 'error');
    return;
  }

  submitBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Sending...';

  // Optional: set a continue URL where user will land after reset.
  // If you don't need a custom continue URL you can remove actionCodeSettings.


 try {
  await sendPasswordResetEmail(auth, email);

  // Hide form so user clearly sees success state
  form.style.display = 'none';

  showSuccessModal(email);
}
 catch (err) {
    // Friendly messages for common Firebase Auth errors
    console.error('sendPasswordResetEmail error', err);
    const code = err?.code || '';
    if (code === 'auth/user-not-found') {
      showToast('No account found with that email.', 'error');
    } else if (code === 'auth/invalid-email') {
      showToast('Invalid email address.', 'error');
    } else if (code === 'auth/too-many-requests') {
      showToast('Too many requests — try again later.', 'error');
    } else {
      showToast('Failed to send reset email. Try again.', 'error');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});
