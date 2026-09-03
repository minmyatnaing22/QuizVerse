const discussionModel = require("../models/discussionModel");
const { getAuthenticatedUserId } = require("../config/authToken");

function getSubjectId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function listMessages(req, res) {
    const subjectId = getSubjectId(req.query.subject_id);
    const sinceId = getSubjectId(req.query.since_id);

    discussionModel.listMessages(subjectId, sinceId, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
}

function createMessage(req, res) {
    const userId = getAuthenticatedUserId(req);
    const message = String(req.body.message || "").trim();
    const subjectId = getSubjectId(req.body.subject_id);

    if (!userId) {
        return res.status(401).json({ error: "Login is required to join the discussion" });
    }
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 500) {
        return res.status(400).json({ error: "Message must be 500 characters or less" });
    }

    discussionModel.createMessage(userId, subjectId, message, (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json(row);
    });
}

module.exports = {
    listMessages,
    createMessage
};
