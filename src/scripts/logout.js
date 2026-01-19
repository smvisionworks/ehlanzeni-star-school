import { auth } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const closeButton = document.querySelector('.close-button');

    const openModal = () => {
        if (logoutModal) logoutModal.style.display = 'flex';
    };

    const closeModal = () => {
        if (logoutModal) logoutModal.style.display = 'none';
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', openModal);
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', closeModal);
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    // Also close modal if clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target == logoutModal) {
            closeModal();
        }
    });

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                // Using a generic toast function placeholder, as each page might have its own
                if (typeof showToast === 'function') {
                    showToast('You have been logged out successfully.', 'success');
                } else {
                    // Fallback for pages without a showToast function
                    alert('You have been logged out successfully.');
                }
                // Redirect to index.html after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1500);
            } catch (error) {
                console.error('Logout error:', error);
                if (typeof showToast === 'function') {
                    showToast('Failed to logout: ' + error.message, 'error');
                } else {
                    alert('Failed to logout: ' + error.message);
                }
            }
        });
    }
});
