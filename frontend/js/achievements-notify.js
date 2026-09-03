function showAchievementUnlocks(badges) {
    const list = (badges || []).filter(Boolean);
    if (!list.length) {
        return;
    }

    let index = 0;

    function render() {
        const badge = list[index];
        let overlay = document.getElementById("achievement-toast");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "achievement-toast";
            overlay.className = "achievement-toast";
            document.body.appendChild(overlay);
        }

        overlay.innerHTML =
            "<div class='achievement-toast-card'>" +
                "<div class='toast-icon'>🏆</div>" +
                "<div style='font-size:12px;font-weight:700;color:#f2a400;letter-spacing:.04em;'>ACHIEVEMENT UNLOCKED</div>" +
                "<div class='toast-icon'>" + escapeHtml(badge.icon || "🏅") + "</div>" +
                "<h3>" + escapeHtml(badge.name || "Badge") + "</h3>" +
                "<p>" + escapeHtml(badge.description || "") + "</p>" +
                "<button type='button' id='achievement-toast-ok'>" +
                    (index < list.length - 1 ? "Next" : "Nice!") +
                "</button>" +
            "</div>";

        document.getElementById("achievement-toast-ok").addEventListener("click", () => {
            index += 1;
            if (index >= list.length) {
                overlay.remove();
                return;
            }
            render();
        });
    }

    render();
}
