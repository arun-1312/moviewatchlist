const express = require("express");
const db = require("../db");
const router = express.Router();

// User Login (POST)
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required!" });
    }

    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        res.json({ message: "Login successful", user: results[0] });
    });
});

// User Registration (POST)
router.post("/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "All fields required!" });
    }

    const checkQuery = "SELECT * FROM users WHERE username = ?";
    db.query(checkQuery, [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: "User already exists" });

        const insertQuery = "INSERT INTO users (username, password) VALUES (?, ?)";
        db.query(insertQuery, [username, password], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ message: "User registered successfully!" });
        });
    });
});

module.exports = router;
