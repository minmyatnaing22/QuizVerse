const db = require("../config/database");
const { EXAM_DATE } = require("../config/exam");

function getHistory(user_id, callback) {

    const sql = `
        SELECT
            a.id,
            a.chapter_id,
            a.question_type,
            a.score,
            a.total_questions,
            a.percentage,
            a.created_at,
            c.chapter_number,
            c.chapter_name,
            c.subject_id,
            s.name AS subject_name
        FROM quiz_attempts a
        JOIN chapters c
            ON a.chapter_id = c.id
        JOIN subjects s
            ON c.subject_id = s.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
    `;

    db.all(sql, [user_id], callback);

}

function getLeaderboard(callback) {

    const sql = `
        SELECT
            u.id,
            u.name,
            SUM(a.score) * 10 AS xp,
            SUM(a.total_questions) AS questions_answered,
            ROUND(100.0 * SUM(a.score) / SUM(a.total_questions), 0) AS accuracy
        FROM users u
        JOIN quiz_attempts a
            ON a.user_id = u.id
        GROUP BY u.id, u.name
        ORDER BY xp DESC, accuracy DESC, u.name ASC
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            return callback(err);
        }

        db.all(
            `
                SELECT user_id, date(created_at) AS day
                FROM quiz_attempts
                GROUP BY user_id, date(created_at)
            `,
            [],
            (dayErr, days) => {

                if (dayErr) {
                    return callback(dayErr);
                }

                const daysByUser = {};

                (days || []).forEach((row) => {
                    if (!daysByUser[row.user_id]) {
                        daysByUser[row.user_id] = [];
                    }
                    daysByUser[row.user_id].push(row.day);
                });

                let lastKey = null;
                let lastRank = 0;

                const ranked = (rows || []).map((row, index) => {
                    const xp = Number(row.xp) || 0;
                    const accuracy = Number(row.accuracy) || 0;
                    const key = xp + "|" + accuracy;

                    if (key !== lastKey) {
                        lastRank = index + 1;
                        lastKey = key;
                    }

                    return {
                        rank: lastRank,
                        user_id: row.id,
                        name: row.name,
                        xp,
                        questions_answered: Number(row.questions_answered) || 0,
                        accuracy,
                        streak: streakFromDays(daysByUser[row.id] || [])
                    };
                });

                callback(null, ranked);

            }
        );

    });

}

function streakFromDays(days) {

    if (!days.length) {
        return 0;
    }

    const set = new Set(days);
    const today = utcToday();

    if (!set.has(today)) {
        return 0;
    }

    let count = 0;
    const cursor = new Date(today + "T00:00:00Z");

    while (set.has(formatDayUTC(cursor))) {
        count += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return count;

}

function utcToday() {

    return formatDayUTC(new Date());

}

function formatDayUTC(date) {

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;

}

function getExamDaysRemaining() {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exam = new Date(EXAM_DATE + "T00:00:00");
    exam.setHours(0, 0, 0, 0);

    const days = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
    return Math.max(0, days);

}

function getUserTotals(user_id, callback) {

    const sql = `
        SELECT
            COUNT(*) AS total_quizzes,
            COALESCE(SUM(score), 0) AS correct_answers,
            COALESCE(SUM(total_questions), 0) AS total_questions_done,
            COALESCE(MAX(percentage), 0) AS best_score
        FROM quiz_attempts
        WHERE user_id = ?
    `;

    db.get(sql, [user_id], callback);

}

function getSubjectProgress(user_id, callback) {

    const sql = `
        SELECT
            s.id AS subject_id,
            s.name AS subject_name,
            COUNT(DISTINCT CASE WHEN q.id IS NOT NULL THEN c.id END)
                AS available_chapters,
            COUNT(DISTINCT a.chapter_id) AS attempted_chapters
        FROM subjects s
        LEFT JOIN chapters c
            ON c.subject_id = s.id
        LEFT JOIN questions q
            ON q.chapter_id = c.id
            AND q.is_active = 1
        LEFT JOIN quiz_attempts a
            ON a.chapter_id = c.id
            AND a.user_id = ?
        GROUP BY s.id, s.name
        ORDER BY s.id
    `;

    db.all(sql, [user_id], callback);

}

function getDashboardUser(user_id, callback) {

    db.get(
        "SELECT id, name, email FROM users WHERE id = ?",
        [user_id],
        callback
    );

}

function getDashboard(user_id, callback) {

    getDashboardUser(user_id, (userErr, account) => {

        if (userErr) {
            return callback(userErr);
        }

    getLeaderboard((rankErr, ranks) => {

        if (rankErr) {
            return callback(rankErr);
        }

        getHistory(user_id, (historyErr, historyRows) => {

            if (historyErr) {
                return callback(historyErr);
            }

            getUserTotals(user_id, (totalErr, totals) => {

                if (totalErr) {
                    return callback(totalErr);
                }

                getSubjectProgress(user_id, (progressErr, subjects) => {

                    if (progressErr) {
                        return callback(progressErr);
                    }

                    const history = historyRows || [];
                    const mine = (ranks || []).find(
                        (row) => Number(row.user_id) === Number(user_id)
                    );

                    const totalQuestions = Number(totals && totals.total_questions_done) || 0;
                    const correct = Number(totals && totals.correct_answers) || 0;
                    const accuracy = totalQuestions === 0
                        ? 0
                        : Math.round((correct / totalQuestions) * 100);

                    const latest = history[0] || null;
                    const continuePractice = latest
                        ? {
                            subject_id: latest.subject_id,
                            subject_name: latest.subject_name,
                            chapter_id: latest.chapter_id,
                            chapter_number: latest.chapter_number,
                            chapter_name: latest.chapter_name,
                            type: latest.question_type
                        }
                        : null;

                    callback(null, {
                        user: {
                            id: account ? account.id : Number(user_id) || null,
                            name: account ? account.name : null
                        },
                        sidebar: {
                            xp: mine ? mine.xp : correct * 10,
                            rank: mine ? mine.rank : null,
                            streak: mine ? mine.streak : streakFromDays([]),
                            accuracy,
                            questions_answered: totalQuestions,
                            continue_practice: continuePractice
                        },
                        summary: {
                            exam_days: getExamDaysRemaining(),
                            total_questions_done: totalQuestions,
                            overall_accuracy: accuracy,
                            total_quizzes: Number(totals && totals.total_quizzes) || 0,
                            correct_answers: correct,
                            best_score: Math.round(Number(totals && totals.best_score) || 0)
                        },
                        recent_practice: history.slice(0, 5),
                        subject_progress: (subjects || []).map((row) => {
                            const available = Number(row.available_chapters) || 0;
                            const attempted = Number(row.attempted_chapters) || 0;
                            return {
                                subject_id: row.subject_id,
                                subject_name: row.subject_name,
                                attempted_chapters: attempted,
                                available_chapters: available,
                                progress_percent: available === 0
                                    ? 0
                                    : Math.round((attempted / available) * 100)
                            };
                        })
                    });

                });

            });

        });

    });

    });

}

module.exports = {
    getHistory,
    getLeaderboard,
    getDashboard,
    getExamDaysRemaining
};
