PRAGMA foreign_keys = ON;

-- ==========================================
-- QuizVerse Database Schema
-- Version: 1.0
-- ==========================================

CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    subject_id INTEGER NOT NULL,

    chapter_number INTEGER NOT NULL,

    chapter_name TEXT NOT NULL,

    FOREIGN KEY (subject_id)
        REFERENCES subjects(id),

    UNIQUE(subject_id, chapter_number)
);

CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    chapter_id INTEGER NOT NULL,

    question_number INTEGER NOT NULL,

    question_text TEXT NOT NULL,

    question_type TEXT NOT NULL
        CHECK (question_type IN ('MCQ', 'TRUE_FALSE', 'BLANK')),

    is_active INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id),

    UNIQUE (chapter_id, question_number)
);


CREATE TABLE question_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    question_id INTEGER NOT NULL,

    correct_answer TEXT NOT NULL,

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
);

CREATE TABLE question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    question_id INTEGER NOT NULL,

    option_label TEXT NOT NULL,
       

    option_text TEXT NOT NULL,

    FOREIGN KEY (question_id)
        REFERENCES questions(id)
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quiz_attempts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    chapter_id INTEGER NOT NULL,

    question_type TEXT NOT NULL
        CHECK (question_type IN ('MCQ', 'TRUE_FALSE', 'BLANK')),

    score INTEGER NOT NULL,

    total_questions INTEGER NOT NULL,

    percentage REAL NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id),

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)

);