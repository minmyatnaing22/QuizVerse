const db = require("../config/database");

function getQuestionOptionsByQuestion(question_id, callback) {

    const sql = `
        SELECT
            option_label,
            option_text
        FROM question_options
        WHERE question_id = ?
        ORDER BY option_label;
    `;

    db.all(sql, [question_id], (err, rows) => {
        callback(err, rows);
    });

}

module.exports = {
    getQuestionOptionsByQuestion
};