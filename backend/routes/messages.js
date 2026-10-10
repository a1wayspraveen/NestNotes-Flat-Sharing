const express = require("express");
const router = express.Router();

const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");

// Helper: make sure the logged-in user can access this listing's conversation.
function checkListingAccess(listingId, userId, callback) {
    db.get(
        `SELECT id, title, user_id
         FROM listings
         WHERE id = ?`,
        [listingId],
        (err, listing) => {
            if (err) {
                return callback(err);
            }

            if (!listing) {
                return callback(null, null, false);
            }

            // Only the listing owner or someone who has messaged
            // about the listing can access its conversation.
            db.get(
                `SELECT id
                 FROM messages
                 WHERE listingId = ?
                 AND senderId = ?
                 LIMIT 1`,
                [listingId, userId],
                (messageErr, userMessage) => {
                    if (messageErr) {
                        return callback(messageErr);
                    }

                    const isOwner = Number(listing.user_id) === Number(userId);
                    const hasMessaged = Boolean(userMessage);

                    callback(
                        null,
                        listing,
                        isOwner || hasMessaged
                    );
                }
            );
        }
    );
}


// ========================================
// SEND MESSAGE + CREATE OWNER NOTIFICATION
// ========================================

router.post("/", verifyToken, (req, res) => {
    const { listingId, message } = req.body;
    const senderId = req.user.id;

    if (
        !listingId ||
        !Number.isInteger(Number(listingId)) ||
        typeof message !== "string" ||
        !message.trim()
    ) {
        return res.status(400).json({
            message: "A valid listing ID and message are required."
        });
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length > 2000) {
        return res.status(400).json({
            message: "Messages cannot exceed 2000 characters."
        });
    }

    db.get(
        `SELECT id, title, user_id
         FROM listings
         WHERE id = ?`,
        [listingId],
        (err, listing) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to find listing."
                });
            }

            if (!listing) {
                return res.status(404).json({
                    message: "Listing not found."
                });
            }

            db.run(
                `INSERT INTO messages
                 (listingId, senderId, message)
                 VALUES (?, ?, ?)`,
                [listingId, senderId, cleanMessage],
                function (insertErr) {
                    if (insertErr) {
                        return res.status(500).json({
                            message: "Unable to save message."
                        });
                    }

                    const messageId = this.lastID;

                    // Do not notify the owner about their own message.
                    if (Number(listing.user_id) === Number(senderId)) {
                        return res.status(201).json({
                            message: "Message sent successfully.",
                            messageId
                        });
                    }

                    db.run(
                        `INSERT INTO notifications (userId, message)
                         VALUES (?, ?)`,
                        [
                            listing.user_id,
                            `You received a new message about "${listing.title}".`
                        ],
                        (notificationErr) => {
                            if (notificationErr) {
                                console.error(
                                    "Notification creation failed:",
                                    notificationErr.message
                                );

                                // The original message has still been saved.
                                return res.status(201).json({
                                    message: "Message sent successfully.",
                                    messageId,
                                    notificationCreated: false
                                });
                            }

                            return res.status(201).json({
                                message: "Message sent successfully.",
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


// ========================================
// GET MESSAGES FOR A LISTING
// ========================================

router.get("/:listingId", verifyToken, (req, res) => {
    const listingId = req.params.listingId;
    const userId = req.user.id;

    checkListingAccess(listingId, userId, (err, listing, allowed) => {
        if (err) {
            return res.status(500).json({
                message: "Unable to check conversation access."
            });
        }

        if (!listing) {
            return res.status(404).json({
                message: "Listing not found."
            });
        }

        if (!allowed) {
            return res.status(403).json({
                message: "You do not have access to this conversation."
            });
        }

        db.all(
            `SELECT *
             FROM messages
             WHERE listingId = ?
             ORDER BY createdAt ASC`,
            [listingId],
            (messageErr, rows) => {
                if (messageErr) {
                    return res.status(500).json({
                        message: "Unable to load messages."
                    });
                }

                return res.json(rows);
            }
        );
    });
});


// ========================================
// GET REPLIES FOR A MESSAGE
// ========================================

router.get("/replies/:messageId", verifyToken, (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    db.get(
        `SELECT m.id, m.listingId
         FROM messages m
         WHERE m.id = ?`,
        [messageId],
        (err, originalMessage) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to find message."
                });
            }

            if (!originalMessage) {
                return res.status(404).json({
                    message: "Message not found."
                });
            }

            checkListingAccess(
                originalMessage.listingId,
                userId,
                (accessErr, listing, allowed) => {
                    if (accessErr) {
                        return res.status(500).json({
                            message: "Unable to check access."
                        });
                    }

                    if (!listing) {
                        return res.status(404).json({
                            message: "Listing not found."
                        });
                    }

                    if (!allowed) {
                        return res.status(403).json({
                            message: "You cannot view these replies."
                        });
                    }

                    db.all(
                        `SELECT *
                         FROM replies
                         WHERE messageId = ?
                         ORDER BY createdAt ASC`,
                        [messageId],
                        (replyErr, replies) => {
                            if (replyErr) {
                                return res.status(500).json({
                                    message: "Unable to load replies."
                                });
                            }

                            return res.json(replies);
                        }
                    );
                }
            );
        }
    );
});


// ========================================
// SEND REPLY
// ========================================

router.post("/reply", verifyToken, (req, res) => {
    const { messageId, reply } = req.body;
    const senderId = req.user.id;

    if (
        !messageId ||
        !Number.isInteger(Number(messageId)) ||
        typeof reply !== "string" ||
        !reply.trim()
    ) {
        return res.status(400).json({
            message: "A valid message ID and reply are required."
        });
    }

    const cleanReply = reply.trim();

    if (cleanReply.length > 2000) {
        return res.status(400).json({
            message: "Replies cannot exceed 2000 characters."
        });
    }

    db.get(
        `SELECT m.id, m.listingId, m.senderId, l.user_id
         FROM messages m
         JOIN listings l ON l.id = m.listingId
         WHERE m.id = ?`,
        [messageId],
        (err, originalMessage) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to check message."
                });
            }

            if (!originalMessage) {
                return res.status(404).json({
                    message: "Message not found."
                });
            }

            const isOwner =
                Number(originalMessage.user_id) === Number(senderId);

            const isOriginalSender =
                Number(originalMessage.senderId) === Number(senderId);

            if (!isOwner && !isOriginalSender) {
                return res.status(403).json({
                    message: "You cannot reply to this message."
                });
            }

            db.run(
                `INSERT INTO replies (messageId, senderId, reply)
                 VALUES (?, ?, ?)`,
                [messageId, senderId, cleanReply],
                function (insertErr) {
                    if (insertErr) {
                        return res.status(500).json({
                            message: "Unable to save reply."
                        });
                    }

                    return res.status(201).json({
                        message: "Reply sent successfully.",
                        replyId: this.lastID
                    });
                }
            );
        }
    );
});


// ========================================
// OWNER INBOX
// ========================================

router.get("/owner/:userId", verifyToken, (req, res) => {
    const requestedUserId = Number(req.params.userId);
    const loggedInUserId = Number(req.user.id);

    // A user must not be able to request another user's inbox.
    if (requestedUserId !== loggedInUserId) {
        return res.status(403).json({
            message: "You cannot access another user's inbox."
        });
    }

    db.all(
        `SELECT
            m.id,
            m.message,
            m.createdAt,
            m.senderId,
            m.listingId,
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
         JOIN listings l ON m.listingId = l.id
         LEFT JOIN users u ON m.senderId = u.id
         LEFT JOIN user_profiles fp ON fp.user_id = u.id
         WHERE l.user_id = ?
         ORDER BY m.createdAt DESC`,
        [loggedInUserId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to load your inbox."
                });
            }

            return res.json(rows);
        }
    );
});


// ========================================
// LEGACY CONVERSATION ENDPOINT
// ========================================

router.get("/conversation/:messageId", verifyToken, (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    db.get(
        `SELECT listingId
         FROM messages
         WHERE id = ?`,
        [messageId],
        (err, message) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to find message."
                });
            }

            if (!message) {
                return res.status(404).json({
                    message: "Message not found."
                });
            }

            checkListingAccess(
                message.listingId,
                userId,
                (accessErr, listing, allowed) => {
                    if (accessErr) {
                        return res.status(500).json({
                            message: "Unable to check access."
                        });
                    }

                    if (!listing) {
                        return res.status(404).json({
                            message: "Listing not found."
                        });
                    }

                    if (!allowed) {
                        return res.status(403).json({
                            message: "Access denied."
                        });
                    }

                    db.all(
                        `SELECT *
                         FROM replies
                         WHERE messageId = ?
                         ORDER BY createdAt ASC`,
                        [messageId],
                        (replyErr, replies) => {
                            if (replyErr) {
                                return res.status(500).json({
                                    message: "Unable to load conversation."
                                });
                            }

                            return res.json(replies);
                        }
                    );
                }
            );
        }
    );
});


// ========================================
// NOTIFICATIONS
// ========================================

router.get("/notifications/:userId", verifyToken, (req, res) => {
    const requestedUserId = Number(req.params.userId);
    const loggedInUserId = Number(req.user.id);

    if (requestedUserId !== loggedInUserId) {
        return res.status(403).json({
            message: "You cannot access another user's notifications."
        });
    }

    db.all(
        `SELECT *
         FROM notifications
         WHERE userId = ?
         ORDER BY created_at DESC`,
        [loggedInUserId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to load notifications."
                });
            }

            return res.json(rows);
        }
    );
});

module.exports = router;