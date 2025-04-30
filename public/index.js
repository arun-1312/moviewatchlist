// ===== DOM ELEMENTS =====
const signupForm = document.getElementById("signup-form");
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
async function handleAuth(event) {
    event.preventDefault();
    
    const form = event.target;
    const isLoginMode = form.dataset.mode === 'login';
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('userpassword').value.trim();
    const errorElement = document.getElementById('errorMessage');

    // Clear previous errors
    errorElement.textContent = '';

    // Show loading state
    registerBtn.disabled = true;
    registerText.style.display = "none";
    registerSpinner.style.display = "inline-block";

    try {
        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, userpassword: password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
        }

        // Verify and store user data
        if (!data.data?.userId && !data.user?.id) {
            throw new Error('Authentication succeeded but no user ID received');
        }

        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", data.userId);
        
        window.location.href = 'dashboard.html';

    } catch (error) {
        errorElement.textContent = error.message;
        console.error('Auth error:', error);
    } finally {
        registerBtn.disabled = false;
        registerText.style.display = "inline-block";
        registerSpinner.style.display = "none";
    }
}

function toggleAuthMode(event) {
    event.preventDefault();
    const form = document.getElementById('signup-form');
    const isLogin = form.dataset.mode === 'login';
    
    // Toggle the mode
    form.dataset.mode = isLogin ? 'signup' : 'login';
    
    // Update UI
    authTitle.textContent = isLogin ? 'Get Started' : 'Login';
    registerText.textContent = isLogin ? 'Create Account' : 'Login';
    document.getElementById('userpassword').placeholder = isLogin ? 'Create a Password' : 'Password';
    togglePrompt.textContent = isLogin ? 'Already have an account?' : 'Need an account?';
    toggleLink.textContent = isLogin ? 'Login here' : 'Sign up';
    errorMessage.textContent = '';
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
  if (signupForm) signupForm.addEventListener("submit", handleAuth);
  if (toggleLink) toggleLink.addEventListener("click", toggleAuthMode);

  // UI Setup
  if (getStartedBtn) getStartedBtn.addEventListener("click", scrollToSignup);
  if (ctaStartBtn) ctaStartBtn.addEventListener("click", scrollToSignup);
  
  setupMobileMenu();
  setupNavbarScroll();

  // Initialize form mode
  if (signupForm) signupForm.dataset.mode = 'signup';
});