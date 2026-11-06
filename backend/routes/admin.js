const express = require("express");
const router = express.Router();

const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

// =========================================
// GET ALL LISTINGS — ADMIN ONLY
// =========================================

router.get("/listings", verifyToken, requireAdmin, (req, res) => {
    db.all(
        "SELECT * FROM listings ORDER BY created_at DESC",
        [],
        (err, rows) => {
            if (err) {
                console.error("Error fetching listings:", err);
                return res.status(500).json({
                    message: "Failed to fetch listings."
                });
            }

            res.json(rows);
        }
    );
});

// =========================================
// VERIFY LISTING — ADMIN ONLY
// =========================================

router.put("/verify/:id", verifyToken, requireAdmin, (req, res) => {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            message: "Invalid listing ID."
        });
    }

    db.run(
        "UPDATE listings SET verified = 1 WHERE id = ?",
        [listingId],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Failed to verify listing."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Listing not found."
                });
            }

            res.json({
                message: "Listing verified."
            });
        }
    );
});

// =========================================
// UNVERIFY LISTING — ADMIN ONLY
// =========================================

router.put("/unverify/:id", verifyToken, requireAdmin, (req, res) => {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            message: "Invalid listing ID."
        });
    }

    db.run(
        "UPDATE listings SET verified = 0 WHERE id = ?",
        [listingId],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Failed to unverify listing."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Listing not found."
                });
            }

            res.json({
                message: "Listing unverified."
            });
        }
    );
});

// =========================================
// GET ALL USERS — ADMIN ONLY
// =========================================

router.get("/users", verifyToken, requireAdmin, (req, res) => {
    db.all(
        `SELECT id, name, email, role, verified
         FROM users
         ORDER BY id DESC`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Error fetching users:", err);

                return res.status(500).json({
                    message: "Failed to fetch users."
                });
            }

            res.json(rows);
        }
    );
});

// =========================================
// VERIFY USER — ADMIN ONLY
// =========================================

router.put("/users/verify/:id", verifyToken, requireAdmin, (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID."
        });
    }

    db.run(
        `UPDATE users
         SET verified = 1
         WHERE id = ? AND role != 'admin'`,
        [userId],
        function (err) {
            if (err) {
                console.error("Error verifying user:", err);

                return res.status(500).json({
                    message: "Failed to verify user."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "User not found or cannot be verified."
                });
            }

            res.json({
                message: "User verified successfully."
            });
        }
    );
});

module.exports = router;