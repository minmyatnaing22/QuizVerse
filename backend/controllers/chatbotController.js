const chatbotModel = require("../models/chatbotModel");
const chatbotQuestionModel = require("../models/chatbotQuestionModel");
const chatbotLookup = require("../services/chatbotLookup");
const aiService = require("../services/aiService");
const { getAuthenticatedUserId } = require("../config/authToken");

const MAX_MESSAGE_LENGTH = 2000;

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function sameSubject(context, subjectName) {
    return context &&
        context.subject &&
        subjectName &&
        String(context.subject).toLowerCase() === String(subjectName).toLowerCase();
}

function displaySubject(name) {
    if (!name) {
        return "that subject";
    }
    return String(name).charAt(0).toUpperCase() + String(name).slice(1);
}

function notFoundQuestionMessage(subject, chapterNumber, questionNumber) {
    return "I couldn't find " +
        displaySubject(subject) +
        " Chapter " + chapterNumber +
        " Question " + questionNumber +
        " in the QuizVerse question database. Please check the chapter and question number.";
}

function sendAiReply(res, { message, history, context, question, intent, user_id }) {
    aiService.sendChat({ message, history, context, question, intent }, (aiErr, reply) => {
        if (aiErr) {
            const missingKey = String(aiErr.message || "").includes("GROQ_API_KEY");
            return res.status(missingKey ? 503 : 502).json({
                success: false,
                error: missingKey
                    ? "The study assistant is not configured yet. Add GROQ_API_KEY on the server."
                    : "The study assistant is unavailable right now. Please try again."
            });
        }

        res.json({
            success: true,
            reply,
            subject: context.subject,
            chapter: context.chapter,
            question_id: question ? question.question_id : null,
            user_id: user_id || null
        });
    });
}

function sendLocalReply(res, { reply, context, question, user_id }) {
    res.json({
        success: true,
        reply,
        subject: context.subject,
        chapter: context.chapter,
        question_id: question ? question.question_id : null,
        user_id: user_id || null
    });
}

function diagnoseMissing(lookup, context, callback) {
    const subjectName = lookup.subject_name || (context.subject ? String(context.subject).toLowerCase() : "");
    const chapterNumber = lookup.chapter_number || context.chapter_number;
    const questionNumber = lookup.question_number;

    if (!subjectName) {
        return callback(null, "I couldn't find that question in the QuizVerse question database. Please check the chapter and question number.");
    }

    chatbotQuestionModel.subjectExists(subjectName, (err, subject) => {
        if (err) {
            return callback(err);
        }
        if (!subject) {
            return callback(null, "I couldn't find " + displaySubject(subjectName) + " in the QuizVerse question database.");
        }
        if (!chapterNumber) {
            return callback(null, notFoundQuestionMessage(subject.name, "?", questionNumber));
        }
        chatbotQuestionModel.chapterExists(subject.id, chapterNumber, (err2, chapter) => {
            if (err2) {
                return callback(err2);
            }
            if (!chapter) {
                return callback(
                    null,
                    "I couldn't find " + subject.name + " Chapter " + chapterNumber +
                    " in the QuizVerse question database."
                );
            }
            callback(null, notFoundQuestionMessage(subject.name, chapterNumber, questionNumber));
        });
    });
}

function lookupBySpec(lookup, context, callback) {
    chatbotQuestionModel.getQuestionByLocation(lookup, (err, question) => {
        if (err) {
            return callback(err);
        }
        if (question) {
            return callback(null, { kind: "found", question });
        }
        diagnoseMissing(lookup, context, (diagErr, message) => {
            if (diagErr) {
                return callback(diagErr);
            }
            callback(null, { kind: "missing", message });
        });
    });
}

function buildDirectLookup(ref, context) {
    const lookup = {
        question_number: ref.question_number
    };

    if (ref.explicit_subject) {
        lookup.subject_name = ref.subject_name;
        if (ref.explicit_chapter) {
            lookup.chapter_number = ref.chapter_number;
            return lookup;
        }
        if (sameSubject(context, ref.subject_name) && context.chapter_id) {
            lookup.chapter_id = context.chapter_id;
            lookup.chapter_number = context.chapter_number;
            return lookup;
        }
        return null;
    }

    lookup.subject_id = context.subject_id || null;
    lookup.subject_name = context.subject ? String(context.subject).toLowerCase() : "";
    if (ref.explicit_chapter) {
        lookup.chapter_number = ref.chapter_number;
        if (!lookup.subject_id && !lookup.subject_name) {
            return null;
        }
        return lookup;
    }
    if (context.chapter_id) {
        lookup.chapter_id = context.chapter_id;
        lookup.chapter_number = context.chapter_number;
        return lookup;
    }
    return null;
}

function lookupFromHistory(historyRef, context, callback) {
    const lookup = buildDirectLookup(historyRef, context);
    if (!lookup) {
        return callback(null, null);
    }
    chatbotQuestionModel.getQuestionByLocation(lookup, callback);
}

function resolveQuestion(req, context, callback) {
    const message = String(req.body.message || "");
    const ref = chatbotLookup.parseQuestionReference(message);
    const lastQuestionId = parseId(req.body.question_id);
    const history = req.body.history;
    const intent = ref.intent === "general" && ref.question_number ? "explain" : ref.intent;

    if (ref.question_number) {
        const lookup = buildDirectLookup(ref, context);
        if (!lookup) {
            return callback(null, {
                kind: "incomplete",
                intent,
                message: "I need a subject and chapter to find that question. For example: Explain Math Chapter 1 Question 1."
            });
        }
        return lookupBySpec(lookup, context, (err, result) => {
            if (err) {
                return callback(err);
            }
            result.intent = intent;
            callback(null, result);
        });
    }

    const reuse = intent === "followup" || intent === "hint" || intent === "similar";
    if (!reuse) {
        return callback(null, { kind: "none", intent: "general" });
    }

    function finishPrior(err, question) {
        if (err) {
            return callback(err);
        }
        if (question) {
            return callback(null, { kind: "found", question, intent });
        }
        callback(null, {
            kind: "need_prior",
            intent,
            message: "Tell me which QuizVerse question you mean, for example: Explain Math Chapter 1 Question 1."
        });
    }

    if (lastQuestionId) {
        return chatbotQuestionModel.getQuestionById(lastQuestionId, finishPrior);
    }

    const historyRef = chatbotLookup.parseHistoryReference(history);
    if (historyRef && historyRef.question_number) {
        return lookupFromHistory(historyRef, context, finishPrior);
    }

    finishPrior(null, null);
}

function sendMessage(req, res) {
    const message = req.body && req.body.message != null
        ? String(req.body.message).trim()
        : "";

    if (!message) {
        return res.status(400).json({
            success: false,
            error: "message is required"
        });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
            success: false,
            error: "message is too long"
        });
    }

    const user_id = getAuthenticatedUserId(req);
    const history = req.body.history;

    chatbotModel.getContext(req.body.subject_id, req.body.chapter_id, (err, context) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: "Unable to load study context"
            });
        }

        resolveQuestion(req, context, (lookupErr, result) => {
            if (lookupErr) {
                return res.status(500).json({
                    success: false,
                    error: "Unable to look up that question"
                });
            }

            if (result.kind === "missing" || result.kind === "incomplete" || result.kind === "need_prior") {
                return sendLocalReply(res, {
                    reply: result.message,
                    context,
                    question: null,
                    user_id
                });
            }

            sendAiReply(res, {
                message,
                history,
                context,
                question: result.kind === "found" ? result.question : null,
                intent: result.intent,
                user_id
            });
        });
    });
}

module.exports = {
    sendMessage
};
