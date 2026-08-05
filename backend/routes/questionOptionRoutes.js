const express = require("express");

const router = express.Router();

const questionOptionController = require("../controllers/questionOptionController");

router.get("/", questionOptionController.getQuestionOptions);

module.exports = router;