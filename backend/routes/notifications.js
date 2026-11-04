
const express = require("express");
const router = express.Router();

const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");

router.get("/:userId", verifyToken, (req, res) => {
  const requestedUserId = Number(req.params.userId);
  const authenticatedUserId = Number(req.user.id);

  // Users can only access their own notifications.
  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({
      message: "Not authorized to view these notifications."
    });
  }

  db.all(
    `
    SELECT *
    FROM notifications
    WHERE userId = ?
    ORDER BY created_at DESC
    `,
    [authenticatedUserId],
    (err, rows) => {
      if (err) {
        console.error("Notification loading error:", err.message);

        return res.status(500).json({
          message: "Failed to load notifications."
        });
      }

      res.json(rows);
    }
  );
});

module.exports = router;
