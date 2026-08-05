const db = require("../config/database");

// =========================
// Get Subject ID
// =========================
function getSubjectId(subjectName, callback) {

    const sql = `
        SELECT id
        FROM subjects
        WHERE name = ?;
    `;

    db.get(sql, [subjectName.trim()], (err, row) => {

        if (err) {
            return callback(err);
        }

        if (!row) {
            return callback(new Error(`Subject "${subjectName}" not found.`));
        }

        callback(null, row.id);

    });

}

// =========================
// Get Chapter ID
// =========================
function getChapterId(subjectId, chapterNumber, callback) {

    const sql = `
        SELECT id
        FROM chapters
        WHERE subject_id = ?
        AND chapter_number = ?;
    `;

    db.get(sql, [subjectId, chapterNumber], (err, row) => {

        if (err) {
            return callback(err);
        }

        if (!row) {
            return callback(new Error(`Chapter ${chapterNumber} not found.`));
        }

        callback(null, row.id);

    });

}


// =========================
// Get Question ID
// =========================
function getQuestionId(chapterId, questionNumber, callback) {

    const sql = `
        SELECT id
        FROM questions
        WHERE chapter_id = ?
        AND question_number = ?;
    `;

    db.get(
        sql,
        [
            chapterId,
            questionNumber
        ],
        (err, row) => {

            if (err) {
                return callback(err);
            }

            if (!row) {
                return callback(null, null);
            }

            callback(null, row.id);

        }
    );

}


function insertQuestion(chapterId, row, callback) {

    const sql = `
        INSERT INTO questions
        (
            chapter_id,
            question_number,
            question_text,
            question_type
        )
        VALUES (?, ?, ?, ?);
    `;

    db.run(
        sql,
        [
            chapterId,
            row.No,
            row.Question,
            row.Type
        ],
        function (err) {

            if (err) {
                return callback(err);
            }

            callback(null, this.lastID);

        }
    );

}

// =========================
// Update Question
// =========================
function updateQuestion(questionId, row, callback) {

    const sql = `
        UPDATE questions
        SET
            question_text = ?,
            question_type = ?
        WHERE id = ?;
    `;

    db.run(
        sql,
        [
            row.Question,
            row.Type,
            questionId
        ],
        function (err) {

            if (err) {
                return callback(err);
            }

            callback(null);

        }
    );

}

// =========================
// Delete Options
// =========================
function deleteOptions(questionId, callback) {

    const sql = `
        DELETE FROM question_options
        WHERE question_id = ?;
    `;

    db.run(
        sql,
        [questionId],
        function (err) {

            if (err) {
                return callback(err);
            }

            callback(null);

        }
    );

}

// =========================
// Delete Answer
// =========================
function deleteAnswer(questionId, callback) {

    const sql = `
        DELETE FROM question_answers
        WHERE question_id = ?;
    `;

    db.run(
        sql,
        [questionId],
        function (err) {

            if (err) {
                return callback(err);
            }

            callback(null);

        }
    );

}



function insertOptions(questionId, row, callback) {

    const sql = `
        INSERT INTO question_options
        (
            question_id,
            option_label,
            option_text
        )
        VALUES (?, ?, ?);
    `;

    const labels = ["A", "B", "C", "D"];

    const options = [];

    labels.forEach((label) => {

        const optionText = row[`Option ${label}`];

        if (optionText && optionText.trim()) {

            options.push([
                label,
                optionText.trim()
            ]);

        }

    });

    // NEW
    if (options.length === 0) {
        return callback(null);
    }

    let completed = 0;

    options.forEach((option) => {

        db.run(
            sql,
            [
                questionId,
                option[0],
                option[1]
            ],
            function (err) {

                if (err) {
                    return callback(err);
                }

                completed++;

                if (completed === options.length) {
                    callback(null);
                }

            }
        );

    });

}

function insertAnswer(questionId, row, callback) {

    const sql = `
        INSERT INTO question_answers
        (
            question_id,
            correct_answer
        )
        VALUES (?, ?);
    `;

    db.run(
        sql,
        [
            questionId,
            row["Correct Answer"]
        ],
        function (err) {

            if (err) {
                return callback(err);
            }

            callback(null);

        }
    );

}

module.exports = {
    getSubjectId,
    getChapterId,
    getQuestionId,
    insertQuestion,
    updateQuestion,
    deleteOptions,
    deleteAnswer,
    insertOptions,
    insertAnswer
};


