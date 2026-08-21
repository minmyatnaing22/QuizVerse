const params = new URLSearchParams(window.location.search);

const chapterId = params.get("chapter_id");
const questionType = params.get("type");

console.log("Chapter ID:", chapterId);
console.log("Question Type:", questionType);


const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");

const quizTitle = document.getElementById("quiz-title");
const quizDescription = document.getElementById("quiz-description");

const questionsContainer =
    document.getElementById("questions-container");

const quizForm =
    document.getElementById("quiz-form");


if (!chapterId || !questionType) {

    questionsContainer.innerHTML =
        "<p>Invalid quiz URL.</p>";

} else {

    loadQuiz();

}


function loadQuiz() {

    fetch(
        `http://localhost:3000/quiz?chapter_id=${chapterId}`
    )

        .then(response => {

            if (!response.ok) {
                throw new Error("Failed to load quiz");
            }

            return response.json();

        })

        .then(quizData => {

            console.log("Quiz data:", quizData);

            // Only keep the requested question type
            const questions = quizData.filter(
                question =>
                    question.question_type === questionType
            );

            console.log("Filtered questions:", questions);

            setupPage(questions);

            displayQuestions(questions);

        })

        .catch(error => {

            console.error("Quiz error:", error);

            questionsContainer.innerHTML =
                "<p>Unable to load questions.</p>";

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


    pageTitle.textContent =
        `Mathematics Chapter ${chapterId}`;

    quizTitle.textContent =
        `${typeName} Quiz`;

    pageDescription.textContent =
        `Practice ${typeName} questions from this mathematics chapter.`;

    quizDescription.textContent =
        `Answer all ${questions.length} questions below.`;

}


function displayQuestions(questions) {

    questionsContainer.innerHTML = "";

    if (questions.length === 0) {

        questionsContainer.innerHTML =
            "<p>No questions available for this quiz.</p>";

        return;
    }


    questions.forEach((question, index) => {

        const card =
            document.createElement("article");

        card.classList.add("quiz-card");


        if (questionType === "MCQ") {

            card.innerHTML = createMCQ(question, index);

        }

        else if (questionType === "TRUE_FALSE") {

            card.innerHTML = createTrueFalse(question, index);

        }

        else if (questionType === "BLANK") {

            card.innerHTML = createBlank(question, index);

        }


        questionsContainer.appendChild(card);

    });

}


function createMCQ(question, index) {

    const optionsHTML =
        question.options.map(option => {

            return `
                <label class="option">
                    <input
                        type="radio"
                        name="q${question.id}"
                        value="${option.option_label}"
                    >

                    <span>
                        ${option.option_label}.
                        ${option.option_text}
                    </span>
                </label>
            `;

        }).join("");


    return `
        <div class="quiz-question">
            <span>${index + 1}.</span>
            ${question.question_text}
        </div>

        <div class="options">
            ${optionsHTML}
        </div>
    `;

}

function createTrueFalse(question, index) {

    return `
        <div class="quiz-question">
            <span>${index + 1}.</span>
            ${question.question_text}
        </div>

        <div class="options">

            <label class="option">
                <input
                    type="radio"
                    name="q${question.id}"
                    value="TRUE"
                >

                <span>True</span>
            </label>


            <label class="option">
                <input
                    type="radio"
                    name="q${question.id}"
                    value="FALSE"
                >

                <span>False</span>
            </label>

        </div>
    `;



    
}


function createBlank(question, index) {

    return `
        <div class="quiz-question">
            <span>${index + 1}.</span>
            ${question.question_text}
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


quizForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const formData =
        new FormData(quizForm);

    const answers = {};

    formData.forEach((value, key) => {

        answers[key] = value;

    });


    console.log("Answers:", answers);

});