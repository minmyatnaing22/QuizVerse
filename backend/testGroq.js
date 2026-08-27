require("./config/loadEnv");

const apiKey = process.env.GROQ_API_KEY || "";
const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const baseUrl = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const url = baseUrl + "/chat/completions";

console.log({
    hasGroqKey: Boolean(apiKey),
    model,
    baseUrl,
    url
});

if (!apiKey) {
    console.log("failure");
    console.log("HTTP status: none");
    console.log("provider error: GROQ_API_KEY is missing. Add it to backend/.env");
    process.exit(1);
}

fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({
        model,
        messages: [
            { role: "user", content: "Say hello in one short sentence." }
        ]
    })
})
    .then((response) => {
        return response.text().then((text) => {
            console.log(response.ok ? "success" : "failure");
            console.log("HTTP status:", response.status);

            if (!response.ok) {
                console.log("provider error:", text);
                process.exit(1);
            }

            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                console.log("provider error: response was not JSON");
                console.log(text);
                process.exit(1);
            }

            const reply = data && data.choices && data.choices[0] &&
                data.choices[0].message && data.choices[0].message.content
                ? String(data.choices[0].message.content).trim()
                : "";

            console.log("response text:", reply || "(empty)");
        });
    })
    .catch((err) => {
        console.log("failure");
        console.log("HTTP status: none");
        console.log("provider error:", err && err.message);
        process.exit(1);
    });
