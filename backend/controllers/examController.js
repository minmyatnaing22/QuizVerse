const examModel = require("../models/examModel");
const { getAuthenticatedUserId } = require("../config/authToken");
const badgeService = require("../services/badgeService");

function parseSubjectId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseType(value) {
    const type = String(value || "").trim().toUpperCase();
    return examModel.VALID_TYPES.includes(type) ? type : null;
}

function getExamTypes(req, res) {
    const subject_id = parseSubjectId(req.query.subject_id);

    if (!subject_id) {
        return res.status(400).json({
            error: "subject_id is required"
        });
    }

    examModel.getSubjectById(subject_id, (err, subject) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!subject) {
            return res.status(404).json({ error: "Subject not found" });
        }

        examModel.getTypesForSubject(subject_id, (typeErr, rows) => {
            if (typeErr) {
                return res.status(500).json({ error: typeErr.message });
            }

            res.json({
                subject: {
                    id: subject.id,
                    name: subject.name
                },
                types: (rows || []).map((row) => row.question_type)
            });
        });
    });
}

function getExamQuestions(req, res) {
    const subject_id = parseSubjectId(req.query.subject_id);
    const type = parseType(req.query.type);

    if (!subject_id) {
        return res.status(400).json({ error: "subject_id is required" });
    }
    if (!type) {
        return res.status(400).json({ error: "type is required" });
    }

    examModel.getSubjectById(subject_id, (err, subject) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!subject) {
            return res.status(404).json({ error: "Subject not found" });
        }

        examModel.getTypesForSubject(subject_id, (typeErr, rows) => {
            if (typeErr) {
                return res.status(500).json({ error: typeErr.message });
            }

            const types = (rows || []).map((row) => row.question_type);
            if (!types.includes(type)) {
                return res.status(400).json({
                    error: "That question type is not available for this subject"
                });
            }

            examModel.getRandomExamQuestions(subject_id, type, (quizErr, questions) => {
                if (quizErr) {
                    return res.status(500).json({ error: quizErr.message });
                }

                res.json({
                    subject: {
                        id: subject.id,
                        name: subject.name
                    },
                    type,
                    total_questions: (questions || []).length,
                    questions: questions || []
                });
            });
        });
    });
}

function submitExam(req, res) {
    const subject_id = parseSubjectId(req.body.subject_id);
    const type = parseType(req.body.type);
    const answers = req.body.answers;
    const user_id = getAuthenticatedUserId(req);

    if (!subject_id) {
        return res.status(400).json({ error: "subject_id is required" });
    }
    if (!type) {
        return res.status(400).json({ error: "type is required" });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: "answers are required" });
    }

    examModel.getSubjectById(subject_id, (err, subject) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!subject) {
            return res.status(404).json({ error: "Subject not found" });
        }

        examModel.scoreExam(subject_id, type, answers, (scoreErr, result) => {
            if (scoreErr) {
                const status = String(scoreErr.message || "").includes("valid")
                    ? 400
                    : 500;
                return res.status(status).json({ error: scoreErr.message });
            }

            result.mode = "EXAM";
            result.subject = {
                id: subject.id,
                name: subject.name
            };
            result.type = type;

            if (!user_id) {
                return res.json(result);
            }

            examModel.saveExamAttempt(
                user_id,
                subject_id,
                type,
                result.correct_answers,
                result.total_questions,
                result.percentage,
                (saveErr) => {
                    if (saveErr) {
                        return res.status(500).json({ error: saveErr.message });
                    }
                    badgeService.attachToResponse(user_id, result, res);
                }
            );
        });
    });
}

module.exports = {
    getExamTypes,
    getExamQuestions,
    submitExam
};
