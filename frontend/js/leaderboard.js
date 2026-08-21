const user = getStoredUser();
const list = document.getElementById("leaderboard-rows");

fetch(API + "/leaderboard")
    .then((response) => {
        if (!response.ok) {
            throw new Error("Failed to load leaderboard");
        }
        return response.json();
    })
    .then((rows) => {
        renderLeaderboard(rows);
    })
    .catch((err) => {
        console.error(err);
        if (list) {
            list.innerHTML = `
                <div class="table-row">
                    <span></span>
                    <span class="user-cell"><strong>Unable to load rankings</strong></span>
                    <span></span><span></span><span></span><span></span>
                </div>
            `;
        }
    });

function renderLeaderboard(rows) {

    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = `
            <div class="table-row">
                <span></span>
                <span class="user-cell"><strong>No rankings yet</strong><small>Complete a quiz while logged in to appear here</small></span>
                <span>0</span>
                <span>0</span>
                <span>0</span>
                <span>0%</span>
            </div>
        `;
        return;
    }

    list.innerHTML = rows.map((row, index) => {
        const rank = row.rank || index + 1;
        const topClass = rank === 1 ? " top-row-entry" : "";
        return `
            <div class="table-row${topClass}">
                <span class="${rankClass(rank)}">${rank}</span>
                <span class="user-cell"><strong>${escapeHtml(row.name)}</strong><small>Practice ranking</small></span>
                <span>${Number(row.xp) || 0}</span>
                <span>${Number(row.questions_answered) || 0}</span>
                <span>${Number(row.streak) || 0}</span>
                <span>${Number(row.accuracy) || 0}%</span>
            </div>
        `;
    }).join("");

    const mine = user
        ? rows.find((row) => Number(row.user_id) === Number(user.id))
        : null;

    if (mine) {
        setText("hero-rank", "#" + mine.rank);
        setText("hero-xp", String(mine.xp));
        setText("hero-accuracy", mine.accuracy + "%");
        setText("sidebar-xp", "💥 " + mine.xp);
        setText("sidebar-rank", "🏆 #" + mine.rank);
        setText("sidebar-streak", "🔥 " + mine.streak);
        setText("sidebar-accuracy", "🎯 " + mine.accuracy + "%");
        setText("sidebar-questions", String(mine.questions_answered));
    }

}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}
