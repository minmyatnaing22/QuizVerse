const db = require("../config/database");

function getQuizByChapter(chapter_id, type, callback) {

    const sql = `
        SELECT
            q.id,
            q.question_number,
            q.question_text,
            q.question_type,

            c.chapter_number,
            c.chapter_name,
            s.name AS subject_name,

            o.option_label,
            o.option_text

        FROM questions q

        JOIN chapters c
            ON q.chapter_id = c.id

        JOIN subjects s
            ON c.subject_id = s.id

        LEFT JOIN question_options o
            ON q.id = o.question_id

        WHERE q.chapter_id = ?
        AND q.question_type = ?
        AND q.is_active = 1

        ORDER BY
            q.question_number,
            o.option_label;
    `;

    db.all(sql, [chapter_id, type], (err, rows) => {

        if (err) {
            return callback(err);
        }

        const questions = {};

        rows.forEach((row) => {

            if (!questions[row.id]) {

                questions[row.id] = {
                    id: row.id,
                    question_number: row.question_number,
                    question_text: row.question_text,
                    question_type: row.question_type,
                    chapter_number: row.chapter_number,
                    chapter_name: row.chapter_name,
                    subject_name: row.subject_name,
                    options: []
                };

            }

            if (row.option_label) {

                questions[row.id].options.push({
                    label: row.option_label,
                    text: row.option_text
                });

            }

        });

        callback(
            null,
            Object.values(questions).sort(
                (a, b) => a.question_number - b.question_number
            )
        );

    });

}



function calculateScore(chapter_id, question_type, answers, callback) {


    const sql = `
        SELECT
            q.id,
            q.question_number,
            q.question_text,
            qa.correct_answer
        FROM questions q
        INNER JOIN question_answers qa
            ON q.id = qa.question_id
        WHERE q.chapter_id = ?
        AND q.question_type = ?
        AND q.is_active = 1
        ORDER BY q.question_number;
    `;

    db.all(
        sql,
        [chapter_id, question_type],
        (err, questions) => {

            if (err) {
                return callback(err);
            }

            if (questions.length === 0) {
                return callback(
                    new Error("No questions found for this chapter.")
                );
            }

            let score = 0;
            let skipped = 0;

            const reviews = questions.map((question) => {

                const answer = answers.find(
                    (answer) =>
                        Number(answer.question_id) === Number(question.id)
                );

                const selected = answer && answer.selected_answer
                    ? String(answer.selected_answer).trim()
                    : "";

                const isSkipped = selected === "";
                const isCorrect = !isSkipped &&
                    selected.toUpperCase() ===
                    String(question.correct_answer).trim().toUpperCase();

                if (isSkipped) {
                    skipped++;
                }
                else if (isCorrect) {
                    score++;
                }

                return {
                    question_id: question.id,
                    question_number: question.question_number,
                    question_text: question.question_text,
                    selected_answer: selected,
                    correct_answer: question.correct_answer,
                    is_correct: isCorrect,
                    skipped: isSkipped
                };

            });

            const total = questions.length;

            callback(null, {
                total_questions: total,
                correct_answers: score,
                wrong_answers: total - score - skipped,
                skipped_answers: skipped,
                percentage: total === 0 ? 0 : (score / total) * 100,
                reviews
            });

        }
    );


}



function saveQuizAttempt(user_id, chapter_id, question_type, score, total_questions, percentage, callback) {

    const sql = `
        INSERT INTO quiz_attempts
        (user_id, chapter_id, question_type, score, total_questions, percentage)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [user_id, chapter_id, question_type, score, total_questions, percentage],
        callback
    );

}



module.exports = {
    getQuizByChapter,
    calculateScore,
    saveQuizAttempt
};