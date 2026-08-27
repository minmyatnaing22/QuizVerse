const badgeService = require("../services/badgeService");
const { getAuthenticatedUserId } = require("../config/authToken");

function getAchievements(req, res) {
    const user_id = getAuthenticatedUserId(req);

    if (!user_id) {
        return res.status(401).json({
            error: "Login is required"
        });
    }

    badgeService.listAchievements(user_id, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
}

module.exports = {
    getAchievements
};
