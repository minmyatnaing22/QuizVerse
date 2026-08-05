const questionAnswerModel = require("../models/questionAnswerModel");

function getQuestionAnswer(req, res) {

    const question_id = req.query.question_id;

    if (!question_id) {
        return res.status(400).json({
            error: "question_id is required"
        });
    }

    questionAnswerModel.getQuestionAnswerByQuestion(question_id, (err, answer) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(answer);

    });

}

module.exports = {
    getQuestionAnswer
};