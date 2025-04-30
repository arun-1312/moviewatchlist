// Environment Configuration with enhanced fallbacks
const API_BASE = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://movieshelff.onrender.com';
  })();
  
  // State Management
  let appState = {
    isLoading: false,
    currentUser: {
      id: null,
      username: null
    }
  };
  
  // Helper function to get watchlist ID by name with enhanced validation
  async function getWatchlistIdByName(watchlistName) {
    if (!watchlistName || !appState.currentUser.id) {
      throw new Error("Invalid watchlist name or user ID");
    }
  
    try {
      const response = await fetch(`${API_BASE}/watchlists?user_id=${encodeURIComponent(appState.currentUser.id)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch watchlists: ${response.status}`);
      }
  
      const result = await response.json();
      const watchlists = result.success ? result.data : result;
      
      if (!Array.isArray(watchlists)) {
        throw new Error("Invalid watchlists data format");
      }
  
      const watchlist = watchlists.find(w => w.name === watchlistName);
      if (!watchlist) {
        throw new Error(`Watchlist "${watchlistName}" not found`);
      }
      return watchlist.id;
    } catch (error) {
      console.error("Error getting watchlist ID:", error);
      throw error;
    }
  }
  
  // Enhanced initialization
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const username = localStorage.getItem("username");
      const userId = localStorage.getItem("userId");
  
      // Enhanced validation
      if (!username || !userId || userId === "undefined" || userId === "null") {
        console.warn("Missing user credentials, redirecting to login");
        logout();
        return;
      }
  
      // Update application state
      appState.currentUser = {
        id: userId,
        username: username
      };
  
      document.getElementById("user-name").textContent = username;
      await initializeDashboard();
    } catch (error) {
      console.error("Initialization error:", error);
      logout();
    }
  });
  
  async function initializeDashboard() {
    try {
      setLoadingState(true);
      await fetchWatchlists();
      setupEventListeners();
      setupStarRating();
    } catch (error) {
      console.error("Dashboard initialization failed:", error);
      showErrorNotification("Failed to initialize dashboard. Please try again.");
    } finally {
      setLoadingState(false);
    }
  }
  
  function setLoadingState(isLoading) {
    appState.isLoading = isLoading;
    const loader = document.getElementById("global-loader");
    if (loader) {
      loader.style.display = isLoading ? "block" : "none";
    }
  }
  
  function setupEventListeners() {
    // Safe event listener attachment
    const addEvent = (id, event, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, fn);
    };
  
    addEvent("create-watchlist-btn", "click", createWatchlist);
    addEvent("logout-btn", "click", logout);
    addEvent("close-modal", "click", closeModal);
    addEvent("add-movie-form", "submit", addMovie);
  }
  
  function logout() {
    // Clear all application state
    localStorage.clear();
    appState = {
      isLoading: false,
      currentUser: {
        id: null,
        username: null
      }
    };
    window.location.href = "index.html";
  }
  
  // Enhanced fetchWatchlists with proper state management
  async function fetchWatchlists() {
    if (!appState.currentUser.id) {
      console.error("No valid user ID available");
      logout();
      return;
    }
  
    try {
      setLoadingState(true);
      const response = await fetch(`${API_BASE}/watchlists?user_id=${encodeURIComponent(appState.currentUser.id)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
  
      const result = await response.json();
      const watchlists = result.success ? result.data : result;
      
      if (!Array.isArray(watchlists)) {
        throw new Error("Invalid watchlists data format");
      }
  
      displayWatchlists(watchlists);
  
      // Parallel fetch for movies
      await Promise.all(
        watchlists.map(watchlist => 
          watchlist.name ? fetchMovies(watchlist.name) : Promise.resolve()
        )
      );
    } catch (error) {
      console.error("Error fetching watchlists:", error);
      
      const errorMessage = error.message.includes("401") || error.message.includes("403")
        ? "Session expired. Please login again."
        : "Failed to load watchlists.";
  
      showErrorNotification(errorMessage);
      
      if (error.message.includes("401") || error.message.includes("403")) {
        setTimeout(logout, 2000);
      }
    } finally {
      setLoadingState(false);
    }
  }
  
  // Enhanced modal functions
  window.openModal = function(watchlistName) {
    const movieModal = document.getElementById("addMovieModal");
    if (!movieModal) return;
  
    document.getElementById("modal-title").textContent = `Add Movie to ${watchlistName}`;
    movieModal.style.display = "block";
    movieModal.classList.add("show");
    localStorage.setItem("selectedWatchlist", watchlistName);
  };
  
  function closeModal() {
    const movieModal = document.getElementById("addMovieModal");
    if (!movieModal) return;
  
    movieModal.style.display = "none";
    document.getElementById("add-movie-form").reset();
    document.getElementById("review-rating").value = 0;
    updateStars(0);
  }
  
  // Enhanced star rating
  function setupStarRating() {
    const stars = document.querySelectorAll(".star");
    const ratingInput = document.getElementById("review-rating");
  
    stars.forEach((star, index) => {
      star.addEventListener("click", () => {
        const value = index + 1;
        ratingInput.value = value;
        updateStars(value);
      });
  
      star.addEventListener("mouseover", () => updateStars(index + 1));
      star.addEventListener("mouseout", () => updateStars(Number(ratingInput.value)));
    });
  }
  
  function updateStars(value) {
    const stars = document.querySelectorAll(".star");
    stars.forEach((star, i) => {
      star.style.color = i < value ? "#ffd700" : "#ccc";
      star.style.transform = i < value ? "scale(1.1)" : "scale(1)";
    });
  }
  
  // Enhanced watchlist display
  function displayWatchlists(watchlists) {
    const sidebarContainer = document.getElementById("watchlist-container");
    const mainDisplay = document.getElementById("watchlist-display");
    if (!sidebarContainer || !mainDisplay) return;
  
    sidebarContainer.innerHTML = "";
    mainDisplay.innerHTML = "";
  
    const validWatchlists = Array.isArray(watchlists) ? watchlists : [];
    
    if (validWatchlists.length === 0) {
      mainDisplay.innerHTML = `
        <div class="empty-state">
          <p>No watchlists found.</p>
          <button onclick="document.getElementById('create-watchlist-btn').click()" 
                  class="btn btn-primary">
            Create your first watchlist
          </button>
        </div>
      `;
      return;
    }
  
    validWatchlists.forEach(watchlist => {
      // Sidebar item
      const listItem = document.createElement("li");
      listItem.className = "watchlist-item";
      listItem.innerHTML = `
        <span>${watchlist.name}</span>
        <button class="add-movie-btn" data-watchlist="${watchlist.name}">+</button>
      `;
      sidebarContainer.appendChild(listItem);
  
      // Main display card
      const watchlistCard = document.createElement("div");
      watchlistCard.className = "watchlist-card";
      
      watchlistCard.innerHTML = `
        <div class="watchlist-header">
          <h3>${watchlist.name}</h3>
          <button class="add-movie-btn" data-watchlist="${watchlist.name}">
            Add Movie
          </button>
        </div>
        <div id="movies-${watchlist.name.replace(/\s+/g, '-')}" class="movies-container"></div>
      `;
  
      mainDisplay.appendChild(watchlistCard);
  
      // Add event listeners to all add movie buttons
      document.querySelectorAll(`[data-watchlist="${watchlist.name}"]`).forEach(btn => {
        btn.addEventListener("click", () => openModal(watchlist.name));
      });
    });
  }
  
  // Enhanced movie display
  function displayMovies(movies, watchlistName) {
    const containerId = `movies-${watchlistName.replace(/\s+/g, '-')}`;
    const moviesContainer = document.getElementById(containerId);
    if (!moviesContainer) return;
  
    moviesContainer.innerHTML = "";
    moviesContainer.className = "watchlist-grid";
  
    if (!Array.isArray(movies) || movies.length === 0) {
      moviesContainer.innerHTML = `
        <div class="empty-movies">
          <p>No movies in this watchlist yet.</p>
          <button class="btn btn-sm btn-primary" data-watchlist="${watchlistName}">
            Add your first movie
          </button>
        </div>
      `;
      
      // Add event listener to the button
      const addBtn = moviesContainer.querySelector(`[data-watchlist="${watchlistName}"]`);
      if (addBtn) {
        addBtn.addEventListener("click", () => openModal(watchlistName));
      }
      return;
    }
  
    movies.forEach(movie => {
      const movieCard = document.createElement("div");
      movieCard.className = "movie-card";
      movieCard.innerHTML = `
        <div class="movie-header">
          <h4>${movie.name}</h4>
          <span class="trash-icon" data-movie="${movie.name}" data-watchlist="${watchlistName}">🗑️</span>
        </div>
        <p><strong>Genre:</strong> ${movie.genre || 'N/A'}</p>
        <p><strong>Platform:</strong> ${movie.platform || 'N/A'}</p>
        <p><strong>Review:</strong> ${"★".repeat(movie.review || 0)}</p>
        <p><strong>Description:</strong> ${movie.description || 'No description'}</p>
      `;
  
      movieCard.querySelector(".trash-icon").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteMovie(movie.name, watchlistName);
      });
  
      moviesContainer.appendChild(movieCard);
    });
  }
  
  // Enhanced create watchlist
  async function createWatchlist() {
    const nameInput = document.getElementById("watchlist-name");
    const watchlistName = nameInput?.value.trim();
    const errorMessage = document.getElementById("errorMessage");
    
    if (!watchlistName) {
      showErrorNotification("Please enter a watchlist name.");
      return;
    }
  
    const btn = document.getElementById("create-watchlist-btn");
    if (!btn) return;
  
    const originalText = btn.innerHTML;
    setButtonLoading(btn, true);
  
    try {
      const response = await fetch(`${API_BASE}/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: appState.currentUser.id, 
          name: watchlistName 
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create watchlist");
      }
  
      nameInput.value = "";
      await fetchWatchlists();
      showSuccessNotification("Watchlist created successfully!");
    } catch (error) {
      console.error("Create watchlist error:", error);
      showErrorNotification(error.message);
    } finally {
      setButtonLoading(btn, false, originalText);
    }
  }
  
  // Enhanced add movie
  async function addMovie(event) {
    event.preventDefault();
    
    const form = document.getElementById("add-movie-form");
    const submitBtn = document.getElementById("add-movie-btn");
    if (!form || !submitBtn) return;
  
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
  
    try {
      const formData = {
        name: document.getElementById("movie-name")?.value.trim() || "",
        genre: document.getElementById("movie-genre")?.value || "",
        platform: document.getElementById("platform")?.value || "",
        description: document.getElementById("description")?.value.trim() || "",
        review: parseInt(document.getElementById("review-rating")?.value) || 0,
        watchlistName: localStorage.getItem("selectedWatchlist") || ""
      };
  
      if (!formData.name || !formData.genre || !formData.platform || !formData.watchlistName) {
        throw new Error("Please fill in all required fields");
      }
  
      const watchlistId = await getWatchlistIdByName(formData.watchlistName);
      if (!watchlistId) throw new Error("Watchlist not found");
  
      const response = await fetch(`${API_BASE}/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist_id: watchlistId,
          name: formData.name,
          genre: formData.genre,
          review: formData.review,
          description: formData.description,
          platform: formData.platform
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add movie");
      }
  
      await fetchMovies(formData.watchlistName);
      closeModal();
      showSuccessNotification("Movie added successfully!");
    } catch (error) {
      console.error("Add movie error:", error);
      showErrorNotification(error.message);
    } finally {
      setButtonLoading(submitBtn, false, originalText);
    }
  }
  
  // Enhanced fetch movies
  async function fetchMovies(watchlistName) {
    if (!watchlistName) return;
  
    try {
      const watchlistId = await getWatchlistIdByName(watchlistName);
      if (!watchlistId) return;
  
      const response = await fetch(`${API_BASE}/movies?watchlist_id=${encodeURIComponent(watchlistId)}`);
      if (!response.ok) throw new Error(`Failed to fetch movies: ${response.status}`);
  
      const result = await response.json();
      const movies = Array.isArray(result) ? result : (result.data || []);
      displayMovies(movies, watchlistName);
    } catch (error) {
      console.error("Fetch movies error:", error);
      displayMovies([], watchlistName);
      showErrorNotification("Failed to load movies");
    }
  }
  
  // Enhanced delete movie
  async function deleteMovie(movieName, watchlistName) {
    if (!confirm(`Are you sure you want to delete "${movieName}"?`)) return;
  
    try {
      const watchlistId = await getWatchlistIdByName(watchlistName);
      if (!watchlistId) throw new Error("Watchlist not found");
  
      const response = await fetch(`${API_BASE}/movies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          watchlist_id: watchlistId, 
          movieName: movieName 
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete movie");
      }
  
      await fetchMovies(watchlistName);
      showSuccessNotification("Movie deleted successfully!");
    } catch (error) {
      console.error("Delete movie error:", error);
      showErrorNotification(error.message);
    }
  }
  
  // UI Helper Functions
  function setButtonLoading(button, isLoading, originalText = "") {
    if (!button) return;
    
    button.disabled = isLoading;
    button.innerHTML = isLoading 
      ? `<span class="spinner">⌛</span> Processing...` 
      : originalText;
  }
  
  function showSuccessNotification(message) {
    showNotification(message, "success");
  }
  
  function showErrorNotification(message) {
    showNotification(message, "error");
  }
  
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="close-notification">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after delay
    const timer = setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    // Manual close
    notification.querySelector(".close-notification").addEventListener("click", () => {
      clearTimeout(timer);
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 500);
    });
  }