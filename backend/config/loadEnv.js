const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const text = fs.readFileSync(filePath, "utf8");
    text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.charAt(0) === "#") {
            return;
        }
        const eq = trimmed.indexOf("=");
        if (eq < 1) {
            return;
        }
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] == null) {
            process.env[key] = value;
        }
    });
}

function loadEnv() {
    loadEnvFile(path.join(__dirname, "../../.env"));
    loadEnvFile(path.join(__dirname, "../.env"));
}

loadEnv();

module.exports = { loadEnv };
