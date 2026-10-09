const express = require("express");
const router = express.Router();

const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");

// Save or update the logged-in user's profile
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

    db.run(
        `
        INSERT OR REPLACE INTO user_profiles (
            user_id,
            age,
            gender,
            occupation,
            budget,
            food_preference,
            smoking,
            drinking,
            bio
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            req.user.id,
            age,
            gender,
            occupation,
            budget,
            food_preference,
            smoking,
            drinking,
            bio
        ],
        function (err) {
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
});

// Get the logged-in user's profile
router.get("/", verifyToken, (req, res) => {
    db.get(
        `
        SELECT
            u.name,
            u.email,
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
        [req.user.id],
        (err, row) => {
            if (err) {
                console.error("Profile loading error:", err.message);

                return res.status(500).json({
                    message: "Failed to load profile."
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