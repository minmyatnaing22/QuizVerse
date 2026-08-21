const API = "http://localhost:3000";

function saveUser(user) {
    localStorage.setItem("quizVerseUser", JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }));
}

function setMessage(formId, text) {
    const paragraph = document.querySelector("#" + formId + " .card-head p");
    if (paragraph) {
        paragraph.textContent = text;
    }
}

function postJson(path, body) {
    return fetch(API + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    }).then((response) => {
        return response.json().then((data) => {
            if (!response.ok) {
                throw new Error(data.error || "Request failed");
            }
            return data;
        });
    });
}

document.getElementById("login-btn")?.addEventListener("click", () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    postJson("/users/login", { email, password })
        .then((user) => {
            saveUser(user);
            window.location.href = "index.html";
        })
        .catch((err) => {
            setMessage("login", err.message);
        });
});

document.getElementById("register-btn")?.addEventListener("click", () => {
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    postJson("/users/register", { name, email, password })
        .then((user) => {
            saveUser(user);
            window.location.href = "index.html";
        })
        .catch((err) => {
            setMessage("register", err.message);
        });
});
