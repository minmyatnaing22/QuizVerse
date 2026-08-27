const db = require("../config/database");

function listByUser(user_id, callback) {

    const sql = `
        SELECT
            b.question_id,
            b.created_at,
            q.question_text,
            q.question_type,
            q.chapter_id,
            c.chapter_number,
            c.chapter_name,
            s.name AS subject_name
        FROM bookmarks b
        JOIN questions q
            ON q.id = b.question_id
        JOIN chapters c
            ON c.id = q.chapter_id
        JOIN subjects s
            ON s.id = c.subject_id
        WHERE b.user_id = ?
        AND q.is_active = 1
        ORDER BY b.created_at DESC
    `;

    db.all(sql, [user_id], callback);

}

function add(user_id, question_id, callback) {

    db.get(
        "SELECT id FROM questions WHERE id = ? AND is_active = 1",
        [question_id],
        (err, question) => {

            if (err) {
                return callback(err);
            }

            if (!question) {
                return callback(null, { notFound: true });
            }

            db.run(
                "INSERT OR IGNORE INTO bookmarks (user_id, question_id) VALUES (?, ?)",
                [user_id, question_id],
                function (insertErr) {

                    if (insertErr) {
                        return callback(insertErr);
                    }

                    callback(null, {
                        bookmarked: true,
                        created: this.changes > 0
                    });

                }
            );

        }
    );

}

function remove(user_id, question_id, callback) {

    db.run(
        "DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?",
        [user_id, question_id],
        function (err) {

            if (err) {
                return callback(err);
            }

            callback(null, {
                bookmarked: false,
                removed: this.changes > 0
            });

        }
    );

}

module.exports = {
    listByUser,
    add,
    remove
};
