const db = require("../config/database");


function getChaptersBySubject(subject_id, callback){

    const sql = `
        SELECT
            id,
            chapter_number,
            chapter_name
        FROM chapters
        WHERE subject_id = ?
        ORDER BY chapter_number;
    `;


    db.all(sql, [subject_id], (err, rows)=>{

        callback(err, rows);

    });

}


module.exports = {
    getChaptersBySubject
};


// const db = require("../config/database");


// function getChaptersBySubject(subject_id, callback){

//     console.log("Model received:", subject_id);


//     const sql = `
//         SELECT
//             id,
//             chapter_number,
//             chapter_name
//         FROM chapters
//         WHERE subject_id = ?
//         ORDER BY chapter_number;
//     `;


//     db.all(sql, [subject_id], (err, rows)=>{

//         if(err){
//             console.log("Database error:", err);
//             return callback(err);
//         }


//         console.log("Number of rows:", rows.length);

//         console.log(rows);


//         callback(null, rows);

//     });

// }


// module.exports = {
//     getChaptersBySubject
// };