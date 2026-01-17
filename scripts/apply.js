// scripts/apply.js
import { auth, database, storage } from './firebase.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, set, push, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { ref as storageRef, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// Get current month in SA timezone
function getCurrentMonthSA() {
  const now = new Date();
  const saDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const year = saDate.getFullYear();
  const month = String(saDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Safe field getter - returns empty string if field doesn't exist
function getFieldValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

document.getElementById('applicationForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    // Get form values
    const formData = {
      // Section A: Student Personal Details
      firstName: getFieldValue('firstName'),
      lastName: getFieldValue('lastName'),
      idNumber: getFieldValue('idNumber'),
      race: getFieldValue('race'),
      email: getFieldValue('email'),
      phone: getFieldValue('phone'),
      address: {
        line1: getFieldValue('addressLine1'),
        line2: getFieldValue('addressLine2'),
        city: getFieldValue('city'),
        province: getFieldValue('province'),
        postalCode: getFieldValue('postalCode'),
        country: getFieldValue('country')
      },

      // Section B: Education & Subjects
      highestGrade: getFieldValue('highestGrade'),
      attendanceType: getFieldValue('attendanceType'),
      subjects: getSelectedSubjects(),

      // Section C: Guardian Details
      guardian: {
        firstName: getFieldValue('guardianFirstName'),
        lastName: getFieldValue('guardianLastName'),
        idNumber: getFieldValue('guardianIdNumber'),
        race: getFieldValue('guardianRace'),
        phone: getFieldValue('guardianPhone'),
        email: getFieldValue('guardianEmail'),
        employmentStatus: getFieldValue('guardianEmploymentStatus')
      },

      // Section D: Declaration
      declaration: {
        name: getFieldValue('declarationName'),
        signedAt: getFieldValue('signedAt'),
        date: getFieldValue('declarationDate'),
        guardianSignature: getFieldValue('guardianSignature'),
        studentSignature: getFieldValue('studentSignature')
      },

      // Payment tracking
      payment: {
        registrationFee: 'pending'
      },
      monthlyPayment: {
        month: getCurrentMonthSA(),
        status: 'pending'
      },

      // System fields
      status: 'pending',
      applicationDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    const password = getFieldValue('password');
    const confirmPassword = getFieldValue('confirmPassword');

    // Validate passwords
    if (password !== confirmPassword) {
      showToast('Passwords do not match!', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
      return;
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);
    const user = userCredential.user;

    // Generate unique student code
    const studentCode = 'ESS' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    formData.studentCode = studentCode;
    formData.uid = user.uid;

    // Save to database under application/pending
    const applicationRef = ref(database, `application/pending/${user.uid}`);
    await set(applicationRef, formData);


    try {
      const uploadResult = await uploadDocumentsToServer(user.uid);
      const courses = await autoEnrollStudent(formData);
      if (uploadResult && uploadResult.documents) {
        console.log("Documents uploaded:", uploadResult.documents);
      }
    } catch (err) {
      console.error("Document upload failed:", err);
      showToast("Application saved BUT document upload failed: " + err.message, "error");
    }


    // ===============================
    // LINK STUDENT WITH TEACHERS
    // ===============================

    try {
      const teachersRef = ref(database, "teachers");
      const teachersSnap = await get(teachersRef);

      if (teachersSnap.exists()) {
        const teachers = teachersSnap.val();
        const studentSubjects = formData.subjects;

        for (const teacherId in teachers) {
          const teacher = teachers[teacherId];

          if (!teacher.subjects) continue;

          // Find matching subjects
          const overlap = teacher.subjects.filter(sub =>
            studentSubjects.includes(sub)
          );

          if (overlap.length > 0) {
            // Link student under teacher
            await set(
              ref(database, `teacher_students/${teacherId}/${user.uid}`),
              {
                subjects: overlap,
                studentName: formData.firstName + " " + formData.lastName
              }
            );

            // Link teacher under student
            await set(
              ref(database, `student_teachers/${user.uid}/${teacherId}`),
              {
                subjects: overlap,
                teacherName: teacher.firstName + " " + teacher.lastName
              }
            );
          }
        }
      }
    } catch (matchErr) {
      console.error("Error matching teachers:", matchErr);
    }


    showToast('Application submitted successfully! Your student code: ' + studentCode, 'success');

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);

  } catch (error) {
    console.error('Error submitting application:', error);
    showToast('Error submitting application: ' + error.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
  }
});

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 5000);
}

function getSelectedSubjects() {
  const boxes = document.querySelectorAll('.subject-checkbox:checked');
  let selected = Array.from(boxes).map(b => b.value);

  const additionalSubjectsField = document.getElementById('additionalSubjects');
  if (additionalSubjectsField) {
    const extra = additionalSubjectsField.value.trim();
    if (extra.length > 0) {
      selected = selected.concat(
        extra.split(',').map(s => s.trim()).filter(s => s.length > 0)
      );
    }
  }

  return selected;
}



async function autoEnrollStudent(student) {
  if (!student || !student.uid) return [];
  const studentUid = student.uid;
  if (!student.subjects || student.subjects.length === 0) return [];

  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();

  // normalize student subjects
  const studentSubjectsNormalized = student.subjects
    .map(s => String(s).trim().toLowerCase())
    .filter(s => s.length > 0);

  // 1. Load all courses
  const coursesSnap = await get(ref(database, "courses"));
  if (!coursesSnap.exists()) return [];

  const courses = coursesSnap.val();
  let enrolledCourses = [];

  for (const courseId in courses) {
    const course = courses[courseId];
    const courseSubjectNorm = String(course.subject || course.name || '').trim().toLowerCase();
    if (!courseSubjectNorm) continue;
    if (!studentSubjectsNormalized.includes(courseSubjectNorm)) continue;

    // 2. Add to enrollments
    await set(ref(database, `enrollments/${studentUid}/${courseId}`), {
      studentId: studentUid,
      studentName,
      courseId,
      courseName: course.name || course.subject,
      status: "active",
      enrolledAt: new Date().toISOString()
    });

    enrolledCourses.push(course.name || course.subject);

    // 3. Link student with teacher (if teacherId exists on course)
    if (course.teacherId) {
      await set(ref(database, `teacher_students/${course.teacherId}/${studentUid}`), {
        subjects: [course.subject || course.name],
        studentName
      });

      await set(ref(database, `student_teachers/${studentUid}/${course.teacherId}`), {
        subjects: [course.subject || course.name],
        teacherName: course.teacherName || ''
      });
    }
  }

  // ✅ Do NOT update application status — leave it as "pending"

  return enrolledCourses;
}


// call this after you've created the user and saved applicationRef
async function uploadDocumentsToServer(uid) {
  const previousFile = document.getElementById('previousResults').files[0];
  const studentIdFile = document.getElementById('studentIdCopy').files[0];
  const guardianIdFile = document.getElementById('guardianIdCopy').files[0];

  if (!previousFile || !studentIdFile || !guardianIdFile) {
    console.warn('One or more required files missing. Skipping document upload.');
    return null;
  }

  try {
    const uploadedDocs = {};

    // Upload previous results
    const previousResultsRef = storageRef(storage, `application/${uid}/previousResults-${Date.now()}`);
    await uploadBytes(previousResultsRef, previousFile);
    uploadedDocs.previousResults = previousResultsRef.fullPath;

    // Upload student ID copy
    const studentIdRef = storageRef(storage, `application/${uid}/studentIdCopy-${Date.now()}`);
    await uploadBytes(studentIdRef, studentIdFile);
    uploadedDocs.studentIdCopy = studentIdRef.fullPath;

    // Upload guardian ID copy
    const guardianIdRef = storageRef(storage, `application/${uid}/guardianIdCopy-${Date.now()}`);
    await uploadBytes(guardianIdRef, guardianIdFile);
    uploadedDocs.guardianIdCopy = guardianIdRef.fullPath;

    return { documents: uploadedDocs };
  } catch (err) {
    console.error('Document upload failed:', err);
    throw new Error('Firebase storage upload failed: ' + err.message);
  }
}
