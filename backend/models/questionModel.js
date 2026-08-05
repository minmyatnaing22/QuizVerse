const db = require("../config/database");


function getQuestionsByChapter(chapter_id, callback){

    const sql = `
        SELECT *
        FROM questions
        WHERE chapter_id = ?
        AND is_active = 1
        ORDER BY question_number;
    `;


    db.all(sql,[chapter_id],(err,rows)=>{

        callback(err,rows);

    });

}


module.exports = {
    getQuestionsByChapter
};