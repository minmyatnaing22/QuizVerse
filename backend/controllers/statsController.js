const statsModel = require("../models/statsModel");

function getHistory(req, res) {

    const user_id = req.query.user_id;

    if (!user_id) {
        return res.status(400).json({
            error: "user_id is required"
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

    const user_id = req.query.user_id || 0;

    statsModel.getDashboard(user_id, (err, data) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(data);

    });

}

module.exports = {
    getHistory,
    getLeaderboard,
    getDashboard
};
