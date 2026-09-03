const crypto = require("crypto");
const db = require("../config/database");

function hashPassword(password) {

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
    return salt + ":" + hash;

}

function verifyPassword(password, stored) {

    const parts = String(stored || "").split(":");

    if (parts.length !== 2) {
        return false;
    }

    const [salt, hash] = parts;
    const check = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");

    try {
        return crypto.timingSafeEqual(
            Buffer.from(hash, "hex"),
            Buffer.from(check, "hex")
        );
    } catch (err) {
        return false;
    }

}

function buildUser(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        password_hash: row.password_hash,
        auth_provider: row.auth_provider || "local",
        google_id: row.google_id || null
    };
}

function createUser(name, email, password, callback) {

    const sql = `
        INSERT INTO users (name, email, password_hash, auth_provider)
        VALUES (?, ?, ?, 'local')
    `;

    db.run(sql, [name, email, hashPassword(password)], function (err) {

        if (err) {
            return callback(err);
        }

        callback(null, {
            id: this.lastID,
            name,
            email,
            auth_provider: "local",
            google_id: null
        });

    });

}

function createGoogleUser(name, email, googleId, callback) {

    const sql = `
        INSERT INTO users (name, email, password_hash, auth_provider, google_id)
        VALUES (?, ?, '', 'google', ?)
    `;

    db.run(sql, [name, email, googleId], function (err) {

        if (err) {
            return callback(err);
        }

        callback(null, {
            id: this.lastID,
            name,
            email,
            auth_provider: "google",
            google_id: googleId
        });

    });

}

function findByEmail(email, callback) {

    const sql = `
        SELECT id, name, email, password_hash, auth_provider, google_id
        FROM users
        WHERE email = ?
    `;

    db.get(sql, [email], (err, row) => callback(err, buildUser(row)));

}

function findByGoogleId(googleId, callback) {

    const sql = `
        SELECT id, name, email, password_hash, auth_provider, google_id
        FROM users
        WHERE google_id = ?
    `;

    db.get(sql, [googleId], (err, row) => callback(err, buildUser(row)));

}

function updateGoogleProfile(id, googleId, name, email, callback) {

    const sql = `
        UPDATE users
        SET name = ?, email = ?, auth_provider = 'google', google_id = ?
        WHERE id = ?
    `;

    db.run(sql, [name, email, googleId, id], (err) => {
        if (err) {
            return callback(err);
        }
        callback(null, {
            id,
            name,
            email,
            auth_provider: "google",
            google_id: googleId
        });
    });

}

function findById(id, callback) {

    const sql = `
        SELECT id, name, email, password_hash, auth_provider, google_id
        FROM users
        WHERE id = ?
    `;

    db.get(sql, [id], (err, row) => callback(err, buildUser(row)));

}

function updateProfile(id, name, email, callback) {

    const sql = `
        UPDATE users
        SET name = ?, email = ?
        WHERE id = ?
    `;

    db.run(sql, [name, email, id], (err) => {
        if (err) {
            return callback(err);
        }
        findById(id, callback);
    });

}

function updatePassword(id, password, callback) {

    const sql = `
        UPDATE users
        SET password_hash = ?, auth_provider = CASE
            WHEN auth_provider = 'google' THEN 'hybrid'
            ELSE auth_provider
        END
        WHERE id = ?
    `;

    db.run(sql, [hashPassword(password), id], function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, this.changes > 0);
    });

}

function getPreferences(userId, callback) {

    const sql = `
        SELECT user_id, dark_mode, study_goal, daily_reminder, email_updates
        FROM user_settings
        WHERE user_id = ?
    `;

    db.get(sql, [userId], callback);

}

function upsertPreferences(userId, preferences, callback) {

    const sql = `
        INSERT INTO user_settings (
            user_id,
            dark_mode,
            study_goal,
            daily_reminder,
            email_updates
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            dark_mode = excluded.dark_mode,
            study_goal = excluded.study_goal,
            daily_reminder = excluded.daily_reminder,
            email_updates = excluded.email_updates,
            updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [
        userId,
        preferences.dark_mode ? 1 : 0,
        preferences.study_goal,
        preferences.daily_reminder ? 1 : 0,
        preferences.email_updates ? 1 : 0
    ], (err) => {
        if (err) {
            return callback(err);
        }
        getPreferences(userId, callback);
    });

}

module.exports = {
    createUser,
    createGoogleUser,
    findById,
    findByEmail,
    findByGoogleId,
    getPreferences,
    updatePassword,
    updateProfile,
    updateGoogleProfile,
    upsertPreferences,
    verifyPassword
};
