
require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = require("../database");

// Register a new user.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
      `,
      [name.trim(), normalizedEmail, hashedPassword],
      function (err) {
        if (err) {
          if (
            err.code === "23505" ||
            err.code === "SQLITE_CONSTRAINT"
          ) {
            return res.status(409).json({
              message: "An account with this email already exists."
            });
          }

          console.error("Registration error:", err.message);

          return res.status(500).json({
            message: "Registration failed."
          });
        }

        return res.status(201).json({
          id: this.lastID,
          name: name.trim(),
          email: normalizedEmail
        });
      }
    );
  } catch (err) {
    console.error("Registration error:", err.message);

    return res.status(500).json({
      message: "Registration failed."
    });
  }
});

// Login an existing user.
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured.");

    return res.status(500).json({
      message: "Server authentication configuration error."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [normalizedEmail],
    async (err, user) => {
      try {
        if (err) {
          console.error("Login database error:", err.message);

          return res.status(500).json({
            message: "Login failed."
          });
        }

        if (!user) {
          return res.status(401).json({
            message: "Invalid credentials"
          });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
          return res.status(401).json({
            message: "Invalid credentials"
          });
        }

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role || "user"
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        });
      } catch (loginError) {
        console.error("Login error:", loginError.message);

        return res.status(500).json({
          message: "Login failed."
        });
      }
    }
  );
});

module.exports = router;
