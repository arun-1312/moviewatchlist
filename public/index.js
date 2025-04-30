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

    // Validate inputs
    if (!username || !password) {
        errorElement.textContent = 'Username and password are required';
        return;
    }

    if (!isLoginMode && password.length < 6) {
        errorElement.textContent = 'Password must be at least 6 characters';
        return;
    }

    // Show loading state
    registerBtn.disabled = true;
    registerText.style.display = "none";
    registerSpinner.style.display = "inline-block";

    try {
        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        const response = await fetch(`${API_BASE}${endpoint}`, {  // Added API_BASE
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, userpassword: password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || (isLoginMode ? 'Login failed' : 'Registration failed'));
        }

        // Handle response data structure
        const userData = data.data || data.user || data;
        if (!userData.userId && !userData.id) {
            throw new Error('Authentication succeeded but no user ID received');
        }

        // Store user data - consistent with dashboard.js expectations
        localStorage.setItem("username", userData.username || username);
        localStorage.setItem("userId", (userData.userId || userData.id).toString());

        // Add timestamp for session validation
        localStorage.setItem("lastAuth", Date.now().toString());

        // Ensure storage is complete before redirect
        await new Promise(resolve => setTimeout(resolve, 50));
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
    document.getElementById('userpassword').placeholder = isLogin ? 'Create a Password (min 6 chars)' : 'Password';
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

// ===== ENVIRONMENT CONFIG =====
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://movieshelff.onrender.com';

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", () => {
    // Clear any existing auth data if returning to login
    if (!window.location.pathname.endsWith('dashboard.html')) {
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
    }

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