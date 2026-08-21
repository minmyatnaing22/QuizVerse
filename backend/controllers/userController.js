const userModel = require("../models/userModel");

function publicUser(user) {

    return {
        id: user.id,
        name: user.name,
        email: user.email
    };

}

function register(req, res) {

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
        return res.status(400).json({
            error: "name, email, and password are required"
        });
    }

    userModel.createUser(name, email, password, (err, user) => {

        if (err) {

            if (err.message && err.message.includes("UNIQUE")) {
                return res.status(409).json({
                    error: "An account with this email already exists"
                });
            }

            return res.status(500).json({
                error: err.message
            });

        }

        res.status(201).json(user);

    });

}

function login(req, res) {

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
        return res.status(400).json({
            error: "email and password are required"
        });
    }

    userModel.findByEmail(email, (err, user) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (!user || !userModel.verifyPassword(password, user.password_hash)) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        res.json(publicUser(user));

    });

}

module.exports = {
    register,
    login
};
