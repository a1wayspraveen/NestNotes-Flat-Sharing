const express = require("express");
const fs = require("fs");

const router = express.Router();

const FILE = "./data/listings.json";

// GET all listings
router.get("/", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  res.json(data);
});

// GET listing by ID
router.get("/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));

  const listing = data.find(
    item => item.id == req.params.id
  );

  if (!listing) {
    return res.status(404).json({
      message: "Listing not found"
    });
  }

  res.json(listing);
});

// CREATE new listing
router.post("/", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));

  const newListing = {
    id: Date.now(),
    title: req.body.title,
    price: req.body.price
  };

  data.push(newListing);

  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );

  res.status(201).json(newListing);
});

module.exports = router;