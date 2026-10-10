const express = require("express");
const router = express.Router();
const db = require("../database");

// Get all listings
router.get("/listings", (req, res) => {

    db.all(
        "SELECT * FROM listings ORDER BY created_at DESC",
        [],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.json(rows);
        }
    );
});

// Verify listing
router.put("/verify/:id", (req, res) => {

    db.run(
        "UPDATE listings SET verified = 1 WHERE id = ?",
        [req.params.id],
        function(err) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.json({
                message: "Listing verified"
            });
        }
    );
});

// Unverify listing
router.put("/unverify/:id", (req, res) => {

    db.run(
        "UPDATE listings SET verified = 0 WHERE id = ?",
        [req.params.id],
        function(err) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.json({
                message: "Listing unverified"
            });
        }
    );
});

module.exports = router;