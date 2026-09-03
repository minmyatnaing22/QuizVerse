const feedEl = document.getElementById("discussion-feed");
const formEl = document.getElementById("discussion-form");
const inputEl = document.getElementById("discussion-message");
const subjectEl = document.getElementById("discussion-subject");
const statusEl = document.getElementById("discussion-status");

let lastMessageId = 0;
let pollTimer = null;

function escapeText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return "Just now";
    }
    return date.toLocaleString();
}

function renderMessage(row, appendOnly) {
    if (!row || !row.id) {
        return;
    }
    if (feedEl.querySelector('[data-message-id="' + row.id + '"]')) {
        return;
    }

    const current = getStoredUser() || {};
    const card = document.createElement("article");
    card.className = "discussion-message" + (String(current.id) === String(row.user_id) ? " is-you" : "");
    card.setAttribute("data-message-id", String(row.id));
    card.innerHTML = '' +
        '<div class="message-head">' +
            "<strong>" + escapeText(row.user_name || "Student") + "</strong>" +
            '<span class="message-time">' + escapeText(formatTime(row.created_at)) + "</span>" +
        "</div>" +
        '<div class="message-text">' + escapeText(row.message || "") + "</div>";

    feedEl.appendChild(card);
    lastMessageId = Math.max(lastMessageId, Number(row.id) || 0);
    if (!appendOnly) {
        feedEl.scrollTop = feedEl.scrollHeight;
    }
}

function loadSubjects() {
    return fetch(API + "/subjects")
        .then((response) => response.json())
        .then((rows) => {
            (rows || []).forEach((row) => {
                const option = document.createElement("option");
                option.value = row.id;
                option.textContent = row.name;
                subjectEl.appendChild(option);
            });
        });
}

function loadMessages(reset) {
    const subjectId = subjectEl.value;
    if (reset) {
        feedEl.innerHTML = "";
        lastMessageId = 0;
    }

    const params = new URLSearchParams();
    if (subjectId) {
        params.set("subject_id", subjectId);
    }
    if (!reset && lastMessageId) {
        params.set("since_id", String(lastMessageId));
    }

    statusEl.textContent = "Loading messages...";
    fetch(API + "/discussion/messages?" + params.toString(), {
        headers: authHeaders()
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Unable to load discussion");
            }
            return response.json();
        })
        .then((rows) => {
            const list = rows || [];
            if (reset && !list.length) {
                feedEl.innerHTML = '<article class="discussion-message"><div class="message-text">No messages yet. Start the conversation.</div></article>';
            } else {
                list.forEach((row) => renderMessage(row, !reset));
            }
            statusEl.textContent = subjectId ? "Live in selected subject room" : "Live in general discussion";
        })
        .catch((err) => {
            statusEl.textContent = err.message;
        });
}

function postMessage(message) {
    return fetch(API + "/discussion/messages", {
        method: "POST",
        headers: Object.assign({
            "Content-Type": "application/json"
        }, authHeaders()),
        body: JSON.stringify({
            subject_id: subjectEl.value || null,
            message
        })
    }).then((response) => response.text().then((text) => {
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            throw new Error("Unexpected server response");
        }
        if (!response.ok) {
            throw new Error(data.error || "Unable to send message");
        }
        return data;
    }));
}

formEl?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = String(inputEl.value || "").trim();
    if (!message) {
        return;
    }
    postMessage(message)
        .then((row) => {
            if (feedEl.children.length === 1 && !feedEl.querySelector("[data-message-id]")) {
                feedEl.innerHTML = "";
            }
            renderMessage(row, false);
            inputEl.value = "";
            statusEl.textContent = "Message sent";
        })
        .catch((err) => {
            statusEl.textContent = err.message;
        });
});

subjectEl?.addEventListener("change", () => {
    loadMessages(true);
});

loadSubjects()
    .then(() => loadMessages(true))
    .catch(() => {
        loadMessages(true);
    });

pollTimer = window.setInterval(() => {
    loadMessages(false);
}, 8000);
