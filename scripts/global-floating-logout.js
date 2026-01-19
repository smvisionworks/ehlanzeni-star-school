// ========= Firebase imports (CDN – plain JS) =========
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "/scripts/firebase.js";

/* ========= Inject CSS ========= */
const style = document.createElement("style");
style.textContent = `
/* Modal styles */
.modal {
  display: none;
  position: fixed;
  z-index: 10000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: white;
  margin: 15% auto;
  padding: 0;
  width: 90%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

@keyframes slideUp {
  from { 
    transform: translateY(50px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  background: linear-gradient(135deg, #1B3A61, #132945);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-body {
  padding: 30px;
  text-align: center;
}

.modal-body p {
  color: #666;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 30px 0;
}

.modal-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.modal-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
}

.cancel-btn {
  background: #E3EAF5;
  color: #1B3A61;
}

.cancel-btn:hover {
  background: #d3dceb;
  transform: translateY(-2px);
}

.confirm-btn {
  background: linear-gradient(135deg, #D4A024, #c28f1e);
  color: white;
  box-shadow: 0 4px 15px rgba(212, 160, 36, 0.3);
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #c28f1e, #b07e18);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 160, 36, 0.4);
}

/* Floating menu */
.floating-menu {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 9999;
}

.floating-burger {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1B3A61, #132945);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 22px;
  box-shadow: 0 8px 18px rgba(0,0,0,0.25);
  transition: all 0.3s ease;
}

.floating-burger:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(0,0,0,0.3);
}

.floating-actions {
  display: none;
  margin-bottom: 10px;
  animation: slideUp 0.3s ease;
}

.floating-actions.show {
  display: block;
}

.floating-logout-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  border: none;
  padding: 14px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  transition: all 0.3s ease;
}

.floating-logout-btn:hover {
  background: linear-gradient(135deg, #b91c1c, #991b1b);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    margin: 10% auto;
    width: 95%;
  }
  
  .modal-buttons {
    flex-direction: column;
  }
  
  .modal-btn {
    width: 100%;
  }
}
`;
document.head.appendChild(style);

/* ========= Inject HTML ========= */
const wrapper = document.createElement("div");
wrapper.className = "floating-menu";
wrapper.innerHTML = `
  <div class="floating-actions" id="floatingActions">
    <button class="floating-logout-btn" id="floatingLogoutBtn">
      <i class="fas fa-sign-out-alt"></i> Logout
    </button>
  </div>
  <div class="floating-burger" id="floatingBurger">
    <i class="fas fa-bars"></i>
  </div>
`;
document.body.appendChild(wrapper);

// Check if modal already exists in HTML, if not, create it
let modal = document.getElementById("logoutModal");
if (!modal) {
    modal = document.createElement("div");
    modal.id = "logoutModal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Confirm Logout</h3>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to log out of Ehlazeni Star School?</p>
                <div class="modal-buttons">
                    <button class="modal-btn cancel-btn" id="cancelLogoutBtn">Cancel</button>
                    <button class="modal-btn confirm-btn" id="confirmLogoutBtn">Logout</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/* ========= Behaviour ========= */
const burger = document.getElementById("floatingBurger");
const actions = document.getElementById("floatingActions");
const logoutBtn = document.getElementById("floatingLogoutBtn");
const closeButton = modal.querySelector(".close-button");
const cancelBtn = modal.querySelector(".cancel-btn");
const confirmBtn = modal.querySelector(".confirm-btn");

// Toggle floating actions menu
burger.addEventListener("click", function () {
    actions.classList.toggle("show");
});

// Open modal when logout button is clicked
logoutBtn.addEventListener("click", function () {
    modal.style.display = "block";
    actions.classList.remove("show");
});

// Close modal when close button is clicked
closeButton.addEventListener("click", function () {
    modal.style.display = "none";
});

// Close modal when cancel button is clicked
cancelBtn.addEventListener("click", function () {
    modal.style.display = "none";
});

// Confirm logout
confirmBtn.addEventListener("click", async function () {
    try {
        // Change button to loading state
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        confirmBtn.disabled = true;
        
        await signOut(auth);
        window.location.href = "/landing/login.html";
    } catch (error) {
        console.error("Logout error:", error);
        // Reset button state
        confirmBtn.innerHTML = 'Logout';
        confirmBtn.disabled = false;
        
        // Show error toast
        showToast("Failed to logout. Please try again.", "error");
    }
});

// Close modal when clicking outside
window.addEventListener("click", function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// Close modal with Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && modal.style.display === "block") {
        modal.style.display = "none";
    }
});

// Toast notification function
function showToast(message, type = "info") {
    // Check if toast already exists
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = "toast";
    
    if (type === "error") {
        toast.classList.add("error");
    }
    
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Remove the old logout button from sidebar if it exists
document.addEventListener("DOMContentLoaded", function() {
    const oldLogoutBtn = document.querySelector('.logout-btn');
    if (oldLogoutBtn && oldLogoutBtn.parentElement) {
        // Instead of removing, hide it and make it open the modal
        oldLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            modal.style.display = "block";
        });
    }
});