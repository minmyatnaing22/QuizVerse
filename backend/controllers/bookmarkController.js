const bookmarkModel = require("../models/bookmarkModel");
const { getAuthenticatedUserId } = require("../config/authToken");
const badgeService = require("../services/badgeService");

function requireUser(req, res) {

    const user_id = getAuthenticatedUserId(req);

    if (!user_id) {
        res.status(401).json({
            error: "Login is required"
        });
        return null;
    }

    return user_id;

}

function listBookmarks(req, res) {

    const user_id = requireUser(req, res);

    if (!user_id) {
        return;
    }

    bookmarkModel.listByUser(user_id, (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows || []);

    });

}

function addBookmark(req, res) {

    const user_id = requireUser(req, res);

    if (!user_id) {
        return;
    }

    const question_id = Number(req.body.question_id);

    if (!Number.isInteger(question_id) || question_id < 1) {
        return res.status(400).json({
            error: "question_id is required"
        });
    }

    bookmarkModel.add(user_id, question_id, (err, result) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (result && result.notFound) {
            return res.status(404).json({
                error: "Question not found"
            });
        }

        if (result && result.created) {
            return badgeService.attachToResponse(user_id, {
                question_id,
                bookmarked: true
            }, res);
        }

        res.status(200).json({
            question_id,
            bookmarked: true
        });

    });

}

function removeBookmark(req, res) {

    const user_id = requireUser(req, res);

    if (!user_id) {
        return;
    }

    const question_id = Number(req.params.question_id);

    if (!Number.isInteger(question_id) || question_id < 1) {
        return res.status(400).json({
            error: "question_id is required"
        });
    }

    bookmarkModel.remove(user_id, question_id, (err, result) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            question_id,
            bookmarked: false,
            removed: !!(result && result.removed)
        });

    });

}

module.exports = {
    listBookmarks,
    addBookmark,
    removeBookmark
};
