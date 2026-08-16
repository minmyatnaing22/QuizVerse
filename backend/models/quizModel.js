const db = require("../config/database");

function getQuizByChapter(chapter_id, type, callback) {

    const sql = `
        SELECT
            q.id,
            q.question_number,
            q.question_text,
            q.question_type,

            o.option_label,
            o.option_text

        FROM questions q

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

        callback(null, Object.values(questions));

    });

}



function calculateScore(chapter_id, question_type, answers, callback) {


    const sql = `
        SELECT
            q.id,
            qa.correct_answer
        FROM questions q
        INNER JOIN question_answers qa
            ON q.id = qa.question_id
        WHERE q.chapter_id = ?
        AND q.question_type = ?
        AND q.is_active = 1;
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

            questions.forEach((question) => {

                const answer = answers.find(
                    (answer) =>
                        answer.question_id === question.id
                );

                if (!answer) {
                    return;
                }

                if (
                    answer.selected_answer
                        .trim()
                        .toUpperCase()
                    ===
                    question.correct_answer
                        .trim()
                        .toUpperCase()
                ) {
                    score++;
                }

            });

            const total = questions.length;

            callback(null, {
                total_questions: total,
                correct_answers: score,
                wrong_answers: total - score,
                percentage: (score / total) * 100
            });

        }
    );


}



function saveQuizAttempt(chapter_id, score, total_questions, percentage, callback) {

    const sql = `
        INSERT INTO quiz_attempts
        (chapter_id, score, total_questions, percentage)

        VALUES (?, ?, ?, ?)

        ON CONFLICT(chapter_id)
        DO UPDATE SET
            score = excluded.score,
            total_questions = excluded.total_questions,
            percentage = excluded.percentage,
            updated_at = CURRENT_TIMESTAMP;
    `;

    db.run(
        sql,
        [chapter_id, score, total_questions, percentage],  
        callback                  //=======????
    );

}



module.exports = {
    getQuizByChapter,
    calculateScore,
    saveQuizAttempt
};