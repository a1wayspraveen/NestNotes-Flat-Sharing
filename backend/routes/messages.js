const express = require("express");
const router = express.Router();
const db = require("../database");
const verifyToken =
require("../middleware/authMiddleware");

// Send Message
router.post("/", verifyToken, (req, res) => {

    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { listingId, message } = req.body;

    db.run(
        `
        INSERT INTO messages
        (listingId, senderId, message)
        VALUES (?, ?, ?)
        `,
        [
            listingId,
            req.user.id,
            message
        ],
        function(err) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.status(201).json({
                message: "Message sent"
            });
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