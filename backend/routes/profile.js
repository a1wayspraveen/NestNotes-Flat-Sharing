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
    console.log("Profile request received");
    console.log("Authenticated user ID:", req.user.id);

    db.get(
        "SELECT id, name, email FROM users WHERE id = ?",
        [req.user.id],
        (err, user) => {
            if (err) {
                console.error("Database error:", err.message);
                return res.status(500).json({
                    message: "Database query failed."
                });
            }

            console.log(
                "User found in database:",
                user ? { id: user.id, email: user.email } : null
            );

            if (!user) {
                return res.status(404).json({
                    message: "Authenticated user not found in database."
                });
            }

            db.get(
                `SELECT * FROM user_profiles WHERE user_id = ?`,
                [req.user.id],
                (profileErr, profile) => {
                    if (profileErr) {
                        console.error(
                            "Profile query error:",
                            profileErr.message
                        );

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

module.exports = router;