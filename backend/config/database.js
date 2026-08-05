const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(
    __dirname,
    "../../database/quizVerse.db"
);

console.log("Database path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite database.");
    }

});

module.exports = db;