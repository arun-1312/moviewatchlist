require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", 
    "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com; script-src 'self'; img-src 'self';"
  );
  next();
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://movieshelff.onrender.com']
    : 'http://localhost:5500',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database Connection Failed!", err.stack);
  } else {
    console.log("✅ Connected to PostgreSQL Database");
    release();
  }
});

// Register a New User
app.post("/auth/register", async (req, res) => {
  const { username, userpassword } = req.body;

  if (!username || !userpassword) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Check if user exists
    const checkResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userpassword, saltRounds);

    // Insert user
    const insertResult = await pool.query(
      "INSERT INTO users (username, userpassword) VALUES ($1, $2) RETURNING id",
      [username, hashedPassword]
    );

    return res.status(201).json({ 
      success: true, 
      message: "User registered successfully",
      user: insertResult.rows[0]
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login Endpoint
app.post("/auth/login", async (req, res) => {
  const { username, userpassword } = req.body;

  if (!username || !userpassword) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    
    if (result.rows.length > 0) {
      const match = await bcrypt.compare(userpassword, result.rows[0].userpassword);
      if (match) {
        res.json({ success: true, message: "Login successful", data: { username } });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("❌ Database Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Create a New Watchlist
app.post("/watchlists", async (req, res) => {
    const { user_id, name } = req.body; // Changed from watchlistName to name
  
    if (!user_id || !name) {
      return res.status(400).json({ error: "User ID and watchlist name are required" });
    }
  
    try {
      const result = await pool.query(
        "INSERT INTO watchlists (user_id, name) VALUES ($1, $2) RETURNING *",
        [user_id, name]
      );
      
      res.json({ 
        success: true, 
        message: "Watchlist created successfully!",
        watchlist: result.rows[0]
      });
    } catch (err) {
      console.error("❌ Database Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  
  // Fetch Watchlists for a User (Fixed)
  app.get("/watchlists", async (req, res) => {
    const { user_id } = req.query;
  
    if (!user_id) {
      return res.status(400).json({ error: "❌ User ID is required" });
    }
  
    try {
      const result = await pool.query(
        "SELECT * FROM watchlists WHERE user_id = $1", 
        [user_id]
      );
      
      console.log("✅ Watchlists Retrieved:", result.rows);
      res.json(result.rows || []);
    } catch (err) {
      console.error("❌ Database Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Add a Movie to a Watchlist (Fixed)
  app.post("/movies", async (req, res) => {
    const { watchlist_id, name, genre, review, description, platform } = req.body;
  
    if (!watchlist_id || !name || !genre || !platform) {
      return res.status(400).json({ error: "All required fields are missing" });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO movies 
          (watchlist_id, name, genre, review, description, platform) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING *`,
        [watchlist_id, name, genre, review, description, platform]
      );
      
      res.json({ 
        success: true, 
        message: "Movie added successfully!",
        movie: result.rows[0]
      });
    } catch (err) {
      console.error("❌ Database Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  
  // Fetch Movies for a Watchlist (Fixed)
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
      
      console.log("✅ Movies Retrieved:", result.rows);
      res.json({ success: true, data: result.rows || [] });
    } catch (err) {
      console.error("❌ Database Error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });
  
  // Delete a Movie (Fixed)
  app.delete("/movies", async (req, res) => {
    const { watchlist_id, movieName } = req.body;
  
    if (!watchlist_id || !movieName) {
      return res.status(400).json({ error: "Watchlist ID and movie name are required" });
    }
  
    try {
      const result = await pool.query(
        "DELETE FROM movies WHERE watchlist_id = $1 AND name = $2 RETURNING *",
        [watchlist_id, movieName]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Movie not found" });
      }
  
      res.json({ 
        success: true, 
        message: "Movie deleted successfully!",
        deletedMovie: result.rows[0]
      });
    } catch (err) {
      console.error("❌ Database Error:", err);
      res.status(500).json({ error: "Database error" });
    }
  });
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}...`);
});