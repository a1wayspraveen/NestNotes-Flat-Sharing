const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/:userId", (req, res) => {
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