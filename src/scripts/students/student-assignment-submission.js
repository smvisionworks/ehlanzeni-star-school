// student-assignment-submission.js - PURE FIREBASE SOLUTION
import { database, auth } from '../firebase.js';
import { ref, get, set, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Initialize Firebase Storage
const storage = getStorage();

const $id = (id) => document.getElementById(id);

let currentStudent = null;
let currentStudentData = null;

/**
 * Initialize the student submission system
 */
export function initStudentSubmissionSystem(student) {
    currentStudent = student;
    currentStudentData = student;
    console.log('[SUBMISSION] Initialized for student:', student.uid);
    
    // Setup modal and event listeners
    setupSubmissionModal();
    setupEventListeners();
}

/* ---------------------------
   Modal Setup
   --------------------------- */

function setupSubmissionModal() {
    // Create modal if it doesn't exist
    if ($id('submissionModal')) return;

    const modal = document.createElement('div');
    modal.id = 'submissionModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header-styled">
                <div class="header-content">
                    <i class="fas fa-paper-plane header-icon"></i>
                    <div>
                        <h2>Submit Assignment</h2>
                        <p class="assignment-title-sub" id="submissionAssignmentTitle"></p>
                    </div>
                </div>
                <button class="close-btn" id="closeSubmissionModalBtn">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="submissionForm">
                    <div class="form-group">
                        <label for="submissionFile">Upload Your Assignment *</label>
                        <div class="file-upload-area" id="submissionFileUploadArea">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Click to upload or drag and drop</p>
                            <span class="file-types">PDF, DOC, DOCX, Images, ZIP, TXT</span>
                            <input type="file" id="submissionFile" 
                                   accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.txt" 
                                   required />
                        </div>
                        <div class="file-info">
                            <span id="submissionFileName">No file chosen</span>
                            <span id="submissionFileSize"></span>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="submissionNotes">Submission Notes (Optional)</label>
                        <textarea id="submissionNotes" 
                                  placeholder="Add any comments about your submission..." 
                                  rows="3"></textarea>
                    </div>
                    
                    <div class="submission-details-card">
                        <div class="card-header">
                            <i class="fas fa-info-circle"></i>
                            <h4>Submission Details</h4>
                        </div>
                        <div class="details-grid">
                            <div class="detail-item">
                                <div class="detail-icon"><i class="fas fa-user"></i></div>
                                <div class="detail-content">
                                    <strong>Student</strong>
                                    <span id="submissionStudentName">Loading...</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-icon"><i class="fas fa-book"></i></div>
                                <div class="detail-content">
                                    <strong>Course</strong>
                                    <span id="submissionCourseName">Loading...</span>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-icon"><i class="fas fa-calendar-alt"></i></div>
                                <div class="detail-content">
                                    <strong>Due Date</strong>
                                    <span id="submissionDueDate">No due date set</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="submissionStatusContainer"></div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelSubmissionBtn">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" id="submitAssignmentBtn">
                            <i class="fas fa-paper-plane"></i> Submit Assignment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup modal event listeners
    setupModalEventListeners();
}

function setupModalEventListeners() {
    // Close modal
    const closeBtn = $id('closeSubmissionModalBtn');
    const cancelBtn = $id('cancelSubmissionBtn');
    
    if (closeBtn) closeBtn.addEventListener('click', closeSubmissionModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeSubmissionModal);
    
    // File upload area
    const fileInput = $id('submissionFile');
    const fileUploadArea = $id('submissionFileUploadArea');
    
    if (fileInput && fileUploadArea) {
        fileUploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const fileNameEl = $id('submissionFileName');
            const fileSizeEl = $id('submissionFileSize');
            
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                fileNameEl.textContent = file.name;
                fileSizeEl.textContent = formatFileSize(file.size);
            } else {
                fileNameEl.textContent = 'No file chosen';
                fileSizeEl.textContent = '';
            }
        });
        
        // Drag and drop with validation
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                const droppedFile = e.dataTransfer.files[0];
                
                // Validate file type
                const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip', '.txt'];
                const fileName = droppedFile.name.toLowerCase();
                const isValidType = allowedExtensions.some(ext => fileName.endsWith(ext));
                
                if (!isValidType) {
                    showToast(`Invalid file type. Please upload: PDF, DOC, DOCX, Images (JPG, PNG), ZIP, or TXT files.`, 'error');
                    return;
                }
                
                // Validate file size (max 10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB in bytes
                if (droppedFile.size > maxSize) {
                    showToast(`File is too large. Maximum size is 10MB.`, 'error');
                    return;
                }
                
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // Form submission
    const form = $id('submissionForm');
    if (form) {
        form.addEventListener('submit', handleAssignmentSubmission);
    }
}

/* ---------------------------
   Event Listeners for Submission Buttons
   --------------------------- */

function setupEventListeners() {
    // Listen for click on submission buttons
    document.addEventListener('click', (e) => {
        const submitBtn = e.target.closest('.submit-assignment-btn');
        if (!submitBtn) return;
        
        const assignmentId = submitBtn.dataset.assignmentId;
        if (assignmentId) {
            openSubmissionModal(assignmentId);
        }
    });
}

/* ---------------------------
   Open Submission Modal
   --------------------------- */

export async function openSubmissionModal(assignmentId) {
    if (!assignmentId || !currentStudent?.uid) {
        showToast('Error: Missing assignment or student data', 'error');
        return;
    }
    
    console.log('[SUBMISSION] Opening modal for assignment:', assignmentId);
    
    try {
        // Fetch assignment details from Firebase
        const assignmentRef = ref(database, `resources/${assignmentId}`);
        const assignmentSnap = await get(assignmentRef);
        
        if (!assignmentSnap.exists()) {
            showToast('Assignment not found in database', 'error');
            return;
        }
        
        const assignment = assignmentSnap.val();
        
        // Update modal UI
        const titleEl = $id('submissionAssignmentTitle');
        const studentNameEl = $id('submissionStudentName');
        const courseNameEl = $id('submissionCourseName');
        const dueDateEl = $id('submissionDueDate');
        
        if (titleEl) titleEl.textContent = assignment.title || 'Assignment';
        if (studentNameEl && currentStudentData) {
            studentNameEl.textContent = `${currentStudentData.firstName || ''} ${currentStudentData.lastName || ''}`.trim();
        }
        if (courseNameEl) {
            courseNameEl.textContent = assignment.courseName || 'Unknown Course';
        }
        if (dueDateEl) {
            const dueDate = assignment.dueDate ? 
                new Date(assignment.dueDate).toLocaleDateString() : 
                'No due date';
            dueDateEl.textContent = dueDate;
        }
        
        // Store assignment data on modal
        const modal = $id('submissionModal');
        if (modal) {
            modal.dataset.assignmentId = assignmentId;
            modal.dataset.courseId = assignment.courseId || '';
            modal.dataset.assignmentTitle = assignment.title || '';
            modal.dataset.courseName = assignment.courseName || '';
            
            // Show modal
            modal.style.display = 'flex';
            
            // Reset form
            const form = $id('submissionForm');
            if (form) form.reset();
            
            const fileNameEl = $id('submissionFileName');
            const fileSizeEl = $id('submissionFileSize');
            if (fileNameEl) fileNameEl.textContent = 'No file chosen';
            if (fileSizeEl) fileSizeEl.textContent = '';
            
            // Check for existing submission
            await checkExistingSubmission(assignmentId);
        }
        
    } catch (error) {
        console.error('[SUBMISSION] Error opening modal:', error);
        showToast('Error loading assignment details', 'error');
    }
}

/* ---------------------------
   Check Existing Submission
   --------------------------- */

async function checkExistingSubmission(assignmentId) {
    if (!assignmentId || !currentStudent?.uid) return;
    
    try {
        const submissionRef = ref(database, `submissions/${assignmentId}/${currentStudent.uid}`);
        const submissionSnap = await get(submissionRef);
        
        const statusContainer = $id('submissionStatusContainer');
        if (!statusContainer) return;
        
        if (submissionSnap.exists()) {
            const submission = submissionSnap.val();
            showSubmissionStatus(submission);
        } else {
            hideSubmissionStatus();
        }
    } catch (error) {
        console.error('[SUBMISSION] Error checking existing submission:', error);
        hideSubmissionStatus();
    }
}

function showSubmissionStatus(submission) {
    const statusContainer = $id('submissionStatusContainer');
    if (!statusContainer) return;
    
    let html = `
        <div class="existing-submission">
            <div class="submission-header">
                <h4><i class="fas fa-history"></i> Existing Submission</h4>
                <span class="status-badge ${submission.status || 'submitted'}">
                    ${submission.status || 'Submitted'}
                </span>
            </div>
            
            <div class="submission-details">
                <p><strong>Submitted:</strong> ${formatDate(submission.submittedAt || submission.createdAt)}</p>
                <p><strong>File:</strong> 
                    <a href="${submission.fileUrl}" target="_blank" class="file-link">
                        <i class="fas fa-download"></i> ${submission.fileName}
                    </a>
                </p>
    `;
    
    if (submission.notes) {
        html += `<p><strong>Your Notes:</strong> ${escapeHtml(submission.notes)}</p>`;
    }
    
    if (submission.grade !== undefined && submission.grade !== null) {
        html += `<p><strong>Grade:</strong> <span class="grade-value">${submission.grade}%</span></p>`;
    }
    
    if (submission.feedback) {
        html += `<p><strong>Feedback:</strong> ${escapeHtml(submission.feedback)}</p>`;
    }
    
    html += `
            </div>
            <div class="submission-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Submitting again will replace your current submission
            </div>
        </div>
    `;
    
    statusContainer.innerHTML = html;
}

function hideSubmissionStatus() {
    const statusContainer = $id('submissionStatusContainer');
    if (statusContainer) {
        statusContainer.innerHTML = '';
    }
}

/* ---------------------------
   Handle Assignment Submission
   --------------------------- */

async function handleAssignmentSubmission(e) {
    e.preventDefault();
    
    const modal = $id('submissionModal');
    const fileInput = $id('submissionFile');
    const notesInput = $id('submissionNotes');
    
    if (!modal || !fileInput) {
        showToast('Submission form not available', 'error');
        return;
    }
    
    const assignmentId = modal.dataset.assignmentId;
    const courseId = modal.dataset.courseId;
    
    if (!assignmentId || !courseId) {
        showToast('Missing assignment information', 'error');
        return;
    }
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select a file to upload', 'error');
        return;
    }
    
    // Get current student info
    const studentId = currentStudent?.uid;
    if (!studentId) {
        showToast('Student information not available. Please log in again.', 'error');
        return;
    }
    
    const btn = $id('submitAssignmentBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }
    
    try {
        const file = fileInput.files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // Validate file
        if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit');
        }
        
        // Create a unique filename to avoid collisions
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const safeFileName = `${timestamp}_${studentId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        
        // Define storage path
        const storagePath = `submissions/${assignmentId}/${studentId}/${safeFileName}`;
        const fileRef = storageRef(storage, storagePath);
        
        console.log('[SUBMISSION] Uploading to:', storagePath);
        
        // Upload file to Firebase Storage
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        
        // Get assignment details for reference
        const assignmentRef = ref(database, `resources/${assignmentId}`);
        const assignmentSnap = await get(assignmentRef);
        const assignment = assignmentSnap.exists() ? assignmentSnap.val() : {};
        
        // Create submission object
        const submissionId = push(ref(database, 'submissions')).key;
        const submissionData = {
            id: submissionId,
            assignmentId: assignmentId,
            assignmentTitle: assignment.title || 'Assignment',
            courseId: courseId,
            courseName: assignment.courseName || '',
            studentId: studentId,
            studentName: currentStudentData?.displayName || 
                       `${currentStudentData?.firstName || ''} ${currentStudentData?.lastName || ''}`.trim(),
            studentEmail: currentStudentData?.email || '',
            fileName: file.name,
            fileUrl: downloadUrl,
            fileSize: file.size,
            fileType: file.type,
            storagePath: storagePath,
            notes: notesInput?.value?.trim() || '',
            status: 'submitted',
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Grading fields (will be filled by teacher)
            grade: null,
            gradedAt: null,
            feedback: '',
            gradedBy: null,
            gradedByName: ''
        };
        
        // Save to Firebase Database
        const submissionRef = ref(database, `submissions/${assignmentId}/${studentId}`);
        await set(submissionRef, submissionData);
        
        console.log('[SUBMISSION] Successfully saved to database');
        
        // Show success message
        showToast('Assignment submitted successfully!', 'success');
        
        // Close modal after delay
        setTimeout(() => {
            closeSubmissionModal();
            // Optional: Refresh the page or update UI
            if (typeof window.updateAssignmentStatus === 'function') {
                window.updateAssignmentStatus(assignmentId);
            }
        }, 1500);
        
    } catch (error) {
        console.error('[SUBMISSION] Error:', error);
        showToast(`Submission failed: ${error.message}`, 'error');
        
        // Re-enable button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment';
        }
    }
}

/* ---------------------------
   Close Submission Modal
   --------------------------- */

export function closeSubmissionModal() {
    const modal = $id('submissionModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    
    // Clear modal data
    delete modal.dataset.assignmentId;
    delete modal.dataset.courseId;
    
    // Reset form
    const form = $id('submissionForm');
    if (form) form.reset();
    
    // Clear file info
    const fileNameEl = $id('submissionFileName');
    const fileSizeEl = $id('submissionFileSize');
    if (fileNameEl) fileNameEl.textContent = 'No file chosen';
    if (fileSizeEl) fileSizeEl.textContent = '';
    
    // Clear status
    hideSubmissionStatus();
}

/* ---------------------------
   Utility Functions
   --------------------------- */

function formatFileSize(bytes) {
    if (!bytes) return '0 bytes';
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('submissionToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'submissionToast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            border-radius: 8px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(10px);
            border-left: 4px solid rgba(255, 255, 255, 0.5);
            color: white;
            font-weight: 500;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
    }
    
    const icon = type === 'success' 
        ? '<i class="fas fa-check-circle"></i>' 
        : '<i class="fas fa-exclamation-triangle"></i>';
    const title = type === 'success' ? 'Success' : 'Error';
    const borderColor = type === 'success' ? '#4CAF50' : '#f44336';
    
    toast.innerHTML = `
        <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: ${borderColor}; flex-shrink: 0;">
            ${icon}
        </span>
        <span style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-weight: 600; font-size: 14px;">${title}</span>
            <span style="font-size: 13px; opacity: 0.9;">${message}</span>
        </span>
    `;
    toast.style.borderLeftColor = borderColor;
    toast.style.opacity = '1';
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 4000);
}

/* ---------------------------
   Global Functions (for HTML onclick)
   --------------------------- */

window.openSubmissionModal = openSubmissionModal;
window.closeSubmissionModal = closeSubmissionModal;

// Export for module use
export default {
    initStudentSubmissionSystem,
    openSubmissionModal,
    closeSubmissionModal
};