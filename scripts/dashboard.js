// Update your imports at the top of the file
import { auth, database } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

console.log("Dashboard JS loaded");

// REMOVE THIS TESTING CODE:
// setTimeout(() => {
//     console.log("TESTING TIMELINE...");
//     updateTimeline("approved");  // <- force change
// }, 2000);

let currentApplicationData = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../landing/login.html';
            return;
        }

        await loadApplicationData(user.uid);
        setupEventListeners();
    });
});

// Replace the existing loadApplicationData function with this real-time version
async function loadApplicationData(uid) {
    try {
        console.log('Loading application data for UID:', uid);
        const applicationRef = ref(database, `application/pending/${uid}`);
        
        // Use onValue for real-time updates instead of get
        onValue(applicationRef, (snapshot) => {
            if (snapshot.exists()) {
                currentApplicationData = snapshot.val();
                console.log('Application data updated:', currentApplicationData);
                populateDashboard(currentApplicationData);
            } else {
                console.log('No application data found for UID:', uid);
                showToast('No application data found. Please submit an application first.', 'error');
                // Redirect to application page after 3 seconds
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

// KEEP ONLY ONE populateDashboard FUNCTION - REMOVE THE DUPLICATE:
function populateDashboard(data) {
    console.log('Populating dashboard with data:', data);
    
    // Update user info
    document.getElementById('student-name').textContent = `${data.firstName} ${data.lastName}`;
    document.getElementById('student-code').textContent = `Code: ${data.studentCode}`;
    
    // Update status
    updateStatusDisplay(data.status);
    
    // Update timeline based on status - PASS THE DATA PARAMETER
    updateTimeline(data.status, data);
    
    // Populate forms
    populateForm('profile', data);
    populateForm('education', data);
    populateForm('guardian', data.guardian);
    
    // Update submission date
    if (data.applicationDate) {
        const submissionDate = new Date(data.applicationDate).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('submission-date').textContent = `Date: ${submissionDate}`;
    } else {
        document.getElementById('submission-date').textContent = 'Date: Not available';
    }
}

// FIX THE updateStatusDisplay FUNCTION TO PASS DATA TO updateTimeline:
function updateStatusDisplay(status) {
    const statusElement = document.getElementById('application-status');
    const statusBadge = document.getElementById('status-badge');
    const statusTitle = document.getElementById('status-title');

    if (!statusElement || !statusBadge || !statusTitle) {
        console.error('Status elements not found');
        return;
    }

    statusElement.textContent = `Status: ${status}`;
    statusElement.className = `status-${status.toLowerCase()}`;
    statusBadge.textContent = status;
    statusBadge.className = `status-badge ${status.toLowerCase()}`;

    switch (status.toLowerCase()) {
        case 'approved':
            statusTitle.textContent = 'Application Approved';
            break;
        case 'rejected':
            statusTitle.textContent = 'Application Rejected';
            break;
        case 'pending':
        default:
            statusTitle.textContent = 'Application Under Review';
            break;
    }

    // Update timeline with current data
    updateTimeline(status, currentApplicationData);
}

// Enhanced updateTimeline function with date handling
// Enhanced updateTimeline function with payment status handling
function updateTimeline(status, data) {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    // Reset all timeline items
    timelineItems.forEach(item => {
        item.classList.remove('completed', 'current', 'pending');
        item.classList.add('pending');
    });

    // Always mark Step 1 as completed (Application Submitted)
    timelineItems[0].classList.remove('pending');
    timelineItems[0].classList.add('completed');

    // Update submission date in timeline
    if (data && data.applicationDate) {
        const submissionDate = new Date(data.applicationDate).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timelineDateElement = document.getElementById('submission-date-timeline');
        if (timelineDateElement) {
            timelineDateElement.textContent = `Date: ${submissionDate}`;
        }
    }

    // Check if payment is approved
    const isPaymentApproved = data && data.payment && data.payment.registrationFee === 'paid';

    if (status === 'pending') {
        // Step 2: Admin Review is current
        timelineItems[1].classList.remove('pending');
        timelineItems[1].classList.add('current');
        // Steps 3 & 4 remain pending
    } else if (status === 'approved') {
        // Step 2: Admin Review is completed
        timelineItems[1].classList.remove('pending');
        timelineItems[1].classList.add('completed');
        
        // Update the status text for approved applications
        const adminReviewStatus = document.getElementById('admin-review-status');
        if (adminReviewStatus) {
            adminReviewStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
            adminReviewStatus.className = 'text-green-500 text-sm font-medium flex items-center space-x-1';
        }
        
        // Show approval date if available
        if (data && data.approvedDate) {
            const approvedDate = new Date(data.approvedDate).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const adminReviewDateElement = document.getElementById('admin-review-date');
            if (adminReviewDateElement) {
                adminReviewDateElement.textContent = `Approved on: ${approvedDate}`;
            }
        }

        if (isPaymentApproved) {
            // Payment is approved - mark both Step 3 and Step 4 as completed
            timelineItems[2].classList.remove('pending');
            timelineItems[2].classList.add('completed');
            timelineItems[3].classList.remove('pending');
            timelineItems[3].classList.add('completed');
            
            // Update Payment Verification status
            const paymentStatusElement = timelineItems[2].querySelector('.text-gray-400');
            if (paymentStatusElement) {
                paymentStatusElement.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
                paymentStatusElement.className = 'text-green-500 text-sm font-medium flex items-center space-x-1';
            }
            
            // Update Approval & Enrollment status
            const enrollmentStatusElement = timelineItems[3].querySelector('.text-gray-400');
            if (enrollmentStatusElement) {
                enrollmentStatusElement.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
                enrollmentStatusElement.className = 'text-green-500 text-sm font-medium flex items-center space-x-1';
            }
            
            // Show payment date if available
            if (data.payment.registrationFeeDate) {
                const paymentDate = new Date(data.payment.registrationFeeDate).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const paymentDateElement = document.createElement('p');
                paymentDateElement.className = 'text-sm text-gray-500 mt-1';
                paymentDateElement.textContent = `Paid on: ${paymentDate}`;
                
                const paymentStepContent = timelineItems[2].querySelector('.flex-1');
                if (paymentStepContent && !paymentStepContent.querySelector('.text-sm.text-gray-500.mt-1:last-child')) {
                    paymentStepContent.appendChild(paymentDateElement);
                }
            }
        } else {
            // Payment not approved yet - Step 3 is current, Step 4 remains pending
            timelineItems[2].classList.remove('pending');
            timelineItems[2].classList.add('current');
        }
    } else if (status === 'rejected') {
        // For rejected applications, mark Admin Review as completed but show rejection
        timelineItems[1].classList.remove('pending');
        timelineItems[1].classList.add('completed');
        
        const adminReviewStatus = document.getElementById('admin-review-status');
        if (adminReviewStatus) {
            adminReviewStatus.innerHTML = '<i class="fas fa-times-circle"></i><span>Completed</span>';
            adminReviewStatus.className = 'text-red-500 text-sm font-medium flex items-center space-x-1';
        }
        
        // Show rejection date if available
        if (data && data.rejectedDate) {
            const rejectedDate = new Date(data.rejectedDate).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const adminReviewDateElement = document.getElementById('admin-review-date');
            if (adminReviewDateElement) {
                adminReviewDateElement.textContent = `Rejected on: ${rejectedDate}`;
            }
        }
    }
}

function populateForm(formType, data) {
    const form = document.getElementById(`${formType}-form`);
    if (!form) {
        console.log(`Form ${formType}-form not found`);
        return;
    }

    const fields = form.querySelectorAll('input, select, textarea');
    console.log(`Populating ${formType} form with ${fields.length} fields`);
    
    fields.forEach(field => {
        const fieldId = field.id.replace('edit-', '');
        let value = '';

        try {
            if (formType === 'guardian') {
                // Handle guardian fields
                if (data && fieldId in data) {
                    value = data[fieldId] || '';
                }
            } else if (formType === 'profile') {
                // Handle profile fields - check both root and address
                if (fieldId in data) {
                    value = data[fieldId] || '';
                } else if (data.address && fieldId in data.address) {
                    value = data.address[fieldId] || '';
                } else if (fieldId === 'addressLine1' && data.address) {
                    value = data.address.line1 || '';
                } else if (fieldId === 'addressLine2' && data.address) {
                    value = data.address.line2 || '';
                }
            } else {
                // Handle education fields
                if (data && fieldId in data) {
                    value = data[fieldId] || '';
                }
            }

            if (field.type === 'select-one') {
                field.value = value;
                // Trigger change event for select elements
                field.dispatchEvent(new Event('change'));
            } else {
                field.value = value;
            }
            
            console.log(`Set field ${fieldId} to:`, value);
        } catch (error) {
            console.error(`Error setting field ${fieldId}:`, error);
        }
    });
}


function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            
            // Update active tab
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('bg-blue-600', 'text-white');
                nav.classList.add('text-gray-300', 'hover:bg-gray-700/50', 'hover:text-white');
            });
            
            item.classList.remove('text-gray-300', 'hover:bg-gray-700/50', 'hover:text-white');
            item.classList.add('bg-blue-600', 'text-white');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab content
            const tabElement = document.getElementById(`${tab}-tab`);
            if (tabElement) {
                tabElement.classList.add('active');
            }
        });
    });

    // Form submissions
    const profileForm = document.getElementById('profile-form');
    const educationForm = document.getElementById('education-form');
    const guardianForm = document.getElementById('guardian-form');

    if (profileForm) {
        profileForm.addEventListener('submit', (e) => handleFormSubmit(e, 'profile'));
    }
    if (educationForm) {
        educationForm.addEventListener('submit', (e) => handleFormSubmit(e, 'education'));
    }
    if (guardianForm) {
        guardianForm.addEventListener('submit', (e) => handleFormSubmit(e, 'guardian'));
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}


async function handleFormSubmit(e, formType) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.save-btn');
    
    if (!submitBtn) {
        console.error('Save button not found');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>';

    try {
        const updates = {};
        const fields = form.querySelectorAll('input, select, textarea');
        
        console.log(`Processing ${formType} form submission with ${fields.length} fields`);
        
        fields.forEach(field => {
            const fieldName = field.id.replace('edit-', '');
            const value = field.value;

            if (formType === 'guardian') {
                // Update guardian fields
                updates[`guardian/${fieldName}`] = value;
            } else if (formType === 'profile') {
                // Update profile fields - handle address separately
                if (['addressLine1', 'addressLine2', 'city', 'province', 'postalCode', 'country'].includes(fieldName)) {
                    const addressFieldMap = {
                        'addressLine1': 'line1',
                        'addressLine2': 'line2',
                        'city': 'city',
                        'province': 'province',
                        'postalCode': 'postalCode',
                        'country': 'country'
                    };
                    const dbFieldName = addressFieldMap[fieldName] || fieldName;
                    updates[`address/${dbFieldName}`] = value;
                } else {
                    updates[fieldName] = value;
                }
            } else {
                // Update education fields
                updates[fieldName] = value;
            }
        });

        updates.lastUpdated = new Date().toISOString();

        console.log('Updates to be applied:', updates);

        // Update in database
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const applicationRef = ref(database, `application/pending/${user.uid}`);
        await update(applicationRef, updates);

        // Update local data
        Object.keys(updates).forEach(key => {
            const keys = key.split('/');
            if (keys.length === 1) {
                currentApplicationData[keys[0]] = updates[key];
            } else if (keys.length === 2) {
                if (!currentApplicationData[keys[0]]) {
                    currentApplicationData[keys[0]] = {};
                }
                currentApplicationData[keys[0]][keys[1]] = updates[key];
            }
        });

        showToast('Changes saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving changes:', error);
        showToast('Error saving changes: ' + error.message, 'error');
    } finally {
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
export { loadApplicationData, populateDashboard, handleFormSubmit, updateTimeline };