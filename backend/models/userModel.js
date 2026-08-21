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

function createUser(name, email, password, callback) {

    const sql = `
        INSERT INTO users (name, email, password_hash)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [name, email, hashPassword(password)], function (err) {

        if (err) {
            return callback(err);
        }

        callback(null, {
            id: this.lastID,
            name,
            email
        });

    });

}

function findByEmail(email, callback) {

    const sql = `
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = ?
    `;

    db.get(sql, [email], callback);

}

module.exports = {
    createUser,
    findByEmail,
    verifyPassword
};
