const API = "http://localhost:3000";

function saveUser(user) {
    localStorage.setItem("quizVerseUser", JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        token: user.token
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
        return response.text().then((text) => {
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                throw new Error("Could not reach the QuizVerse API. Is the backend running on port 3000?");
            }
            if (!response.ok) {
                throw new Error(data.error || "Request failed");
            }
            return data;
        });
    });
}

function login() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    postJson("/users/login", { email, password })
        .then((user) => {
            if (!user || !user.id || !user.token) {
                throw new Error("Login did not return a user");
            }
            saveUser(user);
            window.location.href = "index.html";
        })
        .catch((err) => {
            setMessage("login", err.message === "Failed to fetch"
                ? "Cannot reach the server at localhost:3000. Start the backend and try again."
                : err.message);
        });
}

function register() {
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    postJson("/users/register", { name, email, password })
        .then((user) => {
            if (!user || !user.id || !user.token) {
                throw new Error("Registration did not return a user");
            }
            saveUser(user);
            window.location.href = "index.html";
        })
        .catch((err) => {
            setMessage("register", err.message === "Failed to fetch"
                ? "Cannot reach the server at localhost:3000. Start the backend and try again."
                : err.message);
        });
}

document.getElementById("login-btn")?.addEventListener("click", login);
document.getElementById("register-btn")?.addEventListener("click", register);

["login-email", "login-password"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            login();
        }
    });
});

["register-name", "register-email", "register-password"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            register();
        }
    });
});
