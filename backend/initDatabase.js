const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "../database/quizVerse.db");
const schemaPath = path.join(__dirname, "../database/schema.sql");
const seedPath = path.join(__dirname, "../database/seed.sql");

console.log("Database:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
        return;
    }

    console.log("Connected to SQLite database.");

    const schema = fs.readFileSync(schemaPath, "utf8");
    const seed = fs.readFileSync(seedPath, "utf8");

    db.exec(schema, (err) => {
        if (err) {
            console.error("Schema error:", err.message);
            return;
        }

        console.log("Schema created successfully.");

        db.exec(seed, (err) => {
            if (err) {
                console.error("Seed error:", err.message);
                return;
            }

            console.log("Seed data inserted successfully.");

            db.close((err) => {
                if (err) {
                    console.error("Error closing database:", err.message);
                } else {
                    console.log("Database initialization complete.");
                }
            });
        });
    });
});