function getPageSubjectName() {

    const file = window.location.pathname.split("/").pop() || "";

    return file.replace(/\.html$/i, "");

}


function resolveSubjectId() {

    const fromUrl = new URLSearchParams(window.location.search)
        .get("subject_id");

    if (fromUrl) {
        return Promise.resolve(fromUrl);
    }

    return fetch("http://localhost:3000/subjects")
        .then(response => response.json())
        .then(subjects => {

            const pageName = getPageSubjectName();

            const subject = subjects.find(item =>
                item.name.toLowerCase() === pageName.toLowerCase()
            );

            if (!subject) {
                throw new Error(
                    "Could not determine subject_id for this page"
                );
            }

            return String(subject.id);

        });

}


function getSupportedTypes(chapters) {

    const types = [];

    chapters.forEach(chapter => {

        (chapter.question_types || []).forEach(type => {

            if (!types.includes(type)) {
                types.push(type);
            }

        });

    });

    return types.length > 0 ? types : ["MCQ"];

}


resolveSubjectId()
    .then(subjectId => {

        console.log("Subject ID:", subjectId);

        return fetch(
            `http://localhost:3000/chapters?subject_id=${subjectId}`
        ).then(response => response.json());

    })
    .then(chapters => {

        console.log("Chapters from backend:");
        console.log(chapters);

        const supportedTypes = getSupportedTypes(chapters);

        console.log("Supported types:", supportedTypes);

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

            const types = chapter.question_types.length > 0
                ? chapter.question_types
                : supportedTypes;

            types.forEach(questionType => {

                if (questionType === "MCQ" && mcqContainer) {
                    mcqContainer.appendChild(
                        createChapterCard(chapter, "MCQ")
                    );
                }

                if (questionType === "TRUE_FALSE" && trueContainer) {
                    trueContainer.appendChild(
                        createChapterCard(chapter, "TRUE_FALSE")
                    );
                }

                if (questionType === "BLANK" && blankContainer) {
                    blankContainer.appendChild(
                        createChapterCard(chapter, "BLANK")
                    );
                }

            });

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
