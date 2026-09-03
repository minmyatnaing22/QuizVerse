const db = require("../config/database");

function listMessages(subjectId, sinceId, callback) {
    const params = [];
    const where = [];

    if (subjectId) {
        where.push("m.subject_id = ?");
        params.push(subjectId);
    }

    if (sinceId) {
        where.push("m.id > ?");
        params.push(sinceId);
    }

    const sql = `
        SELECT
            m.id,
            m.subject_id,
            m.message,
            m.created_at,
            u.id AS user_id,
            u.name AS user_name
        FROM discussion_messages m
        INNER JOIN users u ON u.id = m.user_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY m.id DESC
        LIMIT 50
    `;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return callback(err);
        }
        callback(null, (rows || []).reverse());
    });
}

function createMessage(userId, subjectId, message, callback) {
    const sql = `
        INSERT INTO discussion_messages (user_id, subject_id, message)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [userId, subjectId || null, message], function (err) {
        if (err) {
            return callback(err);
        }
        db.get(`
            SELECT
                m.id,
                m.subject_id,
                m.message,
                m.created_at,
                u.id AS user_id,
                u.name AS user_name
            FROM discussion_messages m
            INNER JOIN users u ON u.id = m.user_id
            WHERE m.id = ?
        `, [this.lastID], callback);
    });
}

module.exports = {
    listMessages,
    createMessage
};
