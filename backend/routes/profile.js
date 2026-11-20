const express = require("express");
const router = express.Router();

const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");

const allowedValues = {
  gender: ["Male", "Female", "Non-binary", "Prefer not to say"],
  food_preference: ["Vegetarian", "Non-vegetarian", "Vegan", "No preference"],
  smoking: ["Yes", "No", "Occasionally"],
  drinking: ["Yes", "No", "Occasionally"],
  budget: [
    "Below ₹5,000",
    "₹5,000 - ₹10,000",
    "₹10,000 - ₹15,000",
    "₹15,000 - ₹25,000",
    "Above ₹25,000"
  ]
};

function validateText(value, maxLength) {
  return value === undefined ||
    (typeof value === "string" && value.trim().length <= maxLength);
}

// Save or update logged-in user's profile.
router.post("/", verifyToken, (req, res) => {
  const {
    age,
    gender,
    occupation,
    budget,
    food_preference,
    smoking,
    drinking,
    bio
  } = req.body;

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ message: "Invalid request body." });
  }

  if (
    age !== undefined &&
    (!Number.isInteger(Number(age)) || Number(age) < 18 || Number(age) > 100)
  ) {
    return res.status(400).json({ message: "Age must be between 18 and 100." });
  }

  if (
    !validateText(occupation, 100) ||
    !validateText(bio, 1000)
  ) {
    return res.status(400).json({ message: "Occupation or bio is too long." });
  }

  for (const [field, allowed] of Object.entries(allowedValues)) {
    const value = req.body[field];

    if (value !== undefined && value !== "" && !allowed.includes(value)) {
      return res.status(400).json({
        message: `Invalid ${field} value.`
      });
    }
  }

  db.get(
    "SELECT id FROM users WHERE id = ?",
    [req.user.id],
    (userErr, user) => {
      if (userErr) {
        return res.status(500).json({ message: "Database error." });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      db.run(
        `
        INSERT INTO user_profiles (
          user_id, age, gender, occupation, budget,
          food_preference, smoking, drinking, bio
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET
          age = excluded.age,
          gender = excluded.gender,
          occupation = excluded.occupation,
          budget = excluded.budget,
          food_preference = excluded.food_preference,
          smoking = excluded.smoking,
          drinking = excluded.drinking,
          bio = excluded.bio
        `,
        [
          req.user.id,
          age ?? null,
          gender ?? null,
          occupation?.trim() ?? null,
          budget ?? null,
          food_preference ?? null,
          smoking ?? null,
          drinking ?? null,
          bio?.trim() ?? null
        ],
        (err) => {
          if (err) {
            console.error("Profile save error:", err.message);
            return res.status(500).json({
              message: "Failed to save profile."
            });
          }

          return res.json({
            message: "Profile saved successfully."
          });
        }
      );
    }
  );
});

// Get logged-in user's profile.
router.get("/", verifyToken, (req, res) => {
  db.get(
    "SELECT id, name, email FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: "Database query failed." });
      }

      if (!user) {
        return res.status(404).json({
          message: "Authenticated user not found."
        });
      }

      db.get(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [req.user.id],
        (profileErr, profile) => {
          if (profileErr) {
            return res.status(500).json({
              message: "Failed to load profile."
            });
          }

          return res.json({
            ...user,
            ...(profile || {})
          });
        }
      );
    }
  );
});

// Get another user's public profile.
router.get("/:id", verifyToken, (req, res) => {
  const profileUserId = Number(req.params.id);

  if (!Number.isInteger(profileUserId) || profileUserId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID."
    });
  }

  db.get(
    `
    SELECT
      u.id,
      u.name,
      p.age,
      p.gender,
      p.occupation,
      p.budget,
      p.food_preference,
      p.smoking,
      p.drinking,
      p.bio
    FROM users u
    LEFT JOIN user_profiles p
      ON p.user_id = u.id
    WHERE u.id = ?
    `,
    [profileUserId],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to load user profile."
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "User not found."
        });
      }

      return res.json(row);
    }
  );
});

module.exports = router;