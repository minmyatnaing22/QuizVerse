const TYPE_ORDER = ["MCQ", "TRUE_FALSE", "BLANK"];

const TYPE_GRIDS = {
    MCQ: "mcq-chapters",
    TRUE_FALSE: "true-chapters",
    BLANK: "blank-chapters"
};


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


function getAvailableTypes(chapters) {

    const types = [];

    chapters.forEach(chapter => {

        (chapter.question_types || []).forEach(type => {

            if (type && !types.includes(type)) {
                types.push(type);
            }

        });

    });

    return TYPE_ORDER.filter(type => types.includes(type));

}


function typeFromControlId(id) {

    const value = String(id || "").toLowerCase();

    if (value.includes("mcq")) {
        return "MCQ";
    }

    if (value.includes("blank")) {
        return "BLANK";
    }

    if (value.includes("true")) {
        return "TRUE_FALSE";
    }

    return null;

}


function panelForType(type) {

    const grid = document.getElementById(TYPE_GRIDS[type]);

    return grid ? grid.closest(".category-panel") : null;

}


function setTypeVisible(type, visible) {

    const panel = panelForType(type);

    if (panel) {
        panel.hidden = !visible;
    }

    document.querySelectorAll(".tab-bar .tab-btn").forEach(label => {

        if (typeFromControlId(label.getAttribute("for")) !== type) {
            return;
        }

        label.hidden = !visible;
        label.style.display = visible ? "" : "none";

        const radio = document.getElementById(label.getAttribute("for"));

        if (radio) {
            radio.disabled = !visible;
        }

    });

}


function activateType(type) {

    document.querySelectorAll(".tab-bar .tab-btn").forEach(label => {

        if (typeFromControlId(label.getAttribute("for")) !== type) {
            return;
        }

        const radio = document.getElementById(label.getAttribute("for"));

        if (radio) {
            radio.checked = true;
            radio.disabled = false;
        }

    });

}


function syncQuestionTypeTabs(availableTypes) {

    TYPE_ORDER.forEach(type => {
        setTypeVisible(type, availableTypes.includes(type));
    });

    if (availableTypes.length > 0) {
        activateType(availableTypes[0]);
    }

}


function chapterContainers() {
    return {
        MCQ: document.getElementById("mcq-chapters"),
        TRUE_FALSE: document.getElementById("true-chapters"),
        BLANK: document.getElementById("blank-chapters")
    };
}

function setGridMessage(container, text) {
    if (container) {
        container.innerHTML = "<p>" + text + "</p>";
    }
}

Object.values(chapterContainers()).forEach((container) => {
    setGridMessage(container, "Loading chapters...");
});

resolveSubjectId()
    .then(subjectId => {

        return fetch(
            "http://localhost:3000/chapters?subject_id=" + encodeURIComponent(subjectId)
        ).then(response => {
            if (!response.ok) {
                throw new Error("Failed to load chapters");
            }
            return response.json();
        });

    })
    .then(chapters => {

        const availableTypes = getAvailableTypes(chapters);
        const visibleTypes = availableTypes.length > 0
            ? availableTypes
            : TYPE_ORDER;
        const containers = chapterContainers();

        Object.values(containers).forEach((container) => {
            if (container) {
                container.innerHTML = "";
            }
        });

        syncQuestionTypeTabs(visibleTypes);

        chapters.forEach(chapter => {

            const chapterTypes = (chapter.question_types || []).length > 0
                ? chapter.question_types
                : visibleTypes;

            chapterTypes.forEach(questionType => {

                const container = containers[questionType];

                if (container) {
                    container.appendChild(
                        createChapterCard(chapter, questionType)
                    );
                }

            });

        });

    })
    .catch(() => {

        const containers = chapterContainers();
        Object.values(containers).forEach((container) => {
            setGridMessage(container, "Unable to load chapters.");
        });

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


    const safeName = typeof escapeHtml === "function"
        ? escapeHtml(chapter.chapter_name)
        : chapter.chapter_name;

    card.innerHTML = `
        <h3>
            Chapter ${chapter.chapter_number}:
            ${safeName}
        </h3>

        <p>
            Practice ${questionType} questions
            from this chapter.
        </p>

        <a
            class="start-btn"
            href="../quiz.html?chapter_id=${encodeURIComponent(chapter.id)}&type=${encodeURIComponent(questionType)}"
        >
            ${buttonText}
        </a>
    `;


    return card;
}
