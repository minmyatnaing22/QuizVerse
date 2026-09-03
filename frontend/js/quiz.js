const params = new URLSearchParams(window.location.search);

const chapterId = params.get("chapter_id");
const questionType = params.get("type");
const quizMode = String(params.get("mode") || "practice").toLowerCase() === "exam"
    ? "EXAM"
    : "PRACTICE";
const isExamMode = quizMode === "EXAM";

const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");

const quizTitle = document.getElementById("quiz-title");
const quizDescription = document.getElementById("quiz-description");
const quizPanel = document.getElementById("quiz-panel");

const questionsContainer =
    document.getElementById("questions-container");

const quizForm =
    document.getElementById("quiz-form");

const submitBtn = quizForm
    ? quizForm.querySelector(".submit-btn")
    : null;

const validTypes = ["MCQ", "TRUE_FALSE", "BLANK"];

let loadedQuestions = [];
let submitting = false;
const focusQuestionId = Number(params.get("focus")) || null;
let bookmarkedIds = {};

function quizEscape(value) {
    if (typeof escapeHtml === "function") {
        return escapeHtml(value);
    }
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function setSubmitEnabled(enabled, label) {
    if (!submitBtn) {
        return;
    }
    submitBtn.hidden = !enabled;
    submitBtn.disabled = !enabled;
    if (label) {
        submitBtn.textContent = label;
    }
}


if (!chapterId || !questionType) {

    questionsContainer.innerHTML =
        "<p>Invalid quiz URL.</p>";
    setSubmitEnabled(false);

} else if (!validTypes.includes(questionType)) {

    questionsContainer.innerHTML =
        "<p>Invalid question type.</p>";
    setSubmitEnabled(false);

} else {

    loadQuiz();

}


function loadQuiz() {

    fetch(
        `http://localhost:3000/quiz?chapter_id=${encodeURIComponent(chapterId)}&type=${encodeURIComponent(questionType)}`
    )

        .then(response => {

            if (!response.ok) {
                throw new Error("Failed to load quiz");
            }

            return response.json();

        })

        .then(questions => {

            loadedQuestions = questions;

            setupPage(questions);

            displayQuestions(questions);

            loadBookmarkStates(questions);

        })

        .catch(() => {

            questionsContainer.innerHTML =
                "<p>Unable to load questions.</p>";
            setSubmitEnabled(false);

        });

}

function setupPage(questions) {

    let typeName;

    if (questionType === "MCQ") {
        typeName = "MCQ";
    }
    else if (questionType === "TRUE_FALSE") {
        typeName = "True / False";
    }
    else if (questionType === "BLANK") {
        typeName = "Fill in the Blank";
    }
    else {
        typeName = questionType;
    }

    const first = questions[0];
    const subjectName = first?.subject_name || "QuizVerse";
    const chapterNumber = first?.chapter_number;
    const chapterName = first?.chapter_name || "";

    if (chapterNumber != null && chapterName) {
        pageTitle.textContent =
            `Chapter ${chapterNumber}: ${chapterName}`;
    }
    else if (chapterNumber != null) {
        pageTitle.textContent =
            `Chapter ${chapterNumber}`;
    }
    else {
        pageTitle.textContent = "Quiz";
    }

    quizTitle.textContent =
        isExamMode ? `${typeName} Exam` : `${typeName} Quiz`;

    pageDescription.textContent = isExamMode
        ? `Exam Mode: answer all ${typeName} questions. Results appear only after you submit.`
        : `Practice ${typeName} questions from this chapter.`;

    quizDescription.textContent =
        questions.length === 0
            ? "No questions available for this quiz."
            : isExamMode
                ? `Answer all ${questions.length} questions, then submit the exam. Correctness is hidden until then.`
                : `Answer all ${questions.length} questions below.`;

    if (quizPanel) {
        quizPanel.classList.remove("mcq-panel", "tf-panel", "blank-panel");

        if (questionType === "MCQ") {
            quizPanel.classList.add("mcq-panel");
        }
        else if (questionType === "TRUE_FALSE") {
            quizPanel.classList.add("tf-panel");
        }
        else {
            quizPanel.classList.add("blank-panel");
        }
    }

    const studentMeta = document.getElementById("student-meta");
    if (studentMeta) {
        studentMeta.textContent = isExamMode
            ? `${subjectName} Exam`
            : `${subjectName} Practice`;
    }

    const backLink = document.getElementById("back-to-chapters");
    if (backLink && first?.subject_name) {
        backLink.href =
            `subject/${first.subject_name.toLowerCase()}.html`;
    }

    document.title = `QuizVerse | ${pageTitle.textContent}${isExamMode ? " Exam" : ""}`;

}


function displayQuestions(questions) {

    questionsContainer.innerHTML = "";

    if (questions.length === 0) {

        questionsContainer.innerHTML =
            "<p>No questions available for this quiz.</p>";
        setSubmitEnabled(false);
        return;
    }

    setSubmitEnabled(true, isExamMode ? "Submit Exam" : "Submit Answers");

    questions.forEach((question, index) => {

        const card =
            document.createElement("article");

        card.classList.add("quiz-card");
        card.setAttribute("data-question-id", String(question.id));

        if (focusQuestionId && Number(question.id) === focusQuestionId) {
            card.classList.add("focused");
        }


        if (questionType === "MCQ" || questionType === "TRUE_FALSE") {

            card.innerHTML = createChoiceQuestion(question, index);

        }

        else if (questionType === "BLANK") {

            card.innerHTML = createBlank(question, index);

        }


        questionsContainer.appendChild(card);

    });

    if (focusQuestionId) {
        const focused = questionsContainer.querySelector(
            '.quiz-card[data-question-id="' + focusQuestionId + '"]'
        );
        if (focused) {
            focused.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

}


function createChoiceQuestion(question, index) {

    const optionsHTML =
        (question.options || []).map(option => {

            return `
                <label class="option-label">
                    <input
                        type="radio"
                        name="q${question.id}"
                        value="${quizEscape(option.label)}"
                    >

                    <span>
                        ${quizEscape(option.label)}.
                        ${quizEscape(option.text)}
                    </span>
                </label>
            `;

        }).join("");


    return `
        <div class="quiz-question-head">
            <div class="quiz-question">
                <span>${index + 1}.</span>
                ${quizEscape(question.question_text)}
            </div>
            ${bookmarkButton(question.id)}
        </div>

        <div class="option-list">
            ${optionsHTML}
        </div>
    `;

}


function createBlank(question, index) {

    return `
        <div class="quiz-question-head">
            <div class="quiz-question">
                <span>${index + 1}.</span>
                ${quizEscape(question.question_text)}
            </div>
            ${bookmarkButton(question.id)}
        </div>

        <label class="answer-field">

            <span>Answer</span>

            <input
                type="text"
                name="q${question.id}"
                placeholder="Type your answer"
            >

        </label>
    `;

}

function bookmarkButton(questionId) {
    const saved = !!bookmarkedIds[questionId];
    return `
        <button
            type="button"
            class="bookmark-btn${saved ? " saved" : ""}"
            data-question-id="${questionId}"
            aria-pressed="${saved ? "true" : "false"}"
        >
            ${saved ? "Saved" : "Save"}
        </button>
    `;
}

function setBookmarkButtonState(button, saved) {
    if (!button) {
        return;
    }
    button.classList.toggle("saved", saved);
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    button.textContent = saved ? "Saved" : "Save";
}

function loadBookmarkStates(questions) {
    const user = typeof getStoredUser === "function" ? getStoredUser() : null;
    if (!user || !user.token || !questions.length) {
        return;
    }

    fetch("http://localhost:3000/bookmarks", {
        headers: typeof authHeaders === "function" ? authHeaders() : {}
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("bookmarks failed");
            }
            return response.json();
        })
        .then((rows) => {
            bookmarkedIds = {};
            (rows || []).forEach((row) => {
                bookmarkedIds[row.question_id] = true;
            });
            questionsContainer.querySelectorAll(".bookmark-btn").forEach((button) => {
                const id = Number(button.getAttribute("data-question-id"));
                setBookmarkButtonState(button, !!bookmarkedIds[id]);
            });
        })
        .catch(() => {});
}

if (questionsContainer) {
    questionsContainer.addEventListener("click", function (event) {
        const button = event.target.closest(".bookmark-btn");
        if (!button) {
            return;
        }

        const user = typeof getStoredUser === "function" ? getStoredUser() : null;
        if (!user || !user.token) {
            button.textContent = "Log in to save";
            return;
        }

        const questionId = Number(button.getAttribute("data-question-id"));
        if (!questionId || button.disabled) {
            return;
        }

        const currentlySaved = button.classList.contains("saved");
        button.disabled = true;

        const request = currentlySaved
            ? fetch("http://localhost:3000/bookmarks/" + encodeURIComponent(questionId), {
                method: "DELETE",
                headers: authHeaders()
            })
            : fetch("http://localhost:3000/bookmarks", {
                method: "POST",
                headers: Object.assign(
                    { "Content-Type": "application/json" },
                    authHeaders()
                ),
                body: JSON.stringify({ question_id: questionId })
            });

        request
            .then((response) => {
                if (response.status === 401) {
                    throw new Error("login");
                }
                if (!response.ok) {
                    throw new Error("bookmark failed");
                }
                const saved = !currentlySaved;
                bookmarkedIds[questionId] = saved;
                setBookmarkButtonState(button, saved);
            })
            .catch(() => {
                button.textContent = currentlySaved ? "Saved" : "Save";
            })
            .finally(() => {
                button.disabled = false;
            });
    });
}

if (quizForm) {

    quizForm.addEventListener("submit", function (event) {

        event.preventDefault();

        if (submitting) {
            return;
        }

        if (!chapterId || !questionType || loadedQuestions.length === 0) {
            return;
        }

        const formData = new FormData(quizForm);

        const answers = loadedQuestions.map(question => {

            const selected = formData.get(`q${question.id}`);

            return {
                question_id: Number(question.id),
                selected_answer: selected ? String(selected) : ""
            };

        });

        const body = {
            chapter_id: Number(chapterId),
            type: questionType,
            mode: quizMode,
            answers
        };

        const headers = Object.assign(
            { "Content-Type": "application/json" },
            typeof authHeaders === "function" ? authHeaders() : {}
        );

        submitting = true;
        setSubmitEnabled(true, "Submitting...");
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        fetch("http://localhost:3000/quiz/submit", {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        })

            .then(response => {

                if (!response.ok) {
                    throw new Error("Failed to submit quiz");
                }

                return response.json();

            })

            .then(result => {

                const first = loadedQuestions[0];

                sessionStorage.setItem("quizVerseResult", JSON.stringify({
                    chapter_id: Number(chapterId),
                    type: questionType,
                    mode: quizMode,
                    chapter_number: first?.chapter_number,
                    chapter_name: first?.chapter_name,
                    subject_name: first?.subject_name,
                    result
                }));

                window.location.href = "result.html";

            })

            .catch(() => {

                submitting = false;
                setSubmitEnabled(true, isExamMode ? "Submit Exam" : "Submit Answers");

                quizDescription.textContent =
                    "Unable to submit quiz.";

            });

    });

}
