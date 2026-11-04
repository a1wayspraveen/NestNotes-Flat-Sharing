const express = require("express");
const router = express.Router();

const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");

// Check whether the user can access a listing conversation.
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

      const isOwner = Number(listing.user_id) === Number(userId);

      // The listing owner can access their listing conversations.
      if (isOwner) {
        return callback(null, listing, true);
      }

      // An interested user can access the listing conversation
      // only after expressing interest or sending a message.
      db.get(
        `SELECT id
                 FROM interests
                 WHERE listing_id = ?
                   AND user_id = ?
                 LIMIT 1`,
        [listingId, userId],
        (interestErr, interest) => {
          if (interestErr) {
            return callback(interestErr);
          }

          if (interest) {
            return callback(null, listing, true);
          }

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

              callback(null, listing, Boolean(userMessage));
            },
          );
        },
      );
    },
  );
}

// ========================================
// GET UNREAD MESSAGE COUNT
// ========================================

router.get("/unread-count", verifyToken, (req, res) => {
  const userId = Number(req.user.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID.",
    });
  }

  db.get(
    `SELECT COUNT(*) AS unreadCount
         FROM messages
         WHERE recipientId = ?
           AND isRead = 0`,
    [userId],
    (err, row) => {
      if (err) {
        console.error("Unread message count failed:", err.message);

        return res.status(500).json({
          message: "Unable to retrieve unread message count.",
        });
      }

      return res.json({
        unreadCount: row ? row.unreadCount : 0,
      });
    },
  );
});

// ========================================
// SEND MESSAGE + CREATE OWNER NOTIFICATION
// ========================================

router.post("/", verifyToken, (req, res) => {
  const { listingId, message, recipientId } = req.body;
  const senderId = Number(req.user.id);
  const parsedListingId = Number(listingId);

  if (
    !listingId ||
    !Number.isInteger(parsedListingId) ||
    parsedListingId <= 0 ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return res.status(400).json({
      message: "A valid listing ID and message are required.",
    });
  }

  const cleanMessage = message.trim();

  if (cleanMessage.length > 2000) {
    return res.status(400).json({
      message: "Messages cannot exceed 2000 characters.",
    });
  }

  db.get(
    `SELECT id, title, user_id
         FROM listings
         WHERE id = ?`,
    [parsedListingId],
    (err, listing) => {
      if (err) {
        console.error("Listing lookup failed:", err.message);

        return res.status(500).json({
          message: "Unable to find listing.",
        });
      }

      if (!listing) {
        return res.status(404).json({
          message: "Listing not found.",
        });
      }

      const ownerId = Number(listing.user_id);
      const isOwner = ownerId === senderId;

      // The owner must specify which interested user they are messaging.
      // Other users always message the listing owner.
      const parsedRecipientId = isOwner ? Number(recipientId) : ownerId;

      if (
        !Number.isInteger(parsedRecipientId) ||
        parsedRecipientId <= 0 ||
        parsedRecipientId === senderId
      ) {
        return res.status(400).json({
          message: isOwner
            ? "A valid recipient ID is required when the owner sends a message."
            : "Invalid message recipient.",
        });
      }

      // Verify that the intended recipient is allowed to participate
      // in this listing's conversation.
      const otherUserId = isOwner ? parsedRecipientId : senderId;

      db.get(
        `SELECT id
                 FROM interests
                 WHERE listing_id = ?
                   AND user_id = ?`,
        [parsedListingId, otherUserId],
        (interestErr, interest) => {
          if (interestErr) {
            console.error("Interest lookup failed:", interestErr.message);

            return res.status(500).json({
              message: "Unable to verify conversation access.",
            });
          }

          // Also allow an established conversation to continue
          // if the user no longer has an interest record.
          db.get(
            `SELECT id
                         FROM messages
                         WHERE listingId = ?
                           AND (
                               (senderId = ? AND recipientId = ?)
                               OR
                               (senderId = ? AND recipientId = ?)
                           )
                         LIMIT 1`,
            [
              parsedListingId,
              senderId,
              parsedRecipientId,
              parsedRecipientId,
              senderId,
            ],
            (conversationErr, existingMessage) => {
              if (conversationErr) {
                console.error(
                  "Conversation lookup failed:",
                  conversationErr.message,
                );

                return res.status(500).json({
                  message: "Unable to verify conversation.",
                });
              }

              if (!interest && !existingMessage) {
                return res.status(403).json({
                  message: "You cannot message this user about this listing.",
                });
              }

              db.run(
                `INSERT INTO messages
                                 (listingId, senderId, recipientId, message)
                                 VALUES (?, ?, ?, ?)`,
                [parsedListingId, senderId, parsedRecipientId, cleanMessage],
                function (insertErr) {
                  if (insertErr) {
                    console.error("Message insert failed:", insertErr.message);

                    return res.status(500).json({
                      message: "Unable to save message.",
                    });
                  }

                  // Save the ID of the message that was just inserted.
                  const newMessageId = this.lastID;

                  // Notify the recipient, not every user
                  // interested in the same listing.
                  db.run(
                    `INSERT INTO notifications
                     (userId, message, listingId, otherUserId)
                     VALUES (?, ?, ?, ?)`,
                    [
                      parsedRecipientId,
                      `You received a new message about "${listing.title}".`,
                      parsedListingId,
                      senderId,
                    ],
                    (notificationErr) => {
                      if (notificationErr) {
                        console.error(
                          "Notification creation failed:",
                          notificationErr.message,
                        );

                        return res.status(201).json({
                          message: "Message sent successfully.",
                          messageId: newMessageId,
                          notificationCreated: false,
                        });
                      }

                      return res.status(201).json({
                        message: "Message sent successfully.",
                        messageId: newMessageId,
                        notificationCreated: true,
                      });
                    },
                  );
                },
              );
            },
          );
        },
      );
    },
  );
});

// ========================================
// GET MESSAGES FOR A LISTING
// Supports both listing owners and interested users
// ========================================

router.get("/:listingId", verifyToken, (req, res) => {
  const listingId = Number(req.params.listingId);
  const currentUserId = Number(req.user.id);
  const requestedUserId = req.query.userId ? Number(req.query.userId) : null;

  if (
    !Number.isInteger(listingId) ||
    listingId <= 0 ||
    !Number.isInteger(currentUserId) ||
    currentUserId <= 0
  ) {
    return res.status(400).json({
      message: "Invalid listing or user ID.",
    });
  }

  db.get(
    `SELECT id, user_id
         FROM listings
         WHERE id = ?`,
    [listingId],
    (err, listing) => {
      if (err) {
        console.error("Listing lookup failed:", err.message);

        return res.status(500).json({
          message: "Unable to load listing.",
        });
      }

      if (!listing) {
        return res.status(404).json({
          message: "Listing not found.",
        });
      }

      const ownerId = Number(listing.user_id);
      const isOwner = ownerId === currentUserId;

      let participantId;

      if (isOwner) {
        // The owner must specify which interested user to contact.
        participantId = requestedUserId;

        if (
          !Number.isInteger(participantId) ||
          participantId <= 0 ||
          participantId === currentUserId
        ) {
          return res.status(400).json({
            message: "A valid interested user ID is required.",
          });
        }
      } else {
        // Interested users always converse with the listing owner.
        participantId = ownerId;

        // If a userId is supplied, it must identify this owner.
        if (
          requestedUserId !== null &&
          (!Number.isInteger(requestedUserId) || requestedUserId !== ownerId)
        ) {
          return res.status(400).json({
            message: "The requested user is not the listing owner.",
          });
        }
      }

      // Confirm that the two users have an established conversation
      // or that the non-owner has expressed interest in the listing.
      const otherUserId = isOwner ? participantId : currentUserId;

      db.get(
        `SELECT id
                 FROM interests
                 WHERE listing_id = ?
                   AND user_id = ?`,
        [listingId, otherUserId],
        (interestErr, interest) => {
          if (interestErr) {
            console.error("Interest lookup failed:", interestErr.message);

            return res.status(500).json({
              message: "Unable to verify conversation access.",
            });
          }

          db.get(
            `SELECT id
                         FROM messages
                         WHERE listingId = ?
                           AND (
                               (senderId = ? AND recipientId = ?)
                               OR
                               (senderId = ? AND recipientId = ?)
                           )
                         LIMIT 1`,
            [
              listingId,
              currentUserId,
              participantId,
              participantId,
              currentUserId,
            ],
            (conversationErr, existingMessage) => {
              if (conversationErr) {
                console.error(
                  "Conversation lookup failed:",
                  conversationErr.message,
                );

                return res.status(500).json({
                  message: "Unable to verify conversation.",
                });
              }

              if (!interest && !existingMessage) {
                return res.status(403).json({
                  message: "You do not have access to this conversation.",
                });
              }

              db.all(
                `SELECT
        m.id,
        m.listingId,
        m.senderId,
        m.recipientId,
        m.message,
        m.createdAt,
        sender.name AS "senderName",
        recipient.name AS "recipientName"
     FROM messages m
     LEFT JOIN users sender ON sender.id = m.senderId
     LEFT JOIN users recipient ON recipient.id = m.recipientId
     WHERE m.listingId = ?
       AND (
            (m.senderId = ? AND m.recipientId = ?)
            OR
            (m.senderId = ? AND m.recipientId = ?)
       )
     ORDER BY m.createdAt ASC, m.id ASC`,
                [
                  listingId,
                  currentUserId,
                  participantId,
                  participantId,
                  currentUserId,
                ],
                (messagesErr, messages) => {
                  if (messagesErr) {
                    console.error(
                      "Messages lookup failed:",
                      messagesErr.message,
                    );

                    return res.status(500).json({
                      message: "Unable to load messages.",
                    });
                  }

                  return res.json(messages);
                },
              );
            },
          );
        },
      );
    },
  );
});

// ========================================
// SEND REPLY + CREATE NOTIFICATION
// ========================================

router.post("/reply", verifyToken, (req, res) => {
  const { messageId, reply } = req.body;
  const senderId = Number(req.user.id);
  const parsedMessageId = Number(messageId);

  if (
    !Number.isInteger(parsedMessageId) ||
    parsedMessageId <= 0 ||
    typeof reply !== "string" ||
    !reply.trim()
  ) {
    return res.status(400).json({
      message: "A valid message ID and reply are required.",
    });
  }

  const cleanReply = reply.trim();

  if (cleanReply.length > 2000) {
    return res.status(400).json({
      message: "Replies cannot exceed 2000 characters.",
    });
  }

  db.get(
    `SELECT
            m.id,
            m.listingId,
            m.senderId,
            m.recipientId,
            l.user_id AS owner_id,
            l.title
         FROM messages m
         JOIN listings l ON l.id = m.listingId
         WHERE m.id = ?`,
    [parsedMessageId],
    (err, originalMessage) => {
      if (err) {
        console.error("Message lookup failed:", err.message);

        return res.status(500).json({
          message: "Unable to check message.",
        });
      }

      if (!originalMessage) {
        return res.status(404).json({
          message: "Message not found.",
        });
      }

      const ownerId = Number(originalMessage.owner_id);
      const originalSenderId = Number(originalMessage.senderId);

      const isOwner = ownerId === senderId;

      const isParticipant =
        originalSenderId === senderId ||
        Number(originalMessage.recipientId) === senderId;

      if (!isOwner && !isParticipant) {
        return res.status(403).json({
          message: "You cannot reply to this message.",
        });
      }

      // Determine who should receive this reply notification.
      let recipientId = null;

      if (isOwner) {
        // If the owner is replying to a user's message,
        // notify that user.
        if (originalSenderId !== ownerId) {
          recipientId = originalSenderId;
        } else if (originalMessage.recipientId != null) {
          // If the original message was sent by the owner,
          // notify its intended recipient.
          recipientId = Number(originalMessage.recipientId);
        }
      } else {
        // A non-owner replying to their own conversation
        // should notify the listing owner.
        recipientId = ownerId;
      }

      db.run(
        `INSERT INTO replies (messageId, senderId, reply)
                 VALUES (?, ?, ?)`,
        [parsedMessageId, senderId, cleanReply],
        function (insertErr) {
          if (insertErr) {
            console.error("Reply insert failed:", insertErr.message);

            return res.status(500).json({
              message: "Unable to save reply.",
            });
          }

          const replyId = this.lastID;

          // Do not notify the sender or an unknown recipient.
          if (
            !Number.isInteger(recipientId) ||
            recipientId <= 0 ||
            recipientId === senderId
          ) {
            return res.status(201).json({
              message: "Reply sent successfully.",
              replyId,
              notificationCreated: false,
            });
          }

          db.run(
            `INSERT INTO notifications (userId, message, listingId, otherUserId)
                         VALUES (?, ?, ?, ?)`,
            [
              recipientId,
              `You received a new reply about "${originalMessage.title}".`,
              Number(originalMessage.listingId),
              senderId,
            ],
            function (notificationErr) {
              if (notificationErr) {
                console.error(
                  "Reply notification failed:",
                  notificationErr.message,
                );

                return res.status(201).json({
                  message: "Reply sent successfully.",
                  replyId,
                  notificationCreated: false,
                });
              }

              return res.status(201).json({
                message: "Reply sent successfully.",
                replyId,
                notificationCreated: true,
              });
            },
          );
        },
      );
    },
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
      message: "You cannot access another user's inbox.",
    });
  }

  db.all(
    `SELECT
            m.id,
            m.message,
            m.createdAt,
            m.senderId,
            m.recipientId,
            m.isRead,
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
          message: "Unable to load your inbox.",
        });
      }

      return res.json(rows);
    },
  );
});

// ========================================
// GET REPLIES FOR A MESSAGE
// ========================================

router.get("/replies/:messageId", verifyToken, (req, res) => {
  const messageId = Number(req.params.messageId);
  const currentUserId = Number(req.user.id);

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({
      message: "Invalid message ID.",
    });
  }

  db.get(
    `SELECT
            m.id,
            m.listingId,
            m.senderId,
            m.recipientId,
            l.user_id AS owner_id
         FROM messages m
         JOIN listings l ON l.id = m.listingId
         WHERE m.id = ?`,
    [messageId],
    (err, message) => {
      if (err) {
        console.error("Message lookup failed:", err.message);

        return res.status(500).json({
          message: "Unable to find message.",
        });
      }

      if (!message) {
        return res.status(404).json({
          message: "Message not found.",
        });
      }

      const isOwner = Number(message.owner_id) === currentUserId;

      const isParticipant =
        Number(message.senderId) === currentUserId ||
        Number(message.recipientId) === currentUserId;

      console.log("REPLY HISTORY ACCESS:", {
        messageId,
        currentUserId,
        ownerId: Number(message.owner_id),
        senderId: Number(message.senderId),
        recipientId: Number(message.recipientId),
        isOwner,
        isParticipant,
      });

      if (!isOwner && !isParticipant) {
        return res.status(403).json({
          message: "You cannot access these replies.",
        });
      }

              db.all(
                `SELECT
            r.id,
            r.messageId,
            r.senderId,
            r.reply,
            r.createdAt,
            u.name AS "senderName"
        FROM replies r
        LEFT JOIN users u ON u.id = r.senderId
        WHERE r.messageId = ?
        ORDER BY r.createdAt ASC, r.id ASC`,
        [messageId],
        (replyErr, replies) => {
          if (replyErr) {
            console.error("Replies lookup failed:", replyErr.message);

            return res.status(500).json({
              message: "Unable to load replies.",
            });
          }

          console.log("CHAT REPLY ACCESS CHECK:", {
            messageId,
            currentUserId,
            senderId: Number(message.senderId),
            recipientId: Number(message.recipientId),
            ownerId: Number(message.owner_id),
            isOwner,
            isParticipant,
          });

          console.log("CHAT ACCESS DIAGNOSTIC:", {
            messageId,
            currentUserId,
            ownerId: message.owner_id,
            senderId: message.sender_id,
            recipientId: message.recipient_id,
            isOwner,
            isParticipant,
          });

          return res.json(replies);
        },
      );
    },
  );
});

// ========================================
// LEGACY CONVERSATION ENDPOINT
// ========================================

router.get("/conversation/:messageId", verifyToken, (req, res) => {
  const messageId = Number(req.params.messageId);
  const currentUserId = Number(req.user.id);

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({
      message: "Invalid message ID.",
    });
  }

  db.get(
    `SELECT
       m.id,
       m.listingId,
       m.senderId,
       m.recipientId,
       l.user_id AS owner_id
     FROM messages m
     JOIN listings l ON l.id = m.listingId
     WHERE m.id = ?`,
    [messageId],
    (err, message) => {
      if (err) {
        return res.status(500).json({
          message: "Unable to find message.",
        });
      }

      if (!message) {
        return res.status(404).json({
          message: "Message not found.",
        });
      }

      const isOwner = Number(message.owner_id) === currentUserId;

      const isParticipant =
        Number(message.sender_id) === currentUserId ||
        Number(message.recipient_id) === currentUserId;

      console.log("CONVERSATION ACCESS DEBUG:", {
        messageId,
        currentUserId,
        ownerId: Number(message.owner_id),
        senderId: Number(message.sender_id),
        recipientId: Number(message.recipient_id),
        isOwner,
        isParticipant,
      });

      if (!isOwner && !isParticipant) {
        return res.status(403).json({
          message: "Access denied.",
        });
      }

      db.all(
        `SELECT id, messageId, senderId, reply, createdAt
         FROM replies
         WHERE messageId = ?
         ORDER BY createdAt ASC, id ASC`,
        [messageId],
        (replyErr, replies) => {
          if (replyErr) {
            return res.status(500).json({
              message: "Unable to load conversation.",
            });
          }

          return res.json(replies);
        },
      );
    },
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
      message: "You cannot access another user's notifications.",
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
          message: "Unable to load notifications.",
        });
      }

      return res.json(rows);
    },
  );
});

// ========================================
// MARK NOTIFICATIONS AS READ
// ========================================

router.patch("/notifications/read", verifyToken, (req, res) => {
  const userId = Number(req.user.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID.",
    });
    return;
  }

  db.run(
    `UPDATE notifications
         SET isRead = 1
         WHERE userId = ?
           AND isRead = 0`,
    [userId],
    function (err) {
      if (err) {
        console.error("Mark notifications as read failed:", err.message);

        return res.status(500).json({
          message: "Unable to mark notifications as read.",
        });
      }

      return res.json({
        message: "Notifications marked as read.",
        updatedCount: this.changes,
      });
    },
  );
});

// ========================================
// MARK ONE NOTIFICATION AS READ
// ========================================

router.patch("/notifications/:notificationId/read", verifyToken, (req, res) => {
  const userId = Number(req.user.id);
  const notificationId = Number(req.params.notificationId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID.",
    });
  }

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({
      message: "Invalid notification ID.",
    });
  }

  db.run(
    `UPDATE notifications
     SET isRead = 1
     WHERE id = ? AND userId = ? AND isRead = 0`,
    [notificationId, userId],
    function (err) {
      if (err) {
        console.error("Mark notification as read failed:", err.message);

        return res.status(500).json({
          message: "Unable to mark notification as read.",
        });
      }

      if (this.changes === 0) {
        return res.json({
          message: "Notification is already read or does not exist.",
          updatedCount: 0,
        });
      }

      return res.json({
        message: "Notification marked as read.",
        updatedCount: this.changes,
      });
    },
  );
});

// ========================================
// MARK CONVERSATION MESSAGES AS READ
// ========================================

router.patch("/read/:listingId", verifyToken, (req, res) => {
  const listingId = Number(req.params.listingId);
  const userId = Number(req.user.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID.",
    });
  }

  checkListingAccess(listingId, userId, (accessErr, listing, allowed) => {
    if (accessErr) {
      return res.status(500).json({
        message: "Unable to check conversation access.",
      });
    }

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found.",
      });
    }

    if (!allowed) {
      return res.status(403).json({
        message: "You cannot access this conversation.",
      });
    }

    db.run(
      `UPDATE messages
                 SET isRead = 1
                 WHERE listingId = ?
                   AND recipientId = ?
                   AND isRead = 0`,
      [listingId, userId],
      function (updateErr) {
        if (updateErr) {
          console.error("Mark messages as read failed:", updateErr.message);

          return res.status(500).json({
            message: "Unable to mark messages as read.",
          });
        }

        return res.json({
          message: "Messages marked as read.",
          updatedCount: this.changes,
        });
      },
    );
  });
});

module.exports = router;
