const params = new URLSearchParams(window.location.search);

const chapterId = params.get("chapter_id");
const questionType = params.get("type");

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
        `${typeName} Quiz`;

    pageDescription.textContent =
        `Practice ${typeName} questions from this chapter.`;

    quizDescription.textContent =
        questions.length === 0
            ? "No questions available for this quiz."
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
        studentMeta.textContent = `${subjectName} Practice`;
    }

    const backLink = document.getElementById("back-to-chapters");
    if (backLink && first?.subject_name) {
        backLink.href =
            `subject/${first.subject_name.toLowerCase()}.html`;
    }

    document.title = `QuizVerse | ${pageTitle.textContent}`;

}


function displayQuestions(questions) {

    questionsContainer.innerHTML = "";

    if (questions.length === 0) {

        questionsContainer.innerHTML =
            "<p>No questions available for this quiz.</p>";
        setSubmitEnabled(false);
        return;
    }

    setSubmitEnabled(true, "Submit Answers");

    questions.forEach((question, index) => {

        const card =
            document.createElement("article");

        card.classList.add("quiz-card");


        if (questionType === "MCQ" || questionType === "TRUE_FALSE") {

            card.innerHTML = createChoiceQuestion(question, index);

        }

        else if (questionType === "BLANK") {

            card.innerHTML = createBlank(question, index);

        }


        questionsContainer.appendChild(card);

    });

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
        <div class="quiz-question">
            <span>${index + 1}.</span>
            ${quizEscape(question.question_text)}
        </div>

        <div class="option-list">
            ${optionsHTML}
        </div>
    `;

}


function createBlank(question, index) {

    return `
        <div class="quiz-question">
            <span>${index + 1}.</span>
            ${quizEscape(question.question_text)}
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
                    chapter_number: first?.chapter_number,
                    chapter_name: first?.chapter_name,
                    subject_name: first?.subject_name,
                    result
                }));

                window.location.href = "result.html";

            })

            .catch(() => {

                submitting = false;
                setSubmitEnabled(true, "Submit Answers");

                quizDescription.textContent =
                    "Unable to submit quiz.";

            });

    });

}
