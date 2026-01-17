document.getElementById("reset-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("reset-email").value;

    try {
        const res = await fetch("http://localhost:5000/password-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (data.success) {
            showToast("Password reset email sent!", "success");
        } else {
            showToast(data.error, "error");
        }
    } catch (err) {
        showToast("Failed to connect to server.", "error");
    }
});
