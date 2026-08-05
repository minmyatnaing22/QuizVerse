const quizModel = require("../models/quizModel");

function getQuiz(req, res) {

    const chapter_id = req.query.chapter_id;

    if (!chapter_id) {
        return res.status(400).json({
            error: "chapter_id is required"
        });
    }

    quizModel.getQuizByChapter(chapter_id, (err, quiz) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(quiz);

    });

}


function submitQuiz(req, res) {

    const chapter_id = req.body.chapter_id;
    const answers = req.body.answers;

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

    quizModel.calculateScore(answers, (err, result) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        quizModel.saveQuizAttempt(
            chapter_id,
            result.correct_answers,
            result.total_questions,
            result.percentage,
            (err) => {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }

                res.json(result);

            }
        );

    });

}


module.exports = {
    getQuiz,
    submitQuiz
};