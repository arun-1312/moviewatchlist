// Environment Configuration
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://movieshelff.onrender.com';

// Helper function to get watchlist ID by name
async function getWatchlistIdByName(watchlistName) {
  const userId = localStorage.getItem("userId");
  const response = await fetch(`${API_BASE}/watchlists?user_id=${encodeURIComponent(userId)}`);
  const watchlists = await response.json();
  const watchlist = watchlists.find(w => w.name === watchlistName);
  return watchlist?.id;
}

document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");
    
    if (!username || !userId) {
        window.location.href = "index.html";
        return;
    }
    
    document.getElementById("user-name").textContent = username;
    fetchWatchlists();
    setupEventListeners();
    setupStarRating();
});

function logout() {
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    window.location.href = "index.html";
}

function setupEventListeners() {
    document.getElementById("create-watchlist-btn")?.addEventListener("click", createWatchlist);
    document.getElementById("logout-btn")?.addEventListener("click", logout);
    document.getElementById("close-modal")?.addEventListener("click", closeModal);
    document.getElementById("add-movie-form")?.addEventListener("submit", addMovie);
}

async function fetchWatchlists() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE}/watchlists?user_id=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        
        // Handle both response formats:
        // 1. Direct array response (legacy)
        // 2. { success: true, data: [...] } (current)
        const watchlists = Array.isArray(result) ? result : (result.data || []);
        
        console.log("Processed Watchlists:", watchlists);
        displayWatchlists(watchlists);

        // Fetch movies for each watchlist
        watchlists.forEach(watchlist => {
            if (watchlist.name) {
                fetchMovies(watchlist.name);
            }
        });
    } catch (error) {
        console.error("Error fetching watchlists:", error);
        alert("Failed to load watchlists. Please refresh the page.");
    }
}

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
    document.querySelectorAll(".star").forEach(star => {
        star.style.color = "#ccc";
        star.style.transform = "scale(1)";
    });
}

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
        star.addEventListener("mouseout", () => updateStars(ratingInput.value));
    });

    function updateStars(value) {
        stars.forEach((star, i) => {
            star.style.color = i < value ? "#ffd700" : "#ccc";
            star.style.transform = i < value ? "scale(1.1)" : "scale(1)";
        });
    }
}

function displayWatchlists(watchlists) {
    const sidebarContainer = document.getElementById("watchlist-container");
    const mainDisplay = document.getElementById("watchlist-display");
    if (!sidebarContainer || !mainDisplay) return;

    sidebarContainer.innerHTML = "";
    mainDisplay.innerHTML = "";

    // Ensure we have an array (even if empty)
    const validWatchlists = Array.isArray(watchlists) ? watchlists : [];
    
    if (validWatchlists.length === 0) {
        mainDisplay.innerHTML = `<p class="empty-state">No watchlists found. Create your first watchlist!</p>`;
        return;
    }

    validWatchlists.forEach(watchlist => {
        // Add to sidebar
        const listItem = document.createElement("li");
        listItem.textContent = watchlist.name;
        listItem.addEventListener("click", () => openModal(watchlist.name));
        sidebarContainer.appendChild(listItem);

        // Add to main display
        const watchlistCard = document.createElement("div");
        watchlistCard.className = "watchlist-card";
        
        const title = document.createElement("h3");
        title.textContent = watchlist.name;
        watchlistCard.appendChild(title);

        const moviesContainer = document.createElement("div");
        moviesContainer.id = `movies-${watchlist.name.replace(/\s+/g, '-')}`;
        watchlistCard.appendChild(moviesContainer);

        mainDisplay.appendChild(watchlistCard);
    });
}

function displayMovies(movies, watchlistName) {
    const containerId = `movies-${watchlistName.replace(/\s+/g, '-')}`;
    const moviesContainer = document.getElementById(containerId);
    if (!moviesContainer) return;

    moviesContainer.innerHTML = "";
    moviesContainer.className = "watchlist-grid";

    if (!Array.isArray(movies)) {
        moviesContainer.innerHTML = "<p>No movies found</p>";
        return;
    }

    movies.forEach(movie => {
        const movieCard = document.createElement("div");
        movieCard.className = "movie-card";
        movieCard.innerHTML = `
            <div class="movie-header">
                <h4>${movie.name}</h4>
                <span class="trash-icon" data-movie="${movie.name}">🗑️</span>
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

async function createWatchlist() {
    const nameInput = document.getElementById("watchlist-name");
    const watchlistName = nameInput.value.trim();
    const errorMessage = document.getElementById("errorMessage");
    
    if (!watchlistName) {
        errorMessage.textContent = "Please enter a watchlist name.";
        return;
    }

    const btn = document.getElementById("create-watchlist-btn");
    const btnText = document.getElementById("create-watchlist-text");
    const spinner = document.getElementById("create-watchlist-spinner");

    btn.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "inline-block";
    errorMessage.textContent = "";

    try {
        const userId = localStorage.getItem("userId");
        const response = await fetch(`${API_BASE}/watchlists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, name: watchlistName })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create watchlist");
        }

        nameInput.value = "";
        await fetchWatchlists();
    } catch (error) {
        console.error("Create watchlist error:", error);
        errorMessage.textContent = error.message;
    } finally {
        btn.disabled = false;
        btnText.style.display = "inline-block";
        spinner.style.display = "none";
    }
}

async function addMovie(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById("movie-name").value.trim(),
        genre: document.getElementById("movie-genre").value,
        platform: document.getElementById("platform").value,
        description: document.getElementById("description").value.trim(),
        review: parseInt(document.getElementById("review-rating").value) || 0,
        watchlistName: localStorage.getItem("selectedWatchlist")
    };

    if (!formData.name || !formData.genre || !formData.platform || !formData.watchlistName) {
        alert("Please fill in all required fields.");
        return;
    }

    try {
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

        closeModal();
        await fetchMovies(formData.watchlistName);
    } catch (error) {
        console.error("Add movie error:", error);
        alert(error.message);
    }
}

async function fetchMovies(watchlistName) {
    try {
        const watchlistId = await getWatchlistIdByName(watchlistName);
        if (!watchlistId) return;

        const response = await fetch(`${API_BASE}/movies?watchlist_id=${encodeURIComponent(watchlistId)}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        const movies = Array.isArray(result) ? result : (result.data || []);
        displayMovies(movies, watchlistName);
    } catch (error) {
        console.error("Fetch movies error:", error);
        displayMovies([], watchlistName);
    }
}

async function deleteMovie(movieName, watchlistName) {
    if (!confirm("Are you sure you want to delete this movie?")) return;

    try {
        const watchlistId = await getWatchlistIdByName(watchlistName);
        if (!watchlistId) throw new Error("Watchlist not found");

        const response = await fetch(`${API_BASE}/movies`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ watchlist_id: watchlistId, movieName })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to delete movie");
        }

        await fetchMovies(watchlistName);
    } catch (error) {
        console.error("Delete movie error:", error);
        alert(error.message);
    }
}