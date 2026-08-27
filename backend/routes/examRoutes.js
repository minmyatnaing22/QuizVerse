const express = require("express");

const router = express.Router();

const examController = require("../controllers/examController");

router.get("/types", examController.getExamTypes);

router.get("/questions", examController.getExamQuestions);

router.post("/submit", examController.submitExam);

module.exports = router;
