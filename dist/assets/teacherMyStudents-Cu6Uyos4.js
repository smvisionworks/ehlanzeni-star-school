import{a as F,d as j}from"./firebase-B3bAttLw.js";import{onAuthStateChanged as M}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{get as S,ref as w}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";import"./global-floating-logout-Em6X96d7.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";const I=document.getElementById("teacherName"),p=document.getElementById("classContainer"),_=document.getElementById("loading"),h=document.getElementById("toast"),C=document.createElement("div");C.className="subject-filter-wrapper";C.innerHTML=`
  <label for="subjectFilter" class="sr-only">Filter by subject</label>
  <select id="subjectFilter" class="subject-filter">
    <option value="__all">All subjects</option>
  </select>
`;const A=document.querySelector(".main-content"),H=document.getElementById("classContainer");A.insertBefore(C,H);const N=document.getElementById("subjectFilter");function g(e,t=!1,s=3500){h.textContent=e,h.classList.add("show"),t&&h.classList.add("error"),setTimeout(()=>{h.classList.remove("show","error")},s)}function d(e,t="Loading classes..."){_.style.display=e?"block":"none",_.textContent=t}function T(){p.innerHTML=""}function k(e,t){const s=document.createElement("div");s.className="student-card";const m=t&&t.length?t.map(f=>`<span class="chip">${f}</span>`).join(" "):'<span class="chip">—</span>',o=e.guardian||{},l=e.phone||"—";return o.firstName?`${o.firstName} ${o.lastName||""}`.trim():o.name,s.innerHTML=`
    <div class="student-card-left">
      <div class="student-avatar">${(e.firstName||"S").charAt(0).toUpperCase()}</div>
      <div class="student-main">
        <h3 class="student-name">${e.firstName||"Unknown"} ${e.lastName||""}</h3>
        <div class="meta-row">
          <small class="muted">Grade: ${e.highestGrade||"—"}</small>
          <small class="muted">Code: ${e.studentCode||"—"}</small>
        </div>
        <div class="meta-row">
          <small>Phone: <a href="tel:${l}">${l}</a></small>
          <small>Email: ${e.email||"—"}</small>
        </div>
      </div>
    </div>

    <div class="student-card-right">
      <div class="section">
        <div class="section-title">Subjects </div>
        <div class="subject-chips">${m}</div>
      </div>
    </div>  
  `,s}async function y(e){d(!0,"Loading teacher and students..."),T();try{const t=await S(w(j,`teachers/${e}`));if(!t.exists()){g("Teacher profile not found for this user.",!0),d(!1);return}const s=t.val(),m=(s.personalInfo&&`${s.personalInfo.firstName||""} ${s.personalInfo.lastName||""}`).trim()||s.teacherName||"Teacher";I.textContent=m;const o=s.teachingInfo&&s.teachingInfo.subjects?s.teachingInfo.subjects:[];N.innerHTML='<option value="__all">All subjects</option>'+o.map(r=>`<option value="${r}">${r}</option>`).join(""),N.onchange=()=>E(e);const l=await S(w(j,"student_teachers")),f=l.exists()?l.val():{},a=[];for(const[r,n]of Object.entries(f))if(n&&Object.prototype.hasOwnProperty.call(n,e)){const i=(n[e]||{}).subjects||[];a.push({studentId:r,subjectsForStudent:i})}window.__teacherStudentList={teacherId:e,teacherSubjects:o,associatedStudents:a},await E(e)}catch(t){console.error(t),g("Error loading students. See console.",!0)}finally{d(!1)}}async function E(e){d(!0,"Loading students..."),T();const t=window.__teacherStudentList;if(!t||t.teacherId!==e){d(!1);return}const{associatedStudents:s}=t,m=N.value||"__all",o=(t.teacherSubjects||[]).map(a=>String(a).trim().toLowerCase()),l=m!=="__all"?m.trim().toLowerCase():"__all",f=s.map(async({studentId:a,subjectsForStudent:r})=>{const n=await S(w(j,`application/pending/${a}`)),c=n.exists()?n.val():{firstName:"Unknown",lastName:"",phone:"",guardian:{}};let i=r||[];if(c.subjects&&Array.isArray(c.subjects)){const b=c.subjects.map(u=>String(u).trim().toLowerCase()),$=o.filter(u=>b.includes(u)).map(u=>{const x=c.subjects.find(v=>String(v).trim().toLowerCase()===u),B=t.teacherSubjects.find(v=>String(v).trim().toLowerCase()===u);return x||B||u});$.length>i.length&&(i=$)}return{studentId:a,studentProfile:c,subjectsForStudent:i}});try{const a=await Promise.all(f),r=a.filter(({subjectsForStudent:c})=>l==="__all"?!0:c.some(i=>String(i).trim().toLowerCase()===l));if(r.length===0){p.innerHTML='<div class="no-classes">No students found for the selected subject.</div>',d(!1);return}r.forEach(({studentId:c,studentProfile:i,subjectsForStudent:b})=>{const L=k(i,b);p.appendChild(L)});const n=document.createElement("div");n.className="students-summary",n.textContent=`Showing ${a.length} student(s).`,p.prepend(n)}catch(a){console.error(a),g("Error fetching student profiles.",!0)}finally{d(!1)}}M(F,e=>{const t=localStorage.getItem("teacherId")||null;e&&e.uid?y(e.uid):t?y(t):(d(!1),g("Not signed in. Please sign in as teacher (or set teacherId in localStorage).",!0),I.textContent="Not signed in")});window.loadStudentsForTeacher=y;
