
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
        INSERT INTO user_profiles (
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
        ON CONFLICT (user_id) DO UPDATE SET
            age = EXCLUDED.age,
            gender = EXCLUDED.gender,
            occupation = EXCLUDED.occupation,
            budget = EXCLUDED.budget,
            food_preference = EXCLUDED.food_preference,
            smoking = EXCLUDED.smoking,
            drinking = EXCLUDED.drinking,
            bio = EXCLUDED.bio
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
        "SELECT id, name, email FROM users WHERE id = ?",
        [req.user.id],
        (err, user) => {
            if (err) {
                console.error("Database error:", err.message);
                return res.status(500).json({
                    message: "Database query failed."
                });
            }

            if (!user) {
                return res.status(404).json({
                    message: "Authenticated user not found in database."
                });
            }

            db.get(
                "SELECT * FROM user_profiles WHERE user_id = ?",
                [req.user.id],
                (profileErr, profile) => {
                    if (profileErr) {
                        console.error("Profile query error:", profileErr.message);

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

// Get another user's public flatmate profile
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
                console.error("Public profile loading error:", err.message);

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
