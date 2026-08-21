const API = "http://localhost:3000";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("quizVerseUser") || "null");
    } catch (err) {
        return null;
    }
}

function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "QV";
    }
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
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
            window.location.href = "quizverse-auth.html";
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

bindLogout();
applySidebarUser(getStoredUser());

const currentPage = (window.location.pathname.split("/").pop() || "").toLowerCase();

if (currentPage !== "index.html") {
    document.querySelector(".continue-btn")?.addEventListener("click", () => {
        window.location.href = "index.html";
    });
}
