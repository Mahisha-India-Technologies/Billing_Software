const express = require("express");
const router = express.Router();
const db = require("../config/config.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const secretKey = "your-secret-key"; // ⚠️ Move this to .env in production

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE BINARY email = ? AND status = "active"',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // ✅ Enforce case-sensitive password match
    if (password !== user.password_hash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        first_name: user.first_name,
      },
      secretKey,
      { expiresIn: "22h" }
    );

    const decoded = jwt.decode(token);

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.first_name,
        role: user.role,
        tokenExpiry: decoded.exp,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
