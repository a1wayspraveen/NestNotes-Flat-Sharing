const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname
            .replace(/\s+/g, "-")
            .replace(/[()]/g, "");

        cb(null, Date.now() + "-" + cleanName);
    }
});

module.exports = multer({ storage });