const API = "http://localhost:3000";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("quizVerseUser") || "null");
    } catch (err) {
        return null;
    }
}

function authHeaders() {
    const headers = {};
    const user = getStoredUser();
    if (user && user.token) {
        headers["X-QuizVerse-Token"] = user.token;
    }
    return headers;
}

function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "QV";
    }
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function currentPageName() {
    return (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function htmlHref(file) {
    if (window.location.pathname.replace(/\\/g, "/").includes("/subject/")) {
        return "../" + file;
    }
    return file;
}

function quizHref(chapterId, type) {
    return htmlHref("quiz.html") +
        "?chapter_id=" + encodeURIComponent(chapterId) +
        "&type=" + encodeURIComponent(type);
}

function applySidebarUser(user) {
    if (!user) {
        return;
    }

    const nameEl = document.querySelector(".student-name");
    const avatarEl = document.querySelector(".avatar-fallback");

    if (nameEl) {
        nameEl.textContent = user.name;
    }
    if (avatarEl) {
        avatarEl.textContent = initials(user.name);
    }
}

function bindLogout() {
    document.querySelectorAll(".nav-item.logout").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.removeItem("quizVerseUser");
            window.location.href = htmlHref("quizverse-auth.html");
        });
    });
}

function rankClass(rank) {
    if (rank === 1) {
        return "rank-badge gold";
    }
    if (rank === 2) {
        return "rank-badge silver";
    }
    if (rank === 3) {
        return "rank-badge bronze";
    }
    return "rank-badge";
}

function typeLabel(type) {
    if (type === "TRUE_FALSE") {
        return "True/False";
    }
    if (type === "BLANK") {
        return "Blank";
    }
    return type || "MCQ";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function setSidebarText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function applyExamDays(days) {
    document.querySelectorAll(".countdown .num").forEach((el) => {
        el.textContent = String(days);
    });
}

function goToContinueTarget(target) {
    if (target && target.chapter_id && target.type) {
        window.location.href = quizHref(target.chapter_id, target.type);
        return;
    }
    window.location.href = htmlHref("index.html") + "#subject-grid";
}

function bindContinueButton(target) {
    if (currentPageName() === "result.html") {
        return;
    }

    const button = document.querySelector(".continue-btn");
    if (!button) {
        return;
    }

    const clone = button.cloneNode(true);
    button.parentNode.replaceChild(clone, button);

    if (target && target.chapter_id && target.type) {
        clone.textContent = "▶ Continue Practice";
    } else {
        clone.textContent = "▶ Start Your First Quiz";
    }

    clone.addEventListener("click", () => {
        goToContinueTarget(target);
    });
}

function applySidebarStats(data) {
    const sidebar = data && data.sidebar ? data.sidebar : {};
    const xp = Number(sidebar.xp) || 0;
    const accuracy = Number(sidebar.accuracy) || 0;
    const questions = Number(sidebar.questions_answered) || 0;
    const streak = Number(sidebar.streak) || 0;
    const rank = sidebar.rank;

    setSidebarText("sidebar-xp", "💥 " + xp);
    setSidebarText("sidebar-rank", rank ? "🏆 #" + rank : "🏆 —");
    setSidebarText("sidebar-streak", "🔥 " + streak);
    setSidebarText("sidebar-accuracy", "🎯 " + accuracy + "%");
    setSidebarText("sidebar-questions", String(questions));
    setSidebarText("xp-label-left", "XP");
    setSidebarText("xp-label-right", String(xp));

    const fill = document.getElementById("xp-fill");
    if (fill) {
        fill.style.width = Math.min(accuracy, 100) + "%";
    }
}

function applySubjectProgress(rows) {

    const byName = {};

    (rows || []).forEach((row) => {
        const name = String(row.subject_name || "").trim().toLowerCase();
        if (name) {
            byName[name] = row;
        }
    });

    document.querySelectorAll(".nav-list .nav-item").forEach((link) => {

        const nameEl = link.querySelector(".subject-name");
        const fill = link.querySelector(".progress-fill");
        const value = link.querySelector(".progress-value");

        if (!nameEl || (!fill && !value)) {
            return;
        }

        const name = nameEl.textContent.trim().toLowerCase();

        if (name === "back to home" || name.indexOf("back") === 0) {
            return;
        }

        const row = byName[name];
        const percent = row ? Number(row.progress_percent) || 0 : 0;

        if (fill) {
            fill.style.width = percent + "%";
        }
        if (value) {
            value.textContent = percent + "%";
        }

    });

}

function loadSharedUserData() {
    const user = getStoredUser();
    applySidebarUser(user);

    fetch(API + "/exam-days")
        .then((response) => response.json())
        .then((data) => {
            if (data && data.exam_days != null) {
                applyExamDays(data.exam_days);
            }
        })
        .catch(() => {});

    if (!user || !user.token) {
        bindContinueButton(null);
        fetch(API + "/dashboard")
            .then((response) => response.json())
            .then((data) => {
                applySubjectProgress(data.subject_progress);
            })
            .catch(() => {
                applySubjectProgress([]);
            });
        return;
    }

    fetch(API + "/dashboard", {
        headers: authHeaders()
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("dashboard failed");
            }
            return response.json();
        })
        .then((data) => {
            if (data.user && data.user.name) {
                applySidebarUser({
                    id: data.user.id,
                    name: data.user.name
                });
            }
            applySidebarStats(data);
            applySubjectProgress(data.subject_progress);
            if (data.summary && data.summary.exam_days != null) {
                applyExamDays(data.summary.exam_days);
            }
            bindContinueButton(data.sidebar && data.sidebar.continue_practice);
            window.quizVerseDashboard = data;
            document.dispatchEvent(new CustomEvent("quizverse-dashboard", { detail: data }));
        })
        .catch(() => {
            bindContinueButton(null);
        });
}

bindLogout();
loadSharedUserData();
