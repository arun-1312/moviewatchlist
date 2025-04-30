require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Enhanced rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later"
});

// Middleware Configuration
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced Security Headers
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

// Enhanced CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://movieshelff.onrender.com']
    : ['http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'DELETE'],
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));

// Database Connection with enhanced error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Enhanced Database Connection Test
pool.connect()
  .then(client => {
    console.log("✅ Connected to PostgreSQL Database");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!", err);
    process.exit(1);
  });

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Enhanced User Registration
app.post("/auth/register", authLimiter, async (req, res) => {
  const { username, userpassword } = req.body;

  if (!username || !userpassword) {
    return res.status(400).json({ 
      success: false,
      error: "Username and password are required" 
    });
  }

  try {
    const userExists = await pool.query(
      "SELECT id FROM users WHERE username = $1", 
      [username]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: "Username already exists" 
      });
    }

    const hashedPassword = await bcrypt.hash(userpassword, 10);
    const newUser = await pool.query(
      "INSERT INTO users (username, userpassword) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    res.status(201).json({ 
      success: true, 
      data: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username
      },
      message: "User registered successfully" 
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

// Enhanced User Login
app.post("/auth/login", authLimiter, async (req, res) => {
  const { username, userpassword } = req.body;

  if (!username || !userpassword) {
    return res.status(400).json({ 
      success: false,
      error: "Username and password are required" 
    });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, username, userpassword FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(userpassword, user.userpassword);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        userId: user.id
      },
      message: "Login successful"
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

// Enhanced Watchlist Endpoints
app.post("/watchlists", async (req, res) => {
  const { user_id, name } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ 
      success: false,
      error: "User ID and watchlist name are required" 
    });
  }

  try {
    // Validate user exists
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
    res.status(500).json({ 
      success: false,
      error: "Failed to create watchlist" 
    });
  }
});

// Enhanced Get Watchlists
app.get("/watchlists", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({ 
      success: false,
      error: "Valid User ID is required" 
    });
  }

  try {
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

    const result = await pool.query(
      "SELECT id, name, user_id FROM watchlists WHERE user_id = $1",
      [user_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get watchlists error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch watchlists"
    });
  }
});

// Enhanced Movie Endpoints
app.post("/movies", async (req, res) => {
  const { watchlist_id, name, genre, review, description, platform } = req.body;

  if (!watchlist_id || !name || !genre || !platform) {
    return res.status(400).json({ 
      success: false,
      error: "Watchlist ID, name, genre and platform are required" 
    });
  }

  try {
    // Validate watchlist exists
    const watchlistCheck = await pool.query(
      "SELECT id FROM watchlists WHERE id = $1",
      [watchlist_id]
    );
    
    if (watchlistCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Watchlist not found"
      });
    }

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
    res.status(500).json({ 
      success: false,
      error: "Failed to add movie" 
    });
  }
});

// Enhanced Get Movies
app.get("/movies", async (req, res) => {
  const { watchlist_id } = req.query;

  if (!watchlist_id || isNaN(watchlist_id)) {
    return res.status(400).json({ 
      success: false,
      error: "Valid Watchlist ID is required" 
    });
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
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch movies" 
    });
  }
});

// Enhanced Delete Movie
app.delete("/movies", async (req, res) => {
  const { watchlist_id, movieName } = req.body;

  if (!watchlist_id || !movieName) {
    return res.status(400).json({ 
      success: false,
      error: "Watchlist ID and movie name are required" 
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM movies 
       WHERE watchlist_id = $1 AND name = $2 
       RETURNING id, name`,
      [watchlist_id, movieName]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Movie not found" 
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Movie deleted successfully"
    });

  } catch (error) {
    console.error("Delete movie error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete movie" 
    });
  }
});

// Enhanced Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    success: false,
    error: "Internal server error" 
  });
});

// Server Startup with enhanced logging
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? "Connected" : "Missing config"}`);
});