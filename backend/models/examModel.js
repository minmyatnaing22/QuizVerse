const db = require("../config/database");

const VALID_TYPES = ["MCQ", "TRUE_FALSE", "BLANK"];

function getSubjectById(subject_id, callback) {
    db.get(
        "SELECT id, name FROM subjects WHERE id = ?",
        [subject_id],
        callback
    );
}

function getTypesForSubject(subject_id, callback) {
    const sql = `
        SELECT DISTINCT q.question_type
        FROM questions q
        JOIN chapters c
            ON q.chapter_id = c.id
        WHERE c.subject_id = ?
        AND q.is_active = 1
        AND q.question_type IN ('MCQ', 'TRUE_FALSE', 'BLANK')
        ORDER BY
            CASE q.question_type
                WHEN 'MCQ' THEN 1
                WHEN 'TRUE_FALSE' THEN 2
                WHEN 'BLANK' THEN 3
                ELSE 4
            END
    `;

    db.all(sql, [subject_id], callback);
}

function getRandomExamQuestions(subject_id, question_type, callback) {
    const sql = `
        SELECT
            q.id,
            q.question_text,
            q.question_type,
            o.option_label,
            o.option_text
        FROM questions q
        JOIN chapters c
            ON q.chapter_id = c.id
        LEFT JOIN question_options o
            ON o.question_id = q.id
        WHERE c.subject_id = ?
        AND q.question_type = ?
        AND q.is_active = 1
        AND q.id IN (
            SELECT id FROM (
                SELECT q2.id
                FROM questions q2
                JOIN chapters c2
                    ON q2.chapter_id = c2.id
                WHERE c2.subject_id = ?
                AND q2.question_type = ?
                AND q2.is_active = 1
                ORDER BY RANDOM()
                LIMIT 15
            )
        )
        ORDER BY q.id, o.option_label
    `;

    db.all(
        sql,
        [subject_id, question_type, subject_id, question_type],
        (err, rows) => {
            if (err) {
                return callback(err);
            }

            const grouped = {};
            (rows || []).forEach((row) => {
                if (!grouped[row.id]) {
                    grouped[row.id] = {
                        id: row.id,
                        question_text: row.question_text,
                        question_type: row.question_type,
                        options: []
                    };
                }
                if (row.option_label) {
                    grouped[row.id].options.push({
                        label: row.option_label,
                        text: row.option_text
                    });
                }
            });

            const questions = Object.values(grouped);
            for (let i = questions.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                const swap = questions[i];
                questions[i] = questions[j];
                questions[j] = swap;
            }

            callback(null, questions.map((question, index) => ({
                id: question.id,
                question_number: index + 1,
                question_text: question.question_text,
                question_type: question.question_type,
                options: question.options
            })));
        }
    );
}

function scoreExam(subject_id, question_type, answers, callback) {
    const ids = (answers || [])
        .map((item) => Number(item.question_id))
        .filter((id) => Number.isInteger(id) && id > 0);

    if (!ids.length) {
        return callback(new Error("answers are required"));
    }

    const placeholders = ids.map(() => "?").join(",");
    const sql = `
        SELECT
            q.id,
            q.question_text,
            qa.correct_answer
        FROM questions q
        JOIN chapters c
            ON q.chapter_id = c.id
        JOIN question_answers qa
            ON qa.question_id = q.id
        WHERE c.subject_id = ?
        AND q.question_type = ?
        AND q.is_active = 1
        AND q.id IN (${placeholders})
    `;

    db.all(sql, [subject_id, question_type].concat(ids), (err, questions) => {
        if (err) {
            return callback(err);
        }

        const byId = {};
        (questions || []).forEach((row) => {
            byId[row.id] = row;
        });

        let correct = 0;
        let skipped = 0;
        const reviews = [];

        answers.forEach((item, index) => {
            const questionId = Number(item.question_id);
            const question = byId[questionId];
            const selected = item && item.selected_answer
                ? String(item.selected_answer).trim()
                : "";

            if (!question) {
                reviews.push({
                    question_id: questionId,
                    question_number: index + 1,
                    question_text: "",
                    selected_answer: selected,
                    correct_answer: "",
                    is_correct: false,
                    skipped: selected === "",
                    invalid: true
                });
                if (selected === "") {
                    skipped += 1;
                }
                return;
            }

            const isSkipped = selected === "";
            const isCorrect = !isSkipped &&
                selected.toUpperCase() ===
                String(question.correct_answer).trim().toUpperCase();

            if (isSkipped) {
                skipped += 1;
            } else if (isCorrect) {
                correct += 1;
            }

            reviews.push({
                question_id: question.id,
                question_number: index + 1,
                question_text: question.question_text,
                selected_answer: selected,
                correct_answer: question.correct_answer,
                is_correct: isCorrect,
                skipped: isSkipped
            });
        });

        const invalid = reviews.some((row) => row.invalid);
        if (invalid) {
            return callback(new Error("One or more questions are not valid for this exam"));
        }

        const total = reviews.length;
        callback(null, {
            total_questions: total,
            correct_answers: correct,
            wrong_answers: total - correct - skipped,
            skipped_answers: skipped,
            percentage: total === 0 ? 0 : (correct / total) * 100,
            reviews
        });
    });
}

function saveExamAttempt(user_id, subject_id, question_type, score, total_questions, percentage, callback) {
    const sql = `
        INSERT INTO exam_attempts
        (user_id, subject_id, question_type, score, total_questions, percentage)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [user_id, subject_id, question_type, score, total_questions, percentage],
        callback
    );
}

module.exports = {
    VALID_TYPES,
    getSubjectById,
    getTypesForSubject,
    getRandomExamQuestions,
    scoreExam,
    saveExamAttempt
};
