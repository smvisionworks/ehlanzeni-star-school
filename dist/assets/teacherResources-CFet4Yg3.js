import{d as E,a as F}from"./firebase-B3bAttLw.js";import"./global-floating-logout-Em6X96d7.js";import{ref as L,update as _,get as A,onValue as K,push as W,set as X,remove as Z}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";import{onAuthStateChanged as J,signOut as Q}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{getStorage as ee,ref as H,uploadBytes as te,getDownloadURL as se,deleteObject as oe}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";let R=null,P=null;const m=e=>document.getElementById(e);function ne(e){P=e,console.log("[GRADING] Initializing grading system for teacher:",e?.uid),re()}function re(){if(!m("gradingModal")){const e=document.createElement("div");e.id="gradingModal",e.className="modal",e.innerHTML=`
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
        `,document.body.appendChild(e);const t=document.createElement("style");t.textContent=`
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
        `,document.head.appendChild(t)}}function G(e){R=e;const t=m("gradingModal"),s=m("gradingAssignmentTitle");s&&(s.textContent=e.title||"Assignment");const o=m("assignmentInfo");o&&(o.innerHTML=`
  <div class="assignment-meta" style="
        display: flex; 
        gap: 1.2rem; 
        flex-wrap: wrap; 
        font-size: 0.9rem; 
        color: #1f2937; 
        font-weight: 500;
      ">
    <span style="display: inline-block;">
      <strong>Subject:</strong> ${U(e.courseName||"Unknown")}
    </span>
    <span style="display: inline-block;">
      <strong>Due Date:</strong> ${e.dueDate?new Date(e.dueDate).toLocaleDateString():"Not set"}
    </span>
    <span style="display: inline-block;">
      <strong>Created:</strong> ${e.createdAt?new Date(e.createdAt).toLocaleDateString():"Unknown"}
    </span>
  </div>
`),t&&(t.classList.add("show"),B(e.id))}function ie(){const e=m("gradingModal");e&&e.classList.remove("show"),R=null}async function B(e){const t=m("submissionsList");if(t){t.innerHTML='<div class="loading">Loading submissions...</div>';try{const s=L(E,`submissions/${e}`),o=await A(s);if(!o.exists()){t.innerHTML='<div class="no-submissions">No submissions yet</div>';return}const r=o.val();ae(r)}catch(s){console.error("[GRADING] Error loading submissions:",s),t.innerHTML=`<div class="error">Error loading submissions: ${s.message}</div>`}}}function ae(e){const t=m("submissionsList");t&&(t.innerHTML="",Object.entries(e).forEach(([s,o])=>{const r=ce(s,o);t.appendChild(r)}))}function ce(e,t){const s=document.createElement("div");s.className="submission-item";const o=t.grade??"",r=t.status||"submitted";return t.submittedAt&&new Date(t.submittedAt).toLocaleString(),s.innerHTML=`
  <div class="submission-grading-card submission-row">

    <!-- STUDENT -->
    <div class="submission-student">
      <div class="submission-avatar">
        ${(t.studentName||"")[0]||"?"}
      </div>
      <div class="student-name">
        ${U(t.studentName||"Unknown")}
      </div>
    </div>

    <!-- FILE -->
    <div class="submission-file">
      <i class="fas fa-file"></i>
      <a href="${t.fileUrl}" target="_blank" download class="file-link">
        ${U(t.fileName||"File")}
      </a>
    </div>

    <!-- GRADE -->
    <div class="submission-grade">
      <input
        type="number"
        id="grade-${e}"
        min="0"
        max="100"
        step="0.1"
        value="${o}"
        class="grade-input ${r==="graded"?"graded":""}"
      />
    </div>

    <!-- FEEDBACK -->
    <div class="submission-feedback">
      <textarea
        id="feedback-${e}"
        placeholder="Feedback..."
        class="${r==="graded"?"graded":""}"
      >${t.feedback||""}</textarea>
    </div>

    <!-- ACTION -->
    <div class="submission-action">
      <button class="save-grade-btn" onclick="saveGrade('${e}')">
        ${r==="graded"?"Update":"Save"}
      </button>
    </div>

  </div>
`,s}async function le(e){if(!R)return;const t=m(`grade-${e}`),s=m(`feedback-${e}`);if(!t||!s)return;const o=parseFloat(t.value);if(isNaN(o)||o<0||o>100){alert("Please enter a valid grade (0-100)");return}try{const r=L(E,`submissions/${R.id}/${e}`);await _(r,{grade:o,feedback:s.value.trim(),gradedAt:new Date().toISOString(),gradedBy:P?.uid||"teacher",status:"graded"}),t.classList.add("graded"),s.classList.add("graded"),B(R.id)}catch(r){console.error(r),alert("Error saving grade")}}function U(e=""){const t=document.createElement("div");return t.textContent=e,t.innerHTML}window.openGradingModal=G;window.closeGradingModal=ie;window.saveGrade=le;const j=ee();let w=null,x=null,h=[],y=[],b=null,D=!0;const i=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",()=>{console.log("[INIT] DOM ready — attaching auth listener"),J(F,async e=>{try{if(!e){console.warn("[AUTH] No user — redirecting to login"),l("Please log in to access this page","error"),setTimeout(()=>window.location.href="../landing/login.html",2500);return}if(w=e,console.log("[AUTH] User is signed in:",e.uid),!await de(e.uid))return;await ue()}catch(t){console.error("[AUTH HANDLER] Unexpected error:",t),l("Unexpected error during auth","error")}})});async function de(e){try{console.log(`[TEACHER] Checking teacher profile for UID=${e}`);const t=L(E,`teachers/${e}`),s=await A(t);return s.exists()?(x=s.val(),console.log("[TEACHER] Loaded teacher profile"),x.status==="pending"?(l("Your teacher account is pending admin approval. You will be notified once approved.","error"),setTimeout(()=>window.location.href="../landing/login.html",2500),!1):!0):(console.warn("[TEACHER] Profile not found"),l("Teacher profile not found","error"),setTimeout(()=>window.location.href="../landing/login.html",2500),!1)}catch(t){return console.error("[TEACHER] Error checking teacher status:",t),l("Error verifying teacher status","error"),!1}}async function ue(){if(console.log("[PAGE] initPage start"),!x){console.error("[PAGE] No teacher data — aborting init");return}const e=`${x.personalInfo?.firstName||""} ${x.personalInfo?.lastName||""}`.trim(),t=i("teacherName");t&&(t.textContent=e||"Teacher"),ne(w),await fe(),await pe(),xe(),console.log("[PAGE] initPage complete")}async function fe(){try{console.log("[COURSES] Loading courses for teacher:",w.uid);const e=L(E,"courses"),t=await A(e),s=i("createResourceCourseId"),o=i("coursesList");if(!s||!o){console.warn("[COURSES] required elements not found");return}if(s.innerHTML='<option value="">Select a Course (Required)</option>',o.innerHTML="",!t.exists()){console.log("[COURSES] no courses node in database"),I(0);return}const r=t.val();h=[],Object.entries(r).forEach(([n,c])=>{if(c&&String(c.teacherId)===String(w.uid)&&c.status==="active"){h.push({id:n,...c});const a=document.createElement("option");a.value=n,a.textContent=`${c.name} (${c.code||""})`,s.appendChild(a);const d=ge({id:n,...c});o.appendChild(d)}}),console.log("[COURSES] loaded",h.length,"courses"),I(0)}catch(e){console.error("[COURSES] failed to load:",e),l("Error loading courses","error")}}function ge(e){const t=document.createElement("div");return t.className="course-item",t.setAttribute("data-course-id",e.id),t.innerHTML=`
        <div class="course-info">
            <h4>${$(e.name)}</h4>
            <span class="course-code">${$(e.code||"N/A")}</span>
        </div>
        <span class="resource-count" id="count-${e.id}">0 resources</span>
    `,t.addEventListener("click",()=>C(e.id)),t}async function pe(){console.log("[RESOURCES] Setting up listener");const e=i("loadingCircle");e&&e.classList.add("show");try{const t=L(E,"resources");K(t,s=>{if(console.log("[RESOURCES] onValue triggered — exists:",s.exists()),!s.exists()){console.log("[RESOURCES] no resources in DB"),y=[],O([]),z(),e&&e.classList.remove("show");return}const o=s.val();console.log("[RESOURCES] snapshot value:",o),y=[],Object.entries(o).forEach(([r,n])=>{if(!n||typeof n!="object"){console.log("[RESOURCES] skipping non-object resource key=",r);return}String(n.teacherId)===String(w.uid)&&y.push({id:r,...n})}),console.log(`[RESOURCES] found ${y.length} for current teacher`),O(y),b?C(b):z(),e&&e.classList.remove("show")},s=>{console.error("[RESOURCES] onValue error:",s),e&&e.classList.remove("show"),l("Error listening for resources","error")})}catch(t){console.error("[RESOURCES] setup failed:",t),e&&e.classList.remove("show"),l("Error loading resources","error")}}function O(e){const t={};let s=0,o=0;e.forEach(n=>{s++,n.courseId&&h.find(c=>c.id===n.courseId)?(t[n.courseId]||(t[n.courseId]=0),t[n.courseId]++):o++}),h.forEach(n=>{const c=i(`count-${n.id}`);if(c){const a=t[n.id]||0;c.textContent=`${a} resource${a!==1?"s":""}`}});const r=i("uncategorizedCount");r&&(r.textContent=`${o} resource${o!==1?"s":""}`),I(s)}function I(e){const t=i("totalResources");t&&(t.textContent=`${e} total resource${e!==1?"s":""}`)}function C(e){document.querySelectorAll(".course-item").forEach(a=>{a.classList.remove("active")});const t=document.querySelector(`.course-item[data-course-id="${e}"]`);t&&t.classList.add("active"),b=e;const s=h.find(a=>a.id===e),o=s?s.name:"Uncategorized Resources",r=i("selectedCourseTitle");r&&(r.textContent=o);let n;e==="uncategorized"?n=y.filter(a=>!a.courseId||!h.find(d=>d.id===a.courseId)):n=y.filter(a=>a.courseId===e);const c=i("resourceTypeFilter")?.value||"all";c!=="all"&&(n=n.filter(a=>a.resourceType===c)),n.sort((a,d)=>{const f=a.createdAt?new Date(a.createdAt).getTime():0,g=d.createdAt?new Date(d.createdAt).getTime():0;return D?g-f:f-g}),me(n)}function me(e){const t=i("resourcesContainer"),s=i("resourcesGrid"),o=i("emptyState");if(!(!t||!s||!o)){if(o.style.display="none",s.innerHTML="",e.length===0){o.style.display="block";const r=b==="uncategorized"?"No uncategorized resources found.":"No resources found for this course.";o.querySelector("p").textContent=r;return}e.forEach(r=>{const n=he(r);s.appendChild(n)})}}function he(e){const t=document.createElement("div");t.className="resource-card";const s=ye(e.fileType||e.mimetype||""),o=e.fileSize?Se(e.fileSize):"";e.courseName||be(e.courseId);const r=$(e.title||"Untitled"),n=$(e.description||"No description"),c=e.resourceType==="assignment"?`
        <button class="action-btn grade-btn" data-id="${e.id}" title="Grade submissions">
            <i class="fas fa-graduation-cap"></i>
        </button>
    `:"";t.innerHTML=`
        <div class="resource-header">
            <div class="resource-icon">
                <i class="${s}"></i>
            </div>
            <span class="resource-type">${$((e.resourceType||"general").replace("_"," "))}</span>
        </div>
        <h3>${r}</h3>
        <p class="resource-description">${n}</p>
        <div class="resource-meta">
            <div class="resource-actions">
                ${e.fileUrl?`
                    <a href="${e.fileUrl}" target="_blank" class="action-btn" title="Download resource">
                        <i class="fas fa-download"></i>
                    </a>
                `:""}
                ${c}
                <button class="action-btn delete-btn" data-id="${e.id}" title="Delete resource">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="resource-info">
                ${o?`<span>${o}</span>`:""}
                <span>${e.createdAt?new Date(e.createdAt).toLocaleDateString():""}</span>
            </div>
        </div>
    `;const a=t.querySelector(".grade-btn");a&&a.addEventListener("click",f=>{f.stopPropagation(),G(e)});const d=t.querySelector(".delete-btn");return d&&d.addEventListener("click",f=>{f.stopPropagation(),Ee(e.id)}),t.addEventListener("click",()=>{ve(e)}),t}function ve(e){e.fileUrl&&window.open(e.fileUrl,"_blank")}function be(e){const t=h.find(s=>s.id===e);return t?t.name:null}function ye(e){const t=String(e).toLowerCase();return t.includes("pdf")?"fas fa-file-pdf":t.includes("word")||t.includes("doc")?"fas fa-file-word":t.includes("ppt")||t.includes("powerpoint")?"fas fa-file-powerpoint":t.includes("xls")||t.includes("excel")?"fas fa-file-excel":t.includes("image")?"fas fa-file-image":t.includes("audio")?"fas fa-file-audio":t.includes("video")?"fas fa-file-video":t.includes("text")?"fas fa-file-alt":t.includes("zip")||t.includes("archive")?"fas fa-file-archive":"fas fa-file"}function xe(){const e=i("createResourceForm");e&&e.addEventListener("submit",we);const t=i("createResourceType"),s=i("dueDateGroup"),o=i("createResourceDueDate");if(t&&s&&o){t.addEventListener("change",p=>{const v=p.target.value==="assignment";s.style.display=v?"block":"none",o.required=v,v||(o.value="")});const u=t.value==="assignment";s.style.display=u?"block":"none",o.required=u}const r=i("createResourceFile");r&&r.addEventListener("change",u=>{const p=i("fileName");p&&(p.textContent=u.target.files&&u.target.files[0]?u.target.files[0].name:"")});const n=i("fileUploadArea");n&&(n.addEventListener("click",()=>{r.click()}),n.addEventListener("dragover",u=>{u.preventDefault(),n.classList.add("dragover")}),n.addEventListener("dragleave",()=>{n.classList.remove("dragover")}),n.addEventListener("drop",u=>{if(u.preventDefault(),n.classList.remove("dragover"),u.dataTransfer.files.length){const p=u.dataTransfer.files[0],v=[".pdf",".doc",".docx",".ppt",".pptx",".xls",".xlsx",".jpg",".jpeg",".png",".gif",".mp3",".wav",".mp4",".mov",".avi",".txt",".zip"],k=p.name.toLowerCase();if(!v.some(Y=>k.endsWith(Y))){l("Invalid file type. Please upload: PDF, Office docs, Images, Videos, Audio, TXT, or ZIP files.","error");return}const V=50*1024*1024;if(p.size>V){l("File is too large. Maximum size is 50MB.","error");return}const M=new DataTransfer;M.items.add(p),r.files=M.files,r.dispatchEvent(new Event("change"))}}));const c=i("resourceTypeFilter");c&&c.addEventListener("change",()=>{b&&C(b)});const a=i("sortButton");a&&a.addEventListener("click",()=>{D=!D,a.innerHTML=D?'<i class="fas fa-sort-amount-down"></i> Newest First':'<i class="fas fa-sort-amount-up"></i> Oldest First',b&&C(b)});const d=document.querySelector('.course-item[data-course-id="uncategorized"]');d&&d.addEventListener("click",()=>C("uncategorized"));const f=i("logoutBtn"),g=i("confirmLogout"),S=i("cancelLogout"),T=i("logoutModal");f&&f.addEventListener("click",()=>{T&&(T.style.display="flex")}),S&&S.addEventListener("click",()=>{T&&(T.style.display="none")}),g&&g.addEventListener("click",Le)}async function we(e){e.preventDefault(),console.log("[UPLOAD] form submit (Firebase Storage)");const t=i("createResourceTitle")?.value?.trim(),s=i("createResourceCourseId")?.value,o=i("createResourceType")?.value,r=i("createResourceDescription")?.value,n=i("createResourceDueDate")?.value,c=i("createResourceFile");if(!t)return l("Please enter a title","error");if(!s)return l("Please select a course","error");if(o==="assignment"&&!n)return l("Please set a due date for assignment","error");if(!c||!c.files||!c.files[0])return l("Please select a file","error");const a=i("createResourceBtn");a&&(a.disabled=!0,a.innerHTML='<i class="fas fa-spinner fa-spin"></i> Uploading...');try{const d=W(L(E,"resources")),f=d.key,g=c.files[0],S=`resources/${w.uid}/${f}/${g.name}`,T=H(j,S);console.log("[UPLOAD] Uploading file to Firebase Storage:",S);const u=await te(T,g),p=await se(u.ref),v=h.find(N=>N.id===s),k={id:f,title:t,description:r||"",courseId:s,courseName:v?v.name:"Unknown Course",resourceType:o||"general",fileUrl:p,fileName:g.name,fileType:g.type||"application/octet-stream",fileSize:g.size||null,teacherId:w?.uid,teacherName:`${x?.personalInfo?.firstName||""} ${x?.personalInfo?.lastName||""}`.trim(),createdAt:new Date().toISOString(),storagePath:S};o==="assignment"&&n&&(k.dueDate=new Date(n).toISOString()),await X(d,k),console.log("[UPLOAD] Resource saved to Firebase:",f),l("Resource uploaded successfully","success"),q(),i("createResourceForm")&&i("createResourceForm").reset(),i("fileName")&&(i("fileName").textContent=""),C(s)}catch(d){console.error("[UPLOAD] error:",d),l("Error uploading resource: "+(d.message||d),"error")}finally{a&&(a.disabled=!1,a.innerHTML='<i class="fas fa-plus"></i> Create Resource')}}async function Ee(e){if(e&&confirm("Are you sure you want to delete this resource? This will remove the file from storage and the database entry."))try{const t=L(E,`resources/${e}`),s=await A(t);if(!s.exists()){l("Resource not found","error");return}const o=s.val();if(o.fileUrl&&o.storagePath)try{const r=H(j,o.storagePath);await oe(r),console.log("[DELETE] File deleted from Firebase Storage:",o.storagePath)}catch(r){console.warn("[DELETE] Could not delete file from storage:",r)}await Z(t),console.log("[DELETE] Resource deleted from database:",e),l("Resource deleted successfully","success")}catch(t){console.error("[DELETE] failed:",t),l("Error deleting resource: "+(t.message||t),"error")}}function z(){const e=i("resourcesContainer"),t=i("resourcesGrid"),s=i("emptyState");e&&t&&s&&(t.innerHTML="",s.style.display="block",s.querySelector("p").textContent="Select a course from the sidebar to view resources, or create a new resource.")}async function Le(){try{await Q(F),l("Logged out successfully","success"),setTimeout(()=>window.location.href="../landing/login.html",800)}catch(e){console.error("[LOGOUT] failed:",e),l("Failed to logout: "+(e.message||e),"error")}}function Se(e){if(!e&&e!==0)return"";const t=Number(e);return t<1024?`${t} bytes`:t<1048576?`${(t/1024).toFixed(1)} KB`:`${(t/1048576).toFixed(1)} MB`}function l(e,t="success"){let s=i("toast");s||(s=document.createElement("div"),s.id="toast",s.style.cssText=`
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
        `,document.body.appendChild(s));const o=t==="success"?'<i class="fas fa-check-circle"></i>':'<i class="fas fa-exclamation-triangle"></i>',r=t==="success"?"Success":"Error",n=t==="success"?"#4CAF50":"#f44336";s.innerHTML=`
        <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: ${n}; flex-shrink: 0;">
            ${o}
        </span>
        <span style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-weight: 600; font-size: 14px;">${r}</span>
            <span style="font-size: 13px; opacity: 0.9;">${e}</span>
        </span>
    `,s.style.borderLeftColor=n,s.style.opacity="1",setTimeout(()=>{s.style.opacity="0"},4e3)}function Te(){const e=i("createModal");e&&(e.style.display="flex")}function q(){const e=i("createModal");e&&(e.style.display="none")}function $(e=""){const t=document.createElement("div");return t.textContent=e,t.innerHTML}window.openCreateModal=Te;window.closeCreateModal=q;
