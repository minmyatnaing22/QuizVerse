const SYSTEM_PROMPT = `You are QuizVerse AI, a helpful Grade 12 study assistant.

Your main purpose is to help students understand Grade 12 subjects and prepare for exams.

Supported subjects include:
- Myanmar
- English
- Mathematics
- Physics
- Chemistry
- Biology

Explain concepts clearly and simply.

When appropriate:
- give step-by-step explanations
- provide examples
- give hints instead of immediately giving full answers
- encourage understanding rather than memorization

If a question is unrelated to studying, politely redirect the student back to Grade 12 study topics.

Do not pretend to know information from the QuizVerse database unless that information was actually provided in the context.

When QUIZVERSE QUESTION CONTEXT is provided:
- That question, its options, and the official answer came from the QuizVerse database.
- Treat the official QuizVerse answer as the answer key. Do not silently replace it with a guessed answer.
- You may explain WHY that official answer is correct.
- If you think the official answer might be wrong, still state the QuizVerse answer first, then mention the concern. Never change the official answer.
- Do not invent a different question text or different options.
- For a full explanation, use a short student-friendly structure: Question, Concept, Step-by-step solution, Answer, Quick tip. Keep it concise.
- If the student asks for a hint, do NOT reveal the official answer. Give a progressive hint and offer a stronger hint if they want one.
- If the student asks for a similar question, clearly label it "AI-generated practice question". Do not present it as an official QuizVerse question.`;

function getConfig() {
    return {
        apiKey: process.env.GROQ_API_KEY || "",
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "")
    };
}

function buildQuestionBlock(question, intent) {
    if (!question) {
        return "";
    }

    let block = "QUIZVERSE QUESTION CONTEXT\n";
    block += "This question was retrieved from the QuizVerse database. It is trusted source material.\n";
    block += "Subject: " + question.subject + "\n";
    block += "Chapter: " + question.chapter_number + " — " + question.chapter_name + "\n";
    block += "Question Number: " + question.question_number + "\n";
    block += "Type: " + question.question_type + "\n\n";
    block += "Question:\n" + question.question_text + "\n";
    if (question.options && question.options.length) {
        block += "\nOptions:\n";
        question.options.forEach((option) => {
            block += option.label + ". " + option.text + "\n";
        });
    }
    if (intent !== "hint" && question.correct_answer) {
        block += "\nOfficial QuizVerse Answer:\n" + question.correct_answer + "\n";
    }
    return block;
}

function buildSystemPrompt(context, question, intent) {
    let prompt = SYSTEM_PROMPT;
    if (context && (context.subject || context.chapter)) {
        prompt += "\n\nYou are currently helping the student with:";
        if (context.subject) {
            prompt += "\nSubject: " + context.subject;
        }
        if (context.chapter) {
            prompt += "\nChapter: " + context.chapter;
        }
        prompt += "\nPrefer explanations that fit this subject and chapter when relevant.";
    }
    if (question) {
        prompt += "\n\n" + buildQuestionBlock(question, intent);
        if (intent === "hint") {
            prompt += "\nThe student wants a hint only. Do not reveal the official answer yet.";
        } else if (intent === "similar") {
            prompt += "\nThe student wants an AI-generated practice question based on the same concept. Label it clearly as AI-generated.";
        } else {
            prompt += "\nThe student wants help with this retrieved QuizVerse question.";
        }
    }
    return prompt;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history.slice(-12).map((item) => {
        const role = item && item.role === "assistant" ? "assistant" : "user";
        const content = String(item && item.content != null ? item.content : "").trim();
        return { role, content };
    }).filter((item) => item.content);
}

function sendChat({ message, history, context, question, intent }, callback) {
    const config = getConfig();

    if (!config.apiKey) {
        return callback(new Error("GROQ_API_KEY is not configured on the server"));
    }

    const messages = [{ role: "system", content: buildSystemPrompt(context, question, intent) }]
        .concat(sanitizeHistory(history))
        .concat([{ role: "user", content: message }]);

    const url = config.baseUrl + "/chat/completions";
    const payload = JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.4
    });

    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + config.apiKey
        },
        body: payload
    })
        .then((response) => {
            return response.text().then((text) => {
                let data = {};
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (parseErr) {
                    throw new Error("AI request failed");
                }
                if (!response.ok) {
                    console.error("[chatbot Groq] request failed", {
                        status: response.status,
                        statusText: response.statusText,
                        model: config.model,
                        baseUrl: config.baseUrl,
                        body: text
                    });
                    const detail = data && data.error && data.error.message
                        ? data.error.message
                        : "AI request failed";
                    throw new Error(detail);
                }
                const reply = data && data.choices && data.choices[0] &&
                    data.choices[0].message && data.choices[0].message.content
                    ? String(data.choices[0].message.content).trim()
                    : "";
                if (!reply) {
                    throw new Error("The AI returned an empty reply");
                }
                return reply;
            });
        })
        .then((reply) => callback(null, reply))
        .catch((err) => {
            console.error("[chatbot Groq] error", {
                model: config.model,
                baseUrl: config.baseUrl,
                message: err && err.message
            });
            callback(err);
        });
}

module.exports = {
    sendChat
};
