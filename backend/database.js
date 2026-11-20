require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = path.join(__dirname, "nestnotes.db");

// Tests and local development use SQLite.
// Render uses Neon when DATABASE_URL is configured.
const useSQLite =
  process.env.USE_SQLITE === "true" ||
  process.env.NODE_ENV === "test" ||
  !process.env.DATABASE_URL;

function createSQLiteDatabase() {
  console.log("Using SQLite:", DB_PATH);

  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isVerified INTEGER DEFAULT 0,
        role TEXT NOT NULL DEFAULT 'user',
        verified INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        rent INTEGER,
        location TEXT,
        category TEXT,
        image TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        verified INTEGER DEFAULT 0
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
        recipientId INTEGER,
        message TEXT NOT NULL,
        isRead INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId INTEGER,
        senderId INTEGER,
        reply TEXT,
        isRead INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        message TEXT NOT NULL,
        isRead INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        listingId INTEGER,
        otherUserId INTEGER
      )
    `);

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
    `);

    // Safely add columns to older SQLite databases.
    const ensureColumn = (table, column, definition) => {
      db.all(`PRAGMA table_info(${table})`, (err, columns) => {
        if (err) {
          console.error(`Could not inspect ${table}:`, err.message);
          return;
        }

        if (!columns.some((item) => item.name === column)) {
          db.run(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
            (alterError) => {
              if (alterError) {
                console.error(
                  `Could not add ${table}.${column}:`,
                  alterError.message,
                );
              } else {
                console.log(`Added ${table}.${column}`);
              }
            },
          );
        }
      });
    };

    ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'user'");
    ensureColumn("users", "verified", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("users", "isVerified", "INTEGER DEFAULT 0");
    ensureColumn("listings", "verified", "INTEGER DEFAULT 0");
    ensureColumn("messages", "recipientId", "INTEGER");
    ensureColumn("messages", "isRead", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("replies", "isRead", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("notifications", "listingId", "INTEGER");
    ensureColumn("notifications", "otherUserId", "INTEGER");

    db.run(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS unique_interest
      ON interests(listing_id, user_id)
    `,
      (err) => {
        if (err) {
          console.error("Interest index error:", err.message);
        }
      },
    );
  });

  return db;
}

// Convert SQLite-style SQL into PostgreSQL-compatible SQL.
function preparePostgresSQL(sql) {
  let query = sql.trim().replace(/;$/, "");

  // Convert SQLite INSERT OR IGNORE syntax.
  const wasInsertOrIgnore = /^\s*INSERT\s+OR\s+IGNORE\s+INTO/i.test(query);

  if (wasInsertOrIgnore) {
    query = query.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT INTO");

    if (!/\bON\s+CONFLICT\b/i.test(query)) {
      query += " ON CONFLICT DO NOTHING";
    }
  }

  const camelCaseColumns = [
    "listingId",
    "senderId",
    "recipientId",
    "createdAt",
    "isRead",
    "userId",
    "messageId",
    "otherUserId",
    "isVerified",
  ];

  const aliases = [
    "totalListings",
    "averageRent",
    "highestRent",
    "lowestRent",
    "totalInterests",
    "totalMessages",
    "unreadCount",
  ];

  // Process SQL character by character so identifiers and
  // placeholders inside strings or quoted identifiers are preserved.
  let output = "";
  let index = 0;
  let parameterIndex = 0;
  let state = "normal";

  while (index < query.length) {
    const char = query[index];
    const next = query[index + 1];

    // Inside a single-quoted SQL string.
    if (state === "single") {
      output += char;

      if (char === "'" && next === "'") {
        output += next;
        index += 2;
        continue;
      }

      if (char === "'") {
        state = "normal";
      }

      index++;
      continue;
    }

    // Inside an already quoted PostgreSQL identifier.
    if (state === "double") {
      output += char;

      if (char === '"' && next === '"') {
        output += next;
        index += 2;
        continue;
      }

      if (char === '"') {
        state = "normal";
      }

      index++;
      continue;
    }

    // Handle SQL strings.
    if (char === "'") {
      state = "single";
      output += char;
      index++;
      continue;
    }

    // Preserve already quoted identifiers.
    if (char === '"') {
      state = "double";
      output += char;
      index++;
      continue;
    }

    // Convert SQLite placeholders outside strings and identifiers.
    if (char === "?") {
      output += `$${++parameterIndex}`;
      index++;
      continue;
    }

    // Identify SQL words and convert known camelCase columns.
    if (/[a-zA-Z_]/.test(char)) {
      let end = index + 1;

      while (end < query.length && /[a-zA-Z0-9_$]/.test(query[end])) {
        end++;
      }

      const word = query.slice(index, end);

      if (camelCaseColumns.includes(word)) {
        output += `"${word}"`;
      } else {
        output += word;
      }

      index = end;
      continue;
    }

    output += char;
    index++;
  }

  // Quote camelCase aliases after AS.
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    output = output.replace(
      new RegExp(`\\bAS\\s+${escaped}\\b`, "gi"),
      `AS "${alias}"`,
    );
  }

  return output;
}

function createPostgresDatabase() {
  const { Pool } = require("pg");

  console.log("Using Neon PostgreSQL");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL pool error:", err.message);
  });

  return {
    get(sql, params = [], callback) {
      if (typeof params === "function") {
        callback = params;
        params = [];
      }

      const query = preparePostgresSQL(sql);

      pool
        .query(query, params)
        .then((result) => {
          if (callback) callback(null, result.rows[0]);
        })
        .catch((err) => {
          if (callback) callback(err);
          else console.error("PostgreSQL GET error:", err.message);
        });
    },

    all(sql, params = [], callback) {
      if (typeof params === "function") {
        callback = params;
        params = [];
      }

      const query = preparePostgresSQL(sql);

      pool
        .query(query, params)
        .then((result) => {
          if (callback) callback(null, result.rows);
        })
        .catch((err) => {
          if (callback) callback(err);
          else console.error("PostgreSQL ALL error:", err.message);
        });
    },

    run(sql, params = [], callback) {
      if (typeof params === "function") {
        callback = params;
        params = [];
      }

      let query = preparePostgresSQL(sql);

      const isInsert = /^\s*INSERT\s+INTO/i.test(query);

      if (
        isInsert &&
        !/\bRETURNING\b/i.test(query) &&
        !/\bON\s+CONFLICT\b[\s\S]*\bDO\s+NOTHING\b/i.test(query)
      ) {
        query += " RETURNING id";
      } else if (
        isInsert &&
        !/\bRETURNING\b/i.test(query) &&
        /\bON\s+CONFLICT\b[\s\S]*\bDO\s+NOTHING\b/i.test(query)
      ) {
        query += " RETURNING id";
      }

      pool
        .query(query, params)
        .then((result) => {
          const context = {
            lastID: result.rows[0]?.id,
            changes: result.rowCount,
          };

          if (callback) callback.call(context, null);
        })
        .catch((err) => {
          if (callback) callback.call({}, err);
          else console.error("PostgreSQL RUN error:", err.message);
        });
    },

    close(callback) {
      pool
        .end()
        .then(() => callback && callback(null))
        .catch((err) => callback && callback(err));
    },
  };
}

const db = useSQLite ? createSQLiteDatabase() : createPostgresDatabase();

module.exports = db;
