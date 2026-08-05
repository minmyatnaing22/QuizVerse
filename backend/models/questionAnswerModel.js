const db = require("../config/database");

function getQuestionAnswerByQuestion(question_id, callback) {

    const sql = `
        SELECT
            correct_answer
        FROM question_answers
        WHERE question_id = ?;
    `;

    db.get(sql, [question_id], (err, row) => {
        callback(err, row);
    });

}

module.exports = {
    getQuestionAnswerByQuestion
};