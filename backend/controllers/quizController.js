const quizModel = require("../models/quizModel");

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
    const user_id = req.body.user_id;

    console.log("Chapter ID:", chapter_id);
    console.log("Question Type:", question_type);
    console.log("Answers:", answers);

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
                return res.json(result);
            }

            quizModel.saveQuizAttempt(
                user_id,
                chapter_id,
                question_type,
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

        }


        );


}

module.exports = {
    getQuiz,
    submitQuiz
};