const express = require("express");
const cors = require("cors");
const path = require("path");

const fs = require("fs");

console.log(
    "Uploads exists:",
    fs.existsSync(path.join(__dirname, "uploads"))
);

const authRoutes = require("./routes/auth");
const listingsRoutes = require("./routes/listings");
const interestRoutes = require("./routes/interests");
const messageRoutes = require("./routes/messages");
const adminRoutes = require("./routes/admin");
const profileRoutes = require("./routes/profile");
const notificationsRoutes = require("./routes/notifications");

require("./database");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationsRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;