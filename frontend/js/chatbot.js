const params = new URLSearchParams(window.location.search);
const pageContext = {
    subject_id: parsePositiveId(params.get("subject_id")),
    chapter_id: parsePositiveId(params.get("chapter_id"))
};
const context = { subject_id: null, chapter_id: null };
const conversation = [];
let lastQuestionId = null;
let sending = false;

const windowEl = document.getElementById("chat-window");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("chat-send");
const statusEl = document.getElementById("chat-status");
const contextEl = document.getElementById("chat-context");

if (typeof loadSharedChatSession === "function") {
    loadSharedChatSession(startChatFromSession);
} else {
    startChatFromSession(null);
}

document.addEventListener("quizverse-chat-sync", (event) => {
    applyChatSession(event.detail);
    renderChatConversation();
    loadContextLabel();
});

function startChatFromSession(stored) {
    applyChatSession(stored);
    renderChatConversation();
    loadContextLabel();
    saveChatSession();
}

function applyChatSession(stored) {
    conversation.splice(0, conversation.length);
    const turns = Array.isArray(stored && stored.conversation)
        ? stored.conversation.filter(isChatTurn)
        : [];
    turns.forEach((item) => {
        conversation.push({
            role: item.role === "assistant" ? "assistant" : "user",
            content: String(item.content || "")
        });
    });
    const next = mergeChatContext(pageContext, stored && stored.context);
    context.subject_id = next.subject_id;
    context.chapter_id = next.chapter_id;
    lastQuestionId = parsePositiveId(stored && stored.context && stored.context.question_id);
}

function renderChatConversation() {
    windowEl.innerHTML = "";
    if (conversation.length) {
        conversation.forEach((item) => {
            addBubble(item.content, item.role === "assistant" ? "ai" : "user");
        });
        return;
    }
    addBubble("Ask a Grade 12 question. I can explain topics, give examples, and offer hints.", "system");
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
        inputEl.value = button.getAttribute("data-prompt");
        inputEl.focus();
    });
});

formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
});

inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

function loadContextLabel() {
    const subjectId = context.subject_id;
    const chapterId = context.chapter_id;
    if (!subjectId && !chapterId) {
        contextEl.textContent = "General Grade 12 help. You can also open this page from a subject later.";
        return;
    }

    if (!subjectId) {
        contextEl.textContent = "Helping with the selected chapter.";
        return;
    }

    fetch(API + "/subjects")
        .then((response) => response.json())
        .then((subjects) => {
            const subject = (subjects || []).find((row) => String(row.id) === String(subjectId));
            const subjectName = subject ? subject.name : "this subject";
            if (!chapterId) {
                contextEl.textContent = "Currently helping with: " + subjectName;
                return;
            }
            return fetch(API + "/chapters?subject_id=" + encodeURIComponent(subjectId))
                .then((response) => response.json())
                .then((chapters) => {
                    const chapter = (chapters || []).find((row) => String(row.id) === String(chapterId));
                    const chapterName = chapter
                        ? (chapter.chapter_name || ("Chapter " + chapter.chapter_number))
                        : "this chapter";
                    contextEl.textContent = "Currently helping with: " + subjectName + " · " + chapterName;
                });
        })
        .catch(() => {
            contextEl.textContent = "Study assistant is ready.";
        });
}

function sendMessage() {
    const message = String(inputEl.value || "").trim();
    if (!message || sending) {
        return;
    }

    sending = true;
    sendBtn.disabled = true;
    statusEl.textContent = "Thinking...";
    addBubble(message, "user");
    conversation.push({ role: "user", content: message });
    saveChatSession();
    inputEl.value = "";

    const body = { message, history: conversation.slice(0, -1) };
    if (context.subject_id) {
        body.subject_id = Number(context.subject_id);
    }
    if (context.chapter_id) {
        body.chapter_id = Number(context.chapter_id);
    }
    if (lastQuestionId) {
        body.question_id = lastQuestionId;
    }

    fetch(API + "/chatbot/message", {
        method: "POST",
        headers: Object.assign(
            { "Content-Type": "application/json" },
            authHeaders()
        ),
        body: JSON.stringify(body)
    })
        .then((response) => {
            return response.text().then((text) => {
                let data = {};
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (parseErr) {
                    throw new Error("Unable to get a reply");
                }
                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Unable to get a reply");
                }
                return data;
            });
        })
        .then((data) => {
            addBubble(data.reply, "ai");
            conversation.push({ role: "assistant", content: data.reply });
            if (data.question_id) {
                lastQuestionId = Number(data.question_id);
            }
            saveChatSession();
            statusEl.textContent = "";
        })
        .catch((err) => {
            addBubble(err.message || "The study assistant is unavailable right now.", "system");
            statusEl.textContent = "";
        })
        .finally(() => {
            sending = false;
            sendBtn.disabled = false;
            inputEl.focus();
        });
}

function addBubble(text, type) {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + type;
    bubble.textContent = text;
    windowEl.appendChild(bubble);
    windowEl.scrollTop = windowEl.scrollHeight;
}

function parsePositiveId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function isChatTurn(item) {
    return item &&
        (item.role === "user" || item.role === "assistant") &&
        String(item.content || "").trim();
}

function saveChatSession() {
    const data = {
        conversation: conversation.map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: String(item.content || "")
        })).filter(isChatTurn),
        context: {
            subject_id: context.subject_id || null,
            chapter_id: context.chapter_id || null,
            question_id: lastQuestionId || null
        }
    };
    if (typeof writeChatSession === "function") {
        writeChatSession(data);
        return;
    }
    sessionStorage.setItem("quizVerseChatSession", JSON.stringify(data));
}

function mergeChatContext(page, previous) {
    const next = {
        subject_id: previous && previous.subject_id ? previous.subject_id : null,
        chapter_id: previous && previous.chapter_id ? previous.chapter_id : null
    };
    const pageSubject = page && page.subject_id ? page.subject_id : null;
    const pageChapter = page && page.chapter_id ? page.chapter_id : null;
    if (pageChapter && pageChapter !== next.chapter_id) {
        next.chapter_id = pageChapter;
        if (pageSubject) {
            next.subject_id = pageSubject;
        }
        return next;
    }
    if (pageSubject && pageSubject !== next.subject_id) {
        next.subject_id = pageSubject;
        next.chapter_id = pageChapter;
        return next;
    }
    if (pageSubject && !next.subject_id) {
        next.subject_id = pageSubject;
    }
    if (pageChapter && !next.chapter_id) {
        next.chapter_id = pageChapter;
    }
    return next;
}
