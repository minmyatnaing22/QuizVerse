const chapterModel = require("../models/chapterModel");

function getChapters(req, res) {

    const subject_id = req.query.subject_id;
    
    if (!subject_id) {
        return res.status(400).json({
            error: "subject_id is required"
        });
    }

    chapterModel.getChaptersBySubject(subject_id, (err, chapters) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(chapters);

    });

}

module.exports = {
    getChapters
};