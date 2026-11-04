const express = require("express");
const router = express.Router();
const db = require("../database");
const verifyToken = require("../middleware/authMiddleware");

// CREATE INTEREST
router.post("/", verifyToken, (req, res) => {
  const listingId = Number(req.body.listingId);
  const userId = Number(req.user.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID."
    });
  }

  // Check whether listing exists
  db.get(
    "SELECT id, user_id, title FROM listings WHERE id = ?",
    [listingId],
    (err, listing) => {
      if (err) {
        return res.status(500).json({
          message: "Database error."
        });
      }

      if (!listing) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      if (Number(listing.user_id) === userId) {
        return res.status(400).json({
          message: "You cannot express interest in your own listing."
        });
      }

      // Insert interest
      db.run(
        `INSERT INTO interests (listing_id, user_id)
         VALUES (?, ?)`,
        [listingId, userId],
        function (err) {
          if (err) {
            if (
              err.code === "23505" ||
              err.code === "SQLITE_CONSTRAINT" ||
              err.message?.includes("UNIQUE constraint failed")
            ) {
              return res.status(400).json({
                message: "Already interested."
              });
            }

            console.error("Interest creation error:", err.message);

            return res.status(500).json({
              message: "Failed to express interest."
            });
          }

          const interestId = this.lastID;

          // Notify listing owner
          db.run(
            `INSERT INTO notifications (userId, message)
             VALUES (?, ?)`,
            [
              listing.user_id,
              `Someone showed interest in your listing "${listing.title}"`
            ],
            (notificationError) => {
              if (notificationError) {
                console.error(
                  "Notification creation error:",
                  notificationError.message
                );
              }

              return res.status(201).json({
                message: "Interest sent successfully.",
                id: interestId
              });
            }
          );
        }
      );
    }
  );
});

// GET INTEREST COUNT
router.get("/count/:id", (req, res) => {
  const listingId = Number(req.params.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID."
    });
  }

  db.get(
    `SELECT COUNT(*) AS count
     FROM interests
     WHERE listing_id = ?`,
    [listingId],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to retrieve interest count."
        });
      }

      return res.json(row);
    }
  );
});

// GET USERS INTERESTED IN A LISTING
// Only the listing owner can view interested users.
router.get("/listing/:listingId", verifyToken, (req, res) => {
  const listingId = Number(req.params.listingId);
  const userId = Number(req.user.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID."
    });
  }

  db.get(
    "SELECT user_id FROM listings WHERE id = ?",
    [listingId],
    (err, listing) => {
      if (err) {
        return res.status(500).json({
          message: "Database error."
        });
      }

      if (!listing) {
        return res.status(404).json({
          message: "Listing not found."
        });
      }

      if (Number(listing.user_id) !== userId) {
        return res.status(403).json({
          message: "Only the listing owner can view interested users."
        });
      }

      db.all(
        `SELECT
          users.id,
          users.name,
          users.email,
          user_profiles.age,
          user_profiles.gender,
          user_profiles.occupation,
          user_profiles.budget,
          user_profiles.food_preference,
          user_profiles.smoking,
          user_profiles.drinking,
          user_profiles.bio
        FROM interests
        JOIN users ON interests.user_id = users.id
        LEFT JOIN user_profiles
          ON users.id = user_profiles.user_id
        WHERE interests.listing_id = ?`,
        [listingId],
        (err, rows) => {
          if (err) {
            return res.status(500).json({
              message: "Failed to retrieve interested users."
            });
          }

          return res.json(rows);
        }
      );
    }
  );
});

// GET INTEREST RECORDS FOR A LISTING
router.get("/:listingId", verifyToken, (req, res) => {
  const listingId = Number(req.params.listingId);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID."
    });
  }

  db.all(
    `SELECT * FROM interests WHERE listing_id = ?`,
    [listingId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to retrieve interests."
        });
      }

      return res.json(rows);
    }
  );
});

module.exports = router;