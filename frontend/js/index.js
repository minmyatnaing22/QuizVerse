const user = getStoredUser();

function examDaysFromToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(today);
    exam.setDate(exam.getDate() + 200);
    return Math.round((exam.getTime() - today.getTime()) / 86400000);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function renderGuestDashboard() {
    const days = examDaysFromToday();
    setText("countdown-num", String(days));
    setText("stat-exam", days + " days");
    setText("heading-sub", days + " days to go — log in to track your real progress.");
    setText("stat-questions", "0");
    setText("stat-accuracy", "0%");
    setText("sidebar-rank", "🏆 —");
    renderRecent([]);
    bindContinue(null);
}

function renderDashboard(data) {
    const sidebar = data.sidebar || {};
    const summary = data.summary || {};
    const days = summary.exam_days != null ? summary.exam_days : examDaysFromToday();
    const xp = Number(sidebar.xp) || 0;
    const accuracy = Number(sidebar.accuracy) || 0;
    const questions = Number(sidebar.questions_answered) || 0;
    const streak = Number(sidebar.streak) || 0;
    const rank = sidebar.rank;

    setText("xp-label-left", "XP");
    setText("xp-label-right", String(xp));
    setText("sidebar-xp", "💥 " + xp);
    setText("sidebar-rank", rank ? "🏆 #" + rank : "🏆 —");
    setText("sidebar-streak", "🔥 " + streak);
    setText("sidebar-accuracy", "🎯 " + accuracy + "%");
    setText("sidebar-questions", String(questions));
    setText("countdown-num", String(days));
    setText("stat-exam", days + " days");
    setText("stat-questions", String(summary.total_questions_done || 0));
    setText("stat-accuracy", (summary.overall_accuracy || 0) + "%");
    setText("heading-sub", days + " days to go — keep your streak alive and close the gap on your weakest subject.");

    const fill = document.getElementById("xp-fill");
    if (fill) {
        fill.style.width = Math.min(accuracy, 100) + "%";
    }

    const ring = document.getElementById("avatar-ring-progress");
    if (ring) {
        ring.setAttribute("stroke-dashoffset", String(251.2 * (1 - Math.min(accuracy, 100) / 100)));
    }

    renderSubjectProgress(data.subject_progress || []);
    renderRecent(data.recent_practice || []);
    bindContinue(sidebar.continue_practice || null);
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
        return (
            '<div class="recent-item">' +
                '<div class="recent-name">' + escapeHtml(row.subject_name || "") + "</div>" +
                '<div class="recent-meta">' +
                    escapeHtml(chapter) + " · " + escapeHtml(typeLabel(row.question_type)) +
                    " · " + (Number(row.score) || 0) + "/" + (Number(row.total_questions) || 0) +
                    " (" + percent + "%)" +
                "</div>" +
            "</div>"
        );
    }).join("");
}

function bindContinue(target) {
    const button = document.getElementById("continue-btn");
    if (!button) {
        return;
    }

    if (!target || !target.chapter_id || !target.type) {
        button.textContent = "▶ Start Your First Quiz";
        button.onclick = () => {
            document.querySelector(".subject-grid")?.scrollIntoView({
                behavior: "smooth"
            });
        };
        return;
    }

    button.textContent = "▶ Continue Practice";
    button.onclick = () => {
        window.location.href =
            "quiz.html?chapter_id=" + encodeURIComponent(target.chapter_id) +
            "&type=" + encodeURIComponent(target.type);
    };
}

const user = getStoredUser();
const dashboardUrl = user && user.id
    ? API + "/dashboard?user_id=" + encodeURIComponent(user.id)
    : API + "/dashboard";

fetch(dashboardUrl)
    .then((response) => {
        if (!response.ok) {
            throw new Error("Failed to load dashboard");
        }
        return response.json();
    })
    .then(renderDashboard)
    .catch((err) => {
        console.error(err);
        renderGuestDashboard();
    });
