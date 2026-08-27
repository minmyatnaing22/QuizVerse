const db = require("../config/database");

const QUESTION_COUNT = 10;
const XP_PER_CORRECT = 10;

function utcToday() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function shuffle(items) {
    const list = (items || []).slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = list[i];
        list[i] = list[j];
        list[j] = swap;
    }
    return list;
}

function parseQuestionIds(value) {
    try {
        const parsed = JSON.parse(value || "[]");
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0);
    } catch (err) {
        return [];
    }
}

function getTodayAttempt(user_id, callback) {
    db.get(
        `
            SELECT *
            FROM daily_challenge_attempts
            WHERE user_id = ?
            AND challenge_date = ?
        `,
        [user_id, utcToday()],
        callback
    );
}

function pickRandomQuestionIds(callback) {
    db.all(
        `
            SELECT id
            FROM questions
            WHERE is_active = 1
            ORDER BY RANDOM()
            LIMIT ?
        `,
        [QUESTION_COUNT],
        (err, rows) => {
            if (err) {
                return callback(err);
            }
            callback(null, (rows || []).map((row) => row.id));
        }
    );
}

function startTodayAttempt(user_id, questionIds, callback) {
    const ids = questionIds || [];
    db.run(
        `
            INSERT INTO daily_challenge_attempts
            (user_id, challenge_date, question_ids, score, total_questions, percentage, xp_earned, completed)
            VALUES (?, ?, ?, 0, ?, 0, 0, 0)
        `,
        [user_id, utcToday(), JSON.stringify(ids), ids.length],
        function (err) {
            if (err) {
                return callback(err);
            }
            callback(null, {
                id: this.lastID,
                user_id,
                challenge_date: utcToday(),
                question_ids: JSON.stringify(ids),
                score: 0,
                total_questions: ids.length,
                percentage: 0,
                xp_earned: 0,
                completed: 0
            });
        }
    );
}

function loadQuestionsByIds(ids, hideAnswers, callback) {
    const questionIds = (ids || []).filter((id) => Number.isInteger(id) && id > 0);
    if (!questionIds.length) {
        return callback(null, []);
    }

    const placeholders = questionIds.map(() => "?").join(",");
    const sql = `
        SELECT
            q.id,
            q.question_text,
            q.question_type,
            s.name AS subject_name,
            o.option_label,
            o.option_text,
            qa.correct_answer
        FROM questions q
        JOIN chapters c
            ON q.chapter_id = c.id
        JOIN subjects s
            ON c.subject_id = s.id
        LEFT JOIN question_options o
            ON o.question_id = q.id
        LEFT JOIN question_answers qa
            ON qa.question_id = q.id
        WHERE q.is_active = 1
        AND q.id IN (${placeholders})
        ORDER BY q.id, o.option_label
    `;

    db.all(sql, questionIds, (err, rows) => {
        if (err) {
            return callback(err);
        }

        const grouped = {};
        (rows || []).forEach((row) => {
            if (!grouped[row.id]) {
                grouped[row.id] = {
                    id: row.id,
                    question_text: row.question_text,
                    question_type: row.question_type,
                    subject_name: row.subject_name,
                    correct_answer: row.correct_answer,
                    options: []
                };
            }
            if (row.option_label) {
                grouped[row.id].options.push({
                    label: row.option_label,
                    text: row.option_text
                });
            }
        });

        const ordered = questionIds
            .map((id) => grouped[id])
            .filter(Boolean)
            .map((question) => {
                const options = shuffle(question.options || []);
                const payload = {
                    id: question.id,
                    question_text: question.question_text,
                    question_type: question.question_type,
                    subject_name: question.subject_name,
                    options
                };
                if (!hideAnswers) {
                    payload.correct_answer = question.correct_answer;
                }
                return payload;
            });

        callback(null, ordered);
    });
}

function scoreAnswers(questionIds, answers, callback) {
    loadQuestionsByIds(questionIds, false, (err, questions) => {
        if (err) {
            return callback(err);
        }

        const answerById = {};
        (answers || []).forEach((item) => {
            const id = Number(item.question_id);
            if (Number.isInteger(id) && id > 0) {
                answerById[id] = item && item.selected_answer != null
                    ? String(item.selected_answer).trim()
                    : "";
            }
        });

        let correct = 0;
        let skipped = 0;
        const reviews = questions.map((question, index) => {
            const selected = answerById[question.id] || "";
            const isSkipped = selected === "";
            const isCorrect = !isSkipped &&
                selected.toUpperCase() ===
                String(question.correct_answer || "").trim().toUpperCase();

            if (isSkipped) {
                skipped += 1;
            } else if (isCorrect) {
                correct += 1;
            }

            return {
                question_id: question.id,
                question_number: index + 1,
                question_text: question.question_text,
                question_type: question.question_type,
                selected_answer: selected,
                correct_answer: question.correct_answer,
                is_correct: isCorrect,
                skipped: isSkipped
            };
        });

        const total = questions.length;
        const percentage = total === 0 ? 0 : (correct / total) * 100;

        callback(null, {
            total_questions: total,
            correct_answers: correct,
            wrong_answers: total - correct - skipped,
            skipped_answers: skipped,
            percentage,
            xp_earned: correct * XP_PER_CORRECT,
            reviews
        });
    });
}

function completeTodayAttempt(user_id, result, callback) {
    db.run(
        `
            UPDATE daily_challenge_attempts
            SET score = ?,
                total_questions = ?,
                percentage = ?,
                xp_earned = ?,
                completed = 1
            WHERE user_id = ?
            AND challenge_date = ?
            AND completed = 0
        `,
        [
            result.correct_answers,
            result.total_questions,
            result.percentage,
            result.xp_earned,
            user_id,
            utcToday()
        ],
        function (err) {
            if (err) {
                return callback(err);
            }
            callback(null, this.changes);
        }
    );
}

function formatCompleted(row, extra) {
    return Object.assign({
        completed: true,
        challenge_date: row.challenge_date,
        total_questions: Number(row.total_questions) || 0,
        correct_answers: Number(row.score) || 0,
        percentage: Number(row.percentage) || 0,
        xp_earned: Number(row.xp_earned) || 0
    }, extra || {});
}

module.exports = {
    QUESTION_COUNT,
    utcToday,
    parseQuestionIds,
    getTodayAttempt,
    pickRandomQuestionIds,
    startTodayAttempt,
    loadQuestionsByIds,
    scoreAnswers,
    completeTodayAttempt,
    formatCompleted
};
