import { database } from '../firebase.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let currentAssignment = null;
let currentUser = null;

const $id = (id) => document.getElementById(id);

export function initGradingSystem(user) {
    currentUser = user;
    console.log('[GRADING] Initializing grading system for teacher:', user?.uid);
    setupGradingModal();
}

function setupGradingModal() {
    if (!$id('gradingModal')) {
        const modal = document.createElement('div');
        modal.id = 'gradingModal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="grading-modal-content">
            <div class="modal-header">
              <h2>Grade Submissions - <span id="gradingAssignmentTitle"></span></h2>
              <button class="close-btn" onclick="closeGradingModal()">&times;</button>
            </div>
            <div class="grading-content">
              <div class="assignment-info" id="assignmentInfo"></div>
              <div class="submissions-list" id="submissionsList"></div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // Minimal CSS for modal + scrollable submissions
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(94, 94, 94, 0.6);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                overflow: auto;
                padding: 1rem;
            }
            .modal.show { display: flex; }
            .grading-modal-content {
                background: #fff;
                width: 90%;
                max-width: 1100px;
                max-height: 92vh;
                padding: 20px;
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.18);
            }
          .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-radius: 8px; /* <-- corrected property */
}

            .close-btn { cursor: pointer; font-size: 1.5em; border: none; background: transparent; }
            .submissions-list {
                display: flex;
                flex-direction: column;
                gap: 14px;
                padding-right: 4px;
                overflow-y: auto;
                max-height: calc(90vh - 140px);
            }
            .submission-item {
                background: #f9fbff;
                border: 1px solid #dbeafe;
                border-radius: 12px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.06);
                width: 100%;
            }
            .submission-item:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
            .submission-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .submission-details { font-size: 0.9rem; margin-bottom: 5px; }
            .grading-section input, .grading-section textarea {
                width: 100%;
                padding: 5px;
                border: 1px solid #ccc;
                border-radius: 5px;
                margin-bottom: 5px;
                font-size: 0.9rem;
            }
            .grading-section input.graded, .grading-section textarea.graded { background-color: #e0ffe0; }
            .grading-section button {
                padding: 5px 10px;
                border: none;
                border-radius: 5px;
                background: #1B3A61;
                color: #fff;
                cursor: pointer;
                transition: background 0.2s, transform 0.2s;
            }
            .grading-section button:hover { background: #132945; transform: translateY(-1px); }
        `;
        document.head.appendChild(style);
    }
}

export function openGradingModal(assignment) {
    currentAssignment = assignment;
    const modal = $id('gradingModal');
    const titleSpan = $id('gradingAssignmentTitle');

    if (titleSpan) titleSpan.textContent = assignment.title || 'Assignment';

    const assignmentInfo = $id('assignmentInfo');
    if (assignmentInfo) {
       assignmentInfo.innerHTML = `
  <div class="assignment-meta" style="
        display: flex; 
        gap: 1.2rem; 
        flex-wrap: wrap; 
        font-size: 0.9rem; 
        color: #1f2937; 
        font-weight: 500;
      ">
    <span style="display: inline-block;">
      <strong>Subject:</strong> ${escapeHtml(assignment.courseName || 'Unknown')}
    </span>
    <span style="display: inline-block;">
      <strong>Due Date:</strong> ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Not set'}
    </span>
    <span style="display: inline-block;">
      <strong>Created:</strong> ${assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'Unknown'}
    </span>
  </div>
`;

    }

    if (modal) {
        modal.classList.add('show');
        loadSubmissions(assignment.id);
    }
}

export function closeGradingModal() {
    const modal = $id('gradingModal');
    if (modal) modal.classList.remove('show');
    currentAssignment = null;
}

async function loadSubmissions(assignmentId) {
    const submissionsList = $id('submissionsList');
    if (!submissionsList) return;
    submissionsList.innerHTML = '<div class="loading">Loading submissions...</div>';

    try {
        const submissionsRef = ref(database, `submissions/${assignmentId}`);
        const snapshot = await get(submissionsRef);

        if (!snapshot.exists()) {
            submissionsList.innerHTML = '<div class="no-submissions">No submissions yet</div>';
            return;
        }

        const submissions = snapshot.val();
        displaySubmissions(submissions);
    } catch (err) {
        console.error('[GRADING] Error loading submissions:', err);
        submissionsList.innerHTML = `<div class="error">Error loading submissions: ${err.message}</div>`;
    }
}

function displaySubmissions(submissions) {
    const submissionsList = $id('submissionsList');
    if (!submissionsList) return;

    submissionsList.innerHTML = '';
    Object.entries(submissions).forEach(([studentId, submission]) => {
        const submissionItem = createSubmissionItem(studentId, submission);
        submissionsList.appendChild(submissionItem);
    });
}

function createSubmissionItem(studentId, submission) {
    const item = document.createElement('div');
    item.className = 'submission-item';

    const grade = submission.grade ?? '';
    const status = submission.status || 'submitted';
    const submittedAt = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Unknown';
    const isGraded = status === 'graded';

   item.innerHTML = `
  <div class="submission-grading-card submission-row">

    <!-- STUDENT -->
    <div class="submission-student">
      <div class="submission-avatar">
        ${(submission.studentName || '')[0] || '?'}
      </div>
      <div class="student-name">
        ${escapeHtml(submission.studentName || 'Unknown')}
      </div>
    </div>

    <!-- FILE -->
    <div class="submission-file">
      <i class="fas fa-file"></i>
      <a href="${submission.fileUrl}" target="_blank" download class="file-link">
        ${escapeHtml(submission.fileName || 'File')}
      </a>
    </div>

    <!-- GRADE -->
    <div class="submission-grade">
      <input
        type="number"
        id="grade-${studentId}"
        min="0"
        max="100"
        step="0.1"
        value="${grade}"
        class="grade-input ${status === 'graded' ? 'graded' : ''}"
      />
    </div>

    <!-- FEEDBACK -->
    <div class="submission-feedback">
      <textarea
        id="feedback-${studentId}"
        placeholder="Feedback..."
        class="${status === 'graded' ? 'graded' : ''}"
      >${submission.feedback || ''}</textarea>
    </div>

    <!-- ACTION -->
    <div class="submission-action">
      <button class="save-grade-btn" onclick="saveGrade('${studentId}')">
        ${status === 'graded' ? 'Update' : 'Save'}
      </button>
    </div>

  </div>
`;



    return item;
}

async function saveGrade(studentId) {
    if (!currentAssignment) return;
    const gradeInput = $id(`grade-${studentId}`);
    const feedbackInput = $id(`feedback-${studentId}`);
    if (!gradeInput || !feedbackInput) return;

    const grade = parseFloat(gradeInput.value);
    if (isNaN(grade) || grade < 0 || grade > 100) {
        alert('Please enter a valid grade (0-100)');
        return;
    }

    try {
        const submissionRef = ref(database, `submissions/${currentAssignment.id}/${studentId}`);
        await update(submissionRef, {
            grade,
            feedback: feedbackInput.value.trim(),
            gradedAt: new Date().toISOString(),
            gradedBy: currentUser?.uid || 'teacher',
            status: 'graded'
        });

        gradeInput.classList.add('graded');
        feedbackInput.classList.add('graded');
        loadSubmissions(currentAssignment.id);
    } catch (err) {
        console.error(err);
        alert('Error saving grade');
    }
}

function escapeHtml(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Expose globally
window.openGradingModal = openGradingModal;
window.closeGradingModal = closeGradingModal;
window.saveGrade = saveGrade;
