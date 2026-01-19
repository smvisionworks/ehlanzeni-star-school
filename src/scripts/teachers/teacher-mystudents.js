// /scripts/teacher-mystudents.js
// ES module. Assumes /scripts/firebase.js exports `auth` and `database` (as provided).

import { auth, database } from '/src/scripts/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const teacherNameEl = document.getElementById('teacherName');
const classContainer = document.getElementById('classContainer');
const loadingEl = document.getElementById('loading');
const toastEl = document.getElementById('toast');

// create subject select and place above classContainer
const subjectWrapper = document.createElement('div');
subjectWrapper.className = 'subject-filter-wrapper';
subjectWrapper.innerHTML = `
  <label for="subjectFilter" class="sr-only">Filter by subject</label>
  <select id="subjectFilter" class="subject-filter">
    <option value="__all">All subjects</option>
  </select>
`;
const mainContent = document.querySelector('.main-content');
const nextNode = document.getElementById('classContainer');
mainContent.insertBefore(subjectWrapper, nextNode);

// DOM references
const subjectSelect = document.getElementById('subjectFilter');

function showToast(message, isError = false, timeout = 3500) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (isError) toastEl.classList.add('error');
    setTimeout(() => {
        toastEl.classList.remove('show', 'error');
    }, timeout);
}

function setLoading(visible, text = 'Loading classes...') {
    loadingEl.style.display = visible ? 'block' : 'none';
    loadingEl.textContent = text;
}

function clearContainer() {
    classContainer.innerHTML = '';
}

function makeStudentCard(student, teacherSubjectsForStudent) {
    const card = document.createElement('div');
    card.className = 'student-card';

    const subjectsHtml = (teacherSubjectsForStudent && teacherSubjectsForStudent.length)
        ? teacherSubjectsForStudent.map(s => `<span class="chip">${s}</span>`).join(' ')
        : '<span class="chip">—</span>';

    const guardian = student.guardian || {};
    const phone = student.phone || '—';
    const guardianName = guardian.firstName ? `${guardian.firstName} ${guardian.lastName || ''}`.trim() : (guardian.name || '—');

    card.innerHTML = `
    <div class="student-card-left">
      <div class="student-avatar">${(student.firstName || 'S').charAt(0).toUpperCase()}</div>
      <div class="student-main">
        <h3 class="student-name">${student.firstName || 'Unknown'} ${student.lastName || ''}</h3>
        <div class="meta-row">
          <small class="muted">Grade: ${student.highestGrade || '—'}</small>
          <small class="muted">Code: ${student.studentCode || '—'}</small>
        </div>
        <div class="meta-row">
          <small>Phone: <a href="tel:${phone}">${phone}</a></small>
          <small>Email: ${student.email || '—'}</small>
        </div>
      </div>
    </div>

    <div class="student-card-right">
      <div class="section">
        <div class="section-title">Subjects </div>
        <div class="subject-chips">${subjectsHtml}</div>
      </div>
    </div>  
  `;

    return card;
}

async function loadForTeacher(teacherId) {
    setLoading(true, 'Loading teacher and students...');
    clearContainer();
    try {
        // get teacher profile
        const teacherSnap = await get(ref(database, `teachers/${teacherId}`));
        if (!teacherSnap.exists()) {
            showToast('Teacher profile not found for this user.', true);
            setLoading(false);
            return;
        }
        const teacher = teacherSnap.val();
        const teacherDisplayName = (teacher.personalInfo && `${teacher.personalInfo.firstName || ''} ${teacher.personalInfo.lastName || ''}`).trim() || (teacher.teacherName || 'Teacher');
        teacherNameEl.textContent = teacherDisplayName;

        // find teacher subjects from teachingInfo (fallback to empty array)
        const teacherSubjects = (teacher.teachingInfo && teacher.teachingInfo.subjects) ? teacher.teachingInfo.subjects : [];
        // populate subject select
        subjectSelect.innerHTML = `<option value="__all">All subjects</option>` + teacherSubjects.map(s => `<option value="${s}">${s}</option>`).join('');
        subjectSelect.onchange = () => renderStudentsForTeacher(teacherId);

        // load student-teachers mapping
        const stSnap = await get(ref(database, `student_teachers`));
        const stVal = stSnap.exists() ? stSnap.val() : {};
        // find student IDs that have this teacher
        const associatedStudents = []; // { studentId, teacherSubjectsForStudent }

        for (const [studentId, teachersObj] of Object.entries(stVal)) {
            if (teachersObj && Object.prototype.hasOwnProperty.call(teachersObj, teacherId)) {
                const info = teachersObj[teacherId] || {};
                const subjectsForStudent = info.subjects || [];
                associatedStudents.push({ studentId, subjectsForStudent });
            }
        }

        // store list on window for quick filtering & to avoid re-reading student_teachers repeatedly
        window.__teacherStudentList = {
            teacherId,
            teacherSubjects,
            associatedStudents
        };

        // now render initial list
        await renderStudentsForTeacher(teacherId);
    } catch (err) {
        console.error(err);
        showToast('Error loading students. See console.', true);
    } finally {
        setLoading(false);
    }
}

async function renderStudentsForTeacher(teacherId) {
    setLoading(true, 'Loading students...');
    clearContainer();

    const state = window.__teacherStudentList;
    if (!state || state.teacherId !== teacherId) {
        setLoading(false);
        return;
    }
    const { associatedStudents } = state;
    const selectedSubject = subjectSelect.value || '__all';

    // Normalize teacher subjects for comparison
    const teacherSubjectsNorm = (state.teacherSubjects || []).map(s => String(s).trim().toLowerCase());
    const selectedSubjectNorm = selectedSubject !== '__all' ? selectedSubject.trim().toLowerCase() : '__all';

    // Fetch all student profiles and derive their actual subjects first
    const promises = associatedStudents.map(async ({ studentId, subjectsForStudent }) => {
        // try application/pending first
        const appSnap = await get(ref(database, `application/pending/${studentId}`));
        const studentProfile = appSnap.exists() ? appSnap.val() : { firstName: 'Unknown', lastName: '', phone: '', guardian: {} };
        
        // Derive actual subjects by intersecting teacher subjects with student subjects
        let derivedSubjects = subjectsForStudent || [];
        
        // If mapping is incomplete or empty, derive from student's actual subjects
        if (studentProfile.subjects && Array.isArray(studentProfile.subjects)) {
            const studentSubjectsNorm = studentProfile.subjects.map(s => String(s).trim().toLowerCase());
            const overlapNorm = teacherSubjectsNorm.filter(tSub => studentSubjectsNorm.includes(tSub));
            
            // Map back to original casing from student or teacher list
            const actualOverlap = overlapNorm.map(norm => {
                const studentMatch = studentProfile.subjects.find(s => String(s).trim().toLowerCase() === norm);
                const teacherMatch = state.teacherSubjects.find(s => String(s).trim().toLowerCase() === norm);
                return studentMatch || teacherMatch || norm;
            });
            
            // Use the derived subjects if they're more complete than the mapping
            if (actualOverlap.length > derivedSubjects.length) {
                derivedSubjects = actualOverlap;
            }
        }
        
        return { studentId, studentProfile, subjectsForStudent: derivedSubjects };
    });

    try {
        const results = await Promise.all(promises);

        // Now filter based on derived subjects
        const filtered = results.filter(({ subjectsForStudent }) => {
            if (selectedSubjectNorm === '__all') return true;
            // Check if any of the derived subjects match the selected subject (case-insensitive)
            return subjectsForStudent.some(s => String(s).trim().toLowerCase() === selectedSubjectNorm);
        });

        if (filtered.length === 0) {
            classContainer.innerHTML = `<div class="no-classes">No students found for the selected subject.</div>`;
            setLoading(false);
            return;
        }

        // create cards
        filtered.forEach(({ studentId, studentProfile, subjectsForStudent }) => {
            const card = makeStudentCard(studentProfile, subjectsForStudent);
            classContainer.appendChild(card);
        });

        // summary
        const summary = document.createElement('div');
        summary.className = 'students-summary';
        summary.textContent = `Showing ${results.length} student(s).`;
        classContainer.prepend(summary);
    } catch (err) {
        console.error(err);
        showToast('Error fetching student profiles.', true);
    } finally {
        setLoading(false);
    }
}

// determine teacher id: prefer auth, else localStorage teacherId, else prompt error
onAuthStateChanged(auth, (user) => {
    const fallbackTeacherId = localStorage.getItem('teacherId') || null;
    if (user && user.uid) {
        loadForTeacher(user.uid);
    } else if (fallbackTeacherId) {
        loadForTeacher(fallbackTeacherId);
    } else {
        setLoading(false);
        showToast('Not signed in. Please sign in as teacher (or set teacherId in localStorage).', true);
        teacherNameEl.textContent = 'Not signed in';
    }
});

// expose a manual loader for debugging (optional)
window.loadStudentsForTeacher = loadForTeacher;
