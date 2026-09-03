const express = require("express");
const discussionController = require("../controllers/discussionController");

const router = express.Router();

router.get("/messages", discussionController.listMessages);
router.post("/messages", discussionController.createMessage);

module.exports = router;
