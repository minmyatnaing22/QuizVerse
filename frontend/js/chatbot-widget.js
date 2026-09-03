(function () {
    if (document.getElementById("qv-chatbot-root")) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const pageContext = {
        subject_id: parsePositiveId(params.get("subject_id")),
        chapter_id: parsePositiveId(params.get("chapter_id"))
    };
    applyStoredResultContext(pageContext);

    const context = { subject_id: null, chapter_id: null };
    const conversation = [];
    let lastQuestionId = null;
    let sending = false;
    let open = false;

    const root = document.createElement("div");
    root.id = "qv-chatbot-root";
    if (needsButtonClearance()) {
        root.classList.add("qv-chatbot-clearance");
    }
    root.innerHTML = `
        <div class="qv-chat-panel" id="qv-chat-panel" hidden>
            <div class="qv-chat-header">
                <div>
                    <strong>QuizVerse AI</strong>
                    <p id="qv-chat-context">Grade 12 study help</p>
                </div>
                <button type="button" class="qv-chat-close" id="qv-chat-close" aria-label="Close study assistant">×</button>
            </div>
            <div class="qv-chat-window" id="qv-chat-window"></div>
            <div class="qv-chat-status" id="qv-chat-status"></div>
            <div class="qv-chat-prompts">
                <button type="button" data-prompt="Explain this question">Explain this question</button>
                <button type="button" data-prompt="Give me a hint">Give me a hint</button>
                <button type="button" data-prompt="Why is this answer correct?">Why is this answer correct?</button>
                <button type="button" data-prompt="Explain the concept">Explain the concept</button>
                <button type="button" data-prompt="Give me a similar question">Give me a similar question</button>
            </div>
            <form class="qv-chat-form" id="qv-chat-form">
                <textarea id="qv-chat-input" maxlength="2000" placeholder="Ask something..." rows="1"></textarea>
                <button type="submit" id="qv-chat-send">Send</button>
            </form>
        </div>
        <button type="button" class="qv-chat-fab" id="qv-chat-fab" aria-label="Open QuizVerse study assistant" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
            </svg>
        </button>
    `;
    document.body.appendChild(root);

    const panel = document.getElementById("qv-chat-panel");
    const fab = document.getElementById("qv-chat-fab");
    const closeBtn = document.getElementById("qv-chat-close");
    const windowEl = document.getElementById("qv-chat-window");
    const formEl = document.getElementById("qv-chat-form");
    const inputEl = document.getElementById("qv-chat-input");
    const sendBtn = document.getElementById("qv-chat-send");
    const statusEl = document.getElementById("qv-chat-status");
    const contextEl = document.getElementById("qv-chat-context");

    if (typeof loadSharedChatSession === "function") {
        loadSharedChatSession(startFromSession);
    } else {
        startFromSession(null);
    }

    document.addEventListener("quizverse-chat-sync", (event) => {
        applySession(event.detail);
        renderConversation();
        loadContextLabel(context, contextEl);
    });

    fab.addEventListener("click", () => setOpen(!open));
    closeBtn.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && open) {
            setOpen(false);
        }
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

    root.querySelectorAll("[data-prompt]").forEach((button) => {
        button.addEventListener("click", () => {
            inputEl.value = button.getAttribute("data-prompt");
            if (open) {
                inputEl.focus();
            }
        });
    });

    function setOpen(nextOpen) {
        open = nextOpen;
        panel.hidden = !open;
        fab.setAttribute("aria-expanded", open ? "true" : "false");
        fab.setAttribute("aria-label", open ? "Close QuizVerse study assistant" : "Open QuizVerse study assistant");
        if (open) {
            inputEl.focus();
            windowEl.scrollTop = windowEl.scrollHeight;
        }
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
            body.subject_id = context.subject_id;
        }
        if (context.chapter_id) {
            body.chapter_id = context.chapter_id;
        }
        if (lastQuestionId) {
            body.question_id = lastQuestionId;
        }

        fetch(API + "/chatbot/message", {
            method: "POST",
            headers: Object.assign(
                { "Content-Type": "application/json" },
                typeof authHeaders === "function" ? authHeaders() : {}
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
                if (data.subject || data.chapter) {
                    contextEl.textContent = [data.subject, data.chapter].filter(Boolean).join(" · ");
                }
                statusEl.textContent = "";
            })
            .catch((err) => {
                addBubble(err.message || "The study assistant is unavailable right now.", "system");
                statusEl.textContent = "";
            })
            .finally(() => {
                sending = false;
                sendBtn.disabled = false;
                if (open) {
                    inputEl.focus();
                }
            });
    }

    function addBubble(text, type) {
        const bubble = document.createElement("div");
        bubble.className = "qv-chat-bubble " + type;
        bubble.textContent = text;
        windowEl.appendChild(bubble);
        windowEl.scrollTop = windowEl.scrollHeight;
    }

    function startFromSession(stored) {
        applySession(stored);
        renderConversation();
        resolvePageSubject(pageContext).then(() => {
            const nextContext = mergeChatContext(pageContext, context);
            context.subject_id = nextContext.subject_id;
            context.chapter_id = nextContext.chapter_id;
            saveChatSession();
            loadContextLabel(context, contextEl);
        });
    }

    function applySession(stored) {
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

    function renderConversation() {
        windowEl.innerHTML = "";
        if (conversation.length) {
            conversation.forEach((item) => {
                addBubble(item.content, item.role === "assistant" ? "ai" : "user");
            });
            return;
        }
        addBubble("Hi! I'm your Grade 12 Study Assistant. Ask me about subjects, chapters, formulas, or difficult questions.", "system");
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

    function isChatTurn(item) {
        return item &&
            (item.role === "user" || item.role === "assistant") &&
            String(item.content || "").trim();
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

    function parsePositiveId(value) {
        const id = Number(value);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    function needsButtonClearance() {
        const page = typeof currentPageName === "function" ? currentPageName() : "";
        return page === "quiz.html" || page === "exam-take.html" || page === "daily-challenge.html";
    }

    function applyStoredResultContext(target) {
        const page = typeof currentPageName === "function" ? currentPageName() : "";
        if (page !== "result.html") {
            return;
        }
        try {
            const payload = JSON.parse(sessionStorage.getItem("quizVerseResult") || "null");
            if (!payload) {
                return;
            }
            if (!target.chapter_id) {
                target.chapter_id = parsePositiveId(payload.chapter_id);
            }
            if (!target.subject_id) {
                target.subject_id = parsePositiveId(payload.subject_id);
            }
        } catch (err) {}
    }

    function resolvePageSubject(target) {
        if (target.subject_id || target.chapter_id) {
            return Promise.resolve(target);
        }

        const file = (typeof currentPageName === "function" ? currentPageName() : "")
            .replace(/\.html$/i, "")
            .toLowerCase();
        const known = ["myanmar", "english", "mathematics", "physics", "chemistry", "biology"];
        if (!known.includes(file) || typeof API === "undefined") {
            return Promise.resolve(target);
        }

        return fetch(API + "/subjects")
            .then((response) => response.json())
            .then((subjects) => {
                const subject = (subjects || []).find((row) =>
                    String(row.name || "").toLowerCase() === file
                );
                if (subject) {
                    target.subject_id = parsePositiveId(subject.id);
                }
                return target;
            })
            .catch(() => target);
    }

    function loadContextLabel(target, labelEl) {
        if (!labelEl) {
            return;
        }
        if (!target.subject_id && !target.chapter_id) {
            labelEl.textContent = "Grade 12 study help";
            return;
        }
        if (typeof API === "undefined") {
            return;
        }

        const subjectFetch = target.subject_id
            ? fetch(API + "/subjects").then((response) => response.json())
            : Promise.resolve([]);

        subjectFetch
            .then((subjects) => {
                const subject = (subjects || []).find((row) =>
                    String(row.id) === String(target.subject_id)
                );
                const subjectName = subject ? subject.name : "";

                if (!target.chapter_id) {
                    labelEl.textContent = subjectName || "This subject";
                    return;
                }

                if (!target.subject_id) {
                    labelEl.textContent = subjectName || "This chapter";
                    return;
                }

                return fetch(API + "/chapters?subject_id=" + encodeURIComponent(target.subject_id))
                    .then((response) => response.json())
                    .then((chapters) => {
                        const chapter = (chapters || []).find((row) =>
                            String(row.id) === String(target.chapter_id)
                        );
                        const chapterName = chapter
                            ? ("Chapter " + chapter.chapter_number + ": " + (chapter.chapter_name || ""))
                            : "This chapter";
                        labelEl.textContent = subjectName
                            ? subjectName + " · " + chapterName.trim()
                            : chapterName.trim();
                    });
            })
            .catch(() => {
                labelEl.textContent = "Grade 12 study help";
            });
    }
})();
