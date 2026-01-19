import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Root
        index: resolve(__dirname, 'index.html'),

        // ===== Landing pages =====
        admissions: resolve(__dirname, 'landing/admissions.html'),
        apply: resolve(__dirname, 'landing/apply.html'),
        contact: resolve(__dirname, 'landing/contact.html'),
        login: resolve(__dirname, 'landing/login.html'),
        pendingAdminApproval: resolve(__dirname, 'landing/pending-admin-aproval.html'),
        privacy: resolve(__dirname, 'landing/privacy.html'),
        programs: resolve(__dirname, 'landing/programs.html'),
        resetPassword: resolve(__dirname, 'landing/reset-password.html'),
        unsupportedDevice: resolve(__dirname, 'landing/unsupported-device.html'),

        // ===== Student pages =====
        studentDashboard: resolve(__dirname, 'students/studentdashboard.html'),
        studentCalendar: resolve(__dirname, 'students/calendar.html'),
        studentGrades: resolve(__dirname, 'students/grades.html'),
        studentMyCourses: resolve(__dirname, 'students/mycourses.html'),
        studentResources: resolve(__dirname, 'students/resources.html'),
        studentPaymentPending: resolve(__dirname, 'students/payment-pending.html'),

        // ===== Teacher pages =====
        teacherDashboard: resolve(__dirname, 'teachers/teacherdashboard.html'),
        teacherCalendar: resolve(__dirname, 'teachers/teachercalendar.html'),
        teacherMyClasses: resolve(__dirname, 'teachers/myclasses.html'),
        teacherMyStudents: resolve(__dirname, 'teachers/mystudents.html'),
        teacherApply: resolve(__dirname, 'teachers/teacher-apply.html'),
        teacherResources: resolve(__dirname, 'teachers/teacherresources.html'),

        // ===== Unverified students =====
        unverifiedStudentDashboard: resolve(
          __dirname,
          'unverifiedstudents/student-dashboard.html'
        )
      }
    }
  }
})
