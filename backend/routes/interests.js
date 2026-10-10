const express = require("express");
const router = express.Router();
const db = require("../database");

const verifyToken = require("../middleware/authMiddleware");

// Create Interest
router.post("/", verifyToken, (req, res) => {
  const { listingId } = req.body;

  db.get(
    `
    SELECT *
    FROM interests
    WHERE listing_id = ?
    AND user_id = ?
    `,
    [listingId, req.user.id],
    (err, row) => {

      if (err) {
        return res.status(500).json(err);
      }

      if (row) {
        return res.status(400).json({
          message: "Already interested"
        });
      }

      db.run(
        `
        INSERT INTO interests
        (listing_id, user_id)
        VALUES (?, ?)
        `,
        [listingId, req.user.id],
        function (err) {

          if (err) {
            return res.status(500).json(err);
          }

          db.get(
            `
            SELECT user_id, title
            FROM listings
            WHERE id = ?
            `,
            [listingId],
            (err, listing) => {

              if (listing) {
                console.log("Listing owner:", listing);
                console.log("Creating notification for:", listing.user_id);
                db.run(
                  `
                  INSERT INTO notifications
                  (userId, message)
                  VALUES (?, ?)
                  `,
                  [
                    listing.user_id,
                    `Someone showed interest in your listing "${listing.title}"`
                  ],
                  function (err) {

                    if (err) {
                      console.error("NOTIFICATION ERROR:", err);
                    }else{
                      console.log("NOTIFICATION CREATED:")
                    }
                  }
                );

              }

              res.status(201).json({
                message: "Interest sent successfully",
                id: this.lastID
              });
            }
          );
        }
      );
    }
  );
});

router.get("/count/:id", (req, res) => {
  console.log("COUNT ROUTE HIT");

  db.get(
    `
        SELECT COUNT(*) as count
        FROM interests
        WHERE listing_id = ?
        `,
    [req.params.id],
    (err, row) => {
      console.log("COUNT RESULT:", row);

      if (err) {
        return res.status(500).json(err);
      }

      res.json(row);
    },
  );
});

router.get("/listing/:listingId", verifyToken, (req, res) => {
  const { listingId } = req.params;

  db.all(
    `
        SELECT
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
JOIN users
ON interests.user_id = users.id
LEFT JOIN user_profiles
ON users.id = user_profiles.user_id
WHERE interests.listing_id = ?
        `,
    [listingId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
});

router.get("/:listingId", (req, res) => {
  const { listingId } = req.params;

  db.all(
    `
        SELECT *
        FROM interests
        WHERE listing_id = ?
        `,
    [listingId],
    (err, rows) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json(rows);
    },
  );
});


module.exports = router;
