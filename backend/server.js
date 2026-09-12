const express = require("express");
const cors = require("cors");

const listingsRoute =
require("./routes/listings");

console.log("Route =", listingsRoute);

const app = express();

app.use(cors());

app.use(express.json());

console.log("Type:", typeof listingsRoute);
console.log("Value:", listingsRoute);

app.use("/api/listings", listingsRoute);

app.get("/", (req, res) => {

    res.send("NestNotes API Running");

});

module.exports = app;

if (require.main === module) {

    app.listen(3000, () => {

        console.log(
            "Server running on port 3000"
        );

    });

}