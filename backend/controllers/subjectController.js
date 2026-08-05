const subjectModel = require("../models/subjectModel");

function getSubjects(req, res) {

    subjectModel.getAllSubjects((err, subjects) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(subjects);

    });

}

module.exports = {
    getSubjects
};