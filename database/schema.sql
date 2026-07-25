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
    name TEXT NOT NULL,

    FOREIGN KEY (subject_id)
        REFERENCES subjects(id)
);

CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,

    question_type TEXT NOT NULL
        CHECK (question_type IN ('MCQ', 'TRUE_FALSE', 'BLANK')),

    difficulty TEXT
        CHECK (difficulty IN ('Basic', 'Standard', 'Advanced')),

    explanation TEXT,

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)
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