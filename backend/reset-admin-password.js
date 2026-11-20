require("dotenv").config();

const db = require("./database");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const email = "praveenkumarforpubg@gmail.com";

rl.question("Enter your new admin password: ", async (password) => {
    if (!password || password.length < 8) {
        console.log("Password must contain at least 8 characters.");
        rl.close();
        db.close(() => {});
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        db.run(
            "UPDATE users SET password = ? WHERE LOWER(email) = ? AND role = 'admin'",
            [hashedPassword, email],
            function (err) {
                if (err) {
                    console.error("Password reset failed:", err.message);
                } else if (this.changes === 1) {
                    console.log("Admin password reset successfully!");
                } else {
                    console.log("Admin account was not updated.");
                }

                rl.close();
                db.close(() => {});
            }
        );
    } catch (error) {
        console.error("Error:", error.message);
        rl.close();
        db.close(() => {});
    }
});