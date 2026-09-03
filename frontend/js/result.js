const stored = sessionStorage.getItem("quizVerseResult");

if (!stored) {
    document.getElementById("page-title").textContent = "No result found";
    document.getElementById("page-description").textContent =
        "Submit a quiz first to see your score.";
} else {
    renderResult(JSON.parse(stored));
}


function renderResult(payload) {

    const result = payload.result || {};
    const reviews = result.reviews || [];

    const isExam = String(payload.mode || result.mode || "").toUpperCase() === "EXAM";

    const chapterNumber = payload.chapter_number;
    const chapterName = payload.chapter_name || "";
    const subjectName = payload.subject_name || "QuizVerse";

    const title = chapterNumber != null && chapterName
        ? `Chapter ${chapterNumber}: ${chapterName}`
        : (isExam ? "Exam Result" : "Quiz Result");

    document.getElementById("page-title").textContent = title + (isExam ? " — Exam Mode" : " Result");
    document.getElementById("page-description").textContent = isExam
        ? "Exam Mode complete. Review your score and answers."
        : "Review your score and answers.";
    document.title = "QuizVerse | " + title + (isExam ? " Exam" : " Result");

    const studentMeta = document.getElementById("student-meta");
    if (studentMeta) {
        studentMeta.textContent = isExam
            ? subjectName + " Exam"
            : subjectName + " Practice";
    }

    const subjectNav = document.getElementById("subject-nav-label");
    const backLink = document.getElementById("back-to-subject");
    const continueBtn = document.getElementById("continue-btn");
    const subjectHref = isExam
        ? "exam.html"
        : (payload.subject_name
            ? `subject/${payload.subject_name.toLowerCase()}.html`
            : "index.html");

    if (subjectNav) {
        subjectNav.textContent = isExam ? "Exam Mode" : subjectName;
    }
    if (backLink) {
        backLink.href = isExam && payload.subject_id
            ? "exam.html?subject_id=" + encodeURIComponent(payload.subject_id)
            : subjectHref;
    }
    if (continueBtn) {
        continueBtn.textContent = isExam ? "Back to Exam Subjects" : "▶ Continue Practice";
        continueBtn.addEventListener("click", () => {
            window.location.href = isExam ? "exam.html" : subjectHref;
        });
        if (isExam && payload.subject_id && payload.type) {
            const retake = document.createElement("button");
            retake.className = "continue-btn";
            retake.style.marginTop = "8px";
            retake.textContent = "Retake Exam";
            retake.addEventListener("click", () => {
                window.location.href = "exam-take.html?subject_id=" +
                    encodeURIComponent(payload.subject_id) +
                    "&type=" + encodeURIComponent(payload.type);
            });
            continueBtn.parentNode.insertBefore(retake, continueBtn.nextSibling);
        }
    }

    const total = Number(result.total_questions) || 0;
    const correct = Number(result.correct_answers) || 0;
    const incorrect = Number(result.wrong_answers) || 0;
    const skipped = Number(result.skipped_answers) ||
        reviews.filter(item => item.skipped).length;
    const percent = Math.round(Number(result.percentage) || 0);

    document.getElementById("score-percent").textContent = percent + "%";
    document.getElementById("score-sub").textContent =
        `${correct} correct out of ${total}`;
    document.getElementById("correct-count").textContent = String(correct);
    document.getElementById("incorrect-count").textContent = String(incorrect);
    document.getElementById("overview-correct").textContent = String(correct);
    document.getElementById("overview-incorrect").textContent = String(incorrect);
    document.getElementById("overview-skipped").textContent = String(skipped);

    const list = document.getElementById("question-list");
    list.innerHTML = "";

    reviews.forEach((item, index) => {

        const card = document.createElement("div");
        const statusClass = item.skipped
            ? "incorrect"
            : item.is_correct
                ? "correct"
                : "incorrect";

        card.className = "question-card " + statusClass;

        const badgeText = item.skipped
            ? "Skipped"
            : item.is_correct
                ? "Correct"
                : "Incorrect";

        const selected = item.selected_answer || "—";
        const correctAnswer = item.correct_answer || "—";
        const answerClass = item.is_correct
            ? "correct-answer"
            : "wrong-answer";

        card.innerHTML = `
            <div class="q-head">
                <span class="q-num">Question ${item.question_number || index + 1}</span>
                <span class="status-badge ${statusClass}">${badgeText}</span>
            </div>
            <p></p>
            <div class="answer-row">
                <span><strong>Your answer:</strong> ${escapeHtml(selected)}</span>
                <span class="${answerClass}"><strong>Correct answer:</strong> ${escapeHtml(correctAnswer)}</span>
            </div>
        `;

        card.querySelector("p").textContent = item.question_text || "";
        list.appendChild(card);

    });

    if (typeof showAchievementUnlocks === "function") {
        showAchievementUnlocks(result.newly_unlocked || payload.newly_unlocked || []);
    }

}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}
