const dailyChallengeModel = require("../models/dailyChallengeModel");
const { getAuthenticatedUserId } = require("../config/authToken");
const badgeService = require("../services/badgeService");

function requireUser(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        res.status(401).json({
            error: "Login is required for Daily Challenge"
        });
        return null;
    }
    return userId;
}

function publicQuestions(questions) {
    return (questions || []).map((question, index) => ({
        id: question.id,
        question_number: index + 1,
        question_text: question.question_text,
        question_type: question.question_type,
        subject_name: question.subject_name,
        options: question.options || []
    }));
}

function returnQuestions(res, attempt, questions) {
    res.json({
        completed: false,
        challenge_date: attempt.challenge_date || dailyChallengeModel.utcToday(),
        total_questions: (questions || []).length,
        questions: publicQuestions(questions)
    });
}

function getDailyChallenge(req, res) {
    const userId = requireUser(req, res);
    if (!userId) {
        return;
    }

    dailyChallengeModel.getTodayAttempt(userId, (err, attempt) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (attempt && Number(attempt.completed) === 1) {
            return res.json(dailyChallengeModel.formatCompleted(attempt, {
                already_completed: true
            }));
        }

        if (attempt) {
            const ids = dailyChallengeModel.parseQuestionIds(attempt.question_ids);
            return dailyChallengeModel.loadQuestionsByIds(ids, true, (loadErr, questions) => {
                if (loadErr) {
                    return res.status(500).json({ error: loadErr.message });
                }
                if (!questions.length) {
                    return res.status(400).json({
                        error: "Not enough active questions are available for Daily Challenge"
                    });
                }
                returnQuestions(res, attempt, questions);
            });
        }

        dailyChallengeModel.pickRandomQuestionIds((pickErr, ids) => {
            if (pickErr) {
                return res.status(500).json({ error: pickErr.message });
            }
            if (!ids.length) {
                return res.status(400).json({
                    error: "Not enough active questions are available for Daily Challenge"
                });
            }

            dailyChallengeModel.startTodayAttempt(userId, ids, (startErr, created) => {
                if (startErr) {
                    if (String(startErr.message || "").includes("UNIQUE")) {
                        return getDailyChallenge(req, res);
                    }
                    return res.status(500).json({ error: startErr.message });
                }

                dailyChallengeModel.loadQuestionsByIds(ids, true, (loadErr, questions) => {
                    if (loadErr) {
                        return res.status(500).json({ error: loadErr.message });
                    }
                    returnQuestions(res, created, questions);
                });
            });
        });
    });
}

function submitDailyChallenge(req, res) {
    const userId = requireUser(req, res);
    if (!userId) {
        return;
    }

    const answers = req.body && req.body.answers;
    if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: "answers are required" });
    }

    dailyChallengeModel.getTodayAttempt(userId, (err, attempt) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!attempt) {
            return res.status(400).json({
                error: "Start today's Daily Challenge before submitting"
            });
        }
        if (Number(attempt.completed) === 1) {
            return res.json(dailyChallengeModel.formatCompleted(attempt, {
                already_completed: true,
                xp_awarded: false
            }));
        }

        const questionIds = dailyChallengeModel.parseQuestionIds(attempt.question_ids);
        dailyChallengeModel.scoreAnswers(questionIds, answers, (scoreErr, result) => {
            if (scoreErr) {
                return res.status(500).json({ error: scoreErr.message });
            }
            if (!result.total_questions) {
                return res.status(400).json({
                    error: "Not enough active questions are available for Daily Challenge"
                });
            }

            dailyChallengeModel.completeTodayAttempt(userId, result, (saveErr, changes) => {
                if (saveErr) {
                    return res.status(500).json({ error: saveErr.message });
                }
                if (!changes) {
                    return dailyChallengeModel.getTodayAttempt(userId, (againErr, existing) => {
                        if (againErr || !existing) {
                            return res.status(500).json({
                                error: (againErr && againErr.message) || "Unable to save Daily Challenge"
                            });
                        }
                        return res.json(dailyChallengeModel.formatCompleted(existing, {
                            already_completed: true,
                            xp_awarded: false
                        }));
                    });
                }

                badgeService.attachToResponse(userId, {
                    completed: true,
                    already_completed: false,
                    xp_awarded: true,
                    challenge_date: dailyChallengeModel.utcToday(),
                    mode: "DAILY",
                    total_questions: result.total_questions,
                    correct_answers: result.correct_answers,
                    wrong_answers: result.wrong_answers,
                    skipped_answers: result.skipped_answers,
                    percentage: result.percentage,
                    xp_earned: result.xp_earned,
                    reviews: result.reviews
                }, res);
            });
        });
    });
}

module.exports = {
    getDailyChallenge,
    submitDailyChallenge
};
