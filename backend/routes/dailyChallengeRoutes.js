const express = require("express");

const router = express.Router();

const dailyChallengeController = require("../controllers/dailyChallengeController");

router.get("/", dailyChallengeController.getDailyChallenge);

router.post("/submit", dailyChallengeController.submitDailyChallenge);

module.exports = router;
