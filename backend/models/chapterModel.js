const db = require("../config/database");


function getChaptersBySubject(subject_id, callback) {

    const sql = `
        SELECT
            c.id,
            c.chapter_number,
            c.chapter_name,
            q.question_type

        FROM chapters c

        LEFT JOIN questions q
            ON c.id = q.chapter_id
            AND q.is_active = 1

        WHERE c.subject_id = ?

        ORDER BY
            c.chapter_number,
            q.question_type;
    `;


    db.all(sql, [subject_id], (err, rows) => {

        if (err) {
            return callback(err);
        }


        const chapters = {};


        rows.forEach((row) => {

            if (!chapters[row.id]) {

                chapters[row.id] = {

                    id: row.id,

                    chapter_number:
                        row.chapter_number,

                    chapter_name:
                        row.chapter_name,

                    question_types: []

                };

            }


            if (
                row.question_type &&
                !chapters[row.id].question_types.includes(
                    row.question_type
                )
            ) {

                chapters[row.id].question_types.push(
                    row.question_type
                );

            }

        });


        callback(
            null,
            Object.values(chapters)
        );

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