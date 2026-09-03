const TYPE_LABELS = { MCQ: "MCQ", TRUE_FALSE: "True / False", BLANK: "Fill in the Blank" };
const TYPE_THEME = {
  MCQ: { accent: "#2B5FE2", soft: "#E7EDFF", sub: "Multiple choice questions from every chapter." },
  TRUE_FALSE: { accent: "#22A559", soft: "#E4FBEC", sub: "True or false questions from every chapter." },
  BLANK: { accent: "#F2A400", soft: "#FFF4D6", sub: "Fill-in-the-blank questions from every chapter." }
};

const SUBJECT_THEME = {
  myanmar: { accent: "#2B5FE2", soft: "#E7EDFF", sub: "Full exam from every Myanmar chapter.", icon: "📚" },
  english: { accent: "#F2A400", soft: "#FFF4D6", sub: "Full exam from every English chapter.", icon: "📝" },
  math: { accent: "#7C3AED", soft: "#F0E9FF", sub: "Full exam from every Math chapter.", icon: "∑" },
  mathematics: { accent: "#7C3AED", soft: "#F0E9FF", sub: "Full exam from every Math chapter.", icon: "∑" },
  physics: { accent: "#0EA5A4", soft: "#E1FAF7", sub: "Full exam from every Physics chapter.", icon: "⚡" },
  chemistry: { accent: "#E2447C", soft: "#FFE9F1", sub: "Full exam from every Chemistry chapter.", icon: "⚗️" },
  biology: { accent: "#22A559", soft: "#E4FBEC", sub: "Full exam from every Biology chapter.", icon: "🧬" }
};

function subjectIdOf(subject) {
  return subject.subject_id || subject.id;
}

function subjectNameOf(subject) {
  return subject.subject_name || subject.name || "";
}

function subjectTheme(name) {
  const key = String(name || "").toLowerCase();
  return SUBJECT_THEME[key] || { accent: "#2B5FE2", soft: "#E7EDFF", sub: "Full exam from every chapter.", icon: "📘" };
}

function showError(message) {
  document.getElementById("exam-content").innerHTML =
    "<p class='exam-error'>" + escapeHtml(message) + "</p>";
}

function renderSubjects(subjects) {
  const content = document.getElementById("exam-content");
  if (!subjects.length) {
    content.innerHTML = "<p class='exam-error'>No subjects found.</p>";
    return;
  }

  content.innerHTML =
    "<section class='exam-section'>" +
    "<div class='section-head'><h3>Choose a subject</h3></div>" +
    "<div class='subject-grid'>" +
    subjects.map(function (subject) {
      const name = subjectNameOf(subject);
      const id = subjectIdOf(subject);
      const theme = subjectTheme(name);
      return (
        "<article class='subject-card' style='--accent:" + theme.accent + ";--accent-soft:" + theme.soft + ";'>" +
          "<div class='card-top'>" +
            "<div class='subj-icon'>" + theme.icon + "</div>" +
            "<div class='completion-pill'>Exam</div>" +
          "</div>" +
          "<div class='card-title'>" + escapeHtml(name) + "</div>" +
          "<div class='card-sub'>" + theme.sub + "</div>" +
          "<div class='card-bottom'>" +
            "<div class='qcount'>All chapters</div>" +
            "<button class='practice-btn' type='button' data-subject-id='" + id + "' data-subject-name='" + escapeHtml(name) + "'>Start Exam →</button>" +
          "</div>" +
        "</article>"
      );
    }).join("") +
    "</div></section>";

  content.querySelectorAll("[data-subject-id]").forEach(function (button) {
    button.addEventListener("click", function () {
      loadTypes(button.getAttribute("data-subject-id"), button.getAttribute("data-subject-name"));
    });
  });
}

function renderTypes(subjectId, subjectName, types) {
  const content = document.getElementById("exam-content");
  const name = escapeHtml(subjectName);

  if (!types.length) {
    content.innerHTML =
      "<p class='exam-error'>No exam questions found for " + name + ".</p>" +
      "<p><button class='exam-back' type='button' id='exam-back'>Back to subjects</button></p>";
    document.getElementById("exam-back").addEventListener("click", loadSubjects);
    return;
  }

  content.innerHTML =
    "<section class='exam-section'>" +
    "<div class='section-head'><h3>" + name + " · Choose question type</h3></div>" +
    "<div class='subject-grid'>" +
    types.map(function (type) {
      const theme = TYPE_THEME[type] || { accent: "#2B5FE2", soft: "#E7EDFF", sub: "Questions from every chapter." };
      const label = TYPE_LABELS[type] || type;
      return (
        "<article class='subject-card' style='--accent:" + theme.accent + ";--accent-soft:" + theme.soft + ";'>" +
          "<div class='card-top'>" +
            "<div class='subj-icon'>🎯</div>" +
            "<div class='completion-pill'>15 questions</div>" +
          "</div>" +
          "<div class='card-title'>" + escapeHtml(label) + "</div>" +
          "<div class='card-sub'>" + theme.sub + "</div>" +
          "<div class='card-bottom'>" +
            "<div class='qcount'>All chapters</div>" +
            "<button class='practice-btn' type='button' data-type='" + escapeHtml(type) + "'>Start Exam →</button>" +
          "</div>" +
        "</article>"
      );
    }).join("") +
    "</div>" +
    "<p><button class='exam-back' type='button' id='exam-back'>Back to subjects</button></p>" +
    "</section>";

  content.querySelectorAll("[data-type]").forEach(function (button) {
    button.addEventListener("click", function () {
      const type = button.getAttribute("data-type");
      window.location.href =
        "exam-take.html?subject_id=" + encodeURIComponent(subjectId) +
        "&type=" + encodeURIComponent(type);
    });
  });

  document.getElementById("exam-back").addEventListener("click", loadSubjects);
}

function loadTypes(subjectId, subjectName) {
  document.getElementById("exam-content").innerHTML = "<p class='exam-muted'>Loading types...</p>";

  fetch(API + "/exam/types?subject_id=" + encodeURIComponent(subjectId))
    .then(function (res) {
      if (!res.ok) throw new Error("exam-types");
      return res.json();
    })
    .then(function (data) {
      renderTypes(subjectId, subjectName, data.types || []);
    })
    .catch(function () {
      showError("Unable to load question types.");
    });
}

function loadSubjects() {
  document.getElementById("exam-content").innerHTML = "<p class='exam-muted'>Loading subjects...</p>";

  fetch(API + "/subjects")
    .then(function (res) {
      if (!res.ok) throw new Error("subjects");
      return res.json();
    })
    .then(function (payload) {
      const subjects = Array.isArray(payload) ? payload : [];
      renderSubjects(subjects);

      const requestedId = new URLSearchParams(window.location.search).get("subject_id");
      if (!requestedId) return;

      const match = subjects.find(function (subject) {
        return String(subjectIdOf(subject)) === String(requestedId);
      });
      if (match) {
        loadTypes(subjectIdOf(match), subjectNameOf(match));
      }
    })
    .catch(function () {
      showError("Unable to load subjects.");
    });
}

loadSubjects();
