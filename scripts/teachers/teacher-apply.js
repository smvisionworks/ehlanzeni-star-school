import { auth, database, storage } from '../firebase.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { ref, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { ref as storageRef, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

document.getElementById('teacherForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    // Get form values
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const idNumber = document.getElementById('idNumber').value;
    const race = document.getElementById('race').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Address
    const addressLine1 = document.getElementById('addressLine1').value;
    const addressLine2 = document.getElementById('addressLine2').value;
    const city = document.getElementById('city').value;
    const province = document.getElementById('province').value;
    const postalCode = document.getElementById('postalCode').value;
    const country = document.getElementById('country').value;
    
    // Teaching information
    const highestQualification = document.getElementById('highestQualification').value;
    const fieldOfStudy = document.getElementById('fieldOfStudy').value;
    const yearsExperience = document.getElementById('yearsExperience').value;
    
    // Get selected subjects
    const subjectCheckboxes = document.querySelectorAll('.subject-checkbox:checked');
    const subjects = Array.from(subjectCheckboxes).map(cb => cb.value);
    const additionalSubjects = document.getElementById('additionalSubjects').value;
    if (additionalSubjects) {
      const additional = additionalSubjects.split(',').map(s => s.trim()).filter(s => s);
      subjects.push(...additional);
    }
    
    // Get teaching levels
    const teachingLevelCheckboxes = document.querySelectorAll('input[name="teachingLevel"]:checked');
    const teachingLevels = Array.from(teachingLevelCheckboxes).map(cb => cb.value);
    
    // Availability
    const preferredSchedule = document.getElementById('preferredSchedule').value;
    const availableStartDate = document.getElementById('availableStartDate').value;
    
    // Declaration
    const declarationName = document.getElementById('declarationName').value;
    const declarationDate = document.getElementById('declarationDate').value;
    
    // Files (we'll just store the file names for now)
    const idCopyFile = document.getElementById('idCopy').files[0];
    const qualificationsFile = document.getElementById('qualifications').files[0];
    const cvFile = document.getElementById('cv').files[0];

    // Validation
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (subjects.length === 0) {
      throw new Error('Please select at least one subject');
    }

    if (teachingLevels.length === 0) {
      throw new Error('Please select at least one teaching level');
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Prepare teacher data
    const teacherData = {
      personalInfo: {
        firstName,
        lastName,
        idNumber,
        race,
        email,
        phone,
        address: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          province,
          postalCode,
          country
        }
      },
      teachingInfo: {
        highestQualification,
        fieldOfStudy,
        yearsExperience,
        subjects,
        teachingLevels
      },
      availability: {
        preferredSchedule,
        availableStartDate
      },
      documents: {
        idCopy: idCopyFile ? idCopyFile.name : '',
        qualifications: qualificationsFile ? qualificationsFile.name : '',
        cv: cvFile ? cvFile.name : ''
      },
      declaration: {
        name: declarationName,
        date: declarationDate
      },
      registrationDate: new Date().toISOString(),
      status: 'pending', // Teachers must be approved by admin
      role: 'teacher'
    };

    // Save teacher data to Firebase Database
    const teacherRef = ref(database, `teachers/${user.uid}`);
    await set(teacherRef, teacherData);

    // Upload documents to Firebase Storage
    try {
      const uploadedDocs = {};
      
      if (idCopyFile) {
        const idRef = storageRef(storage, `teacherapplication/${user.uid}/idCopy-${Date.now()}`);
        await uploadBytes(idRef, idCopyFile);
        uploadedDocs.idCopy = idRef.fullPath;
      }
      
      if (qualificationsFile) {
        const qualRef = storageRef(storage, `teacherapplication/${user.uid}/qualifications-${Date.now()}`);
        await uploadBytes(qualRef, qualificationsFile);
        uploadedDocs.qualifications = qualRef.fullPath;
      }
      
      if (cvFile) {
        const cvRef = storageRef(storage, `teacherapplication/${user.uid}/cv-${Date.now()}`);
        await uploadBytes(cvRef, cvFile);
        uploadedDocs.cv = cvRef.fullPath;
      }

      // Update teacher data with document paths
      if (Object.keys(uploadedDocs).length > 0) {
        const updateRef = ref(database, `teachers/${user.uid}/documents`);
        await set(updateRef, uploadedDocs);
      }
    } catch (uploadErr) {
      console.error('Document upload failed:', uploadErr);
      showToast('Documents could not be uploaded, but your application was saved', 'warning');
    }

    showToast('Registration successful! Your application is pending admin approval. You will be notified once approved.', 'success');
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      window.location.href = '../landing/login.html';
    }, 2000);

  } catch (error) {
    console.error('Registration error:', error);
    showToast('Registration failed: ' + error.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
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