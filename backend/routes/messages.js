const express = require("express");
const router = express.Router();
const db = require("../database");
const verifyToken =
require("../middleware/authMiddleware");

// Send Message + Create Notification
router.post("/", verifyToken, (req, res) => {
    const { listingId, message } = req.body;
    const senderId = req.user.id;

    if (!listingId || !message || !message.trim()) {
        return res.status(400).json({
            message: "Listing ID and message are required"
        });
    }

    // Find the listing and its owner
    db.get(
        `SELECT id, title, user_id
         FROM listings
         WHERE id = ?`,
        [listingId],
        (err, listing) => {
            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            if (!listing) {
                return res.status(404).json({
                    message: "Listing not found"
                });
            }

            // Save the message
            db.run(
                `INSERT INTO messages
                 (listingId, senderId, message)
                 VALUES (?, ?, ?)`,
                [listingId, senderId, message.trim()],
                function (err) {
                    if (err) {
                        return res.status(500).json({
                            message: err.message
                        });
                    }

                    const messageId = this.lastID;

                    // Don't notify someone about their own message
                    if (listing.user_id === senderId) {
                        return res.status(201).json({
                            message: "Message sent successfully",
                            messageId
                        });
                    }

                    // Notify the listing owner
                    db.run(
                        `INSERT INTO notifications
                         (userId, message)
                         VALUES (?, ?)`,
                        [
                            listing.user_id,
                            `You received a new message about "${listing.title}".`
                        ],
                        function (notificationErr) {
                            if (notificationErr) {
                                console.error(
                                    "Notification error:",
                                    notificationErr.message
                                );

                                // The message was saved even if notification
                                // creation failed.
                                return res.status(201).json({
                                    message: "Message sent, but notification failed",
                                    messageId
                                });
                            }

                            res.status(201).json({
                                message: "Message sent successfully",
                                messageId,
                                notificationCreated: true
                            });
                        }
                    );
                }
            );
        }
    );
});

router.get("/owner/:userId", (req, res) => {
    const userId = req.params.userId;

    db.all(
    `
SELECT
    m.id,
    m.message,
    m.createdAt,
    m.senderId,

    l.id as listingId,
    l.title,

    u.name,
    u.email,

    fp.age,
    fp.gender,
    fp.occupation,
    fp.budget,
    fp.food_preference,
    fp.smoking,
    fp.drinking,
    fp.bio

FROM messages m

JOIN listings l
ON m.listingId = l.id

LEFT JOIN users u
ON m.senderId = u.id

LEFT JOIN user_profiles fp
ON fp.user_id = u.id

WHERE l.user_Id = ?

ORDER BY m.createdAt DESC
`,
    [userId],
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

router.post("/reply", (req, res) => {

    const {
        messageId,
        senderId,
        reply
    } = req.body;

    db.run(
        `
        INSERT INTO replies
        (messageId, senderId, reply)
        VALUES (?, ?, ?)
        `,
        [messageId, senderId, reply],
        function(err) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.json({
                message: "Reply sent"
            });
        }
    );
});
router.get("/replies/:messageId", (req, res) => {

    db.all(
        `
        SELECT *
        FROM replies
        WHERE messageId = ?
        ORDER BY createdAt ASC
        `,
        [req.params.messageId],
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

// Get Messages For Listing
router.get("/:listingId", (req, res) => {

    db.all(
        `
        SELECT *
        FROM messages
        WHERE listingId = ?
        ORDER BY createdAt DESC
        `,
        [req.params.listingId],
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

router.get("/conversation/:messageId", (req, res) => {

    db.all(
        `
        SELECT *
        FROM replies
        WHERE messageId = ?
        ORDER BY createdAt ASC
        `,
        [req.params.messageId],
        (err, rows) => {

            if(err){
                return res.status(500).json(err);
            }

            res.json(rows);
        }
    );
});

router.get("/notifications/:userId", (req, res) => {

    db.all(
        `
        SELECT *
        FROM notifications
        WHERE userId = ?
        ORDER BY created_at DESC
        `,
        [req.params.userId],
        (err, rows) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(rows);
        }
    );
});

module.exports = router;