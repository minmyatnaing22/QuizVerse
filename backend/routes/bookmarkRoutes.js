const express = require("express");

const router = express.Router();

const bookmarkController = require("../controllers/bookmarkController");

router.get("/bookmarks", bookmarkController.listBookmarks);

router.post("/bookmarks", bookmarkController.addBookmark);

router.delete("/bookmarks/:question_id", bookmarkController.removeBookmark);

module.exports = router;
