const db = require("../config/database");
const { EXAM_DATE } = require("../config/exam");

function getHistory(user_id, callback) {

    const sql = `
        SELECT * FROM (
            SELECT
                a.id,
                a.chapter_id,
                a.question_type,
                a.score,
                a.total_questions,
                a.percentage,
                COALESCE(a.mode, 'PRACTICE') AS mode,
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

            UNION ALL

            SELECT
                e.id,
                NULL AS chapter_id,
                e.question_type,
                e.score,
                e.total_questions,
                e.percentage,
                'EXAM' AS mode,
                e.created_at,
                NULL AS chapter_number,
                'Exam Mode' AS chapter_name,
                e.subject_id,
                s.name AS subject_name
            FROM exam_attempts e
            JOIN subjects s
                ON s.id = e.subject_id
            WHERE e.user_id = ?

            UNION ALL

            SELECT
                d.id,
                NULL AS chapter_id,
                'MIXED' AS question_type,
                d.score,
                d.total_questions,
                d.percentage,
                'DAILY' AS mode,
                d.created_at,
                NULL AS chapter_number,
                'Daily Challenge' AS chapter_name,
                NULL AS subject_id,
                'Daily Challenge' AS subject_name
            FROM daily_challenge_attempts d
            WHERE d.user_id = ?
            AND d.completed = 1
        )
        ORDER BY created_at DESC
    `;

    db.all(sql, [user_id, user_id, user_id], callback);

}

function getLeaderboard(callback) {

    const sql = `
        SELECT
            u.id,
            u.name,
            SUM(x.score) * 10 AS xp,
            SUM(x.total_questions) AS questions_answered,
            ROUND(100.0 * SUM(x.score) / SUM(x.total_questions), 0) AS accuracy
        FROM users u
        JOIN (
            SELECT user_id, score, total_questions, created_at
            FROM quiz_attempts
            UNION ALL
            SELECT user_id, score, total_questions, created_at
            FROM exam_attempts
            UNION ALL
            SELECT user_id, score, total_questions, created_at
            FROM daily_challenge_attempts
            WHERE completed = 1
        ) x
            ON x.user_id = u.id
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
                UNION
                SELECT user_id, date(created_at) AS day
                FROM exam_attempts
                GROUP BY user_id, date(created_at)
                UNION
                SELECT user_id, challenge_date AS day
                FROM daily_challenge_attempts
                WHERE completed = 1
                GROUP BY user_id, challenge_date
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
        FROM (
            SELECT score, total_questions, percentage
            FROM quiz_attempts
            WHERE user_id = ?
            UNION ALL
            SELECT score, total_questions, percentage
            FROM exam_attempts
            WHERE user_id = ?
            UNION ALL
            SELECT score, total_questions, percentage
            FROM daily_challenge_attempts
            WHERE user_id = ?
            AND completed = 1
        )
    `;

    db.get(sql, [user_id, user_id, user_id], callback);

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

                    const latestPractice = (history || []).find((row) =>
                        row.chapter_id &&
                        String(row.mode || "PRACTICE").toUpperCase() !== "EXAM" &&
                        String(row.mode || "").toUpperCase() !== "DAILY"
                    ) || null;
                    const continuePractice = latestPractice
                        ? {
                            subject_id: latestPractice.subject_id,
                            subject_name: latestPractice.subject_name,
                            chapter_id: latestPractice.chapter_id,
                            chapter_number: latestPractice.chapter_number,
                            chapter_name: latestPractice.chapter_name,
                            type: latestPractice.question_type,
                            mode: "PRACTICE"
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

function percent(correct, total) {
    const questions = Number(total) || 0;
    if (questions === 0) {
        return 0;
    }
    return Math.round((Number(correct) / questions) * 100);
}

function averageAccuracy(rows) {
    const list = rows || [];
    if (!list.length) {
        return 0;
    }
    const totals = list.reduce((acc, row) => {
        acc.correct += Number(row.score) || 0;
        acc.questions += Number(row.total_questions) || 0;
        return acc;
    }, { correct: 0, questions: 0 });
    return percent(totals.correct, totals.questions);
}

function buildInsights({ overall, subjects, chapters, timeline }) {
    const insights = [];
    const questions = Number(overall.questions_answered) || 0;
    const accuracy = Number(overall.accuracy) || 0;
    const practicedSubjects = subjects.filter((row) => row.questions_answered > 0);
    const practicedChapters = chapters.filter((row) => row.questions_answered > 0);

    if (questions === 0) {
        return insights;
    }

    if (questions >= 10 && accuracy < 60) {
        insights.push(
            "Your current accuracy is below 60%. Focus on reviewing your weakest chapters before attempting harder questions."
        );
    }

    if (practicedSubjects.length >= 2) {
        const weakest = practicedSubjects[practicedSubjects.length - 1];
        const strongest = practicedSubjects[0];
        if (strongest.accuracy - weakest.accuracy >= 15) {
            insights.push(
                weakest.subject_name +
                " is currently your weakest subject. Consider practicing " +
                weakest.subject_name +
                " chapters next."
            );
        }
    }

    if (timeline.length >= 6) {
        const recent = averageAccuracy(timeline.slice(-3));
        const earlier = averageAccuracy(timeline.slice(0, 3));
        if (recent - earlier >= 8) {
            insights.push("Your recent accuracy is improving compared with your earlier attempts.");
        } else if (earlier - recent >= 8) {
            insights.push("Your recent accuracy is lower than earlier attempts. A short review session may help.");
        }
    }

    if (practicedChapters.length && practicedChapters[0].accuracy < 60) {
        const weakestChapter = practicedChapters[0];
        insights.push(
            "Weakest chapter so far: " +
            weakestChapter.subject_name +
            " · Chapter " +
            weakestChapter.chapter_number +
            ": " +
            weakestChapter.chapter_name +
            " (" +
            weakestChapter.accuracy +
            "%)."
        );
    }

    if (!insights.length && accuracy >= 80 && questions >= 20) {
        insights.push("Your overall accuracy is strong. Keep practicing weaker chapters to stay exam-ready.");
    }

    return insights;
}

function getAnalytics(user_id, callback) {

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

                    const history = historyRows || [];
                    const mine = (ranks || []).find(
                        (row) => Number(row.user_id) === Number(user_id)
                    );

                    const totalQuestions = Number(totals && totals.total_questions_done) || 0;
                    const correct = Number(totals && totals.correct_answers) || 0;
                    const incorrect = Math.max(totalQuestions - correct, 0);
                    const accuracy = percent(correct, totalQuestions);
                    const quizzes = Number(totals && totals.total_quizzes) || 0;

                    const subjectMap = {};
                    const chapterMap = {};
                    const typeMap = {};

                    history.forEach((row) => {
                        const score = Number(row.score) || 0;
                        const questions = Number(row.total_questions) || 0;
                        const type = String(row.question_type || "").toUpperCase();

                        if (type && type !== "MIXED") {
                            if (!typeMap[type]) {
                                typeMap[type] = {
                                    question_type: type,
                                    questions_answered: 0,
                                    correct_answers: 0,
                                    attempts: 0
                                };
                            }
                            typeMap[type].questions_answered += questions;
                            typeMap[type].correct_answers += score;
                            typeMap[type].attempts += 1;
                        }

                        if (row.subject_id && String(row.mode || "").toUpperCase() !== "DAILY") {
                            const subjectKey = String(row.subject_id);
                            if (!subjectMap[subjectKey]) {
                                subjectMap[subjectKey] = {
                                    subject_id: row.subject_id,
                                    subject_name: row.subject_name,
                                    questions_answered: 0,
                                    correct_answers: 0,
                                    attempts: 0
                                };
                            }
                            subjectMap[subjectKey].questions_answered += questions;
                            subjectMap[subjectKey].correct_answers += score;
                            subjectMap[subjectKey].attempts += 1;
                        }

                        if (row.chapter_id) {
                            const chapterKey = String(row.chapter_id);
                            if (!chapterMap[chapterKey]) {
                                chapterMap[chapterKey] = {
                                    chapter_id: row.chapter_id,
                                    subject_id: row.subject_id,
                                    subject_name: row.subject_name,
                                    chapter_number: row.chapter_number,
                                    chapter_name: row.chapter_name,
                                    questions_answered: 0,
                                    correct_answers: 0,
                                    attempts: 0
                                };
                            }
                            chapterMap[chapterKey].questions_answered += questions;
                            chapterMap[chapterKey].correct_answers += score;
                            chapterMap[chapterKey].attempts += 1;
                        }
                    });

                    const subjects = Object.values(subjectMap).map((row) => {
                        const incorrectAnswers = Math.max(row.questions_answered - row.correct_answers, 0);
                        return {
                            subject_id: row.subject_id,
                            subject_name: row.subject_name,
                            questions_answered: row.questions_answered,
                            correct_answers: row.correct_answers,
                            incorrect_answers: incorrectAnswers,
                            attempts: row.attempts,
                            accuracy: percent(row.correct_answers, row.questions_answered)
                        };
                    }).sort((a, b) => b.accuracy - a.accuracy || b.questions_answered - a.questions_answered);

                    const chapters = Object.values(chapterMap).map((row) => {
                        return {
                            chapter_id: row.chapter_id,
                            subject_id: row.subject_id,
                            subject_name: row.subject_name,
                            chapter_number: row.chapter_number,
                            chapter_name: row.chapter_name,
                            questions_answered: row.questions_answered,
                            correct_answers: row.correct_answers,
                            attempts: row.attempts,
                            accuracy: percent(row.correct_answers, row.questions_answered)
                        };
                    }).sort((a, b) => a.accuracy - b.accuracy || b.questions_answered - a.questions_answered);

                    const types = ["MCQ", "TRUE_FALSE", "BLANK"].filter((type) => typeMap[type]).map((type) => {
                        const row = typeMap[type];
                        return {
                            question_type: type,
                            questions_answered: row.questions_answered,
                            correct_answers: row.correct_answers,
                            incorrect_answers: Math.max(row.questions_answered - row.correct_answers, 0),
                            attempts: row.attempts,
                            accuracy: percent(row.correct_answers, row.questions_answered)
                        };
                    });

                    const chronological = history.slice().reverse();
                    const timeline = chronological.slice(Math.max(chronological.length - 14, 0)).map((row) => ({
                        created_at: row.created_at,
                        score: Number(row.score) || 0,
                        total_questions: Number(row.total_questions) || 0,
                        accuracy: percent(row.score, row.total_questions),
                        subject_name: row.subject_name,
                        mode: row.mode
                    }));

                    const overall = {
                        questions_answered: totalQuestions,
                        quizzes_completed: quizzes,
                        correct_answers: correct,
                        incorrect_answers: incorrect,
                        accuracy,
                        xp: mine ? mine.xp : correct * 10,
                        streak: mine ? mine.streak : 0,
                        rank: mine ? mine.rank : null
                    };

                    const strongestSubject = subjects.length ? subjects[0] : null;
                    const weakestSubject = subjects.length >= 2
                        ? subjects[subjects.length - 1]
                        : null;

                    callback(null, {
                        user: {
                            id: account ? account.id : Number(user_id),
                            name: account ? account.name : null
                        },
                        overall,
                        subjects,
                        chapters,
                        weakest_chapters: chapters.slice(0, 5),
                        strongest_chapters: chapters.slice().sort((a, b) =>
                            b.accuracy - a.accuracy || b.questions_answered - a.questions_answered
                        ).slice(0, 5),
                        strongest_subject: strongestSubject,
                        weakest_subject: weakestSubject,
                        question_types: types,
                        timeline,
                        recent: history.slice(0, 8),
                        insights: buildInsights({
                            overall,
                            subjects,
                            chapters,
                            timeline
                        })
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
    getAnalytics,
    getExamDaysRemaining
};
