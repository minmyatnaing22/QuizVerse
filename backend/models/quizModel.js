const db = require("../config/database");

function getQuizByChapter(chapter_id, callback) {

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
        AND q.is_active = 1

        ORDER BY
            q.question_number,
            o.option_label;
    `;

    db.all(sql, [chapter_id], (err, rows) => {

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




function calculateScore(answers, callback){

    let score = 0;

    let total = answers.length;

    let completed = 0;


    answers.forEach((answer)=>{


        const sql = `
            SELECT correct_answer
            FROM question_answers
            WHERE question_id = ?
        `;


        db.get(
            sql,
            [answer.question_id],
            (err,row)=>{


                if(err){
                    return callback(err);
                }


                if (
                    row.correct_answer.trim().toUpperCase() ===
                    answer.answer.trim().toUpperCase()
                ) {
                    score++;
                }


                completed++;


                if(completed === total){

                    callback(null,{
                        total_questions: total,
                        correct_answers: score,
                        wrong_answers: total-score,
                        percentage: (score/total)*100
                    });

                }

            }
        );

    });

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