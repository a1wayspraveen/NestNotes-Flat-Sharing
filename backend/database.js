const sqlite3 = require("sqlite3").verbose();

const path = require("path");

console.log(
  path.resolve("./nestnotes.db")
);

const db = new sqlite3.Database("./nestnotes.db");

db.serialize(() => {

    db.run(`
    CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        rent INTEGER,
        location TEXT,
        category TEXT,
        image TEXT,
        description TEXT,
        user_id INTEGER,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        UNIQUE(user_id, listing_id)
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS interests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER,
        user_id INTEGER
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listingId INTEGER NOT NULL,
        senderId INTEGER NOT NULL,
        message TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `);

});

db.run(`
CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageId INTEGER,
    senderId INTEGER,
    reply TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

db.all("PRAGMA table_info(listings)", [], (err, rows) => {
    console.log("LISTINGS COLUMNS:", rows);
});

db.run(`
ALTER TABLE listings
ADD COLUMN verified INTEGER DEFAULT 0
`, (err) => {
    if (err) {
        console.log("verified column already exists");
    } else {
        console.log("verified column added");
    }
});

db.run(
  "UPDATE listings SET verified = 1 WHERE id IN (10,11)",
  (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Listings verified successfully");
    }
  }
);

db.run(`
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    message TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`, (err) => {
    if(err){
        console.error("Notifications table error:", err);
    } else {
        console.log("Notifications table ready");
    }
});

db.run(`
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    age INTEGER,
    gender TEXT,
    occupation TEXT,
    budget TEXT,
    food_preference TEXT,
    smoking TEXT,
    drinking TEXT,
    bio TEXT,
    profile_image TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
`, (err) => {
    if(err){
        console.error(err);
    } else {
        console.log("User profiles table ready");
    }
});

db.run(
  `CREATE UNIQUE INDEX IF NOT EXISTS unique_interest
   ON interests(listing_id, user_id)`,
  (err) => {
    if (err) {
      console.log("Index error:", err.message);
    } else {
      console.log("Interest index created");
    }
  }
);

db.run(
  "DELETE FROM interests WHERE id IN (2,4)",
  (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Duplicates removed");
    }
  }
);

module.exports = db;

