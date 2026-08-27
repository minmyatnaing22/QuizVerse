const quizModel = require("../models/quizModel");
const { getAuthenticatedUserId } = require("../config/authToken");
const badgeService = require("../services/badgeService");

function getQuiz(req, res) {

    const chapter_id = req.query.chapter_id;
    const question_type = req.query.type;

    if (!chapter_id) {
        return res.status(400).json({
            error: "chapter_id is required"
        });
    }

    if (!question_type) {
        return res.status(400).json({
            error: "type is required"
        });
    }

    quizModel.getQuizByChapter(
        chapter_id,
        question_type,
        (err, quiz) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(quiz);

        }
    );

}


function submitQuiz(req, res) {

    const chapter_id = req.body.chapter_id;
    const answers = req.body.answers;
    const question_type = req.body.type;
    const user_id = getAuthenticatedUserId(req);
    const mode = String(req.body.mode || "PRACTICE").toUpperCase() === "EXAM"
        ? "EXAM"
        : "PRACTICE";

    if (!chapter_id) {
        return res.status(400).json({
            error: "chapter_id is required"
        });
    }

    if (!answers || answers.length === 0) {
        return res.status(400).json({
            error: "answers are required"
        });
    }

    if (!question_type) {
        return res.status(400).json({
            error: "type is required"
        });
    }

    quizModel.calculateScore(
        chapter_id,
        question_type,
        answers,
        (err, result) => {


            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (!user_id) {
                result.mode = mode;
                return res.json(result);
            }

            quizModel.saveQuizAttempt(
                user_id,
                chapter_id,
                question_type,
                result.correct_answers,
                result.total_questions,
                result.percentage,
                mode,
                (err) => {

                    if (err) {
                        return res.status(500).json({
                            error: err.message
                        });
                    }

                    result.mode = mode;
                    badgeService.attachToResponse(user_id, result, res);

                }
            );

        }


        );


}

module.exports = {
    getQuiz,
    submitQuiz
};