import{d as p,a as Y}from"./firebase-B3bAttLw.js";import{onAuthStateChanged as Z}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{ref as g,get as S,push as K,set as J,onValue as z}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";import{getStorage as W,ref as Q,uploadBytes as ee,getDownloadURL as se}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";import"./global-floating-logout-Em6X96d7.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";const te=W(),c=e=>document.getElementById(e);let E=null,v=null;function ne(e){E=e,v=e,console.log("[SUBMISSION] Initialized for student:",e.uid),ie(),ae()}function ie(){if(c("submissionModal"))return;const e=document.createElement("div");e.id="submissionModal",e.className="modal",e.innerHTML=`
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
    `,document.body.appendChild(e),oe()}function oe(){const e=c("closeSubmissionModalBtn"),s=c("cancelSubmissionBtn");e&&e.addEventListener("click",x),s&&s.addEventListener("click",x);const t=c("submissionFile"),n=c("submissionFileUploadArea");t&&n&&(n.addEventListener("click",()=>t.click()),t.addEventListener("change",a=>{const d=c("submissionFileName"),l=c("submissionFileSize");if(a.target.files&&a.target.files[0]){const i=a.target.files[0];d.textContent=i.name,l.textContent=de(i.size)}else d.textContent="No file chosen",l.textContent=""}),n.addEventListener("dragover",a=>{a.preventDefault(),n.classList.add("dragover")}),n.addEventListener("dragleave",()=>{n.classList.remove("dragover")}),n.addEventListener("drop",a=>{if(a.preventDefault(),n.classList.remove("dragover"),a.dataTransfer.files.length){const d=a.dataTransfer.files[0],l=[".pdf",".doc",".docx",".jpg",".jpeg",".png",".zip",".txt"],i=d.name.toLowerCase();if(!l.some(b=>i.endsWith(b))){f("Invalid file type. Please upload: PDF, DOC, DOCX, Images (JPG, PNG), ZIP, or TXT files.","error");return}const u=10*1024*1024;if(d.size>u){f("File is too large. Maximum size is 10MB.","error");return}t.files=a.dataTransfer.files,t.dispatchEvent(new Event("change"))}}));const o=c("submissionForm");o&&o.addEventListener("submit",ce)}function ae(){document.addEventListener("click",e=>{const s=e.target.closest(".submit-assignment-btn");if(!s)return;const t=s.dataset.assignmentId;t&&R(t)})}async function R(e){if(!e||!E?.uid){f("Error: Missing assignment or student data","error");return}console.log("[SUBMISSION] Opening modal for assignment:",e);try{const s=g(p,`resources/${e}`),t=await S(s);if(!t.exists()){f("Assignment not found in database","error");return}const n=t.val(),o=c("submissionAssignmentTitle"),a=c("submissionStudentName"),d=c("submissionCourseName"),l=c("submissionDueDate");if(o&&(o.textContent=n.title||"Assignment"),a&&v&&(a.textContent=`${v.firstName||""} ${v.lastName||""}`.trim()),d&&(d.textContent=n.courseName||"Unknown Course"),l){const r=n.dueDate?new Date(n.dueDate).toLocaleDateString():"No due date";l.textContent=r}const i=c("submissionModal");if(i){i.dataset.assignmentId=e,i.dataset.courseId=n.courseId||"",i.dataset.assignmentTitle=n.title||"",i.dataset.courseName=n.courseName||"",i.style.display="flex";const r=c("submissionForm");r&&r.reset();const u=c("submissionFileName"),b=c("submissionFileSize");u&&(u.textContent="No file chosen"),b&&(b.textContent=""),await re(e)}}catch(s){console.error("[SUBMISSION] Error opening modal:",s),f("Error loading assignment details","error")}}async function re(e){if(!(!e||!E?.uid))try{const s=g(p,`submissions/${e}/${E.uid}`),t=await S(s);if(!c("submissionStatusContainer"))return;if(t.exists()){const o=t.val();le(o)}else $()}catch(s){console.error("[SUBMISSION] Error checking existing submission:",s),$()}}function le(e){const s=c("submissionStatusContainer");if(!s)return;let t=`
        <div class="existing-submission">
            <div class="submission-header">
                <h4><i class="fas fa-history"></i> Existing Submission</h4>
                <span class="status-badge ${e.status||"submitted"}">
                    ${e.status||"Submitted"}
                </span>
            </div>
            
            <div class="submission-details">
                <p><strong>Submitted:</strong> ${ue(e.submittedAt||e.createdAt)}</p>
                <p><strong>File:</strong> 
                    <a href="${e.fileUrl}" target="_blank" class="file-link">
                        <i class="fas fa-download"></i> ${e.fileName}
                    </a>
                </p>
    `;e.notes&&(t+=`<p><strong>Your Notes:</strong> ${k(e.notes)}</p>`),e.grade!==void 0&&e.grade!==null&&(t+=`<p><strong>Grade:</strong> <span class="grade-value">${e.grade}%</span></p>`),e.feedback&&(t+=`<p><strong>Feedback:</strong> ${k(e.feedback)}</p>`),t+=`
            </div>
            <div class="submission-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Submitting again will replace your current submission
            </div>
        </div>
    `,s.innerHTML=t}function $(){const e=c("submissionStatusContainer");e&&(e.innerHTML="")}async function ce(e){e.preventDefault();const s=c("submissionModal"),t=c("submissionFile"),n=c("submissionNotes");if(!s||!t){f("Submission form not available","error");return}const o=s.dataset.assignmentId,a=s.dataset.courseId;if(!o||!a){f("Missing assignment information","error");return}if(!t.files||!t.files[0]){f("Please select a file to upload","error");return}const d=E?.uid;if(!d){f("Student information not available. Please log in again.","error");return}const l=c("submitAssignmentBtn");l&&(l.disabled=!0,l.innerHTML='<i class="fas fa-spinner fa-spin"></i> Uploading...');try{const i=t.files[0],r=10*1024*1024;if(i.size>r)throw new Error("File size exceeds 10MB limit");const u=Date.now(),b=i.name.split(".").pop(),P=`${u}_${d}_${i.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`,L=`submissions/${o}/${d}/${P}`,_=Q(te,L);console.log("[SUBMISSION] Uploading to:",L);const j=await ee(_,i),G=await se(j.ref),q=g(p,`resources/${o}`),B=await S(q),A=B.exists()?B.val():{},V={id:K(g(p,"submissions")).key,assignmentId:o,assignmentTitle:A.title||"Assignment",courseId:a,courseName:A.courseName||"",studentId:d,studentName:v?.displayName||`${v?.firstName||""} ${v?.lastName||""}`.trim(),studentEmail:v?.email||"",fileName:i.name,fileUrl:G,fileSize:i.size,fileType:i.type,storagePath:L,notes:n?.value?.trim()||"",status:"submitted",submittedAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),grade:null,gradedAt:null,feedback:"",gradedBy:null,gradedByName:""},X=g(p,`submissions/${o}/${d}`);await J(X,V),console.log("[SUBMISSION] Successfully saved to database"),f("Assignment submitted successfully!","success"),setTimeout(()=>{x(),typeof window.updateAssignmentStatus=="function"&&window.updateAssignmentStatus(o)},1500)}catch(i){console.error("[SUBMISSION] Error:",i),f(`Submission failed: ${i.message}`,"error"),l&&(l.disabled=!1,l.innerHTML='<i class="fas fa-paper-plane"></i> Submit Assignment')}}function x(){const e=c("submissionModal");if(!e)return;e.style.display="none",delete e.dataset.assignmentId,delete e.dataset.courseId;const s=c("submissionForm");s&&s.reset();const t=c("submissionFileName"),n=c("submissionFileSize");t&&(t.textContent="No file chosen"),n&&(n.textContent=""),$()}function de(e){if(!e)return"0 bytes";const s=["bytes","KB","MB","GB"],t=Math.floor(Math.log(e)/Math.log(1024));return`${(e/Math.pow(1024,t)).toFixed(1)} ${s[t]}`}function ue(e){if(!e)return"Unknown";const s=new Date(e);return s.toLocaleDateString()+" "+s.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function k(e){const s=document.createElement("div");return s.textContent=e,s.innerHTML}function f(e,s="success"){let t=document.getElementById("submissionToast");t||(t=document.createElement("div"),t.id="submissionToast",t.style.cssText=`
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
        `,document.body.appendChild(t));const n=s==="success"?'<i class="fas fa-check-circle"></i>':'<i class="fas fa-exclamation-triangle"></i>',o=s==="success"?"Success":"Error",a=s==="success"?"#4CAF50":"#f44336";t.innerHTML=`
        <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: ${a}; flex-shrink: 0;">
            ${n}
        </span>
        <span style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-weight: 600; font-size: 14px;">${o}</span>
            <span style="font-size: 13px; opacity: 0.9;">${e}</span>
        </span>
    `,t.style.borderLeftColor=a,t.style.opacity="1",setTimeout(()=>{t.style.opacity="0"},4e3)}window.openSubmissionModal=R;window.closeSubmissionModal=x;let C=null,N=null,M=[],m=[],D=[],w=null,T={};document.addEventListener("DOMContentLoaded",()=>{Z(Y,async e=>{if(!e){y("Please log in to access this page","error"),setTimeout(()=>window.location.href="../landing/login.html",3e3);return}C=e,await me(e.uid),await fe()})});async function me(e){try{const s=g(p,`application/pending/${e}`),t=await S(s);if(t.exists()){const n=t.val();return n.status==="approved"&&n.payment&&n.payment.registrationFee==="paid"?n.monthlyPayment&&n.monthlyPayment.status==="pending"?(console.log("Monthly payment pending for month:",n.monthlyPayment.month),window.location.href="../students/payment-pending.html",!1):(N=n,!0):(y("Your application is not yet fully approved","error"),setTimeout(()=>window.location.href="../unverifiedstudents/student-dashboard.html",3e3),!1)}return y("No complete application found","error"),setTimeout(()=>window.location.href="../landing/login.html",3e3),!1}catch(s){return console.error("Error checking user status:",s),y("Error verifying application status","error"),!1}}async function fe(){if(!N){console.error("No user data available");return}const e=`${N.firstName} ${N.lastName}`;document.getElementById("studentName").textContent=e,ne({uid:C.uid,firstName:N.firstName,lastName:N.lastName}),pe(),Ce(),await ge(),await ve(),await be()}function pe(){const e=document.getElementById("closeSidebar");e&&e.addEventListener("click",H)}function H(){document.getElementById("resourcesSidebar")?.classList.remove("active"),document.querySelectorAll(".course-card").forEach(s=>s.classList.remove("active")),w=null}async function ge(){try{const e=g(p,`enrollments/${C.uid}`),s=await S(e),t=document.getElementById("coursesGrid"),n=document.getElementById("courseFilter");if(!s.exists())return t.innerHTML='<div class="no-courses">No enrolled courses found</div>',m=[],[];const o=s.val();if(m=Object.keys(o).filter(i=>o[i]?.status==="active").map(i=>({courseId:i,...o[i]})),m.length===0)return t.innerHTML='<div class="no-courses">No active enrollments</div>',[];const a=g(p,"courses"),d=await S(a);if(!d.exists())return t.innerHTML='<div class="no-courses">Courses not found</div>',[];const l=d.val();return m=m.map(i=>{const r=l[i.courseId]||{};return{...i,displayName:r.name||i.courseName||"Unnamed Course",courseCode:r.code||"N/A",teacherName:r.teacherName||i.teacherName||"Staff"}}),t.innerHTML="",m.forEach(i=>{const r=document.createElement("div");r.className="course-card",r.setAttribute("data-course-id",i.courseId),r.innerHTML=`
                <div class="course-icon"><i class="fas fa-book"></i></div>
                <h3>${h(i.displayName)}</h3>
                <p class="course-code">${h(i.courseCode)}</p>
                <div class="course-meta">
                    <span class="teacher-name">${h(i.teacherName)}</span>
                    <span class="resource-badge" id="badge-${i.courseId}">0 resources</span>
                </div>
            `,r.addEventListener("click",()=>I(i.courseId)),t.appendChild(r)}),n&&(n.innerHTML='<option value="all">All Courses</option>',m.forEach(i=>{const r=document.createElement("option");r.value=i.courseId,r.textContent=i.displayName,n.appendChild(r)})),m}catch(e){return console.error("Error loading courses:",e),y("Error loading courses","error"),[]}}async function be(){try{const e=g(p,"resources");z(e,s=>{if(!s.exists()){F([]);return}const t=s.val();D=Object.entries(t).filter(([o,a])=>a&&typeof a=="object").map(([o,a])=>({id:o,...a}));const n=m.map(o=>o.courseId);M=D.filter(o=>n.includes(o.courseId)),F(M),w&&I(w)},s=>{console.error("Error listening to resources:",s),y("Error loading resources","error")})}catch(e){console.error("Error setting up resources listener:",e),y("Error loading resources","error")}}function F(e){const s={};e.forEach(t=>{s[t.courseId]=(s[t.courseId]||0)+1}),m.forEach(t=>{const n=document.getElementById(`badge-${t.courseId}`);if(n){const o=s[t.courseId]||0;n.textContent=`${o} resource${o!==1?"s":""}`}})}function I(e){const s=m.find(a=>a.courseId===e);if(!s)return;w=e,document.querySelectorAll(".course-card").forEach(a=>a.classList.remove("active")),document.querySelector(`.course-card[data-course-id="${e}"]`)?.classList.add("active"),document.getElementById("resourcesSidebar")?.classList.add("active"),document.getElementById("sidebarCourseTitle").textContent=s.displayName;const o=M.filter(a=>a.courseId===e);ye(o,s)}async function ve(){if(C?.uid)try{const e=g(p,`submissions/${C.uid}`);T=(await S(e)).val()||{},z(e,t=>{T=t.val()||{},w&&I(w)})}catch(e){console.error("Error loading user submissions:",e),y("Could not load submission statuses.","error")}}function ye(e,s){const t=document.getElementById("assignmentsList"),n=document.getElementById("resourcesList"),o=document.getElementById("resourceCount");t.innerHTML="",n.innerHTML="";const a=e.length;if(o&&(o.innerHTML=`<i class="fas fa-file-alt"></i><span>${a} resource${a!==1?"s":""} available</span>`),e.length===0){const r=document.querySelector(".courses-section");r&&(r.innerHTML=`
                <div class="no-resources">
                    <i class="fas fa-inbox"></i>
                    <p>No resources found for ${h(s.displayName)}</p>
                    <small>Try changing the filter or check back later</small>
                </div>
            `),t.innerHTML='<div class="no-resources"><p>No assignments found.</p></div>',n.innerHTML='<div class="no-resources"><p>No course materials found.</p></div>';return}const d=e.sort((r,u)=>new Date(u.createdAt)-new Date(r.createdAt));let l=0,i=0;d.forEach(r=>{if(r.resourceType==="assignment"){const u=T[r.id];let b=null;typeof u=="string"?b=u:u&&typeof u.status=="string"&&(b=u.status),t.appendChild(U(r,b)),l++}else n.appendChild(U(r,null)),i++}),l===0&&(t.innerHTML='<div class="no-resources"><p>No assignments found.</p></div>'),i===0&&(n.innerHTML='<div class="no-resources"><p>No course materials found.</p></div>')}function U(e,s){const t=document.createElement("div");t.className="resource-item";const n=he(e.fileType||e.mimetype),o=e.fileType||Se(e.mimetype),a=e.fileSize?O(e.fileSize):"Unknown size",d=e.createdAt?new Date(e.createdAt).toLocaleDateString():"Unknown date",l=e.resourceType==="assignment";let i="";if(l){const r=s?s.trim().toLowerCase():null;r==="submitted"?i=`
                <button class="submit-assignment-btn submitted" disabled>
                    <i class="fas fa-check"></i> You have already submitted
                </button>
            `:r==="graded"?i=`
                <button class="submit-assignment-btn graded" disabled>
                    <i class="fas fa-user-check"></i> Graded
                </button>
            `:i=`
                <button class="submit-assignment-btn" 
                        data-assignment-id="${e.id}"
                        data-assignment-title="${h(e.title||"Untitled Resource")}"
                        data-course-id="${e.courseId}"
                        data-course-name="${h(e.courseName||"Unknown Course")}">
                    <i class="fas fa-paper-plane"></i> Submit Assignment
                </button>
            `}return t.innerHTML=`
        <div class="resource-icon"><i class="${n}"></i></div>
        <div class="resource-info">
            <h4>${h(e.title||"Untitled Resource")}</h4>
            <div class="resource-meta">
                <span>${o}</span>
                <span>${a}</span>
                <span>${d}</span>
            </div>
            ${i}
        </div>
        <span class="resource-type">${(e.resourceType||"general").replace("_"," ")}</span>
    `,t.addEventListener("click",r=>{r.target.closest(".submit-assignment-btn")||Ne(e)}),t}function he(e){const s=String(e||"").toLowerCase();return s.includes("pdf")?"fas fa-file-pdf":s.includes("word")||s.includes("doc")?"fas fa-file-word":s.includes("ppt")||s.includes("powerpoint")?"fas fa-file-powerpoint":s.includes("xls")||s.includes("excel")?"fas fa-file-excel":s.includes("image")?"fas fa-file-image":s.includes("audio")?"fas fa-file-audio":s.includes("video")?"fas fa-file-video":s.includes("text")?"fas fa-file-alt":s.includes("zip")||s.includes("archive")?"fas fa-file-archive":"fas fa-file"}function Se(e){if(!e)return"File";const s=e.split("/")[0];return s.charAt(0).toUpperCase()+s.slice(1)}function Ne(e){console.log("Opening resource:",e);const s=m.find(l=>l.courseId===e.courseId),t=s?s.displayName:e.courseName||"General",n=(l,i)=>{const r=document.getElementById(l);r&&(r.textContent=i)};n("resourceTitle",e.title||e.fileName||"Untitled Resource"),n("resourceCourse",t),n("resourceTeacher",e.teacherName||"Unknown"),n("resourceType",(e.resourceType||"general").replace("_"," ")),n("resourceDate",e.createdAt?new Date(e.createdAt).toLocaleDateString():"Unknown"),n("resourceSize",e.fileSize?O(e.fileSize):"Unknown"),n("resourceDescription",e.description||"No description available.");const o=document.getElementById("resourceLink"),a=e.fileUrl||e.finalUrl||e.url||e.downloadUrl||null;if(console.log("Resolved download URL:",a),!o)return;if(!a)o.style.display="none";else{o.style.display="inline-block";const l=(e.fileName||e.title||"resource").replace(/[^a-zA-Z0-9.\-_]/g,"_");o.href=a,o.setAttribute("download",l),o.setAttribute("target","_blank")}const d=document.getElementById("resourceModal");d&&d.classList.add("active")}function we(){const e=document.getElementById("resourceModal");e&&e.classList.remove("active")}function O(e){if(e==null)return"Unknown";const s=Number(e);return s<1024?`${s} bytes`:s<1048576?`${(s/1024).toFixed(1)} KB`:`${(s/1048576).toFixed(1)} MB`}function h(e){return e?String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}function Ee(){const e=document.getElementById("courseFilter"),s=e?e.value:"all";s==="all"?H():I(s)}function Ce(){const e=document.getElementById("courseFilter");e&&e.addEventListener("change",Ee)}window.closeModal=we;function y(e,s="success"){const t=document.getElementById("toast");t&&(t.textContent=e,t.className=`toast ${s} show`,setTimeout(()=>t.className=`toast ${s}`,3e3))}
