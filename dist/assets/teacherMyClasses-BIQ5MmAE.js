import{a as w,d as g}from"./firebase-B3bAttLw.js";import{onAuthStateChanged as $}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{ref as v,get as C,onValue as T}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";import"./global-floating-logout-Em6X96d7.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";let u=null;document.addEventListener("DOMContentLoaded",()=>{$(w,async s=>{if(!s){l("Please log in to access this page","error"),setTimeout(()=>window.location.href="../landing/login.html",3e3);return}u=s,await D(),await y()})});async function D(){try{const s=v(g,`teachers/${u.uid}`),t=await C(s);if(t.exists()){const a=t.val();document.getElementById("teacherName").textContent=`${a.personalInfo?.firstName} ${a.personalInfo?.lastName}`}}catch(s){console.error("Error loading teacher data:",s)}}async function y(){const s=document.getElementById("loading"),t=document.getElementById("classContainer"),a=document.getElementById("pastClassContainer");s.style.display="block";try{const c=v(g,`calendar_events/${u.uid}`);T(c,r=>{t.innerHTML="",a.innerHTML="";const i=[],o=[],d=new Date;r.exists()?(r.forEach(n=>{const e=n.val();e.id=n.key,new Date(`${e.date}T${e.startTime}`)>=d?i.push(e):o.push(e)}),i.sort((n,e)=>new Date(`${n.date}T${n.startTime}`)-new Date(`${e.date}T${e.startTime}`)),o.sort((n,e)=>new Date(`${e.date}T${e.startTime}`)-new Date(`${n.date}T${n.startTime}`)),i.length===0?t.innerHTML='<div class="no-classes">No upcoming classes scheduled</div>':i.forEach(n=>{const e=p(n,"upcoming");t.appendChild(e)}),o.length===0?a.innerHTML='<div class="no-classes">No past classes found</div>':o.forEach(n=>{const e=p(n,"past");a.appendChild(e)})):(t.innerHTML='<div class="no-classes">No classes scheduled yet</div>',a.innerHTML='<div class="no-classes">No past classes found</div>'),s.style.display="none"})}catch(c){console.error("Error loading classes:",c),l("Error loading classes","error"),s.style.display="none"}}function p(s,t){const a=document.createElement("div");a.className=`class-card ${t}`;const c=t==="upcoming"?'<span class="status-badge upcoming">Upcoming</span>':'<span class="status-badge completed">Completed</span>',i=new Date(s.date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),o=n=>{const[e,m]=n.split(":"),f=parseInt(e),h=f>=12?"PM":"AM";return`${f%12||12}:${m} ${h}`},d=s.notes&&s.notes!=="no notes"?`<div class="class-notes"><strong>Notes:</strong> ${s.notes}</div>`:"";return a.innerHTML=`
    ${c}
    <h3><i class="fas fa-chalkboard-teacher"></i> ${s.title}</h3>
    
    <div class="class-details">
      <div class="class-detail-item">
        <i class="fas fa-book"></i>
        <span><strong>Course:</strong> ${s.courseName}</span>
      </div>
      <div class="class-detail-item">
        <i class="fas fa-calendar"></i>
        <span><strong>Date:</strong> ${i}</span>
      </div>
      <div class="class-detail-item">
        <i class="fas fa-clock"></i>
        <span><strong>Time:</strong> ${o(s.startTime)} - ${o(s.endTime)}</span>
      </div>
      ${d}
    </div>
    
    <div class="class-actions">
      ${t==="upcoming"?`<button class="join-btn" onclick="joinClass('${s.joinLink}')">
          <i class="fas fa-video"></i> Join Class
        </button>`:`<button class="join-btn past" onclick="viewClassRecord('${s.id}')">
          <i class="fas fa-eye"></i> View Record
        </button>`}
      <button class="details-btn" onclick="viewClassDetails('${s.id}')">
        <i class="fas fa-info-circle"></i> Details
      </button>
    </div>
  `,a}function b(s){s&&s!=="no link"?window.open(s,"_blank"):l("No join link available for this class","error")}function E(s){l("Viewing class record...","success"),console.log("Viewing record for class:",s)}function N(s){l("Opening class details...","success"),console.log("Viewing details for class:",s)}function l(s,t="success"){const a=document.getElementById("toast");a.textContent=s,a.className=`toast ${t} show`,setTimeout(()=>a.className=`toast ${t}`,3e3)}window.joinClass=b;window.viewClassRecord=E;window.viewClassDetails=N;
