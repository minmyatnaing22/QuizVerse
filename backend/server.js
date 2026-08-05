const express = require("express");

const app = express();

app.use(express.json());

const PORT = 3000;

const subjectRoutes = require("./routes/subjectRoutes");

app.use("/subjects", subjectRoutes);


const chapterRoutes = require("./routes/chapterRoutes");

app.use("/chapters", chapterRoutes);


const questionRoutes = require("./routes/questionRoutes");

app.use("/questions", questionRoutes);


const questionOptionRoutes = require("./routes/questionOptionRoutes");

app.use("/question-options", questionOptionRoutes);


const questionAnswerRoutes = require("./routes/questionAnswerRoutes");

app.use("/question-answer", questionAnswerRoutes);


const quizRoutes = require("./routes/quizRoutes");

app.use("/quiz", quizRoutes);



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});