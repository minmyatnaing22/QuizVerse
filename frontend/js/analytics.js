const emptyEl = document.getElementById("analytics-empty");
const contentEl = document.getElementById("analytics-content");
const user = getStoredUser();

if (!user || !user.token) {
    showEmpty("Log in to see your performance analytics.", "Private stats are saved to your QuizVerse account. Sign in, then return to this page.");
} else {
    fetch(API + "/analytics", {
        headers: authHeaders()
    })
        .then((response) => {
            if (response.status === 401) {
                throw new Error("login");
            }
            if (!response.ok) {
                throw new Error("load");
            }
            return response.json();
        })
        .then(renderAnalytics)
        .catch((err) => {
            if (err.message === "login") {
                showEmpty("Log in to see your performance analytics.", "Private stats are saved to your QuizVerse account. Sign in, then return to this page.");
                return;
            }
            showEmpty("Unable to load analytics.", "Please try again in a moment.");
        });
}

function showEmpty(title, message) {
    emptyEl.hidden = false;
    contentEl.hidden = true;
    emptyEl.querySelector("h3").textContent = title;
    emptyEl.querySelector("p").textContent = message;
}

function renderAnalytics(data) {
    const overall = data.overall || {};
    const questions = Number(overall.questions_answered) || 0;

    if (questions === 0) {
        showEmpty(
            "No performance data yet.",
            "You haven't completed enough quizzes to show performance analytics yet. Finish a practice quiz, exam, or daily challenge to see your stats here."
        );
        return;
    }

    emptyEl.hidden = true;
    contentEl.hidden = false;

    const name = (data.user && data.user.name) || "";
    document.getElementById("analytics-title").textContent = name
        ? name + "'s study snapshot"
        : "Your study snapshot";

    setText("stat-accuracy", overall.accuracy + "%");
    setText("stat-questions", String(questions));
    setText("stat-quizzes", String(overall.quizzes_completed || 0));

    document.getElementById("overall-cards").innerHTML = [
        card("Questions answered", questions),
        card("Quizzes completed", overall.quizzes_completed || 0),
        card("Correct answers", overall.correct_answers || 0),
        card("Incorrect answers", overall.incorrect_answers || 0),
        card("Overall accuracy", (overall.accuracy || 0) + "%"),
        card("Total XP", overall.xp || 0),
        card("Day streak", overall.streak || 0),
        card("Rank", overall.rank ? "#" + overall.rank : "—")
    ].join("");

    renderInsights(data.insights || []);
    renderSubjects(data.subjects || []);
    renderFocus(data.strongest_subject, data.weakest_subject);
    renderChapterList("weak-chapters", data.weakest_chapters || [], "No chapter practice yet.");
    renderChapterList("strong-chapters", data.strongest_chapters || [], "No chapter practice yet.");
    renderTypes(data.question_types || []);
    renderTimeline(data.timeline || []);
    renderRecent(data.recent || []);
}

function card(label, value) {
    return '<div class="stat-card"><div class="lbl">' + escapeHtml(label) +
        '</div><div class="val">' + escapeHtml(String(value)) + "</div></div>";
}

function renderInsights(insights) {
    const cardEl = document.getElementById("insights-card");
    const list = document.getElementById("insight-list");
    if (!insights.length) {
        cardEl.hidden = true;
        return;
    }
    cardEl.hidden = false;
    list.innerHTML = insights.map((text) => "<li>" + escapeHtml(text) + "</li>").join("");
}

function renderSubjects(rows) {
    const wrap = document.getElementById("subject-rows");
    if (!rows.length) {
        wrap.innerHTML = '<p class="empty-note">No subject practice yet.</p>';
        return;
    }
    wrap.innerHTML = rows.map((row) => {
        return '<div class="metric-row"><div><strong>' + escapeHtml(row.subject_name) +
            "</strong><small>" + row.questions_answered + " questions · " +
            row.correct_answers + " correct · " + row.incorrect_answers +
            " incorrect · " + row.attempts + " attempts</small></div><div class=\"accuracy-pill\">" +
            row.accuracy + "%</div></div>";
    }).join("");
}

function renderFocus(strongest, weakest) {
    document.getElementById("strongest-subject").textContent = strongest
        ? strongest.subject_name + " · " + strongest.accuracy + "%"
        : "Not enough data yet.";
    document.getElementById("weakest-subject").textContent = weakest
        ? weakest.subject_name + " · " + weakest.accuracy + "%"
        : "Not enough data yet.";
}

function renderChapterList(id, rows, emptyText) {
    const wrap = document.getElementById(id);
    if (!rows.length) {
        wrap.innerHTML = '<p class="empty-note">' + emptyText + "</p>";
        return;
    }
    wrap.innerHTML = rows.map((row) => {
        const title = "Chapter " + row.chapter_number + ": " + (row.chapter_name || "");
        return '<div class="metric-row"><div><strong>' + escapeHtml(title) +
            "</strong><small>" + escapeHtml(row.subject_name) + " · " +
            row.questions_answered + " questions</small></div><div class=\"accuracy-pill\">" +
            row.accuracy + "%</div></div>";
    }).join("");
}

function renderTypes(rows) {
    const wrap = document.getElementById("type-rows");
    if (!rows.length) {
        wrap.innerHTML = '<p class="empty-note">No question-type data yet.</p>';
        return;
    }
    wrap.innerHTML = rows.map((row) => {
        return '<div class="metric-row"><div><strong>' + escapeHtml(typeLabel(row.question_type)) +
            "</strong><small>" + row.questions_answered + " questions · " +
            row.correct_answers + " correct · " + row.incorrect_answers +
            " incorrect</small></div><div class=\"accuracy-pill\">" +
            row.accuracy + "%</div></div>";
    }).join("");
}

function renderTimeline(points) {
    const wrap = document.getElementById("timeline-wrap");
    if (!points.length || points.length < 2) {
        wrap.innerHTML = '<p class="chart-empty">Not enough history to show a trend yet. Complete at least two quizzes.</p>';
        return;
    }

    const width = 640;
    const height = 220;
    const padL = 36;
    const padR = 12;
    const padT = 16;
    const padB = 36;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const coords = points.map((point, index) => {
        const x = padL + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
        const y = padT + innerH - ((Number(point.accuracy) || 0) / 100) * innerH;
        return { x, y, label: shortDate(point.created_at), accuracy: point.accuracy };
    });
    const line = coords.map((point) => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
    const dots = coords.map((point) =>
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) +
        '" r="4.5" fill="#2b5fe2"></circle>'
    ).join("");
    const labels = coords.map((point, index) => {
        if (index !== 0 && index !== coords.length - 1 && index % 2 === 1 && coords.length > 6) {
            return "";
        }
        return '<text x="' + point.x.toFixed(1) + '" y="' + (height - 10) +
            '" text-anchor="middle" font-size="10" fill="#5C6B8A">' +
            escapeHtml(point.label) + "</text>";
    }).join("");

    wrap.innerHTML =
        '<svg class="chart-svg" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="Accuracy across recent attempts">' +
            '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (height - padB) + '" stroke="#E4E9F5"></line>' +
            '<line x1="' + padL + '" y1="' + (height - padB) + '" x2="' + (width - padR) + '" y2="' + (height - padB) + '" stroke="#E4E9F5"></line>' +
            '<text x="4" y="' + (padT + 4) + '" font-size="10" fill="#5C6B8A">100%</text>' +
            '<text x="8" y="' + (height - padB) + '" font-size="10" fill="#5C6B8A">0%</text>' +
            '<polyline fill="none" stroke="#2b5fe2" stroke-width="3" points="' + line + '"></polyline>' +
            dots + labels +
        "</svg>";
}

function renderRecent(rows) {
    const wrap = document.getElementById("recent-rows");
    if (!rows.length) {
        wrap.innerHTML = '<p class="empty-note">No recent attempts.</p>';
        return;
    }
    wrap.innerHTML = rows.map((row) => {
        const chapter = row.chapter_number != null
            ? "Chapter " + row.chapter_number + ": " + (row.chapter_name || "")
            : (row.chapter_name || typeLabel(row.question_type));
        const mode = String(row.mode || "").toUpperCase();
        const extra = mode === "EXAM" ? " · Exam" : mode === "DAILY" ? " · Daily" : "";
        return '<div class="table-row analytics-recent-row">' +
            "<span>" + escapeHtml(formatDate(row.created_at)) + "</span>" +
            "<span>" + escapeHtml(row.subject_name || "") + "</span>" +
            "<span>" + escapeHtml(chapter + extra) + "</span>" +
            "<span>" + (Number(row.score) || 0) + "/" + (Number(row.total_questions) || 0) + "</span>" +
            "<span>" + Math.round(Number(row.percentage) || 0) + "%</span>" +
        "</div>";
    }).join("");
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function formatDate(value) {
    if (!value) {
        return "";
    }
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString();
}

function shortDate(value) {
    if (!value) {
        return "";
    }
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
