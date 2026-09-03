const content = document.getElementById("daily-content");

let dailyQuestions = [];
let dailyIndex = 0;
let dailyAnswers = {};
let submitting = false;

const user = typeof getStoredUser === "function" ? getStoredUser() : null;

if (!user || !user.token) {
    renderLogin();
} else {
    loadDailyChallenge();
}

function renderLogin() {
    content.innerHTML =
        "<section class='daily-card'>" +
        "<h3>Log in to play Daily Challenge</h3>" +
        "<p>Your attempt, XP, and streak are saved to your account. Guests cannot earn the daily reward.</p>" +
        "<p><a class='daily-login-btn' href='quizverse-auth.html'>Go to login</a></p>" +
        "</section>";
}

function loadDailyChallenge() {
    content.innerHTML = "<p class='exam-muted'>Loading today's challenge...</p>";

    fetch(API + "/daily-challenge", {
        headers: authHeaders()
    })
        .then((response) => {
            if (response.status === 401) {
                renderLogin();
                throw new Error("login");
            }
            if (!response.ok) {
                return response.json().then((data) => {
                    throw new Error(data.error || "Failed to load Daily Challenge");
                });
            }
            return response.json();
        })
        .then((data) => {
            if (!data) {
                return;
            }
            if (data.completed) {
                renderCompleted(data);
                return;
            }
            dailyQuestions = data.questions || [];
            dailyIndex = 0;
            dailyAnswers = {};
            if (!dailyQuestions.length) {
                content.innerHTML = "<p class='daily-error'>Not enough questions are available for Daily Challenge.</p>";
                return;
            }
            renderQuiz(data);
        })
        .catch((err) => {
            if (String(err.message) === "login") {
                return;
            }
            content.innerHTML = "<p class='daily-error'>" +
                escapeHtml(err.message || "Unable to load Daily Challenge.") +
                "</p>";
        });
}

function renderCompleted(data) {
    const percent = Math.round(Number(data.percentage) || 0);
    const xp = Number(data.xp_earned) || 0;
    const correct = Number(data.correct_answers) || 0;
    const total = Number(data.total_questions) || 0;
    const date = data.challenge_date || "";
    const note = data.already_completed
        ? "You already finished today's challenge. XP was not awarded again."
        : "XP has been added to your account.";

    content.innerHTML =
        "<section class='daily-card'>" +
        "<h3>Today's Challenge Completed</h3>" +
        "<p>" + escapeHtml(note) + "</p>" +
        "<div class='daily-meta'>" +
            "<span>" + escapeHtml(date) + "</span>" +
            "<span>" + total + " questions</span>" +
        "</div>" +
        "<div class='daily-result-grid'>" +
            "<div><strong>" + percent + "%</strong>Score</div>" +
            "<div><strong>" + correct + "/" + total + "</strong>Correct</div>" +
            "<div><strong>" + xp + "</strong>XP earned</div>" +
        "</div>" +
        "</section>";

    if (typeof loadSharedUserData === "function") {
        loadSharedUserData();
    }
}

function answeredCount() {
    return dailyQuestions.filter((question) => {
        const value = dailyAnswers[question.id];
        return value != null && String(value).trim() !== "";
    }).length;
}

function progressText(question) {
    return "Question " + (dailyIndex + 1) + " of " + dailyQuestions.length +
        " · Answered " + answeredCount() + "/" + dailyQuestions.length +
        (question && question.subject_name ? " · " + question.subject_name : "") +
        (question ? " · " + typeLabel(question.question_type) : "");
}

function renderQuiz(data) {
    content.innerHTML =
        "<section class='daily-card daily-take-wrap'>" +
        "<div class='daily-meta'>" +
            "<span>" + escapeHtml(data.challenge_date || "") + "</span>" +
            "<span>" + (data.total_questions || dailyQuestions.length) + " questions</span>" +
            "<span>Mixed subjects</span>" +
        "</div>" +
        "<div class='daily-progress' id='daily-progress'></div>" +
        "<div id='daily-question'></div>" +
        "<div class='daily-nav'>" +
            "<button type='button' id='daily-prev'>Previous</button>" +
            "<button type='button' id='daily-next'>Next</button>" +
            "<button type='button' class='submit-daily-btn' id='daily-submit'>Submit Challenge</button>" +
        "</div>" +
        "</section>";

    document.getElementById("daily-prev").addEventListener("click", () => {
        if (dailyIndex > 0) {
            dailyIndex -= 1;
            renderQuestion();
        }
    });
    document.getElementById("daily-next").addEventListener("click", () => {
        if (dailyIndex < dailyQuestions.length - 1) {
            dailyIndex += 1;
            renderQuestion();
        }
    });
    document.getElementById("daily-submit").addEventListener("click", submitDaily);
    renderQuestion();
}

function renderQuestion() {
    const question = dailyQuestions[dailyIndex];
    const questionBox = document.getElementById("daily-question");
    const progressEl = document.getElementById("daily-progress");
    const prevBtn = document.getElementById("daily-prev");
    const nextBtn = document.getElementById("daily-next");
    if (!question || !questionBox) {
        return;
    }

    if (progressEl) {
        progressEl.textContent = progressText(question);
    }
    if (prevBtn) {
        prevBtn.disabled = dailyIndex === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = dailyIndex >= dailyQuestions.length - 1;
    }

    const saved = dailyAnswers[question.id] || "";

    if (question.question_type === "BLANK") {
        questionBox.innerHTML =
            "<article class='quiz-card'>" +
                "<div class='quiz-question'><span>" + (dailyIndex + 1) + ".</span> " +
                escapeHtml(question.question_text) + "</div>" +
                "<label class='answer-field'><span>Answer</span>" +
                "<input type='text' id='daily-input' placeholder='Type your answer' value='" +
                escapeHtml(saved) + "'></label>" +
            "</article>";
        const input = document.getElementById("daily-input");
        input?.addEventListener("input", () => {
            dailyAnswers[question.id] = input.value;
            if (progressEl) {
                progressEl.textContent = progressText(question);
            }
        });
        return;
    }

    const optionsHTML = (question.options || []).map((option) => {
        const checked = saved === option.label ? " checked" : "";
        return (
            "<label class='option-label'>" +
            "<input type='radio' name='daily-option' value='" + escapeHtml(option.label) + "'" + checked + ">" +
            "<span>" + escapeHtml(option.label) + ". " + escapeHtml(option.text) + "</span>" +
            "</label>"
        );
    }).join("");

    questionBox.innerHTML =
        "<article class='quiz-card'>" +
            "<div class='quiz-question'><span>" + (dailyIndex + 1) + ".</span> " +
            escapeHtml(question.question_text) + "</div>" +
            "<div class='option-list'>" + optionsHTML + "</div>" +
        "</article>";

    questionBox.querySelectorAll("input[name='daily-option']").forEach((input) => {
        input.addEventListener("change", () => {
            dailyAnswers[question.id] = input.value;
            if (progressEl) {
                progressEl.textContent = progressText(question);
            }
        });
    });
}

function submitDaily() {
    if (submitting || !dailyQuestions.length) {
        return;
    }

    const done = answeredCount();
    const ok = window.confirm(
        "You have answered " + done + " of " + dailyQuestions.length +
        " questions.\nSubmit today's Daily Challenge?"
    );
    if (!ok) {
        return;
    }

    const answers = dailyQuestions.map((question) => ({
        question_id: Number(question.id),
        selected_answer: dailyAnswers[question.id] ? String(dailyAnswers[question.id]) : ""
    }));

    submitting = true;
    const submitBtn = document.getElementById("daily-submit");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
    }

    fetch(API + "/daily-challenge/submit", {
        method: "POST",
        headers: Object.assign(
            { "Content-Type": "application/json" },
            authHeaders()
        ),
        body: JSON.stringify({ answers })
    })
        .then((response) => {
            if (!response.ok) {
                return response.json().then((data) => {
                    throw new Error(data.error || "Failed to submit Daily Challenge");
                });
            }
            return response.json();
        })
        .then((result) => {
            renderCompleted(result);
            if (typeof showAchievementUnlocks === "function") {
                showAchievementUnlocks(result.newly_unlocked);
            }
        })
        .catch((err) => {
            submitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Challenge";
            }
            alert(err.message || "Unable to submit Daily Challenge.");
        });
}
