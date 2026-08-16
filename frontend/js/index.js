fetch("http://localhost:3000/subjects")
    .then(response => response.json())
    .then(subjects => {

        console.log("Subjects from backend:");
        console.log(subjects);

        const mathematics = subjects.find(
            subject => subject.name === "Mathematics"
        );

        console.log("Mathematics:", mathematics);

        if (mathematics) {
            document.getElementById("math-subject-name").textContent =
                mathematics.name;

            const mathButton =
            document.getElementById("math-practice-btn");

            mathButton.dataset.subjectId = mathematics.id;

            mathButton.addEventListener("click", () => {
                console.log("Mathematics clicked!");
                console.log("Subject ID:", mathematics.id);
            });
        }

      

    })
    .catch(error => {
        console.error("Error fetching subjects:", error);
    });