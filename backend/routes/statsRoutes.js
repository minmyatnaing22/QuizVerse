const express = require("express");

const router = express.Router();

const statsController = require("../controllers/statsController");

router.get("/history", statsController.getHistory);

router.get("/leaderboard", statsController.getLeaderboard);

router.get("/dashboard", statsController.getDashboard);

module.exports = router;
