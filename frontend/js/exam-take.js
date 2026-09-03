const params = new URLSearchParams(window.location.search);
const subjectId = Number(params.get("subject_id"));
const examType = String(params.get("type") || "").toUpperCase();

const questionBox = document.getElementById("exam-question");
const progressEl = document.getElementById("exam-progress");
const prevBtn = document.getElementById("exam-prev");
const nextBtn = document.getElementById("exam-next");
const submitBtn = document.getElementById("exam-submit");

let examQuestions = [];
let examIndex = 0;
let examAnswers = {};
let examMeta = { subject_name: "", type: examType };
let submitting = false;

if (!subjectId || !["MCQ", "TRUE_FALSE", "BLANK"].includes(examType)) {
    if (questionBox) {
        questionBox.innerHTML = "<p>Invalid exam URL.</p>";
    }
} else {
    loadExam();
}

function loadExam() {
    fetch(
        API + "/exam/questions?subject_id=" + encodeURIComponent(subjectId) +
        "&type=" + encodeURIComponent(examType)
    )
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to load exam");
            }
            return response.json();
        })
        .then((data) => {
            examQuestions = data.questions || [];
            examMeta.subject_name = data.subject && data.subject.name ? data.subject.name : "Exam";
            examMeta.type = data.type || examType;

            const pageTitle = document.getElementById("page-title");
            const pageDescription = document.getElementById("page-description");
            const quizTitle = document.getElementById("quiz-title");
            const studentMeta = document.getElementById("student-meta");

            if (pageTitle) {
                pageTitle.textContent = examMeta.subject_name + " Exam";
            }
            if (quizTitle) {
                quizTitle.textContent = typeLabel(examMeta.type) + " Exam Mode";
            }
            if (pageDescription) {
                pageDescription.textContent =
                    "Up to 15 random questions from all chapters. Correct answers are hidden until submit.";
            }
            if (studentMeta) {
                studentMeta.textContent = examMeta.subject_name + " Exam";
            }
            document.title = "QuizVerse | " + examMeta.subject_name + " Exam";

            if (!examQuestions.length) {
                questionBox.innerHTML = "<p>No questions are available for this exam.</p>";
                if (submitBtn) {
                    submitBtn.disabled = true;
                }
                return;
            }

            renderExamQuestion();
        })
        .catch(() => {
            if (questionBox) {
                questionBox.innerHTML = "<p>Unable to load exam questions.</p>";
            }
        });
}

function answeredCount() {
    return examQuestions.filter((question) => {
        const value = examAnswers[question.id];
        return value != null && String(value).trim() !== "";
    }).length;
}

function renderExamQuestion() {
    const question = examQuestions[examIndex];
    if (!question || !questionBox) {
        return;
    }

    if (progressEl) {
        progressEl.textContent =
            "Question " + (examIndex + 1) + " of " + examQuestions.length +
            " · Answered " + answeredCount() + "/" + examQuestions.length;
    }

    if (prevBtn) {
        prevBtn.disabled = examIndex === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = examIndex >= examQuestions.length - 1;
    }

    const saved = examAnswers[question.id] || "";

    if (question.question_type === "BLANK") {
        questionBox.innerHTML = `
            <article class="quiz-card">
                <div class="quiz-question">
                    <span>${examIndex + 1}.</span>
                    ${escapeHtml(question.question_text)}
                </div>
                <label class="answer-field">
                    <span>Answer</span>
                    <input type="text" id="exam-input" placeholder="Type your answer" value="${escapeHtml(saved)}">
                </label>
            </article>
        `;
        const input = document.getElementById("exam-input");
        input?.addEventListener("input", () => {
            examAnswers[question.id] = input.value;
            if (progressEl) {
                progressEl.textContent =
                    "Question " + (examIndex + 1) + " of " + examQuestions.length +
                    " · Answered " + answeredCount() + "/" + examQuestions.length;
            }
        });
        return;
    }

    const optionsHTML = (question.options || []).map((option) => {
        const checked = saved === option.label ? " checked" : "";
        return `
            <label class="option-label">
                <input type="radio" name="exam-option" value="${escapeHtml(option.label)}"${checked}>
                <span>${escapeHtml(option.label)}. ${escapeHtml(option.text)}</span>
            </label>
        `;
    }).join("");

    questionBox.innerHTML = `
        <article class="quiz-card">
            <div class="quiz-question">
                <span>${examIndex + 1}.</span>
                ${escapeHtml(question.question_text)}
            </div>
            <div class="option-list">${optionsHTML}</div>
        </article>
    `;

    questionBox.querySelectorAll('input[name="exam-option"]').forEach((input) => {
        input.addEventListener("change", () => {
            examAnswers[question.id] = input.value;
            if (progressEl) {
                progressEl.textContent =
                    "Question " + (examIndex + 1) + " of " + examQuestions.length +
                    " · Answered " + answeredCount() + "/" + examQuestions.length;
            }
        });
    });
}

prevBtn?.addEventListener("click", () => {
    if (examIndex > 0) {
        examIndex -= 1;
        renderExamQuestion();
    }
});

nextBtn?.addEventListener("click", () => {
    if (examIndex < examQuestions.length - 1) {
        examIndex += 1;
        renderExamQuestion();
    }
});

submitBtn?.addEventListener("click", () => {
    if (submitting || !examQuestions.length) {
        return;
    }

    const done = answeredCount();
    const ok = window.confirm(
        "You have answered " + done + " of " + examQuestions.length +
        " questions.\nAre you sure you want to submit?"
    );
    if (!ok) {
        return;
    }

    const answers = examQuestions.map((question) => ({
        question_id: Number(question.id),
        selected_answer: examAnswers[question.id] ? String(examAnswers[question.id]) : ""
    }));

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    fetch(API + "/exam/submit", {
        method: "POST",
        headers: Object.assign(
            { "Content-Type": "application/json" },
            authHeaders()
        ),
        body: JSON.stringify({
            subject_id: subjectId,
            type: examType,
            answers
        })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to submit exam");
            }
            return response.json();
        })
        .then((result) => {
            sessionStorage.setItem("quizVerseResult", JSON.stringify({
                mode: "EXAM",
                subject_id: subjectId,
                type: examType,
                subject_name: examMeta.subject_name,
                chapter_name: "Exam Mode",
                result
            }));
            window.location.href = "result.html";
        })
        .catch(() => {
            submitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Exam";
            alert("Unable to submit exam.");
        });
});
