export async function loadSidebar(activePage) {
    const holder = document.getElementById("sidebar-placeholder");

    // Load sidebar HTML
    const html = await fetch("../components/sidebar.html").then(r => r.text());
    holder.innerHTML = html;

    // Highlight active nav link
    document.querySelectorAll(".nav-links a").forEach(link => {
        if (link.getAttribute("href") === activePage) {
            link.classList.add("active");
        }
    });

    // Attach logout button listeners
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutModal = document.getElementById("logoutModal");
    const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
    const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");

    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener("click", () => logoutModal.style.display = "block");
        cancelLogoutBtn.addEventListener("click", () => logoutModal.style.display = "none");
        confirmLogoutBtn.addEventListener("click", () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../../index.html";
        });
    }
}
