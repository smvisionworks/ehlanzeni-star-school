// Update your imports at the top of the file
import { auth, database } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

console.log("Dashboard JS loaded");

let currentApplicationData = null;
let currentUid = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../landing/login.html';
            return;
        }
        
        currentUid = user.uid;
        await loadApplicationData(user.uid);
        setupEventListeners();
        setupTabNavigation();
    });
});

// Sidebar toggle logic — put into ../scripts/dashboard.js or inline before </body>
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const navItems = document.querySelectorAll('.nav-item');

  if (!sidebar || !toggleBtn || !overlay) return;

  const openSidebar = () => {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    document.documentElement.classList.add('no-scroll');
    sidebar.setAttribute('aria-hidden', 'false');
  };

  const closeSidebar = () => {
    // keep it visible on md+ via md:translate-x-0; here we apply the hidden transform for mobile
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.documentElement.classList.remove('no-scroll');
    sidebar.setAttribute('aria-hidden', 'true');
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains('-translate-x-full')) openSidebar();
    else closeSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  // When a nav item is clicked on small screens, close the sidebar so user sees content
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });

  // Keep behaviour consistent on resize: sidebar open on md+, closed on small.
  const handleResize = () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove('-translate-x-full'); // show on desktop/tablet
      overlay.classList.add('hidden');
      document.documentElement.classList.remove('no-scroll');
      sidebar.setAttribute('aria-hidden', 'false');
    } else {
      // hide by default on small devices
      sidebar.classList.add('-translate-x-full');
      sidebar.setAttribute('aria-hidden', 'true');
    }
  };

  window.addEventListener('resize', handleResize);

  // initial state
  handleResize();
});
    

async function loadApplicationData(uid) {
    try {
        console.log('Loading application data for UID:', uid);
        const applicationRef = ref(database, `application/pending/${uid}`);
        
        // Use onValue for real-time updates
        onValue(applicationRef, (snapshot) => {
            if (snapshot.exists()) {
                currentApplicationData = snapshot.val();
                console.log('Application data loaded:', currentApplicationData);
                populateDashboard(currentApplicationData);
            } else {
                console.log('No application data found for UID:', uid);
                showToast('No application data found. Please submit an application first.', 'error');
                setTimeout(() => {
                    window.location.href = 'apply.html';
                }, 3000);
            }
        }, (error) => {
            console.error('Error loading application data:', error);
            showToast('Error loading application data: ' + error.message, 'error');
        });
        
    } catch (error) {
        console.error('Error setting up application listener:', error);
        showToast('Error loading application data: ' + error.message, 'error');
    }
}

function populateDashboard(data) {
    console.log('Populating dashboard with data:', data);
    
    if (!data) return;
    
    // Update header info
    document.getElementById('student-name').textContent = `${data.firstName || ''} ${data.lastName || ''}`;
    document.getElementById('student-code').innerHTML = `<i class="fas fa-id-card text-accent"></i><span>Code: ${data.studentCode || 'N/A'}</span>`;
    
    // Update status display
    updateStatusDisplay(data.status || 'pending');
    
    // Update timeline
    updateTimeline(data.status || 'pending', data);

     populateDeclarationInfo(data);
    
    // Update submission date
    if (data.applicationDate) {
        const submissionDate = new Date(data.applicationDate).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('submission-date').textContent = submissionDate;
    }
    
    // Populate all forms with data
    populateForms(data);
}

function updateStatusDisplay(status) {
    const statusElement = document.getElementById('application-status');
    const statusBadge = document.getElementById('status-badge');
    const statusTitle = document.getElementById('status-title');
    
    if (!statusElement || !statusBadge || !statusTitle) return;
    
    // Clear and set classes
    statusElement.className = `status-${status.toLowerCase()} status-badge inline-flex items-center space-x-2`;
    statusBadge.className = `status-badge ${status.toLowerCase()} text-lg px-6 py-2`;
    
    // Set text content
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.innerHTML = `<i class="fas fa-clock"></i><span>${statusText}</span>`;
    statusBadge.textContent = statusText;
    
    // Set status title
    switch(status.toLowerCase()) {
        case 'approved':
            statusTitle.textContent = 'Application Approved';
            statusTitle.nextElementSibling.textContent = 'Your application has been approved!';
            break;
        case 'rejected':
            statusTitle.textContent = 'Application Rejected';
            statusTitle.nextElementSibling.textContent = 'Your application has been rejected.';
            break;
        default:
            statusTitle.textContent = 'Application Under Review';
            statusTitle.nextElementSibling.textContent = "We're currently reviewing your application";
    }
}

function updateTimeline(status, data) {
    const timelineItems = document.querySelectorAll('.timeline-item');
    const adminReviewStatus = document.getElementById('admin-review-status');
    const paymentStatus = document.getElementById('payment-status');
    const enrollmentStatus = document.getElementById('enrollment-status');
    const adminReviewDate = document.getElementById('admin-review-date');
    
    // Reset all
    timelineItems.forEach(item => {
        item.classList.remove('completed', 'current', 'pending');
        item.classList.add('pending');
    });
    
    // Step 1: Always completed (Application Submitted)
    timelineItems[0].classList.remove('pending');
    timelineItems[0].classList.add('completed');
    
    // Update submission date in timeline
    if (data && data.applicationDate) {
        const submissionDate = new Date(data.applicationDate).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('submission-date-timeline').textContent = `Date: ${submissionDate}`;
    }
    
    // Handle different statuses
    if (status === 'pending') {
        timelineItems[1].classList.remove('pending');
        timelineItems[1].classList.add('current');
        
        if (adminReviewStatus) {
            adminReviewStatus.innerHTML = '<i class="fas fa-sync-alt animate-spin"></i><span>In Progress</span>';
            adminReviewStatus.className = 'text-blue-500 text-sm font-medium flex items-center space-x-1';
        }
    } 
    else if (status === 'approved') {
        timelineItems[1].classList.remove('pending');
        timelineItems[1].classList.add('completed');
        
        if (adminReviewStatus) {
            adminReviewStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
            adminReviewStatus.className = 'text-green-500 text-sm font-medium flex items-center space-x-1';
        }
        
        // Show approval date
        if (data && data.approvedDate) {
            const approvedDate = new Date(data.approvedDate).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            adminReviewDate.textContent = `Approved on: ${approvedDate}`;
        }
        
        // Check payment status
        const isPaymentApproved = data && data.payment && data.payment.registrationFee === 'paid';
        
        if (isPaymentApproved) {
            timelineItems[2].classList.remove('pending');
            timelineItems[2].classList.add('completed');
            
            if (paymentStatus) {
                paymentStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
                paymentStatus.className = 'text-green-500 text-sm font-medium flex items-center space-x-1';
            }
            
            // Show payment date
            if (data.payment.registrationFeeDate) {
                const paymentDate = new Date(data.payment.registrationFeeDate).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const paymentStep = timelineItems[2].querySelector('.flex-1');
                if (paymentStep) {
                    const existingDate = paymentStep.querySelector('.payment-date');
                    if (existingDate) existingDate.remove();
                    
                    const dateElement = document.createElement('p');
                    dateElement.className = 'text-sm text-gray-500 mt-1 payment-date';
                    dateElement.textContent = `Paid on: ${paymentDate}`;
                    paymentStep.appendChild(dateElement);
                }
            }
            
            timelineItems[3].classList.remove('pending');
            timelineItems[3].classList.add('completed');
            
            if (enrollmentStatus) {
                enrollmentStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
                enrollmentStatus.className = 'text-green-500 text-sm font-medium flex items-center space-x-1';
            }
        } else {
            timelineItems[2].classList.remove('pending');
            timelineItems[2].classList.add('current');
        }
    }
}

function populateForms(data) {
    // Profile Form
    document.getElementById('edit-firstName').value = data.firstName || '';
    document.getElementById('edit-lastName').value = data.lastName || '';
    document.getElementById('edit-idNumber').value = data.idNumber || '';
    document.getElementById('edit-race').value = data.race || '';
    document.getElementById('edit-email').value = data.email || '';
    document.getElementById('edit-phone').value = data.phone || '';
    
    // Address fields
    if (data.address) {
        document.getElementById('edit-addressLine1').value = data.address.line1 || '';
        document.getElementById('edit-addressLine2').value = data.address.line2 || '';
        document.getElementById('edit-city').value = data.address.city || '';
        document.getElementById('edit-province').value = data.address.province || '';
        document.getElementById('edit-postalCode').value = data.address.postalCode || '';
        document.getElementById('edit-country').value = data.address.country || 'South Africa';
    }
    
    // Education Form
    document.getElementById('edit-highestGrade').value = data.highestGrade || '';
    document.getElementById('edit-attendanceType').value = data.attendanceType || '';
    
    // Subjects - convert array to newline separated string
    if (data.subjects && Array.isArray(data.subjects)) {
        document.getElementById('edit-subjects').value = data.subjects.join('\n');
    }
    
    // Guardian Form
    if (data.guardian) {
        document.getElementById('edit-guardianFirstName').value = data.guardian.firstName || '';
        document.getElementById('edit-guardianLastName').value = data.guardian.lastName || '';
        document.getElementById('edit-guardianIdNumber').value = data.guardian.idNumber || '';
        document.getElementById('edit-guardianRace').value = data.guardian.race || '';
        document.getElementById('edit-guardianEmail').value = data.guardian.email || '';
        document.getElementById('edit-guardianPhone').value = data.guardian.phone || '';
        document.getElementById('edit-guardianEmploymentStatus').value = data.guardian.employmentStatus || '';
        
        // Note: These fields don't exist in your data structure
        // document.getElementById('edit-guardianWorkplace').value = data.guardian.workplace || '';
        // document.getElementById('edit-guardianWorkPhone').value = data.guardian.workPhone || '';
        // document.getElementById('edit-guardianWorkEmail').value = data.guardian.workEmail || '';
    }
    
    // Update payment info if available
    if (data.payment) {
        const paymentSection = document.createElement('div');
        paymentSection.className = 'mt-6 p-4 bg-blue-50 rounded-lg';
        paymentSection.innerHTML = `
            <h4 class="font-semibold text-blue-800 mb-2">Payment Information</h4>
            <p class="text-sm text-blue-600">Registration Fee: <span class="font-medium">${data.payment.registrationFee || 'Not Paid'}</span></p>
            ${data.payment.registrationFeeDate ? 
                `<p class="text-sm text-blue-600">Paid on: ${new Date(data.payment.registrationFeeDate).toLocaleDateString()}</p>` : ''}
            ${data.payment.approvedBy ? 
                `<p class="text-sm text-blue-600">Approved by: ${data.payment.approvedBy}</p>` : ''}
        `;
        
        const statusTab = document.getElementById('status-tab');
        const existingPaymentInfo = statusTab.querySelector('.payment-info');
        if (existingPaymentInfo) existingPaymentInfo.remove();
        
        paymentSection.classList.add('payment-info');
        statusTab.querySelector('.grid').before(paymentSection);
    }
    
    // Update monthly payment info if available
    if (data.monthlyPayment) {
        const monthlyPaymentSection = document.createElement('div');
        monthlyPaymentSection.className = 'mt-4 p-4 bg-green-50 rounded-lg';
        monthlyPaymentSection.innerHTML = `
            <h4 class="font-semibold text-green-800 mb-2">Monthly Payment (${data.monthlyPayment.month || 'N/A'})</h4>
            <p class="text-sm text-green-600">Status: <span class="font-medium">${data.monthlyPayment.status || 'Pending'}</span></p>
            ${data.monthlyPayment.updatedDate ? 
                `<p class="text-sm text-green-600">Updated: ${new Date(data.monthlyPayment.updatedDate).toLocaleDateString()}</p>` : ''}
        `;
        
        const statusTab = document.getElementById('status-tab');
        const existingMonthlyPayment = statusTab.querySelector('.monthly-payment');
        if (existingMonthlyPayment) existingMonthlyPayment.remove();
        
        monthlyPaymentSection.classList.add('monthly-payment');
        const paymentInfo = statusTab.querySelector('.payment-info');
        if (paymentInfo) {
            paymentInfo.after(monthlyPaymentSection);
        } else {
            statusTab.querySelector('.grid').before(monthlyPaymentSection);
        }
    }
}

function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all
            navItems.forEach(nav => {
                nav.classList.remove('bg-blue-600', 'text-white', 'active');
                nav.classList.add('text-gray-300', 'hover:bg-gray-700/50', 'hover:text-white');
            });
            
            // Add active to clicked
            this.classList.remove('text-gray-300', 'hover:bg-gray-700/50', 'hover:text-white');
            this.classList.add('bg-blue-600', 'text-white', 'active');
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            const tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function setupEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => handleFormSubmit(e, 'profile'));
    }
    
    // Education form submission
    const educationForm = document.getElementById('education-form');
    if (educationForm) {
        educationForm.addEventListener('submit', (e) => handleFormSubmit(e, 'education'));
    }
    
    // Guardian form submission
    const guardianForm = document.getElementById('guardian-form');
    if (guardianForm) {
        guardianForm.addEventListener('submit', (e) => handleFormSubmit(e, 'guardian'));
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleFormSubmit(e, formType) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.save-btn');
    
    if (!submitBtn || !currentUid) return;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>';
    
    try {
        const updates = {};
        
        // Collect form data based on form type
        if (formType === 'profile') {
            updates.firstName = document.getElementById('edit-firstName').value;
            updates.lastName = document.getElementById('edit-lastName').value;
            updates.idNumber = document.getElementById('edit-idNumber').value;
            updates.race = document.getElementById('edit-race').value;
            updates.email = document.getElementById('edit-email').value;
            updates.phone = document.getElementById('edit-phone').value;
            
            // Address updates
            updates.address = {
                line1: document.getElementById('edit-addressLine1').value,
                line2: document.getElementById('edit-addressLine2').value,
                city: document.getElementById('edit-city').value,
                province: document.getElementById('edit-province').value,
                postalCode: document.getElementById('edit-postalCode').value,
                country: document.getElementById('edit-country').value
            };
            
        } else if (formType === 'education') {
            updates.highestGrade = document.getElementById('edit-highestGrade').value;
            updates.attendanceType = document.getElementById('edit-attendanceType').value;
            
            // Convert subjects textarea to array
            const subjectsText = document.getElementById('edit-subjects').value;
            updates.subjects = subjectsText.split('\n')
                .map(subject => subject.trim())
                .filter(subject => subject.length > 0);
            
        } else if (formType === 'guardian') {
            updates.guardian = {
                firstName: document.getElementById('edit-guardianFirstName').value,
                lastName: document.getElementById('edit-guardianLastName').value,
                idNumber: document.getElementById('edit-guardianIdNumber').value,
                race: document.getElementById('edit-guardianRace').value,
                email: document.getElementById('edit-guardianEmail').value,
                phone: document.getElementById('edit-guardianPhone').value,
                employmentStatus: document.getElementById('edit-guardianEmploymentStatus').value
                // Add other guardian fields as needed
            };
        }
        
        // Add last updated timestamp
        updates.lastUpdated = new Date().toISOString();
        
        // Update in Firebase
        const applicationRef = ref(database, `application/pending/${currentUid}`);
        await update(applicationRef, updates);
        
        // Update local data
        if (formType === 'profile') {
            Object.assign(currentApplicationData, updates);
        } else if (formType === 'education') {
            Object.assign(currentApplicationData, updates);
        } else if (formType === 'guardian') {
            currentApplicationData.guardian = updates.guardian;
        }
        
        currentApplicationData.lastUpdated = updates.lastUpdated;
        
        showToast('Changes saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving changes:', error);
        showToast('Error saving changes: ' + error.message, 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i><span>Save Changes</span>';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = '../landing/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '../landing/login.html';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

function populateDeclarationInfo(data) {
    if (data.declaration) {
        document.getElementById('declaration-name').textContent = data.declaration.name || 'N/A';
        document.getElementById('declaration-guardian-signature').textContent = data.declaration.guardianSignature || 'N/A';
        document.getElementById('declaration-student-signature').textContent = data.declaration.studentSignature || 'N/A';
        document.getElementById('declaration-date').textContent = data.declaration.date || 'N/A';
        document.getElementById('declaration-location').textContent = data.declaration.signedAt || 'N/A';
    }
}

export { loadApplicationData, populateDashboard, handleFormSubmit, updateTimeline };