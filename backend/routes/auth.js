const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = require("../database");


router.post("/register", async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    db.run(
        `
        INSERT INTO users
        (name,email,password)
        VALUES(?,?,?)
        `,
        [name, email, hashedPassword],

        function(err) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.status(201).json({
                id: this.lastID,
                name,
                email
            });

        }
    );
});

router.post("/login", (req, res) => {

    const { email, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {

            if (err || !user) {
                return res.status(401).json({
                    message: "Invalid credentials"
                });
            }

            const match =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!match) {
                return res.status(401).json({
                    message: "Invalid credentials"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                "nestnotes-secret",
                {
                    expiresIn: "1d"
                }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    );
});

module.exports = router;