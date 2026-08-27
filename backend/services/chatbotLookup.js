const SUBJECT_ALIASES = [
    { name: "mathematics", aliases: ["mathematics", "maths", "math"] },
    { name: "physics", aliases: ["physics", "phys"] },
    { name: "chemistry", aliases: ["chemistry", "chem"] },
    { name: "biology", aliases: ["biology", "bio"] },
    { name: "english", aliases: ["english"] },
    { name: "myanmar", aliases: ["myanmar"] }
];

function parsePositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function detectSubject(text) {
    const lower = String(text || "").toLowerCase();
    let best = null;
    let bestLen = 0;
    SUBJECT_ALIASES.forEach((entry) => {
        entry.aliases.forEach((alias) => {
            const re = new RegExp("\\b" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
            if (re.test(lower) && alias.length > bestLen) {
                best = entry.name;
                bestLen = alias.length;
            }
        });
    });
    return best;
}

function detectIntent(text) {
    const lower = String(text || "").toLowerCase();
    if (/\bsimilar\b/.test(lower) && /\bquestion\b/.test(lower)) {
        return "similar";
    }
    if (/\bhint\b/.test(lower)) {
        return "hint";
    }
    if (
        /\bexplain this question\b/.test(lower) ||
        /\bexplain the concept\b/.test(lower) ||
        /\bthis question\b/.test(lower) ||
        /\bwhy is\b/.test(lower) ||
        /\bcorrect answer\b/.test(lower) ||
        /\bofficial answer\b/.test(lower)
    ) {
        return "followup";
    }
    return "explain";
}

function parseQuestionReference(text) {
    const raw = String(text || "");
    const subject = detectSubject(raw);
    const chapterMatch = raw.match(/\b(?:chapter|ch\.?)\s*(\d+)\b/i);
    const questionMatch = raw.match(/\b(?:question|problem|ques\.?|q(?:uestion)?\.?)\s*(\d+)\b/i) ||
        raw.match(/\bq(\d+)\b/i);

    const chapter_number = chapterMatch ? parsePositiveInt(chapterMatch[1]) : null;
    const question_number = questionMatch ? parsePositiveInt(questionMatch[1] || questionMatch[0]) : null;

    let intent = "general";
    if (question_number) {
        intent = detectIntent(raw) === "similar" || detectIntent(raw) === "hint"
            ? detectIntent(raw)
            : "explain";
    } else if (detectIntent(raw) !== "explain") {
        intent = detectIntent(raw);
    } else if (/\bexplain this question\b/i.test(raw)) {
        intent = "followup";
    }

    return {
        subject_name: subject,
        chapter_number,
        question_number,
        explicit_subject: Boolean(subject),
        explicit_chapter: Boolean(chapter_number),
        intent
    };
}

function parseHistoryReference(history) {
    if (!Array.isArray(history)) {
        return null;
    }
    for (let i = history.length - 1; i >= 0; i -= 1) {
        const item = history[i];
        if (!item || item.role !== "user") {
            continue;
        }
        const ref = parseQuestionReference(item.content);
        if (ref.question_number) {
            return ref;
        }
    }
    return null;
}

module.exports = {
    parseQuestionReference,
    parseHistoryReference
};
