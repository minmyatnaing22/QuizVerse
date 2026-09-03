const userModel = require("../models/userModel");
const { makeToken, getAuthenticatedUserId } = require("../config/authToken");
const { verifyGoogleIdToken } = require("../config/googleVerify");

function getGoogleClientId() {
    return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

function publicUser(user) {

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        token: makeToken(user.id)
    };

}

function isAllowedGmail(email) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(email || "").trim());
}

function validatePassword(password) {
    const value = String(password || "");

    if (value.length < 8) {
        return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(value)) {
        return "Password must include at least one uppercase letter";
    }
    if (!/[a-z]/.test(value)) {
        return "Password must include at least one lowercase letter";
    }
    if (!/[0-9]/.test(value)) {
        return "Password must include at least one number";
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
        return "Password must include at least one special character";
    }

    return "";
}

function readBoolean(value, fallback) {
    if (value === true || value === 1 || value === "1" || value === "true") {
        return true;
    }
    if (value === false || value === 0 || value === "0" || value === "false") {
        return false;
    }
    return fallback;
}

function requireUserId(req, res) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        res.status(401).json({ error: "Login is required" });
        return null;
    }
    return userId;
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

    if (!isAllowedGmail(email)) {
        return res.status(400).json({
            error: "Only valid Gmail addresses are allowed for email/password accounts"
        });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({
            error: passwordError
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

        res.status(201).json(publicUser(user));

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

    if (!isAllowedGmail(email)) {
        return res.status(400).json({
            error: "Only Gmail addresses can use email/password login"
        });
    }

    userModel.findByEmail(email, (err, user) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        if (user.auth_provider === "google" && !user.password_hash) {
            return res.status(400).json({
                error: "This account uses Google Sign-In. Please continue with Google."
            });
        }

        if (!userModel.verifyPassword(password, user.password_hash)) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        res.json(publicUser(user));

    });

}

function googleConfig(req, res) {
    const googleClientId = getGoogleClientId();
    res.json({
        enabled: Boolean(googleClientId),
        clientId: googleClientId || null
    });
}

function googleLoginError(err) {
    const code = err && err.message;

    if (code === "invalid_google_audience") {
        return "Google Sign-In client ID does not match this app configuration";
    }
    if (code === "unverified_google_email") {
        return "Google account email is not verified";
    }
    if (code === "expired_google_token") {
        return "Google sign-in expired. Please try again.";
    }
    if (code === "invalid_google_token") {
        return "Google could not verify this sign-in. Use a real Gmail account and try again.";
    }

    return "Google sign-in failed. Please try again.";
}

function finishGoogleLogin(res, name, email, googleId) {
    if (!isAllowedGmail(email)) {
        return res.status(400).json({
            error: "Only Gmail accounts are allowed"
        });
    }

    userModel.findByGoogleId(googleId, (googleErr, googleUser) => {
        if (googleErr) {
            return res.status(500).json({ error: googleErr.message });
        }

        if (googleUser) {
            return userModel.updateGoogleProfile(
                googleUser.id,
                googleId,
                name,
                email,
                (updateErr, updatedUser) => {
                    if (updateErr) {
                        return res.status(500).json({ error: updateErr.message });
                    }
                    res.json(publicUser(updatedUser));
                }
            );
        }

        userModel.findByEmail(email, (emailErr, existingUser) => {
            if (emailErr) {
                return res.status(500).json({ error: emailErr.message });
            }

            if (existingUser) {
                return userModel.updateGoogleProfile(
                    existingUser.id,
                    googleId,
                    existingUser.name || name,
                    email,
                    (updateErr, updatedUser) => {
                        if (updateErr) {
                            return res.status(500).json({ error: updateErr.message });
                        }
                        res.json(publicUser(updatedUser));
                    }
                );
            }

            userModel.createGoogleUser(name, email, googleId, (createErr, user) => {
                if (createErr) {
                    return res.status(500).json({ error: createErr.message });
                }
                res.status(201).json(publicUser(user));
            });
        });
    });
}

function loginWithGoogle(req, res) {

    const googleClientId = getGoogleClientId();
    const credential = String(req.body.credential || "").trim();

    if (!googleClientId) {
        return res.status(503).json({
            error: "Google Sign-In is not configured yet. Add GOOGLE_CLIENT_ID to the backend environment."
        });
    }

    if (!credential) {
        return res.status(400).json({
            error: "Google credential is required"
        });
    }

    verifyGoogleIdToken(credential, googleClientId)
        .then((payload) => {
            finishGoogleLogin(res, payload.name, payload.email, payload.googleId);
        })
        .catch((err) => {
            console.error("Google sign-in verify failed:", err && err.message ? err.message : err);
            if (!res.headersSent) {
                res.status(401).json({
                    error: googleLoginError(err)
                });
            }
        });

}

function restoreSession(req, res) {

    const email = String(req.body.email || "").trim().toLowerCase();
    const id = Number(req.body.id);

    if (!email || !Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            error: "id and email are required"
        });
    }

    userModel.findByEmail(email, (err, user) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        if (!user || Number(user.id) !== id) {
            return res.status(401).json({
                error: "Login is required"
            });
        }

        res.json(publicUser(user));

    });

}

function getCurrentUser(req, res) {

    const userId = requireUserId(req, res);
    if (!userId) {
        return;
    }

    userModel.findById(userId, (userErr, user) => {
        if (userErr) {
            return res.status(500).json({ error: userErr.message });
        }
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        userModel.getPreferences(userId, (prefErr, preferences) => {
            if (prefErr) {
                return res.status(500).json({ error: prefErr.message });
            }
            res.json({
                user: publicUser(user),
                preferences: {
                    dark_mode: Boolean(preferences && preferences.dark_mode),
                    study_goal: preferences && preferences.study_goal
                        ? preferences.study_goal
                        : "Balanced Practice",
                    daily_reminder: preferences == null ? true : Boolean(preferences.daily_reminder),
                    email_updates: preferences == null ? true : Boolean(preferences.email_updates)
                }
            });
        });
    });

}

function updateProfile(req, res) {

    const userId = requireUserId(req, res);
    if (!userId) {
        return;
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !email) {
        return res.status(400).json({ error: "name and email are required" });
    }

    if (!isAllowedGmail(email)) {
        return res.status(400).json({ error: "Only Gmail addresses are allowed" });
    }

    userModel.updateProfile(userId, name, email, (err, user) => {
        if (err) {
            if (err.message && err.message.includes("UNIQUE")) {
                return res.status(409).json({ error: "An account with this email already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json(publicUser(user));
    });

}

function changePassword(req, res) {

    const userId = requireUserId(req, res);
    if (!userId) {
        return;
    }

    const currentPassword = String(req.body.current_password || "");
    const nextPassword = String(req.body.new_password || "");

    userModel.findById(userId, (userErr, user) => {
        if (userErr) {
            return res.status(500).json({ error: userErr.message });
        }
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (user.password_hash && !userModel.verifyPassword(currentPassword, user.password_hash)) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        const passwordError = validatePassword(nextPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        userModel.updatePassword(userId, nextPassword, (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: updateErr.message });
            }
            res.json({ success: true });
        });
    });

}

function updatePreferences(req, res) {

    const userId = requireUserId(req, res);
    if (!userId) {
        return;
    }

    const studyGoal = String(req.body.study_goal || "Balanced Practice").trim() || "Balanced Practice";

    userModel.upsertPreferences(userId, {
        dark_mode: readBoolean(req.body.dark_mode, false),
        study_goal: studyGoal,
        daily_reminder: readBoolean(req.body.daily_reminder, true),
        email_updates: readBoolean(req.body.email_updates, true)
    }, (err, preferences) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            dark_mode: Boolean(preferences.dark_mode),
            study_goal: preferences.study_goal,
            daily_reminder: Boolean(preferences.daily_reminder),
            email_updates: Boolean(preferences.email_updates)
        });
    });

}

module.exports = {
    register,
    login,
    restoreSession,
    googleConfig,
    loginWithGoogle,
    getCurrentUser,
    updateProfile,
    changePassword,
    updatePreferences
};
