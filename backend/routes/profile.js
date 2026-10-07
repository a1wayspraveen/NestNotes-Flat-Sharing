const express = require("express");
const router = express.Router();
console.log("PROFILE ROUTES LOADED");
const db = require("../database");

const verifyToken =
require("../middleware/authMiddleware");
router.post("/", verifyToken, (req, res) => {

    const {
        age,
        gender,
        occupation,
        budget,
        food_preference,
        smoking,
        drinking,
        bio
    } = req.body;

    db.run(
        `
        INSERT OR REPLACE INTO user_profiles
        (
            user_id,
            age,
            gender,
            occupation,
            budget,
            food_preference,
            smoking,
            drinking,
            bio
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            req.user.id,
            age,
            gender,
            occupation,
            budget,
            food_preference,
            smoking,
            drinking,
            bio
        ],
        function(err) {

            if(err){
                return res.status(500).json(err);
            }

            res.json({
                message: "Profile saved"
            });
        }
    );
});

router.get("/:id", (req, res) => {

    db.get(
        `
        SELECT *
        FROM user_profiles
        WHERE user_id = ?
        `,
        [req.params.id],
        (err, row) => {

            if(err){
                return res.status(500).json(err);
            }

            res.json(row || {});
        }
    );
});

module.exports = router;