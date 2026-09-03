const API = window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

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

function restoreStoredToken() {
    const user = getStoredUser();

    if (!user || !user.id) {
        return Promise.resolve(user);
    }

    if (user.token) {
        return Promise.resolve(user);
    }

    if (!user.email) {
        return Promise.resolve(user);
    }

    return fetch(API + "/users/session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: user.id,
            email: user.email
        })
    })
        .then((response) => {
            if (!response.ok) {
                return null;
            }
            return response.json();
        })
        .then((data) => {
            if (data && data.token) {
                localStorage.setItem("quizVerseUser", JSON.stringify({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    token: data.token
                }));
            }
            return getStoredUser();
        })
        .catch(() => user);
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

function applyTheme(theme) {
    const mode = theme === "dark" ? "dark" : "light";
    let style = document.getElementById("qv-theme-vars");
    if (!style) {
        style = document.createElement("style");
        style.id = "qv-theme-vars";
        document.head.appendChild(style);
    }
    style.textContent = mode === "dark"
        ? ":root{--bg:#0f172a;--white:#111c34;--ink:#f8fafc;--ink-soft:#cbd5e1;--line:#27344f;--blue-100:#1e293b;}body{background:var(--bg);color:var(--ink);} .leaderboard-card,.subject-card,.qstat,.input-wrap,.field-card,.settings-card,.discussion-card,.message-composer,.chat-window{background:var(--white)!important;color:var(--ink)!important;border-color:var(--line)!important;} input,textarea,select{color:var(--ink)!important;} .recent-item,.table-row,.stat-chip,.mini-card{border-color:var(--line)!important;}"
        : ":root{--bg:#F5F7FC;--white:#FFFFFF;--ink:#16294D;--ink-soft:#5C6B8A;--line:#E4E9F5;--blue-100:#E7EDFF;}";
    document.documentElement.setAttribute("data-theme", mode);
    document.body.classList.toggle("theme-dark", mode === "dark");
    try {
        localStorage.setItem("quizVerseTheme", mode);
    } catch (err) {}
}

function restoreThemePreference() {
    try {
        const stored = localStorage.getItem("quizVerseTheme");
        if (stored === "dark" || stored === "light") {
            applyTheme(stored);
        }
    } catch (err) {}
}

function bindSettingsLink() {
    document.querySelectorAll(".nav-item").forEach((link) => {
        const label = link.querySelector("span");
        if (!label || label.textContent.trim() !== "Settings") {
            return;
        }
        link.setAttribute("href", htmlHref("settings.html"));
        link.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = htmlHref("settings.html");
        });
    });
}

function bindDiscussionLink() {
    const navLists = document.querySelectorAll(".nav-list");
    navLists.forEach((nav) => {
        if (!nav || nav.querySelector('[data-qv-discussion-link="true"]')) {
            return;
        }
        const link = document.createElement("a");
        link.className = "nav-item";
        link.href = htmlHref("group-discussion.html");
        link.setAttribute("data-qv-discussion-link", "true");
        if (currentPageName() === "group-discussion.html") {
            link.classList.add("active");
        }
        link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg><span>Group Discussion</span>';
        const settingsLink = Array.from(nav.querySelectorAll(".nav-item")).find((item) => {
            const label = item.querySelector("span");
            return label && label.textContent.trim() === "Settings";
        });
        nav.insertBefore(link, settingsLink || nav.querySelector(".nav-item.logout") || null);
    });
}

function quizHref(chapterId, type, mode) {
    let url = htmlHref("quiz.html") +
        "?chapter_id=" + encodeURIComponent(chapterId) +
        "&type=" + encodeURIComponent(type);
    if (String(mode || "").toUpperCase() === "EXAM") {
        url += "&mode=exam";
    }
    return url;
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
        window.location.href = quizHref(target.chapter_id, target.type, target.mode);
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
        applyTheme("light");
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

    fetch(API + "/users/me", {
        headers: authHeaders()
    })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
            if (!data || !data.preferences) {
                return;
            }
            applyTheme(data.preferences.dark_mode ? "dark" : "light");
            window.quizVerseCurrentUser = data;
            document.dispatchEvent(new CustomEvent("quizverse-user-loaded", { detail: data }));
        })
        .catch(() => {});
}

bindLogout();
restoreThemePreference();
bindSettingsLink();
bindDiscussionLink();
restoreStoredToken().then(() => {
    loadSharedUserData();
    window.quizVerseSessionReady = true;
    document.dispatchEvent(new Event("quizverse-session-ready"));
});

const CHAT_SESSION_KEY = "quizVerseChatSession";
const CHAT_PING_KEY = "quizVerseChatPing";
const CHAT_SHARE_KEY = "quizVerseChatShare";

function isChatBrowserReload() {
    try {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav && nav.type) {
            return nav.type === "reload";
        }
    } catch (err) {}
    try {
        return performance.navigation && performance.navigation.type === 1;
    } catch (err) {}
    return false;
}

function parseChatSession(raw) {
    if (!raw) {
        return null;
    }
    try {
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? data : null;
    } catch (err) {
        return null;
    }
}

function writeChatSession(data) {
    const json = JSON.stringify(data || { conversation: [], context: {} });
    sessionStorage.setItem(CHAT_SESSION_KEY, json);
    try {
        localStorage.setItem(CHAT_SESSION_KEY, json);
    } catch (err) {}
}

function clearChatSession() {
    sessionStorage.removeItem(CHAT_SESSION_KEY);
    try {
        localStorage.removeItem(CHAT_SESSION_KEY);
    } catch (err) {}
}

function loadSharedChatSession(callback) {
    if (isChatBrowserReload()) {
        clearChatSession();
        callback(null);
        return;
    }

    const existing = parseChatSession(sessionStorage.getItem(CHAT_SESSION_KEY));
    if (existing) {
        callback(existing);
        return;
    }

    let answered = false;
    function onShare(event) {
        if (event.key !== CHAT_SHARE_KEY || !event.newValue) {
            return;
        }
        answered = true;
        sessionStorage.setItem(CHAT_SESSION_KEY, event.newValue);
        try {
            localStorage.removeItem(CHAT_SHARE_KEY);
        } catch (err) {}
        callback(parseChatSession(event.newValue));
    }

    window.addEventListener("storage", onShare);
    try {
        localStorage.setItem(CHAT_PING_KEY, String(Date.now()));
    } catch (err) {
        window.removeEventListener("storage", onShare);
        callback(null);
        return;
    }

    setTimeout(() => {
        window.removeEventListener("storage", onShare);
        if (!answered) {
            try {
                localStorage.removeItem(CHAT_SESSION_KEY);
            } catch (err) {}
            callback(null);
        }
    }, 150);
}

window.addEventListener("storage", (event) => {
    if (event.key === CHAT_PING_KEY && event.newValue) {
        const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
        if (!raw) {
            return;
        }
        try {
            localStorage.setItem(CHAT_SHARE_KEY, raw);
            localStorage.removeItem(CHAT_SHARE_KEY);
        } catch (err) {}
        return;
    }

    if (event.key !== CHAT_SESSION_KEY) {
        return;
    }

    if (!event.newValue) {
        sessionStorage.removeItem(CHAT_SESSION_KEY);
        document.dispatchEvent(new CustomEvent("quizverse-chat-sync", { detail: null }));
        return;
    }

    sessionStorage.setItem(CHAT_SESSION_KEY, event.newValue);
    document.dispatchEvent(new CustomEvent("quizverse-chat-sync", {
        detail: parseChatSession(event.newValue)
    }));
});

function chatbotAssetHref(folder, file) {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (path.includes("/subject/")) {
        return "../../" + folder + "/" + file;
    }
    return "../" + folder + "/" + file;
}

function loadChatbotWidget() {
    const page = currentPageName();
    if (page === "chatbot.html" || page === "quizverse-auth.html") {
        return;
    }
    if (document.getElementById("qv-chatbot-root")) {
        return;
    }
    if (!document.querySelector('link[data-qv-chatbot-style]')) {
        const style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = chatbotAssetHref("css", "chatbot_style.css");
        style.setAttribute("data-qv-chatbot-style", "true");
        document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-qv-chatbot-widget]')) {
        const script = document.createElement("script");
        script.src = chatbotAssetHref("js", "chatbot-widget.js");
        script.setAttribute("data-qv-chatbot-widget", "true");
        document.body.appendChild(script);
    }
}

loadChatbotWidget();
