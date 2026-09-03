function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function renderDashboard(data) {
    const sidebar = data.sidebar || {};
    const summary = data.summary || {};
    const account = data.user || {};
    const stored = getStoredUser() || {};
    const name = account.name || stored.name || "";

    const days = summary.exam_days != null ? summary.exam_days : null;
    const xp = Number(sidebar.xp) || 0;
    const accuracy = Number(sidebar.accuracy) || 0;
    const questions = Number(sidebar.questions_answered) || 0;
    const streak = Number(sidebar.streak) || 0;
    const rank = sidebar.rank;

    if (name) {
        setText("welcome-title", "Welcome back, " + name);
        applySidebarUser({ name: name });
    }

    setText("xp-label-left", "XP");
    setText("xp-label-right", String(xp));
    setText("sidebar-xp", "💥 " + xp);
    setText("sidebar-rank", rank ? "🏆 #" + rank : "🏆 —");
    setText("sidebar-streak", "🔥 " + streak);
    setText("sidebar-accuracy", "🎯 " + accuracy + "%");
    setText("sidebar-questions", String(questions));

    if (days != null) {
        setText("countdown-num", String(days));
        setText("stat-exam", days + " days");
        setText(
            "heading-sub",
            days + " days to go — keep your streak alive and close the gap on your weakest subject."
        );
    }

    setText("stat-questions", String(summary.total_questions_done || 0));
    setText("stat-accuracy", (summary.overall_accuracy || 0) + "%");

    const fill = document.getElementById("xp-fill");
    if (fill) {
        fill.style.width = Math.min(accuracy, 100) + "%";
    }

    const ring = document.getElementById("avatar-ring-progress");
    if (ring) {
        ring.setAttribute(
            "stroke-dashoffset",
            String(251.2 * (1 - Math.min(accuracy, 100) / 100))
        );
    }

    renderSubjectProgress(data.subject_progress || []);
    renderRecent(data.recent_practice || []);
    loadBookmarkSummary();
}

function renderSubjectProgress(rows) {
    rows.forEach((row) => {
        const card = document.querySelector('.subject-card[data-subject-id="' + row.subject_id + '"]');
        if (!card) {
            return;
        }

        const available = Number(row.available_chapters) || 0;
        const attempted = Number(row.attempted_chapters) || 0;
        const percent = Number(row.progress_percent) || 0;
        const pill = card.querySelector(".completion-pill");
        const bar = card.querySelector(".prog-fill");
        const count = card.querySelector(".qcount");

        if (pill) {
            pill.textContent = available === 0 ? "No questions" : percent + "% done";
        }
        if (bar) {
            bar.style.width = (available === 0 ? 0 : percent) + "%";
        }
        if (count) {
            count.innerHTML = available === 0
                ? "No chapters yet"
                : "<b>" + attempted + "</b>/" + available + " chapters";
        }
    });
}

function renderRecent(rows) {
    const list = document.getElementById("recent-practice-list");
    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = '<div class="recent-empty">No practice yet</div>';
        return;
    }

    list.innerHTML = rows.map((row) => {
        const percent = Math.round(Number(row.percentage) || 0);
        const chapter = row.chapter_number != null
            ? "Ch " + row.chapter_number + " · " + (row.chapter_name || "")
            : (row.chapter_name || "");
        const href = (row.chapter_id && row.question_type)
            ? ("quiz.html?chapter_id=" + encodeURIComponent(row.chapter_id) +
                "&type=" + encodeURIComponent(row.question_type))
            : "history.html";

        return (
            '<a class="recent-item" href="' + href + '">' +
                '<div class="recent-name">' + escapeHtml(row.subject_name || "") + "</div>" +
                '<div class="recent-meta">' +
                    escapeHtml(chapter) + " · " + escapeHtml(typeLabel(row.question_type)) +
                    " · " + (Number(row.score) || 0) + "/" + (Number(row.total_questions) || 0) +
                    " (" + percent + "%)" +
                "</div>" +
            "</a>"
        );
    }).join("");
}

function loadBookmarkSummary() {
    const meta = document.getElementById("bookmark-home-meta");
    if (!meta) {
        return;
    }

    const user = getStoredUser();
    if (!user || !user.token) {
        meta.textContent = "Log in to save questions";
        return;
    }

    fetch(API + "/bookmarks", {
        headers: authHeaders()
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("bookmarks failed");
            }
            return response.json();
        })
        .then((rows) => {
            const count = (rows || []).length;
            meta.textContent = count === 0
                ? "No saved questions yet"
                : count + " saved question" + (count === 1 ? "" : "s");
        })
        .catch(() => {
            meta.textContent = "Unable to load bookmarks";
        });
}

function loadHomeDashboard() {
    fetch(API + "/dashboard", {
        headers: authHeaders()
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to load dashboard");
            }
            return response.json();
        })
        .then(renderDashboard)
        .catch(() => {
            const list = document.getElementById("recent-practice-list");
            if (list && !list.children.length) {
                list.innerHTML = '<div class="recent-empty">Unable to load dashboard</div>';
            }
        });
}

function startHomeDashboard() {
    if (window.quizVerseDashboard) {
        renderDashboard(window.quizVerseDashboard);
        return;
    }

    document.addEventListener("quizverse-dashboard", (event) => {
        renderDashboard(event.detail);
    });
    loadHomeDashboard();
}

if (window.quizVerseSessionReady) {
    startHomeDashboard();
} else {
    document.addEventListener("quizverse-session-ready", startHomeDashboard);
}

if (window.location.hash === "#subject-grid") {
    document.getElementById("subject-grid")?.scrollIntoView();
}
