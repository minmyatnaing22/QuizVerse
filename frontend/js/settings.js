function setStatus(id, text, isError) {
    const el = document.getElementById(id);
    if (!el) {
        return;
    }
    el.textContent = text;
    el.style.color = isError ? "#dc2626" : "";
}

function putJson(path, body) {
    return fetch(API + path, {
        method: "PUT",
        headers: Object.assign({
            "Content-Type": "application/json"
        }, authHeaders()),
        body: JSON.stringify(body)
    }).then((response) => response.text().then((text) => {
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            throw new Error("Unexpected server response");
        }
        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }
        return data;
    }));
}

function syncStoredUser(user) {
    const current = getStoredUser() || {};
    localStorage.setItem("quizVerseUser", JSON.stringify({
        id: user.id || current.id,
        name: user.name || current.name,
        email: user.email || current.email,
        token: user.token || current.token
    }));
    applySidebarUser({
        name: user.name || current.name
    });
}

function loadSettings() {
    fetch(API + "/users/me", {
        headers: authHeaders()
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Please log in first.");
            }
            return response.json();
        })
        .then((data) => {
            const user = data.user || {};
            const preferences = data.preferences || {};
            document.getElementById("settings-name").value = user.name || "";
            document.getElementById("settings-email").value = user.email || "";
            document.getElementById("pref-dark-mode").checked = Boolean(preferences.dark_mode);
            document.getElementById("pref-study-goal").value = preferences.study_goal || "Balanced Practice";
            document.getElementById("pref-daily-reminder").checked = preferences.daily_reminder !== false;
            document.getElementById("pref-email-updates").checked = preferences.email_updates !== false;
            syncStoredUser(user);
        })
        .catch((err) => {
            setStatus("profile-status", err.message, true);
        });
}

document.getElementById("profile-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    putJson("/users/profile", {
        name: document.getElementById("settings-name").value.trim(),
        email: document.getElementById("settings-email").value.trim()
    })
        .then((user) => {
            syncStoredUser(user);
            setStatus("profile-status", "Profile updated successfully.", false);
        })
        .catch((err) => {
            setStatus("profile-status", err.message, true);
        });
});

document.getElementById("password-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    putJson("/users/password", {
        current_password: document.getElementById("current-password").value,
        new_password: document.getElementById("new-password").value
    })
        .then(() => {
            document.getElementById("current-password").value = "";
            document.getElementById("new-password").value = "";
            setStatus("password-status", "Password changed successfully.", false);
        })
        .catch((err) => {
            setStatus("password-status", err.message, true);
        });
});

document.getElementById("preferences-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    putJson("/users/preferences", {
        dark_mode: document.getElementById("pref-dark-mode").checked,
        study_goal: document.getElementById("pref-study-goal").value,
        daily_reminder: document.getElementById("pref-daily-reminder").checked,
        email_updates: document.getElementById("pref-email-updates").checked
    })
        .then((preferences) => {
            applyTheme(preferences.dark_mode ? "dark" : "light");
            setStatus("preferences-status", "Preferences saved successfully.", false);
        })
        .catch((err) => {
            setStatus("preferences-status", err.message, true);
        });
});

document.getElementById("pref-dark-mode")?.addEventListener("change", (event) => {
    applyTheme(event.target.checked ? "dark" : "light");
});

loadSettings();
