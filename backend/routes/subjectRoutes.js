const express = require("express");

const router = express.Router();

const subjectController = require("../controllers/subjectController");
const chapterController = require("../controllers/chapterController");


router.get("/", subjectController.getSubjects);

router.get("/:subject_id/chapters", chapterController.getChapters);


module.exports = router;