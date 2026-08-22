const statsModel = require("../models/statsModel");
const { EXAM_DATE } = require("../config/exam");
const { getAuthenticatedUserId } = require("../config/authToken");

function getHistory(req, res) {

    const user_id = getAuthenticatedUserId(req);

    if (!user_id) {
        return res.status(401).json({
            error: "Login is required"
        });
    }

    statsModel.getHistory(user_id, (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);

    });

}

function getLeaderboard(req, res) {

    statsModel.getLeaderboard((err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);

    });

}

function getDashboard(req, res) {

    const user_id = getAuthenticatedUserId(req) || 0;

    statsModel.getDashboard(user_id, (err, data) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(data);

    });

}

function getExamDays(req, res) {

    res.json({
        exam_date: EXAM_DATE,
        exam_days: statsModel.getExamDaysRemaining()
    });

}

module.exports = {
    getHistory,
    getLeaderboard,
    getDashboard,
    getExamDays
};
