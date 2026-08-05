const questionModel = require("../models/questionModel");


function getQuestions(req, res){

    const chapter_id = req.query.chapter_id;


    questionModel.getQuestionsByChapter(chapter_id, (err, questions)=>{

        if(err){
            return res.status(500).json({
                error: err.message
            });
        }


        res.json(questions);

    });

}


module.exports = {
    getQuestions
};