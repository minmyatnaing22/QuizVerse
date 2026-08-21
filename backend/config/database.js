const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(
    __dirname,
    "../../database/quizVerse.db"
);

console.log("Database path:", dbPath);

const createAttemptsSql = `
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    question_type TEXT NOT NULL
        CHECK (question_type IN ('MCQ', 'TRUE_FALSE', 'BLANK')),
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
);
`;

function ensureUserTables() {

    db.run("PRAGMA foreign_keys = ON");

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='quiz_attempts'",
        (err, tables) => {

            if (err) {
                console.error(err.message);
                return;
            }

            if (!tables.length) {
                db.run(createAttemptsSql);
                return;
            }

            db.all("PRAGMA table_info(quiz_attempts)", (infoErr, cols) => {

                if (infoErr) {
                    console.error(infoErr.message);
                    return;
                }

                const hasUserId = (cols || []).some((col) => col.name === "user_id");

                if (hasUserId) {
                    return;
                }

                db.serialize(() => {
                    db.run("DROP TABLE quiz_attempts");
                    db.run(createAttemptsSql);
                    console.log("Migrated quiz_attempts for user history.");
                });

            });

        }
    );

}

const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite database.");
        ensureUserTables();
    }

});

module.exports = db;