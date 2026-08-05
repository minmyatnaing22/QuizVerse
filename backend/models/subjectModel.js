const db = require("../config/database");

function getAllSubjects(callback) {
    const sql = `
        SELECT *
        FROM subjects
        ORDER BY id;
    `;

    db.all(sql, [], (err, rows) => {
        callback(err, rows);
    });
}

module.exports = {
    getAllSubjects
};