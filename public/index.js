// ===== DOM ELEMENTS =====
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");
const registerBtn = document.getElementById("register-btn");
const registerText = document.getElementById("register-text");
const registerSpinner = document.getElementById("register-spinner");
const toggleLink = document.getElementById("toggle-link");
const authTitle = document.getElementById("auth-title");
const togglePrompt = document.getElementById("toggle-prompt");
const getStartedBtn = document.getElementById("get-started-btn");
const ctaStartBtn = document.getElementById("cta-start-btn");
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const navbar = document.querySelector(".navbar");

// ===== AUTH FUNCTIONS =====
async function handleAuth(event, mode) {
  event.preventDefault();
  errorMessage.textContent = "";

  const username = document.getElementById("username").value.trim();
  const passwordField = mode === 'register' ? "userpassword" : "password";
  const userpassword = document.getElementById(passwordField).value.trim();

  if (!username || !userpassword) {
    errorMessage.textContent = "Username and password are required.";
    return;
  }

  // Show loading state
  if (registerBtn) {
    registerBtn.disabled = true;
    registerText.style.display = "none";
    registerSpinner.style.display = "inline-block";
  }

  try {
    const endpoint = mode === 'register' ? 'register' : 'login';
    const apiUrl = `${window.location.origin}/auth/${endpoint}`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, userpassword })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("username", username);
      window.location.href = "dashboard.html";
    } else {
      errorMessage.textContent = data.error || `${mode === 'register' ? 'Registration' : 'Login'} failed`;
    }
  } catch (error) {
    console.error("Auth error:", error);
    errorMessage.textContent = "Network error. Please try again.";
  } finally {
    if (registerBtn) {
      registerBtn.disabled = false;
      registerText.style.display = "inline-block";
      registerSpinner.style.display = "none";
    }
  }
}

function toggleAuthMode(event) {
  event.preventDefault();
  const currentMode = signupForm.dataset.mode;
  const newMode = currentMode === 'signup' ? 'login' : 'signup';
  
  signupForm.dataset.mode = newMode;
  authTitle.textContent = newMode === 'login' ? 'Login' : 'Get Started Now';
  if (registerText) registerText.textContent = newMode === 'login' ? 'Login' : 'Create Account';
  togglePrompt.textContent = newMode === 'login' ? "Don't have an account?" : "Already have an account?";
  toggleLink.textContent = newMode === 'login' ? 'Sign Up here' : 'Login here';
  errorMessage.textContent = "";
}

// ===== UI FUNCTIONS =====
function scrollToSignup(event) {
  event.preventDefault();
  document.getElementById("signup").scrollIntoView({ behavior: 'smooth' });
}

function setupMobileMenu() {
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    document.querySelectorAll(".nav-menu a").forEach(link => {
      link.addEventListener("click", () => {
        if (navMenu.classList.contains("active")) {
          hamburger.classList.remove("active");
          navMenu.classList.remove("active");
        }
      });
    });
  }
}

function setupNavbarScroll() {
  if (navbar) {
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 50);
    });
  }
}

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", () => {
  // Auth Setup
  if (signupForm) signupForm.addEventListener("submit", (e) => handleAuth(e, 'register'));
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));
  if (toggleLink) toggleLink.addEventListener("click", toggleAuthMode);

  // UI Setup
  if (getStartedBtn) getStartedBtn.addEventListener("click", scrollToSignup);
  if (ctaStartBtn) ctaStartBtn.addEventListener("click", scrollToSignup);
  
  setupMobileMenu();
  setupNavbarScroll();

  // Initialize form mode
  if (signupForm) signupForm.dataset.mode = 'signup';
});