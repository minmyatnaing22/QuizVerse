const db = require("../config/database");

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function getContext(subject_id, chapter_id, callback) {
    const chapterId = parseId(chapter_id);
    const subjectId = parseId(subject_id);

    if (chapterId) {
        return db.get(
            `
                SELECT
                    c.id AS chapter_id,
                    c.chapter_number,
                    c.chapter_name,
                    s.id AS subject_id,
                    s.name AS subject_name
                FROM chapters c
                JOIN subjects s
                    ON s.id = c.subject_id
                WHERE c.id = ?
            `,
            [chapterId],
            (err, row) => {
                if (err) {
                    return callback(err);
                }
                callback(null, {
                    subject_id: row ? row.subject_id : subjectId,
                    subject: row ? row.subject_name : null,
                    chapter_id: row ? row.chapter_id : chapterId,
                    chapter_number: row ? row.chapter_number : null,
                    chapter: row
                        ? (row.chapter_number + " — " + row.chapter_name)
                        : null
                });
            }
        );
    }

    if (subjectId) {
        return db.get(
            "SELECT id, name FROM subjects WHERE id = ?",
            [subjectId],
            (err, row) => {
                if (err) {
                    return callback(err);
                }
                callback(null, {
                    subject_id: row ? row.id : subjectId,
                    subject: row ? row.name : null,
                    chapter_id: null,
                    chapter_number: null,
                    chapter: null
                });
            }
        );
    }

    callback(null, {
        subject_id: null,
        subject: null,
        chapter_id: null,
        chapter_number: null,
        chapter: null
    });
}

module.exports = {
    getContext
};
