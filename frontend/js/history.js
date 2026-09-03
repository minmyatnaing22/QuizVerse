const user = getStoredUser();
const list = document.getElementById("history-rows");

if (!user || !user.token) {
    if (list) {
        list.innerHTML = `
            <div class="table-row">
                <span></span>
                <span class="user-cell"><strong>Log in to see practice history</strong><small>Your quiz attempts are saved to your account</small></span>
                <span></span><span></span><span></span><span></span>
            </div>
        `;
    }
} else {
    fetch(API + "/history", {
        headers: authHeaders()
    })
        .then((response) => {
            if (response.status === 401) {
                throw new Error("Log in to see practice history");
            }
            if (!response.ok) {
                throw new Error("Failed to load history");
            }
            return response.json();
        })
        .then((rows) => {
            renderHistory(rows);
        })
        .catch((err) => {
            console.error(err);
            if (list) {
                list.innerHTML = `
                    <div class="table-row">
                        <span></span>
                        <span class="user-cell"><strong>Unable to load history</strong></span>
                        <span></span><span></span><span></span><span></span>
                    </div>
                `;
            }
        });
}

function renderHistory(rows) {

    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = `
            <div class="table-row">
                <span></span>
                <span class="user-cell"><strong>No practice yet</strong><small>Finish a quiz to see it here</small></span>
                <span></span><span></span><span></span><span></span>
            </div>
        `;
        return;
    }

    list.innerHTML = rows.map((row) => {
        const percent = Math.round(Number(row.percentage) || 0);
        const chapter = row.chapter_number != null
            ? "Chapter " + row.chapter_number + ": " + (row.chapter_name || "")
            : (row.chapter_name || "");
        const when = formatDate(row.created_at);

        return `
            <div class="table-row">
                <span>${escapeHtml(when)}</span>
                <span>${escapeHtml(row.subject_name || "")}</span>
                <span>${escapeHtml(chapter)}</span>
                <span>${escapeHtml(typeLabel(row.question_type))}${String(row.mode || "").toUpperCase() === "EXAM" ? " · Exam" : String(row.mode || "").toUpperCase() === "DAILY" ? " · Daily" : ""}</span>
                <span>${Number(row.score) || 0}/${Number(row.total_questions) || 0}</span>
                <span>${percent}%</span>
            </div>
        `;
    }).join("");

}

function formatDate(value) {
    if (!value) {
        return "";
    }
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString();
}
