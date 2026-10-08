const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../multerConfig");
const db = require("../database");

router.post("/upload", verifyToken, upload.single("image"), (req, res) => {
    console.log("File uploaded:", req.file);
    console.log("Filename:", req.file.filename);
    console.log("Exists:", require("fs").existsSync(req.file.path));
    res.json({
        image: `https://nestnotes-flat-sharing.onrender.com/uploads/${req.file.filename}`
    });
    console.log("File path:", req.file.path);
});

router.get("/stats/summary", (req, res) => {
    db.get(
        `
        SELECT
            COUNT(*) as totalListings,
            AVG(rent) as averageRent,
            MAX(rent) as highestRent,
            MIN(rent) as lowestRent
        FROM listings
        `,
        [],
        (err, row) => {
            if (err) {
                return res.status(500).json(err);
            }

            res.json(row);



        }
    );
});

// GET all listings
router.get("/", (req, res) => {
    db.all(
        "SELECT * FROM listings",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json(err);
            }

            res.json(rows);
        }
    );
});

router.get("/my", verifyToken, (req, res) => {
    db.all(
        `
        SELECT *
        FROM listings
        WHERE user_id = ?
        ORDER BY id DESC
        `,
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json(err);
            }

            res.json(rows);
        }
    );
});

router.get("/favorites/my", verifyToken, (req, res) => {
    db.all(
        `
        SELECT listings.*
        FROM favorites
        JOIN listings
        ON favorites.listing_id = listings.id
        WHERE favorites.user_id = ?
        `,
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json(err);
            }

            res.json(rows);
        }
    );
});

// GET listing by ID
router.get("/:id", (req, res) => {
    db.get(
        "SELECT * FROM listings WHERE id = ?",
        [req.params.id],
        (err, row) => {
            if (err) {
                return res.status(500).json(err);
            }

            if (!row) {
                return res.status(404).json({
                    message: "Listing not found"
                });
            }

            res.json(row);
        }
    );
});

// CREATE listing
router.post("/", verifyToken, (req, res) => {

    const {
        title,
        rent,
        location,
        category,
        image,
        description
    } = req.body;

    const userId = req.user.id;

    db.run(
        `
        INSERT INTO listings
        (
            title,
            rent,
            location,
            category,
            image,
            description,
            user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            title,
            rent,
            location,
            category,
            image,
            description,
            userId
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.status(201).json({
                id: this.lastID,
                message: "Listing created successfully"
            });
        }
    );
});

// UPDATE listing
router.put("/:id", verifyToken, (req, res) => {
    const {
        title,
        rent,
        location,
        category,
        image,
        description
    } = req.body;

    db.get(
        "SELECT * FROM listings WHERE id = ?",
        [req.params.id],
        (err, listing) => {
            if (err) {
                return res.status(500).json(err);
            }

            if (!listing) {
                return res.status(404).json({
                    message: "Listing not found"
                });
            }

            if (listing.user_id !== req.user.id) {
                return res.status(403).json({
                    message: "Not authorized"
                });
            }

            db.run(
                `
                UPDATE listings
                SET
                title = ?,
                rent = ?,
                location = ?,
                category = ?,
                image = ?,
                description = ?
                WHERE id = ?
                `,
                [
                    title,
                    rent,
                    location,
                    category,
                    image,
                    description,
                    req.params.id
                ],
                function (err) {
                    if (err) {
                        return res.status(500).json(err);
                    }

                    res.json({
                        message: "Listing updated"
                    });
                }
            );
        }
    );
});

// DELETE listing
router.delete("/:id", verifyToken, (req, res) => {
    db.get(
        "SELECT * FROM listings WHERE id = ?",
        [req.params.id],
        (err, listing) => {
            if (err) {
                return res.status(500).json(err);
            }

            if (!listing) {
                return res.status(404).json({
                    message: "Listing not found"
                });
            }

            if (listing.user_id !== req.user.id) {
                return res.status(403).json({
                    message: "Not authorized"
                });
            }

            db.run(
                "DELETE FROM listings WHERE id = ?",
                [req.params.id],
                function (err) {
                    if (err) {
                        return res.status(500).json(err);
                    }

                    res.json({
                        message: "Listing deleted"
                    });
                }
            );
        }
    );
});

router.post("/:id/favorite", verifyToken, (req, res) => {
    db.run(
        `
        INSERT OR IGNORE INTO favorites
        (user_id, listing_id)
        VALUES (?, ?)
        `,
        [
            req.user.id,
            req.params.id
        ],
        function(err) {
            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                message: "Added to favorites"
            });
        }
    );
});

router.get("/dashboard/stats/:userId", (req, res) => {
    const userId = req.params.userId;

    db.get(
        `
        SELECT COUNT(*) as totalListings
        FROM listings
        WHERE user_id = ?
        `,
        [userId],
        (err, listingResult) => {
            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            db.get(
                `
                SELECT COUNT(*) as totalInterests
                FROM interests i
                JOIN listings l
                ON i.listing_id = l.id
                WHERE l.user_id = ?
                `,
                [userId],
                (err, interestResult) => {
                    if (err) {
                        return res.status(500).json({
                            message: err.message
                        });
                    }

                    db.get(
                        `
                        SELECT COUNT(*) as totalMessages
                        FROM messages m
                        JOIN listings l
                        ON m.listingId = l.id
                        WHERE l.user_id = ?
                        `,
                        [userId],
                        (err, messageResult) => {
                            if (err) {
                                return res.status(500).json({
                                    message: err.message
                                });
                            }

                            res.json({
                                totalListings: listingResult.totalListings,
                                totalInterests: interestResult.totalInterests,
                                totalMessages: messageResult.totalMessages
                            });
                        }
                    );
                }
            );
        }
    );
});

router.put("/:id/verify", (req, res) => {
    db.run(
        `
        UPDATE listings
        SET verified = 1
        WHERE id = ?
        `,
        [req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                message: "Listing verified"
            });
        }
    );
});

router.put("/:id/unverify", (req, res) => {
    db.run(
        `
        UPDATE listings
        SET verified = 0
        WHERE id = ?
        `,
        [req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                message: "Listing unverified"
            });
        }
    );
});

module.exports = router;