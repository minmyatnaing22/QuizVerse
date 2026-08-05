const questionOptionModel = require("../models/questionOptionModel");

function getQuestionOptions(req, res) {

    const question_id = req.query.question_id;

    if (!question_id) {
        return res.status(400).json({
            error: "question_id is required"
        });
    }

    questionOptionModel.getQuestionOptionsByQuestion(question_id, (err, options) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(options);

    });

}

module.exports = {
    getQuestionOptions
};