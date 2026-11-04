const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");
const upload = require("../multerConfig");
const db = require("../database");

router.post("/upload", verifyToken, upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: "No image file uploaded."
        });
    }

    console.log("Image uploaded:", req.file.filename);

    res.json({
        image: `/uploads/${req.file.filename}`
    });
});

router.get("/stats/summary", verifyToken, requireAdmin, (req, res) => {
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
    },
  );
});

// GET all listings
router.get("/", (req, res) => {
  db.all("SELECT * FROM listings", [], (err, rows) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(rows);
  });
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
    },
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
    },
  );
});

// GET listing by ID
router.get("/:id", (req, res) => {
  db.get("SELECT * FROM listings WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (!row) {
      return res.status(404).json({
        message: "Listing not found",
      });
    }

    res.json(row);
  });
});

// CREATE listing
router.post("/", verifyToken, (req, res) => {
  const { title, rent, location, category, image, description } = req.body;

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
    [title, rent, location, category, image, description, userId],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.status(201).json({
        id: this.lastID,
        message: "Listing created successfully",
      });
    },
  );
});

// UPDATE listing
router.put("/:id", verifyToken, (req, res) => {
    const listingId = Number(req.params.id);
    const userId = Number(req.user.id);

    const { title, rent, location, category, image, description } = req.body;

    // Validate listing ID
    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            message: "Invalid listing ID."
        });
    }

    // Validate required fields
    if (
        typeof title !== "string" || !title.trim() ||
        typeof location !== "string" || !location.trim() ||
        typeof category !== "string" || !category.trim() ||
        rent === undefined || rent === null || rent === ""
    ) {
        return res.status(400).json({
            message: "Title, rent, location, and category are required."
        });
    }

    // Validate rent
    const rentAmount = Number(rent);

    if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
        return res.status(400).json({
            message: "Rent must be a valid positive number."
        });
    }

    // Validate optional fields
    if (
        image !== undefined && image !== null &&
        typeof image !== "string"
    ) {
        return res.status(400).json({
            message: "Image must be a string."
        });
    }

    if (
        description !== undefined && description !== null &&
        typeof description !== "string"
    ) {
        return res.status(400).json({
            message: "Description must be a string."
        });
    }

    db.get(
        "SELECT * FROM listings WHERE id = ?",
        [listingId],
        (err, listing) => {
            if (err) {
                console.error("Error fetching listing:", err);
                return res.status(500).json({
                    message: "Failed to fetch listing."
                });
            }

            if (!listing) {
                return res.status(404).json({
                    message: "Listing not found."
                });
            }

            // Check listing ownership
            if (Number(listing.user_id) !== userId) {
                return res.status(403).json({
                    message: "Not authorized."
                });
            }

            db.run(
                `UPDATE listings
                 SET title = ?,
                     rent = ?,
                     location = ?,
                     category = ?,
                     image = ?,
                     description = ?
                 WHERE id = ?`,
                [
                    title.trim(),
                    rentAmount,
                    location.trim(),
                    category.trim(),
                    image ?? null,
                    description ?? null,
                    listingId
                ],
                function (err) {
                    if (err) {
                        console.error("Error updating listing:", err);
                        return res.status(500).json({
                            message: "Failed to update listing."
                        });
                    }

                    return res.json({
                        message: "Listing updated successfully."
                    });
                }
            );
        }
    );
});

// =========================================
// DELETE LISTING
// Owners can delete their own listings.
// Admins can delete any listing.
// =========================================

router.delete("/:id", verifyToken, (req, res) => {
    const listingId = Number(req.params.id);
    const userId = Number(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({
            message: "Invalid listing ID."
        });
    }

    db.get(
        "SELECT * FROM listings WHERE id = ?",
        [listingId],
        (err, listing) => {

            if (err) {
                console.error("Error fetching listing:", err);

                return res.status(500).json({
                    message: "Failed to fetch listing."
                });
            }

            if (!listing) {
                return res.status(404).json({
                    message: "Listing not found."
                });
            }

            // Allow the owner or an admin to delete.
            if (
                Number(listing.user_id) !== userId &&
                !isAdmin
            ) {
                return res.status(403).json({
                    message: "Not authorized."
                });
            }

            db.run(
                "DELETE FROM listings WHERE id = ?",
                [listingId],
                function (err) {

                    if (err) {
                        console.error("Error deleting listing:", err);

                        return res.status(500).json({
                            message: "Failed to delete listing."
                        });
                    }

                    return res.json({
                        message: "Listing deleted successfully."
                    });
                }
            );
        }
    );
});

router.post("/:id/favorite", verifyToken, (req, res) => {
  const listingId = Number(req.params.id);
  const userId = Number(req.user.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID."
    });
  }

  db.run(
    `
    INSERT OR IGNORE INTO favorites
    (user_id, listing_id)
    VALUES (?, ?)
    `,
    [userId, listingId],
    function (err) {
      if (err) {
        console.error("Favorite error:", err.message);

        return res.status(500).json({
          message: "Failed to add favorite."
        });
      }

      return res.json({
        message: this.changes > 0
          ? "Added to favorites"
          : "Already in favorites"
      });
    }
  );
});

// Remove a listing from favorites
router.delete("/:id/favorite", verifyToken, (req, res) => {
  const listingId = Number(req.params.id);
  const userId = Number(req.user.id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return res.status(400).json({
      message: "Invalid listing ID."
    });
  }

  db.run(
    `DELETE FROM favorites WHERE user_id = ? AND listing_id = ?`,
    [userId, listingId],
    function (err) {
      if (err) {
        console.error("Remove favorite error:", err.message);
        return res.status(500).json({
          message: "Failed to remove favorite."
        });
      }

      return res.json({
        message: this.changes > 0
          ? "Removed from favorites"
          : "Favorite not found"
      });
    }
  );
});

router.get("/dashboard/stats/:userId", requireAdmin, (req, res) => {
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
          message: err.message,
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
              message: err.message,
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
                  message: err.message,
                });
              }

              res.json({
                totalListings: listingResult.totalListings,
                totalInterests: interestResult.totalInterests,
                totalMessages: messageResult.totalMessages,
              });
            },
          );
        },
      );
    },
  );
});

router.put("/:id/verify", requireAdmin, (req, res) => {
  db.run(
    `
        UPDATE listings
        SET verified = 1
        WHERE id = ?
        `,
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Listing verified",
      });
    },
  );
});

router.put("/:id/unverify", requireAdmin, (req, res) => {
  db.run(
    `
        UPDATE listings
        SET verified = 0
        WHERE id = ?
        `,
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Listing unverified",
      });
    },
  );
});

module.exports = router;
