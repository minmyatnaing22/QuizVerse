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
    mode TEXT NOT NULL DEFAULT 'PRACTICE'
        CHECK (mode IN ('PRACTICE', 'EXAM')),
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
                    ensureQuizAttemptModeColumn();
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

function ensureQuizAttemptModeColumn() {

    db.all("PRAGMA table_info(quiz_attempts)", (err, cols) => {

        if (err) {
            console.error(err.message);
            return;
        }

        const hasMode = (cols || []).some((col) => col.name === "mode");

        if (hasMode) {
            return;
        }

        db.run(
            "ALTER TABLE quiz_attempts ADD COLUMN mode TEXT NOT NULL DEFAULT 'PRACTICE'",
            (alterErr) => {
                if (alterErr) {
                    console.error(alterErr.message);
                    return;
                }
                console.log("Added quiz_attempts.mode column.");
            }
        );

    });

}

function ensureBookmarksTable() {

    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (question_id) REFERENCES questions(id),
            UNIQUE (user_id, question_id)
        )
    `);

}

function ensureExamAttemptsTable() {

    db.run(`
        CREATE TABLE IF NOT EXISTS exam_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            question_type TEXT NOT NULL
                CHECK (question_type IN ('MCQ', 'TRUE_FALSE', 'BLANK')),
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            percentage REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        )
    `);

}

function ensureDailyChallengeTable() {

    db.run(`
        CREATE TABLE IF NOT EXISTS daily_challenge_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            challenge_date TEXT NOT NULL,
            question_ids TEXT NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            total_questions INTEGER NOT NULL DEFAULT 0,
            percentage REAL NOT NULL DEFAULT 0,
            xp_earned INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE (user_id, challenge_date)
        )
    `);

}

function ensureBadgeTables() {

    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS badges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                badge_key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                category TEXT NOT NULL
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                badge_id INTEGER NOT NULL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (badge_id) REFERENCES badges(id),
                UNIQUE (user_id, badge_id)
            )
        `, (err) => {
            if (err) {
                console.error(err.message);
                return;
            }
            const badgeService = require("../services/badgeService");
            badgeService.seedBadges((seedErr) => {
                if (seedErr) {
                    console.error(seedErr.message);
                }
            });
        });
    });

}

const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite database.");
        ensureUserTables();
        ensureBookmarksTable();
        ensureExamAttemptsTable();
        ensureDailyChallengeTable();
        ensureBadgeTables();
    }

});

module.exports = db;