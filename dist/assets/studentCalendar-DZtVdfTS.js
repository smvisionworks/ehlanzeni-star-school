import{a as D,d as g}from"./firebase-B3bAttLw.js";import{onAuthStateChanged as T}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{ref as v,get as b}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";import"./global-floating-logout-Em6X96d7.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";const S=["January","February","March","April","May","June","July","August","September","October","November","December"];let r=new Date,x={},w=null,h=null,i=null;const $=document.getElementById("eventModal"),N=document.getElementById("eventTitle"),I=document.getElementById("eventCourse"),L=document.getElementById("eventDate"),B=document.getElementById("eventTimes"),_=document.getElementById("lecturerNoteCard"),j=document.getElementById("lecturerNoteText");document.addEventListener("DOMContentLoaded",()=>{T(D,async e=>{if(!e){y("Please log in to access this page","error"),setTimeout(()=>window.location.href="../landing/login.html",3e3);return}w=e,await A(e.uid),await F(),P()})});async function A(e){try{const t=v(g,`application/pending/${e}`),o=await b(t);if(o.exists()){const n=o.val();return n.status==="approved"&&n.payment&&n.payment.registrationFee==="paid"?n.monthlyPayment&&n.monthlyPayment.status==="pending"?(console.log("Monthly payment pending for month:",n.monthlyPayment.month),window.location.href="../students/payment-pending.html",!1):(h=n,!0):(y("Your application is not yet fully approved","error"),setTimeout(()=>window.location.href="../unverifiedstudents/student-dashboard.html",3e3),!1)}return y("No complete application found","error"),setTimeout(()=>window.location.href="../landing/login.html",3e3),!1}catch(t){return console.error("Error checking user status:",t),y("Error verifying application status","error"),!1}}async function F(){if(!h){console.error("No user data available");return}const e=`${h.firstName} ${h.lastName}`;document.getElementById("studentName").textContent=e,await k()}async function O(e){const t=r.getFullYear(),o=r.getMonth()+1;try{const n=v(g,`enrollments/${e}`),c=await b(n);if(!c.exists())return{};const a=c.val(),f=Object.keys(a);if(f.length===0)return{};const s=v(g,"calendar_events"),u=await b(s);if(!u.exists())return{};const d=u.val(),m={};return Object.values(d).forEach(p=>{Object.values(p).forEach(l=>{if(f.includes(l.courseId)){const E=new Date(l.date);if(E.getFullYear()===t&&E.getMonth()+1===o){const C=l.date;m[C]={title:l.title,date:l.date,notes:l.notes,start_time:l.startTime,end_time:l.endTime,join_link:l.joinLink,course_name:l.courseName||"N/A",teacherName:l.teacherName||"Teacher"}}}})}),m}catch(n){return console.error("Error fetching events:",n),y(`Error loading events: ${n.message}`,"error"),{}}}async function k(){if(document.getElementById("calendarTable").innerHTML=`
    <div class="calendar-loading">
      <div class="loading-header">
        <div class="skeleton skeleton-text" style="width: 60%; height: 24px; margin-bottom: 20px;"></div>
      </div>
      <table class="skeleton-calendar">
        <tr>
          <th><div class="skeleton skeleton-day"></div></th>
          <th><div class="skeleton skeleton-day"></div></th>
          <th><div class="skeleton skeleton-day"></div></th>
          <th><div class="skeleton skeleton-day"></div></th>
          <th><div class="skeleton skeleton-day"></div></th>
          <th><div class="skeleton skeleton-day"></div></th>
          <th><div class="skeleton skeleton-day"></div></th>
        </tr>
        ${Array(5).fill(0).map(()=>`
          <tr>
            ${Array(7).fill(0).map(()=>`
              <td>
                <div class="skeleton skeleton-cell"></div>
              </td>
            `).join("")}
          </tr>
        `).join("")}
      </table>
    </div>
  `,!w)return;x=await O(w.uid);const e=r.getFullYear(),t=r.getMonth(),o=S[t];document.getElementById("monthLabel").textContent=`${o} ${e}`;const n=new Date(e,t,1).getDay(),c=new Date(e,t+1,0).getDate();let a="<table><tr>";["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(s=>a+=`<th>${s}</th>`),a+="</tr><tr>";for(let s=0;s<n;s++)a+="<td></td>";for(let s=1;s<=c;s++){const u=`${e}-${String(t+1).padStart(2,"0")}-${String(s).padStart(2,"0")}`,d=x[u];let m="";const p=new Date;s===p.getDate()&&t===p.getMonth()&&e===p.getFullYear()&&(m="today"),a+=`<td class="${m}">${s}`,d&&(a+=`
            <div class="calendar-event event-lecture" onclick="openModal('${u}')">
                <div class="event-title">${d.course_name}</div>
                <div class="event-time">${d.start_time} - ${d.end_time}</div>
            </div>
        `),a+="</td>",(s+n)%7===0&&(a+="</tr><tr>")}a+="</tr></table>",document.getElementById("calendarTable").innerHTML=a}async function Y(){r.setMonth(r.getMonth()-1),await k()}async function q(){r.setMonth(r.getMonth()+1),await k()}function H(e){if(i=x[e],!i)return;N.textContent=i.title,I.textContent=`Course: ${i.course_name}`,L.textContent=`Date: ${new Date(i.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}`,B.textContent=`Time: ${i.start_time} - ${i.end_time}`;const t=document.getElementById("eventJoinLink");i.join_link?(t.href=i.join_link,t.style.display="inline-block"):t.style.display="none",_.style.display="block",j.textContent=i.notes||"No additional notes from the lecturer.",$.style.display="flex"}function J(){$.style.display="none"}function y(e,t="success"){let o=document.getElementById("toast");o||(o=document.createElement("div"),o.id="toast",o.style.cssText=`
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
    `,document.body.appendChild(o));const n=t==="success"?'<i class="fas fa-check-circle"></i>':'<i class="fas fa-exclamation-triangle"></i>',c=t==="success"?"Success":"Error",a=t==="success"?"#4CAF50":"#f44336";o.innerHTML=`
    <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: ${a}; flex-shrink: 0;">
      ${n}
    </span>
    <span style="display: flex; flex-direction: column; gap: 4px;">
      <span style="font-weight: 600; font-size: 14px;">${c}</span>
      <span style="font-size: 13px; opacity: 0.9;">${e}</span>
    </span>
  `,o.style.borderLeftColor=a,o.style.opacity="1",setTimeout(()=>{o.style.opacity="0"},4e3)}function P(){let e=document.querySelector(".mobile-burger");e||(e=document.createElement("button"),e.className="mobile-burger",e.innerHTML='<i class="fas fa-bars"></i>',document.body.appendChild(e));let t=document.querySelector(".sidebar-overlay");t||(t=document.createElement("div"),t.className="sidebar-overlay",document.body.appendChild(t)),e.addEventListener("click",M),t.addEventListener("click",M)}function M(){const e=document.querySelector(".sidebar"),t=document.querySelector(".sidebar-overlay");e&&e.classList.toggle("open"),t&&t.classList.toggle("show")}window.prevMonth=Y;window.nextMonth=q;window.openModal=H;window.closeModal=J;
