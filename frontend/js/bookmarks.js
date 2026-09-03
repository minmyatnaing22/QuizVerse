function bookmarkList() {
    return document.getElementById("bookmark-rows");
}

function bookmarkCountPill() {
    return document.getElementById("bookmark-count-pill");
}

function startBookmarksPage() {
    const user = getStoredUser();
    const list = bookmarkList();

    if (!user || !user.token) {
        if (list) {
            list.innerHTML = emptyRow("Log in to see saved questions", "Bookmarks are stored on your account");
        }
        return;
    }

    loadBookmarks();
}

function emptyRow(title, subtitle) {
    return `
        <div class="table-row bookmark-row">
            <span></span>
            <span class="user-cell"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle || "")}</small></span>
            <span></span>
            <span></span>
        </div>
    `;
}

function loadBookmarks() {
    const list = bookmarkList();

    fetch(API + "/bookmarks", {
        headers: authHeaders()
    })
        .then((response) => {
            if (response.status === 401) {
                throw new Error("Log in to see saved questions");
            }
            if (!response.ok) {
                throw new Error("Failed to load bookmarks");
            }
            return response.json();
        })
        .then((rows) => {
            renderBookmarks(rows);
        })
        .catch((err) => {
            if (list) {
                list.innerHTML = emptyRow(err.message || "Unable to load bookmarks", "");
            }
        });
}

function renderBookmarks(rows) {
    const list = bookmarkList();
    const countPill = bookmarkCountPill();

    if (!list) {
        return;
    }

    const items = rows || [];
    if (countPill) {
        countPill.textContent = items.length + " saved";
    }

    if (!items.length) {
        list.innerHTML = emptyRow("No bookmarks yet", "Save a question from any quiz");
        return;
    }

    list.innerHTML = items.map((row) => {
        const href = "quiz.html?chapter_id=" + encodeURIComponent(row.chapter_id) +
            "&type=" + encodeURIComponent(row.question_type) +
            "&focus=" + encodeURIComponent(row.question_id);
        const chapter = row.chapter_number != null
            ? "Ch " + row.chapter_number + ": " + (row.chapter_name || "")
            : (row.chapter_name || "");
        const preview = String(row.question_text || "");
        const short = preview.length > 90 ? preview.slice(0, 87) + "…" : preview;

        return `
            <div class="table-row bookmark-row">
                <span class="user-cell"><strong>${escapeHtml(row.subject_name || "")}</strong><small>${escapeHtml(chapter)}</small></span>
                <span>${escapeHtml(short)}</span>
                <span>${escapeHtml(typeLabel(row.question_type))}</span>
                <span>
                    <a class="back-link" href="${href}">Practice</a>
                    <button type="button" class="bookmark-remove" data-question-id="${Number(row.question_id)}">Remove</button>
                </span>
            </div>
        `;
    }).join("");
}

const list = bookmarkList();

if (list) {
    list.addEventListener("click", (event) => {
        const button = event.target.closest(".bookmark-remove");
        if (!button) {
            return;
        }

        const questionId = Number(button.getAttribute("data-question-id"));
        if (!questionId) {
            return;
        }

        button.disabled = true;

        fetch(API + "/bookmarks/" + encodeURIComponent(questionId), {
            method: "DELETE",
            headers: authHeaders()
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Could not remove bookmark");
                }
                loadBookmarks();
            })
            .catch(() => {
                button.disabled = false;
            });
    });
}

if (window.quizVerseSessionReady) {
    startBookmarksPage();
} else {
    document.addEventListener("quizverse-session-ready", startBookmarksPage);
}
