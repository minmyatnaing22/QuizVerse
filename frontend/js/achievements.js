const statusEl = document.getElementById("achievement-status");
const gridEl = document.getElementById("achievement-grid");
const user = typeof getStoredUser === "function" ? getStoredUser() : null;

if (!user || !user.token) {
    statusEl.textContent = "Log in to see your achievements.";
} else {
    fetch(API + "/achievements", {
        headers: authHeaders()
    })
        .then((response) => {
            if (response.status === 401) {
                throw new Error("Log in to see your achievements.");
            }
            if (!response.ok) {
                throw new Error("Unable to load achievements.");
            }
            return response.json();
        })
        .then(renderAchievements)
        .catch((err) => {
            statusEl.textContent = err.message || "Unable to load achievements.";
        });
}

function renderAchievements(rows) {
    const unlocked = (rows || []).filter((row) => row.unlocked).length;
    statusEl.textContent = unlocked + " of " + (rows || []).length + " badges unlocked";

    gridEl.innerHTML = (rows || []).map((row) => {
        const current = Number(row.progress && row.progress.current) || 0;
        const target = Number(row.progress && row.progress.target) || 1;
        const percent = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
        const state = row.unlocked
            ? "unlocked"
            : current > 0
                ? "in-progress"
                : "locked";
        const date = row.unlocked_at
            ? "Unlocked " + formatDate(row.unlocked_at)
            : "Progress: " + current + " / " + target;

        return (
            "<article class='badge-card " + state + "'>" +
                "<div class='badge-icon'>" + escapeHtml(row.icon || "🏅") + "</div>" +
                "<h3>" + escapeHtml(row.name) + "</h3>" +
                "<p>" + escapeHtml(row.description) + "</p>" +
                "<div class='badge-meta'>" + escapeHtml(date) + "</div>" +
                "<div class='badge-track'><div class='badge-fill' style='width:" + percent + "%'></div></div>" +
            "</article>"
        );
    }).join("");
}

function formatDate(value) {
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString();
}
