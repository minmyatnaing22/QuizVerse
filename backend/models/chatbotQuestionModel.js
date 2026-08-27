const db = require("../config/database");

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseNumber(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function mapQuestion(row, options) {
    if (!row) {
        return null;
    }

    return {
        question_id: row.question_id,
        subject_id: row.subject_id,
        subject: row.subject_name,
        chapter_id: row.chapter_id,
        chapter_number: row.chapter_number,
        chapter_name: row.chapter_name,
        question_number: row.question_number,
        question_text: row.question_text,
        question_type: row.question_type,
        options: (options || []).map((item) => ({
            label: item.option_label,
            text: item.option_text
        })),
        correct_answer: row.correct_answer || null
    };
}

function attachOptions(row, callback) {
    if (!row) {
        return callback(null, null);
    }

    db.all(
        `
            SELECT option_label, option_text
            FROM question_options
            WHERE question_id = ?
            ORDER BY option_label
        `,
        [row.question_id],
        (err, options) => {
            if (err) {
                return callback(err);
            }
            callback(null, mapQuestion(row, options));
        }
    );
}

function getQuestionById(question_id, callback) {
    const id = parseId(question_id);
    if (!id) {
        return callback(null, null);
    }

    db.get(
        `
            SELECT
                q.id AS question_id,
                q.question_number,
                q.question_text,
                q.question_type,
                c.id AS chapter_id,
                c.chapter_number,
                c.chapter_name,
                s.id AS subject_id,
                s.name AS subject_name,
                a.correct_answer
            FROM questions q
            JOIN chapters c
                ON c.id = q.chapter_id
            JOIN subjects s
                ON s.id = c.subject_id
            LEFT JOIN question_answers a
                ON a.question_id = q.id
            WHERE q.id = ?
            AND q.is_active = 1
        `,
        [id],
        (err, row) => {
            if (err) {
                return callback(err);
            }
            attachOptions(row, callback);
        }
    );
}

function getQuestionByLocation(ref, callback) {
    const questionNumber = parseNumber(ref && ref.question_number);
    if (!questionNumber) {
        return callback(null, null);
    }

    const chapterId = parseId(ref && ref.chapter_id);
    const chapterNumber = parseNumber(ref && ref.chapter_number);
    const subjectId = parseId(ref && ref.subject_id);
    const subjectName = ref && ref.subject_name
        ? String(ref.subject_name).trim().toLowerCase()
        : "";

    const where = ["q.is_active = 1", "q.question_number = ?"];
    const params = [questionNumber];

    if (chapterId) {
        where.push("c.id = ?");
        params.push(chapterId);
    } else if (chapterNumber) {
        where.push("c.chapter_number = ?");
        params.push(chapterNumber);
        if (subjectId) {
            where.push("s.id = ?");
            params.push(subjectId);
        } else if (subjectName) {
            where.push("LOWER(s.name) = ?");
            params.push(subjectName);
        } else {
            return callback(null, null);
        }
    } else {
        return callback(null, null);
    }

    db.get(
        `
            SELECT
                q.id AS question_id,
                q.question_number,
                q.question_text,
                q.question_type,
                c.id AS chapter_id,
                c.chapter_number,
                c.chapter_name,
                s.id AS subject_id,
                s.name AS subject_name,
                a.correct_answer
            FROM questions q
            JOIN chapters c
                ON c.id = q.chapter_id
            JOIN subjects s
                ON s.id = c.subject_id
            LEFT JOIN question_answers a
                ON a.question_id = q.id
            WHERE ${where.join(" AND ")}
        `,
        params,
        (err, row) => {
            if (err) {
                return callback(err);
            }
            attachOptions(row, callback);
        }
    );
}

function subjectExists(name, callback) {
    db.get(
        "SELECT id, name FROM subjects WHERE LOWER(name) = ?",
        [String(name || "").trim().toLowerCase()],
        (err, row) => {
            if (err) {
                return callback(err);
            }
            callback(null, row || null);
        }
    );
}

function chapterExists(subject_id, chapter_number, callback) {
    db.get(
        `
            SELECT id, chapter_number, chapter_name
            FROM chapters
            WHERE subject_id = ?
            AND chapter_number = ?
        `,
        [subject_id, chapter_number],
        (err, row) => {
            if (err) {
                return callback(err);
            }
            callback(null, row || null);
        }
    );
}

module.exports = {
    getQuestionById,
    getQuestionByLocation,
    subjectExists,
    chapterExists
};
