const db = require("../config/database");

const CATALOG = [
    {
        badge_key: "FIRST_QUIZ",
        name: "First Steps",
        description: "Complete your first practice quiz.",
        icon: "🌱",
        category: "BEGINNER",
        progress: (s) => ({ current: Math.min(s.quiz_count, 1), target: 1 }),
        earned: (s) => s.quiz_count >= 1
    },
    {
        badge_key: "QUIZ_ROOKIE",
        name: "Quiz Rookie",
        description: "Complete 10 practice quizzes.",
        icon: "📘",
        category: "QUIZ",
        progress: (s) => ({ current: Math.min(s.quiz_count, 10), target: 10 }),
        earned: (s) => s.quiz_count >= 10
    },
    {
        badge_key: "QUIZ_MASTER",
        name: "Quiz Master",
        description: "Complete 50 practice quizzes.",
        icon: "🏆",
        category: "QUIZ",
        progress: (s) => ({ current: Math.min(s.quiz_count, 50), target: 50 }),
        earned: (s) => s.quiz_count >= 50
    },
    {
        badge_key: "PERFECT_SCORE",
        name: "Perfect Score",
        description: "Score 100% on a practice quiz.",
        icon: "🎯",
        category: "QUIZ",
        progress: (s) => ({ current: Math.min(s.perfect_quizzes, 1), target: 1 }),
        earned: (s) => s.perfect_quizzes >= 1
    },
    {
        badge_key: "EXAM_STARTER",
        name: "Exam Starter",
        description: "Complete your first Exam Mode attempt.",
        icon: "📝",
        category: "EXAM",
        progress: (s) => ({ current: Math.min(s.exam_count, 1), target: 1 }),
        earned: (s) => s.exam_count >= 1
    },
    {
        badge_key: "EXAM_ACE",
        name: "Exam Ace",
        description: "Score 90% or higher on an exam.",
        icon: "🥇",
        category: "EXAM",
        progress: (s) => ({ current: Math.min(s.exam_ace_count, 1), target: 1 }),
        earned: (s) => s.exam_ace_count >= 1
    },
    {
        badge_key: "DAILY_CHALLENGER",
        name: "Daily Challenger",
        description: "Complete your first Daily Challenge.",
        icon: "☀️",
        category: "DAILY",
        progress: (s) => ({ current: Math.min(s.daily_count, 1), target: 1 }),
        earned: (s) => s.daily_count >= 1
    },
    {
        badge_key: "DAILY_STREAK",
        name: "Challenge Streak",
        description: "Complete Daily Challenge on 3 consecutive days.",
        icon: "🔥",
        category: "DAILY",
        progress: (s) => ({ current: Math.min(s.daily_max_streak, 3), target: 3 }),
        earned: (s) => s.daily_max_streak >= 3
    },
    {
        badge_key: "STREAK_3",
        name: "3 Day Streak",
        description: "Be active on 3 consecutive days.",
        icon: "⚡",
        category: "STREAK",
        progress: (s) => ({ current: Math.min(s.activity_max_streak, 3), target: 3 }),
        earned: (s) => s.activity_max_streak >= 3
    },
    {
        badge_key: "STREAK_7",
        name: "7 Day Streak",
        description: "Be active on 7 consecutive days.",
        icon: "💪",
        category: "STREAK",
        progress: (s) => ({ current: Math.min(s.activity_max_streak, 7), target: 7 }),
        earned: (s) => s.activity_max_streak >= 7
    },
    {
        badge_key: "STREAK_30",
        name: "30 Day Streak",
        description: "Be active on 30 consecutive days.",
        icon: "🌟",
        category: "STREAK",
        progress: (s) => ({ current: Math.min(s.activity_max_streak, 30), target: 30 }),
        earned: (s) => s.activity_max_streak >= 30
    },
    {
        badge_key: "SHARP_MIND",
        name: "Sharp Mind",
        description: "Reach 85% accuracy after answering at least 30 questions.",
        icon: "🧠",
        category: "ACCURACY",
        progress: (s) => {
            if (s.questions_answered < 30) {
                return { current: s.questions_answered, target: 30 };
            }
            return { current: Math.min(s.accuracy, 85), target: 85 };
        },
        earned: (s) => s.questions_answered >= 30 && s.accuracy >= 85
    },
    {
        badge_key: "QUESTION_COLLECTOR",
        name: "Question Collector",
        description: "Bookmark 10 questions.",
        icon: "🔖",
        category: "BOOKMARK",
        progress: (s) => ({ current: Math.min(s.bookmark_count, 10), target: 10 }),
        earned: (s) => s.bookmark_count >= 10
    },
    {
        badge_key: "RISING_STAR",
        name: "Rising Star",
        description: "Earn 500 XP from real attempts.",
        icon: "⭐",
        category: "XP",
        progress: (s) => ({ current: Math.min(s.xp, 500), target: 500 }),
        earned: (s) => s.xp >= 500
    },
    {
        badge_key: "DEDICATED_LEARNER",
        name: "Dedicated Learner",
        description: "Answer 100 questions across practice, exams, and daily challenges.",
        icon: "📚",
        category: "XP",
        progress: (s) => ({ current: Math.min(s.questions_answered, 100), target: 100 }),
        earned: (s) => s.questions_answered >= 100
    }
];

function maxConsecutiveDays(days) {
    const unique = Array.from(new Set(days || [])).filter(Boolean).sort();
    if (!unique.length) {
        return 0;
    }

    let best = 1;
    let current = 1;

    for (let i = 1; i < unique.length; i += 1) {
        const prev = new Date(unique[i - 1] + "T00:00:00Z");
        const next = new Date(unique[i] + "T00:00:00Z");
        const diff = Math.round((next.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) {
            current += 1;
            if (current > best) {
                best = current;
            }
        } else {
            current = 1;
        }
    }

    return best;
}

function getUserStats(user_id, callback) {
    const countsSql = `
        SELECT
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?) AS quiz_count,
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ? AND percentage >= 100) AS perfect_quizzes,
            (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ?) AS exam_count,
            (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND percentage >= 90) AS exam_ace_count,
            (SELECT COUNT(*) FROM daily_challenge_attempts WHERE user_id = ? AND completed = 1) AS daily_count,
            (SELECT COUNT(*) FROM bookmarks WHERE user_id = ?) AS bookmark_count
    `;

    db.get(countsSql, [user_id, user_id, user_id, user_id, user_id, user_id], (countErr, counts) => {
        if (countErr) {
            return callback(countErr);
        }

        const totalsSql = `
            SELECT
                COALESCE(SUM(score), 0) AS correct_answers,
                COALESCE(SUM(total_questions), 0) AS questions_answered
            FROM (
                SELECT score, total_questions FROM quiz_attempts WHERE user_id = ?
                UNION ALL
                SELECT score, total_questions FROM exam_attempts WHERE user_id = ?
                UNION ALL
                SELECT score, total_questions FROM daily_challenge_attempts
                WHERE user_id = ? AND completed = 1
            )
        `;

        db.get(totalsSql, [user_id, user_id, user_id], (totalErr, totals) => {
            if (totalErr) {
                return callback(totalErr);
            }

            const daysSql = `
                SELECT date(created_at) AS day FROM quiz_attempts WHERE user_id = ?
                UNION
                SELECT date(created_at) AS day FROM exam_attempts WHERE user_id = ?
                UNION
                SELECT challenge_date AS day FROM daily_challenge_attempts
                WHERE user_id = ? AND completed = 1
            `;

            db.all(daysSql, [user_id, user_id, user_id], (dayErr, activityRows) => {
                if (dayErr) {
                    return callback(dayErr);
                }

                db.all(
                    `
                        SELECT challenge_date AS day
                        FROM daily_challenge_attempts
                        WHERE user_id = ? AND completed = 1
                    `,
                    [user_id],
                    (dailyErr, dailyRows) => {
                        if (dailyErr) {
                            return callback(dailyErr);
                        }

                        const questions = Number(totals && totals.questions_answered) || 0;
                        const correct = Number(totals && totals.correct_answers) || 0;
                        const accuracy = questions === 0
                            ? 0
                            : Math.round((correct / questions) * 100);

                        callback(null, {
                            quiz_count: Number(counts && counts.quiz_count) || 0,
                            perfect_quizzes: Number(counts && counts.perfect_quizzes) || 0,
                            exam_count: Number(counts && counts.exam_count) || 0,
                            exam_ace_count: Number(counts && counts.exam_ace_count) || 0,
                            daily_count: Number(counts && counts.daily_count) || 0,
                            bookmark_count: Number(counts && counts.bookmark_count) || 0,
                            questions_answered: questions,
                            xp: correct * 10,
                            accuracy,
                            activity_max_streak: maxConsecutiveDays(
                                (activityRows || []).map((row) => row.day)
                            ),
                            daily_max_streak: maxConsecutiveDays(
                                (dailyRows || []).map((row) => row.day)
                            )
                        });
                    }
                );
            });
        });
    });
}

function seedBadges(callback) {
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO badges (badge_key, name, description, icon, category)
        VALUES (?, ?, ?, ?, ?)
    `);

    CATALOG.forEach((badge) => {
        stmt.run(
            badge.badge_key,
            badge.name,
            badge.description,
            badge.icon,
            badge.category
        );
    });

    stmt.finalize((err) => {
        if (callback) {
            callback(err);
        }
    });
}

function unlockIfNeeded(user_id, badge, callback) {
    db.get(
        "SELECT id FROM badges WHERE badge_key = ?",
        [badge.badge_key],
        (err, row) => {
            if (err) {
                return callback(err);
            }
            if (!row) {
                return callback(null, null);
            }

            db.run(
                "INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)",
                [user_id, row.id],
                function (insertErr) {
                    if (insertErr) {
                        return callback(insertErr);
                    }
                    if (this.changes < 1) {
                        return callback(null, null);
                    }
                    callback(null, {
                        id: row.id,
                        badge_key: badge.badge_key,
                        name: badge.name,
                        description: badge.description,
                        icon: badge.icon,
                        category: badge.category
                    });
                }
            );
        }
    );
}

function evaluateAndUnlock(user_id, callback) {
    if (!user_id) {
        return callback(null, []);
    }

    getUserStats(user_id, (err, stats) => {
        if (err) {
            return callback(err);
        }

        const earned = CATALOG.filter((badge) => badge.earned(stats));
        const newly = [];

        function next(index) {
            if (index >= earned.length) {
                return callback(null, newly);
            }
            unlockIfNeeded(user_id, earned[index], (unlockErr, unlocked) => {
                if (unlockErr) {
                    return callback(unlockErr);
                }
                if (unlocked) {
                    newly.push(unlocked);
                }
                next(index + 1);
            });
        }

        next(0);
    });
}

function attachToResponse(user_id, payload, res) {
    evaluateAndUnlock(user_id, (err, newly) => {
        payload.newly_unlocked = err ? [] : (newly || []);
        res.json(payload);
    });
}

function listAchievements(user_id, callback) {
    evaluateAndUnlock(user_id, (evalErr) => {
        if (evalErr) {
            return callback(evalErr);
        }

        getUserStats(user_id, (statErr, stats) => {
            if (statErr) {
                return callback(statErr);
            }

            db.all(
                `
                    SELECT
                        b.id,
                        b.badge_key,
                        b.name,
                        b.description,
                        b.icon,
                        b.category,
                        ub.unlocked_at
                    FROM badges b
                    LEFT JOIN user_badges ub
                        ON ub.badge_id = b.id
                        AND ub.user_id = ?
                    ORDER BY b.id
                `,
                [user_id],
                (listErr, rows) => {
                    if (listErr) {
                        return callback(listErr);
                    }

                    const byKey = {};
                    CATALOG.forEach((badge) => {
                        byKey[badge.badge_key] = badge;
                    });

                    const result = (rows || []).map((row) => {
                        const def = byKey[row.badge_key];
                        const progress = def && def.progress
                            ? def.progress(stats)
                            : { current: 0, target: 1 };
                        return {
                            id: row.id,
                            badge_key: row.badge_key,
                            name: row.name,
                            description: row.description,
                            icon: row.icon,
                            category: row.category,
                            unlocked: !!row.unlocked_at,
                            unlocked_at: row.unlocked_at || null,
                            progress
                        };
                    });

                    callback(null, result);
                }
            );
        });
    });
}

module.exports = {
    CATALOG,
    seedBadges,
    evaluateAndUnlock,
    attachToResponse,
    listAchievements
};
