const params = new URLSearchParams(window.location.search);
const subjectId = params.get("subject_id");

console.log("Subject ID:", subjectId);

fetch(`http://localhost:3000/chapters?subject_id=${subjectId}`)
    .then(response => response.json())
    .then(chapters => {

        console.log("Chapters from backend:");
        console.log(chapters);

        const mcqContainer =
            document.getElementById("mcq-chapters");

        const trueContainer =
            document.getElementById("true-chapters");

        const blankContainer =
            document.getElementById("blank-chapters");


        chapters.forEach(chapter => {

            console.log(
                `Chapter ${chapter.chapter_number}:`,
                chapter.question_types
            );


            // ==================================
            // MCQ
            // Show ALL chapters
            // ==================================

            if (mcqContainer) {

                const card = createChapterCard(
                    chapter,
                    "MCQ"
                );

                mcqContainer.appendChild(card);
            }


            // ==================================
            // TRUE / FALSE
            // Currently no Mathematics T/F
            // ==================================

            // Don't create cards here.


            // ==================================
            // BLANK
            // Currently no Mathematics Blank
            // ==================================

            // Don't create cards here.

        });

    })
    .catch(error => {

        console.error(
            "Error fetching chapters:",
            error
        );

    });


function createChapterCard(chapter, questionType) {

    const card = document.createElement("article");

    card.classList.add("chapter-card");


    let buttonText = "Start Practice";

    if (questionType === "MCQ") {
        buttonText = "Start MCQ";
    }


    card.innerHTML = `
        <h3>
            Chapter ${chapter.chapter_number}:
            ${chapter.chapter_name}
        </h3>

        <p>
            Practice ${questionType} questions
            from this chapter.
        </p>

        <a
            class="start-btn"
            href="../quiz.html?chapter_id=${chapter.id}&type=${questionType}"
        >
            ${buttonText}
        </a>
    `;


    return card;
}