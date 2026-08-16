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


            // MCQ
            if (mcqContainer) {

                const card = createChapterCard(
                    chapter,
                    "MCQ"
                );

                mcqContainer.appendChild(card);
            }


            // TRUE / FALSE
            if (trueContainer) {

                const card = createChapterCard(
                    chapter,
                    "TRUE_FALSE"
                );

                trueContainer.appendChild(card);
            }


            // BLANK
            if (blankContainer) {

                const card = createChapterCard(
                    chapter,
                    "BLANK"
                );

                blankContainer.appendChild(card);
            }

        });


        function createChapterCard(chapter, questionType) {

            const card = document.createElement("article");

            card.classList.add("chapter-card");


            let buttonText;


            if (questionType === "MCQ") {
                buttonText = "Start MCQ";
            }

            else if (questionType === "TRUE_FALSE") {
                buttonText = "Start T/F";
            }

            else if (questionType === "BLANK") {
                buttonText = "Start Blank";
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

    if (questionType === "TRUE_FALSE") {
        buttonText = "Start T/F";
    }

    if (questionType === "BLANK") {
        buttonText = "Start Blank";
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