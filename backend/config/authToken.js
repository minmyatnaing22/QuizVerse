const crypto = require("crypto");

const SECRET = process.env.QUIZVERSE_SECRET || "quizverse-local-secret";

function makeToken(userId) {

    const id = String(userId);
    const signature = crypto
        .createHmac("sha256", SECRET)
        .update(id)
        .digest("hex");

    return id + "." + signature;

}

function readToken(req) {

    const header = req.headers["x-quizverse-token"];
    const auth = req.headers.authorization || "";
    const bearer = auth.replace(/^Bearer\s+/i, "");
    return String(header || bearer || "").trim();

}

function userIdFromToken(token) {

    const parts = String(token || "").split(".");

    if (parts.length !== 2) {
        return null;
    }

    const [id, signature] = parts;

    if (!/^\d+$/.test(id) || !/^[0-9a-f]+$/i.test(signature)) {
        return null;
    }

    const expected = crypto
        .createHmac("sha256", SECRET)
        .update(id)
        .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
        return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
    }

    return Number(id);

}

function getAuthenticatedUserId(req) {

    return userIdFromToken(readToken(req));

}

module.exports = {
    makeToken,
    getAuthenticatedUserId
};
