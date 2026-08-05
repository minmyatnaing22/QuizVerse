const express = require("express");

const router = express.Router();

const questionAnswerController = require("../controllers/questionAnswerController");

router.get("/", questionAnswerController.getQuestionAnswer);

module.exports = router;