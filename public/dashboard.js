const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://movieshelff.onrender.com' 
  : 'http://localhost:5000';
  

document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (!username) {
        window.location.href = "index.html";
        return;
    }
    document.getElementById("user-name").textContent = username;

    fetchWatchlists();
    setupEventListeners();
    setupStarRating(); // Initialize star rating system
});

function logout() {
    localStorage.removeItem("username");
    window.location.href = "index.html";
}
function setupEventListeners() {
    const createWatchlistBtn = document.getElementById("create-watchlist-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const closeModalBtn = document.getElementById("close-modal");
    const addMovieForm = document.getElementById("add-movie-form");

    if (createWatchlistBtn) createWatchlistBtn.addEventListener("click", createWatchlist);
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (addMovieForm) addMovieForm.addEventListener("submit", addMovie);
}


async function fetchWatchlists() {
    const userId = localStorage.getItem("userId");
    if (!username) return;

    try {
        const userId = localStorage.getItem("userId");
        const response = await fetch(`/watchlists?user_id=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const watchlists = await response.json();
        console.log("Fetched Watchlists:", watchlists);
        displayWatchlists(watchlists);

        // Fetch movies for all watchlists
        if (Array.isArray(watchlists)) {
            watchlists.forEach(watchlist => {
                // Use the correct watchlist name property based on your API response
                const watchlistName = watchlist.name;
                if (watchlistName) {
                    fetchMovies(watchlistName);
                }
            });
        }
    } catch (error) {
        console.error("Error fetching watchlists:", error);
    }
}

window.openModal = function (watchlistName) {

        const movieModal = document.getElementById("addMovieModal");
    
        const modalTitle = document.getElementById("modal-title");
    
    
    
        if (movieModal) {
    
            console.log("Opening modal for watchlist:", watchlistName); // Debugging
    
            modalTitle.textContent = `Add Movie to ${watchlistName}`;
    
            movieModal.style.display = "block"; // Show the modal
    
            movieModal.classList.add("show"); // Add a class to make it visible
    
            localStorage.setItem("selectedWatchlist", watchlistName);
    
        } else {
    
            console.error("Modal not found in the DOM.");
    
        }
    
    };
    
function closeModal() {
    
        const movieModal = document.getElementById("addMovieModal");
    
        if (movieModal) {
    
            movieModal.style.display = "none";
    
            document.getElementById("add-movie-form").reset();
    
            document.getElementById("review-rating").value = 0;
    
            const stars = document.querySelectorAll(".star");
    
            stars.forEach(star => star.style.color = "#ccc");
    
        }
    
    }



// Star Rating System
function setupStarRating() {
    const stars = document.querySelectorAll(".star");
    const ratingInput = document.getElementById("review-rating");

    stars.forEach((star, index) => {
        star.addEventListener("click", () => {
            const value = index + 1;
            ratingInput.value = value;
            
            stars.forEach((s, i) => {
                s.classList.toggle("active", i < value);
                s.style.transform = i < value ? "scale(1.1)" : "scale(1)";
            });
        });

        star.addEventListener("mouseover", () => {
            const hoverValue = index + 1;
            stars.forEach((s, i) => {
                s.style.color = i < hoverValue ? "#ffd700" : "#ccc";
                s.style.transform = i < hoverValue ? "scale(1.1)" : "scale(1)";
            });
        });

        star.addEventListener("mouseout", () => {
            const currentValue = ratingInput.value;
            stars.forEach((s, i) => {
                s.style.color = i < currentValue ? "#ffd700" : "#ccc";
                s.style.transform = i < currentValue ? "scale(1.1)" : "scale(1)";
            });
        });
    });
}



function displayWatchlists(watchlists) {
    const sidebarContainer = document.getElementById("watchlist-container");
    const mainDisplay = document.getElementById("watchlist-display");
    if (!sidebarContainer || !mainDisplay) return;

    sidebarContainer.innerHTML = "";
    mainDisplay.innerHTML = "";

    // Ensure watchlists is an array
    if (!Array.isArray(watchlists)) {
        console.error("Expected an array of watchlists, but got:", watchlists);
        return;
    }

    watchlists.forEach(watchlist => {
        // Add to sidebar
        const listItem = document.createElement("li");
        listItem.textContent = watchlist.name;
        listItem.addEventListener("click", () => {
            console.log("Watchlist clicked:", watchlist.watchlistName); // Debugging
            openModal(watchlist.watchlistName);
        });
        sidebarContainer.appendChild(listItem);

        // Add to main display
        const watchlistCard = document.createElement("div");
        watchlistCard.classList.add("watchlist-card");

        // Watchlist name
        const watchlistNameElement = document.createElement("h3");
        watchlistNameElement.textContent = watchlist.name;
        watchlistCard.appendChild(watchlistNameElement);

        // Movies container
        const moviesContainer = document.createElement("div");
        moviesContainer.id = `movies-${watchlist.watchlistName}`; // Unique ID for each watchlist's movies
        watchlistCard.appendChild(moviesContainer);

        mainDisplay.appendChild(watchlistCard);
    });
}

function displayMovies(movies, watchlistName) {
    const moviesContainer = document.getElementById(`movies-${watchlistName}`);
    if (!moviesContainer) {
        console.error("Movies container not found for watchlist:", watchlistName);
        return;
    }

    // Clear previous content
    moviesContainer.innerHTML = "";

    // Apply horizontal layout classes
    moviesContainer.classList.add("watchlist-grid");
    moviesContainer.style.display = "flex";
    moviesContainer.style.overflowX = "auto";
    moviesContainer.style.gap = "20px";
    moviesContainer.style.paddingBottom = "16px";

    // Ensure movies is an array
    if (!Array.isArray(movies)) {
        console.error("Expected an array of movies, but got:", movies);
        moviesContainer.innerHTML = "<p>No movies found</p>";
        return;
    }

    // Render each movie
    movies.forEach(movie => {
        const movieCard = document.createElement("div");
        movieCard.classList.add("movie-card");
        movieCard.style.minWidth = "240px"; // Ensure fixed width
        movieCard.style.flexShrink = "0"; // Prevent squishing

        movieCard.innerHTML = `
            <div class="movie-header">
                <h4>${movie.name}</h4>
                <span class="trash-icon" data-movie-name="${movie.name}">🗑️</span>
            </div>
            <p><strong>Genre:</strong> ${movie.genre}</p>
            <p><strong>Platform:</strong> ${movie.platform}</p>
            <p><strong>Review:</strong> ${"★".repeat(movie.review)}</p>
            <p><strong>Description:</strong> ${movie.description}</p>
        `;

        const trashIcon = movieCard.querySelector(".trash-icon");
        trashIcon.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteMovie(movie.name, watchlistName);
        });

        moviesContainer.appendChild(movieCard);
    });
}


async function deleteMovie(movieName, watchlistName) {
    const userId = localStorage.getItem("userId");
    if (!userId || !watchlistName || !movieName) return;

    // Confirmation dialog
    const confirmDelete = confirm("Are you sure you want to delete this movie?");
    if (!confirmDelete) return;

    try {
        // First get watchlist_id for the watchlistName
        const watchlistResponse = await fetch(`/watchlists?user_id=${encodeURIComponent(userId)}`);
        const watchlists = await watchlistResponse.json();
        const watchlist = watchlists.find(w => w.name === watchlistName);
        
        if (!watchlist) {
            throw new Error("Watchlist not found");
        }

        const response = await fetch('/movies', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                watchlist_id: watchlist.id,
                movieName
            })
        });

        const result = await response.json();
        console.log("Backend Response:", result);

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }

        alert(result.message);
        fetchMovies(watchlistName); // Refresh the movie list
    } catch (error) {
        console.error("Error deleting movie:", error);
        alert(error.message || "Failed to delete movie. Please try again.");
    }
}

async function createWatchlist() {
    const watchlistName = document.getElementById("watchlist-name").value.trim();
    const createWatchlistBtn = document.getElementById("create-watchlist-btn");
    const createWatchlistText = document.getElementById("create-watchlist-text");
    const createWatchlistSpinner = document.getElementById("create-watchlist-spinner");
    const errorMessage = document.getElementById("errorMessage");

    // Check if elements exist
    if (!createWatchlistBtn || !createWatchlistText || !createWatchlistSpinner) {
        console.error("One or more elements are missing in the DOM.");
        return;
    }

    if (!watchlistName) {
        errorMessage.textContent = "Please enter a watchlist name.";
        return;
    }

    // Disable button and show spinner
    createWatchlistBtn.disabled = true;
    createWatchlistText.style.display = "none";
    createWatchlistSpinner.style.display = "inline-block";

    try {
        const response = await fetch('http://localhost:5000/watchlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: localStorage.getItem("username"), watchlistName })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        alert(data.message);
        fetchWatchlists();
        document.getElementById("watchlist-name").value = "";
    } catch (error) {
        console.error("Error creating watchlist:", error);
        errorMessage.textContent = error.message || "Failed to create watchlist. Please try again.";
    } finally {
        // Re-enable button and hide spinner
        createWatchlistBtn.disabled = false;
        createWatchlistText.style.display = "inline-block";
        createWatchlistSpinner.style.display = "none";
    }
}

async function addMovie(event) {
    event.preventDefault();

    const movieName = document.getElementById("movie-name").value.trim();
    const genre = document.getElementById("movie-genre").value;
    const platform = document.getElementById("platform").value;
    const description = document.getElementById("description").value.trim();
    const review = document.getElementById("review-rating").value;
    const watchlistName = localStorage.getItem("selectedWatchlist");
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");

    if (!movieName || !genre || !platform || !watchlistName) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        // First get watchlist_id for the watchlistName
        const watchlistResponse = await fetch(`/watchlists?user_id=${encodeURIComponent(userId)}`);
        const watchlists = await watchlistResponse.json();
        const watchlist = watchlists.find(w => w.name === watchlistName);
        
        if (!watchlist) {
            throw new Error("Watchlist not found");
        }

        const response = await fetch('/movies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                watchlist_id: watchlist.id,
                name: movieName,
                genre,
                review: parseInt(review) || 0,
                description,
                platform
            })
        });

        const data = await response.json();
        console.log("Backend Response:", data);

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }

        alert(data.message);
        closeModal();
        fetchMovies(watchlistName); // Refresh just this watchlist's movies
    } catch (error) {
        console.error("Error adding movie:", error);
        alert(error.message || "Failed to add movie. Please try again.");
    }
}
    
async function fetchMovies(watchlistName) {
    const userId = localStorage.getItem("userId");
    if (!userId || !watchlistName) return;

    try {
        // First get watchlist_id for the watchlistName
        const watchlistResponse = await fetch(`/watchlists?user_id=${encodeURIComponent(userId)}`);
        const watchlists = await watchlistResponse.json();
        const watchlist = watchlists.find(w => w.name === watchlistName);
        
        if (!watchlist) {
            console.error("Watchlist not found:", watchlistName);
            return;
        }

        const response = await fetch(`/movies?watchlist_id=${encodeURIComponent(watchlist.id)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Fetched Movies:", result);
        
        // Handle both response formats (array or {success, data})
        const movies = Array.isArray(result) ? result : (result.data || []);
        
        if (Array.isArray(movies)) {
            displayMovies(movies, watchlistName);
        } else {
            console.error("Unexpected movies format:", movies);
            displayMovies([], watchlistName); // Show empty state
        }
    } catch (error) {
        console.error("Error fetching movies:", error);
        displayMovies([], watchlistName); // Show empty state on error
    }
}