document.getElementById("signup-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form from reloading the page

    const username = document.getElementById("username").value;
    const userpassword = document.getElementById("userpassword").value;
    const errorMessage = document.getElementById("errorMessage");
    const registerBtn = document.getElementById("register-btn");
    const registerText = document.getElementById("register-text");
    const registerSpinner = document.getElementById("register-spinner");

    // Clear previous error message
    errorMessage.textContent = "";

    // Basic validation
    if (!username || !userpassword) {
        errorMessage.textContent = "Username and password are required.";
        return;
    }

    // Disable button and show spinner
    registerBtn.disabled = true;
    registerText.style.display = "none";
    registerSpinner.style.display = "inline-block";

    try {
        const response = await fetch("http://localhost:5000/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, userpassword })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Signup successful! Redirecting to Dashboard...");
            localStorage.setItem("username", username);
            window.location.href = "dashboard.html";
        } else {
            // Show error message from backend
            errorMessage.textContent = data.error || "Registration failed. Please try again.";
        }
    } catch (error) {
        console.error("Error during registration:", error);
        errorMessage.textContent = "Failed to register. Please try again.";
    } finally {
        // Re-enable button and hide spinner
        registerBtn.disabled = false;
        registerText.style.display = "inline-block";
        registerSpinner.style.display = "none";
    }
});

document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    const username = document.getElementById("username").value;
    const userpassword = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    // Clear previous error message
    errorMessage.textContent = "";

    // Basic validation
    if (!username || !userpassword) {
        errorMessage.textContent = "Username and password are required.";
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, userpassword })
        });

        const result = await response.json();
        console.log("Login Response:", result); // Log the response

        if (response.ok) {
            // ✅ Store user session & Redirect
            localStorage.setItem("username", username);
            window.location.href = "dashboard.html";
        } else {
            // ❌ Show error message if login fails
            errorMessage.textContent = result.error || "Invalid credentials";
        }
    } catch (error) {
        console.error("Error during login:", error);
        errorMessage.textContent = "Failed to login. Please try again.";
    }
});