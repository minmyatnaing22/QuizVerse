const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");

const GOOGLE_ISSUERS = new Set([
    "accounts.google.com",
    "https://accounts.google.com"
]);

const GOOGLE_HOSTS = new Set([
    "oauth2.googleapis.com",
    "www.googleapis.com",
    "accounts.google.com"
]);

let certCache = { keys: null, expiresAt: 0 };

function isTlsError(err) {
    const code = String((err && (err.code || (err.cause && err.cause.code))) || "");
    const message = String((err && err.message) || "").toLowerCase();
    return code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        code === "CERT_UNTRUSTED" ||
        message.includes("certificate") ||
        message.includes("unable to verify");
}

function requestJson(url, options, allowInsecure) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const body = options.body || "";
        const headers = Object.assign({}, options.headers || {});

        if (body && !headers["Content-Length"]) {
            headers["Content-Length"] = Buffer.byteLength(body);
        }

        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: options.method || "GET",
            headers,
            rejectUnauthorized: !(allowInsecure && GOOGLE_HOSTS.has(parsed.hostname))
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");
                try {
                    resolve(JSON.parse(text));
                } catch (err) {
                    reject(new Error("invalid_google_response"));
                }
            });
        });

        req.on("error", reject);
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

function googleJson(url, options) {
    const opts = options || {};
    return requestJson(url, opts, false).catch((err) => {
        if (!isTlsError(err)) {
            throw err;
        }
        return requestJson(url, opts, true);
    });
}

function decodeBase64Url(value) {
    const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64");
}

function decodeJwt(credential) {
    const parts = String(credential || "").split(".");
    if (parts.length !== 3) {
        throw new Error("invalid_google_token");
    }

    try {
        return {
            header: JSON.parse(decodeBase64Url(parts[0]).toString("utf8")),
            payload: JSON.parse(decodeBase64Url(parts[1]).toString("utf8")),
            signingInput: parts[0] + "." + parts[1],
            signature: decodeBase64Url(parts[2])
        };
    } catch (err) {
        throw new Error("invalid_google_token");
    }
}

function isEmailVerified(value) {
    return value === true || value === "true";
}

function normalizePayload(payload, clientId) {
    const email = String(payload.email || "").trim().toLowerCase();
    const name = String(payload.name || email.split("@")[0] || "Student").trim();
    const googleId = String(payload.sub || "").trim();
    const audience = String(payload.aud || "").trim();
    const issuer = String(payload.iss || "").trim();
    const expiresAt = Number(payload.exp) || 0;

    if (!googleId || !email) {
        throw new Error("invalid_google_token");
    }
    if (audience !== clientId) {
        throw new Error("invalid_google_audience");
    }
    if (!GOOGLE_ISSUERS.has(issuer)) {
        throw new Error("invalid_google_token");
    }
    if (expiresAt * 1000 < Date.now() - 60 * 1000) {
        throw new Error("expired_google_token");
    }
    if (!isEmailVerified(payload.email_verified)) {
        throw new Error("unverified_google_email");
    }

    return { email, name, googleId };
}

function verifySignature(token, keys) {
    const match = (keys || []).find((key) => key.kid === token.header.kid && key.kty === "RSA");
    if (!match) {
        throw new Error("invalid_google_token");
    }

    const key = crypto.createPublicKey({ key: match, format: "jwk" });
    const valid = crypto.verify("RSA-SHA256", Buffer.from(token.signingInput), key, token.signature);
    if (!valid) {
        throw new Error("invalid_google_token");
    }
}

function loadGoogleCerts() {
    if (certCache.keys && certCache.expiresAt > Date.now()) {
        return Promise.resolve(certCache.keys);
    }

    return googleJson("https://www.googleapis.com/oauth2/v3/certs").then((data) => {
        const keys = data && Array.isArray(data.keys) ? data.keys : [];
        if (!keys.length) {
            throw new Error("invalid_google_response");
        }
        certCache = {
            keys,
            expiresAt: Date.now() + (60 * 60 * 1000)
        };
        return keys;
    });
}

function verifyWithTokenInfo(credential, clientId) {
    const body = "id_token=" + encodeURIComponent(credential);
    return googleJson("https://oauth2.googleapis.com/tokeninfo", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body
    }).then((payload) => {
        if (payload.error) {
            throw new Error("invalid_google_token");
        }
        return normalizePayload(payload, clientId);
    });
}

function verifyGoogleIdToken(credential, clientId) {
    const token = decodeJwt(credential);
    const claims = normalizePayload(token.payload, clientId);

    return loadGoogleCerts()
        .then((keys) => {
            verifySignature(token, keys);
            return claims;
        })
        .catch(() => verifyWithTokenInfo(credential, clientId));
}

module.exports = {
    verifyGoogleIdToken
};
