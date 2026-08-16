const params = new URLSearchParams(window.location.search);

const subjectId = params.get("subject_id");

console.log("Subject ID:", subjectId);

fetch(`http://localhost:3000/chapters?subject_id=${subjectId}`)
    .then(response => response.json())
    .then(chapters => {

        console.log("Chapters from backend:");
        console.log(chapters);

        const mcqContainer = document.getElementById("mcq-chapters");

        chapters.forEach(chapter => {

            const chapterCard = document.createElement("article");

            chapterCard.classList.add("chapter-card");

            chapterCard.innerHTML = `
                <h3>
                    Chapter ${chapter.chapter_number}: ${chapter.chapter_name}
                </h3>

                <p>
                    Practice MCQ questions from this chapter.
                </p>

                <a
                    class="start-btn"
                    href="../quiz.html?chapter_id=${chapter.id}&type=MCQ"
                >
                    Start MCQ
                </a>
            `;

            mcqContainer.appendChild(chapterCard);

        });

    })
    .catch(error => {

        console.error("Error fetching chapters:", error);

    });