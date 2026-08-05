const express = require("express");

const router = express.Router();

const quizController = require("../controllers/quizController");

router.get("/", quizController.getQuiz);

router.post("/submit", quizController.submitQuiz);

// router.post("/submit", (req,res)=>{
//     res.json({
//         message:"POST route works"
//     });
// });

module.exports = router;