const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {

    const authHeader = req.headers.authorization;

    console.log("Authorization Header:", authHeader);

    if (!authHeader) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    const token = authHeader.split(" ")[1];

    console.log("Token:", token);

    try {

        const decoded = jwt.verify(
            token,
            "nestnotes-secret"
        );

        console.log("Decoded:", decoded);

        req.user = decoded;

        next();

    } catch (error) {

        console.log("JWT Error:", error.message);

        return res.status(403).json({
            message: "Invalid token"
        });
    }
}

module.exports = verifyToken;