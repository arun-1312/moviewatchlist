require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");

const app = express();

// Middleware Configuration
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://*.tmdn.org"],
      connectSrc: [
        "'self'", 
        process.env.NODE_ENV === 'production' 
          ? 'https://movieshelff.onrender.com' 
          : 'http://localhost:5000'
      ]
    }
  },
  crossOriginResourcePolicy: { policy: "same-site" }
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://movieshelff.onrender.com']
    : ['http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'DELETE'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database Connection Test
pool.connect()
  .then(client => {
    console.log("✅ Connected to PostgreSQL Database");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!", err.stack);
    process.exit(1);
  });

// API Routes

// User Registration
app.post("/auth/register", async (req, res) => {
  const { username, userpassword } = req.body;

  if (!username || !userpassword) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Check existing user
    const userExists = await pool.query(
      "SELECT id FROM users WHERE username = $1", 
      [username]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(userpassword, 10);
    const newUser = await pool.query(
      "INSERT INTO users (username, userpassword) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    res.status(201).json({ 
      success: true, 
      data: newUser.rows[0],
      message: "User registered successfully" 
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Login
app.post("/auth/login", async (req, res) => {
  const { username, userpassword } = req.body;

  if (!username || !userpassword) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, username, userpassword FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(userpassword, user.userpassword);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        userId: user.id
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Watchlist Endpoints

// Create Watchlist
app.post("/watchlists", async (req, res) => {
  const { user_id, name } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ error: "User ID and watchlist name are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO watchlists (user_id, name) 
       VALUES ($1, $2) 
       RETURNING id, name, user_id`,
      [user_id, name]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Watchlist created successfully"
    });

  } catch (error) {
    console.error("Create watchlist error:", error);
    res.status(500).json({ error: "Failed to create watchlist" });
  }
});

// Get User Watchlists
// Fetch Watchlists for a User - Updated with better error handling
app.get("/watchlists", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      error: "User ID is required" 
    });
  }

  try {
    // Verify user exists first
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Get watchlists
    const result = await pool.query(
      "SELECT id, name, user_id FROM watchlists WHERE user_id = $1",
      [user_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({
      success: false,
      error: "Database error occurred"
    });
  }
});

// Movie Endpoints

// Add Movie to Watchlist
app.post("/movies", async (req, res) => {
  const { watchlist_id, name, genre, review, description, platform } = req.body;

  if (!watchlist_id || !name || !genre || !platform) {
    return res.status(400).json({ 
      error: "Watchlist ID, name, genre and platform are required" 
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO movies 
        (watchlist_id, name, genre, review, description, platform) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [watchlist_id, name, genre, review || 0, description || null, platform]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Movie added successfully"
    });

  } catch (error) {
    console.error("Add movie error:", error);
    res.status(500).json({ error: "Failed to add movie" });
  }
});

// Get Movies in Watchlist
app.get("/movies", async (req, res) => {
  const { watchlist_id } = req.query;

  if (!watchlist_id) {
    return res.status(400).json({ error: "Watchlist ID is required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM movies WHERE watchlist_id = $1",
      [watchlist_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get movies error:", error);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// Delete Movie
app.delete("/movies", async (req, res) => {
  const { watchlist_id, movieName } = req.body;

  if (!watchlist_id || !movieName) {
    return res.status(400).json({ error: "Watchlist ID and movie name are required" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM movies 
       WHERE watchlist_id = $1 AND name = $2 
       RETURNING id, name`,
      [watchlist_id, movieName]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Movie deleted successfully"
    });

  } catch (error) {
    console.error("Delete movie error:", error);
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});