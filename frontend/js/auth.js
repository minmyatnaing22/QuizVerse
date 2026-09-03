const API = window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

let googleConfig = null;

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

function isAllowedGmail(email) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(email || "").trim());
}

function validatePassword(password) {
    const value = String(password || "");

    if (value.length < 8) {
        return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(value)) {
        return "Password must include at least one uppercase letter.";
    }
    if (!/[a-z]/.test(value)) {
        return "Password must include at least one lowercase letter.";
    }
    if (!/[0-9]/.test(value)) {
        return "Password must include at least one number.";
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
        return "Password must include at least one special character.";
    }

    return "";
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

    if (!isAllowedGmail(email)) {
        setMessage("login", "Please use your real Gmail address.");
        return;
    }

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

    if (!isAllowedGmail(email)) {
        setMessage("register", "Only Gmail addresses are allowed.");
        return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        setMessage("register", passwordError);
        return;
    }

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

function handleGoogleLogin(response) {
    const formId = document.querySelector(".form-panel.active")?.id || "login";

    postJson("/users/google-login", { credential: response && response.credential })
        .then((user) => {
            if (!user || !user.id || !user.token) {
                throw new Error("Google sign-in did not return a user");
            }
            saveUser(user);
            window.location.href = "index.html";
        })
        .catch((err) => {
            setMessage(formId, err.message === "Failed to fetch"
                ? "Cannot reach the server at localhost:3000. Start the backend and try again."
                : err.message);
        });
}

function waitForGoogleLibrary(tries) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        return Promise.resolve();
    }
    if (tries <= 0) {
        return Promise.reject(new Error("google_library_missing"));
    }
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(waitForGoogleLibrary(tries - 1));
        }, 200);
    });
}

function initGoogleButtons() {
    if (!googleConfig || !googleConfig.enabled || !googleConfig.clientId) {
        document.querySelectorAll(".btn-google").forEach((button) => {
            button.disabled = true;
            button.title = "Google Sign-In is not configured yet";
        });
        return;
    }

    waitForGoogleLibrary(25)
        .then(() => {
            window.google.accounts.id.initialize({
                client_id: googleConfig.clientId,
                callback: handleGoogleLogin,
                ux_mode: "popup",
                auto_select: false
            });

            document.querySelectorAll(".btn-google").forEach((button) => {
                button.style.display = "none";
            });

            ["google-login-button", "google-register-button"].forEach((id) => {
                const container = document.getElementById(id);
                if (!container || container.dataset.rendered === "true") {
                    return;
                }
                container.classList.add("active");
                window.google.accounts.id.renderButton(container, {
                    theme: "outline",
                    size: "large",
                    type: "standard",
                    shape: "rectangular",
                    width: 320,
                    text: id === "google-register-button" ? "signup_with" : "continue_with"
                });
                container.dataset.rendered = "true";
            });
        })
        .catch(() => {
            document.querySelectorAll(".btn-google").forEach((button) => {
                button.disabled = true;
                button.title = "Google Sign-In is still loading. Refresh the page.";
            });
        });
}

function loadGoogleConfig() {
    return fetch(API + "/users/google-config")
        .then((response) => {
            if (!response.ok) {
                throw new Error("google config failed");
            }
            return response.json();
        })
        .then((data) => {
            googleConfig = data || { enabled: false, clientId: null };
            initGoogleButtons();
        })
        .catch(() => {
            googleConfig = { enabled: false, clientId: null };
            initGoogleButtons();
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

loadGoogleConfig();
