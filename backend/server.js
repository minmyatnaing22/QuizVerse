require("./config/loadEnv");

const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-QuizVerse-Token", "Authorization"]
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = Number(process.env.PORT) || 3000;

const subjectRoutes = require("./routes/subjectRoutes");
const chapterRoutes = require("./routes/chapterRoutes");
const questionRoutes = require("./routes/questionRoutes");
const questionOptionRoutes = require("./routes/questionOptionRoutes");
const questionAnswerRoutes = require("./routes/questionAnswerRoutes");
const quizRoutes = require("./routes/quizRoutes");
const userRoutes = require("./routes/userRoutes");
const statsRoutes = require("./routes/statsRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const examRoutes = require("./routes/examRoutes");
const dailyChallengeRoutes = require("./routes/dailyChallengeRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const discussionRoutes = require("./routes/discussionRoutes");

app.use("/subjects", subjectRoutes);
app.use("/chapters", chapterRoutes);
app.use("/questions", questionRoutes);
app.use("/question-options", questionOptionRoutes);
app.use("/question-answer", questionAnswerRoutes);
app.use("/quiz", quizRoutes);
app.use("/users", userRoutes);
app.use("/", statsRoutes);
app.use("/", bookmarkRoutes);
app.use("/exam", examRoutes);
app.use("/daily-challenge", dailyChallengeRoutes);
app.use("/", badgeRoutes);
app.use("/chatbot", chatbotRoutes);
app.use("/discussion", discussionRoutes);

app.get("/", (req, res) => {
    res.redirect("/html/quizverse-auth.html");
});

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
