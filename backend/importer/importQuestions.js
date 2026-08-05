const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

let imported = 0;
let skipped = 0;
let failed = 0;

const {
    getSubjectId,
    getChapterId,
    getQuestionId,
    insertQuestion,
    updateQuestion,
    deleteOptions,
    deleteAnswer,
    insertOptions,
    insertAnswer
} = require("./helpers");

//====================================================================

// Subject name passed from terminal
const subjectFile = process.argv[2];

// Check if user provided a filename
if (!subjectFile) {

    console.log("Usage:");
    console.log("node importer/importQuestions.js <subject>");
    console.log("");
    console.log("Example:");
    console.log("node importer/importQuestions.js mathematics");

    process.exit();

}

// Build CSV path automatically
const csvFilePath = path.join(
    __dirname,
    "csv",
    `${subjectFile}.csv`
);

if (!fs.existsSync(csvFilePath)) {

    console.log(`CSV file not found: ${subjectFile}.csv`);
    process.exit();

}

//======================================================================

const results = [];



console.log("");
console.log("==============================");
console.log(`Importing ${subjectFile}.csv`);
console.log("==============================");console.log("");


// Read CSV
fs.createReadStream(csvFilePath)
    .pipe(
        csv({
            mapHeaders: ({ header }) => header.trim()
        })
    )
    .on("data", (row) => {
        results.push(row);
    })
    .on("end", () => {

        console.log("CSV loaded successfully.");
        console.log("Total rows:", results.length);

        console.log(Object.keys(results[0]));
        console.log(results[0]);
        // Start importing from first row
        importRow(0);

    });


function validateRow(row) {

    // Subject
    if (!row.Subject?.trim()) {
        return "Subject is empty.";
    }

    // Chapter
    if (!row.Chapter?.trim()) {
        return "Chapter is empty.";
    }



    // Question Number
    if (!row.No?.trim()) {
        return "Question number is empty.";
    }

    // Question
    if (!row.Question?.trim()) {
        return "Question text is empty.";
    }

    // Type
    const validTypes = ["MCQ", "TRUE_FALSE", "BLANK"];

    if (!validTypes.includes(row.Type)) {
        return "Invalid question type.";
    }

    return null;

}

// ==============================
// Print Import Summary
// ==============================
function printSummary() {

    console.log("");
    console.log("==================================");
    console.log("Import Summary");
    console.log("==================================");
    console.log(`Total Rows : ${results.length}`);
    console.log(`Imported   : ${imported}`);
    console.log(`Skipped    : ${skipped}`);
    console.log(`Failed     : ${failed}`);
    console.log("==================================");

}

// ==============================
// Save Question Options
// ==============================
function saveOptions(questionId, row, callback) {

    insertOptions(questionId, row, (err) => {

        if (err) {
            return callback(err);
        }

        console.log("Options inserted.");

        callback(null);

    });

}

// ==============================
// Save Question Answer
// ==============================
function saveAnswer(questionId, row, callback) {

    insertAnswer(questionId, row, (err) => {

        if (err) {
            return callback(err);
        }

        console.log("Answer inserted.");

        callback(null);

    });

}


// ==============================
// Insert New Question
// ==============================
function insertNewQuestion(chapterId, row, callback) {

    insertQuestion(chapterId, row, (err, questionId) => {

        if (err) {
            return callback(err);
        }

        console.log("Question inserted.");

        saveOptions(questionId, row, (err) => {

            if (err) {
                return callback(err);
            }

            saveAnswer(questionId, row, (err) => {

                if (err) {
                    return callback(err);
                }

                callback(null);

            });

        });

    });

}


// ==============================
// Update Existing Question
// ==============================
function updateExistingQuestion(questionId, row, callback) {

    updateQuestion(questionId, row, (err) => {

        if (err) {
            return callback(err);
        }

        console.log("Question updated.");

        // -----------------------------
        // Delete Old Options
        // -----------------------------
        deleteOptions(questionId, (err) => {

            if (err) {
                return callback(err);
            }

            console.log("Old options deleted.");

            // -----------------------------
            // Save New Options
            // -----------------------------
            saveOptions(questionId, row, (err) => {

                if (err) {
                    return callback(err);
                }

                // -----------------------------
                // Delete Old Answer
                // -----------------------------
                deleteAnswer(questionId, (err) => {

                    if (err) {
                        return callback(err);
                    }

                    console.log("Old answer deleted.");

                    // -----------------------------
                    // Save New Answer
                    // -----------------------------
                    saveAnswer(questionId, row, (err) => {

                        if (err) {
                            return callback(err);
                        }

                        callback(null);

                    });

                });

            });

        });

    });

}


function importRow(index) {

    // Finished importing all rows
    if (index >= results.length) {

        printSummary();
        return;

    }

    const row = results[index];

    const validationError = validateRow(row);

    if (validationError) {

        console.log(
            `⚠ Row ${index + 1}: ${validationError} Skipped.`
        );

        skipped++;

        return importRow(index + 1);

    }

    console.log("");
    console.log(`Importing Question ${index + 1}...`);

    // -----------------------------
    // Get Subject ID
    // -----------------------------
    getSubjectId(row.Subject, (err, subjectId) => {

        if (err) {
            failed++;
            console.error(err.message);
            return importRow(index + 1);
        }

        // -----------------------------
        // Get Chapter ID
        // -----------------------------
        getChapterId(subjectId, row.Chapter, (err, chapterId) => {

            if (err) {
                failed++;
                console.error(err.message);
                return importRow(index + 1);

               
            }
            // -----------------------------
            // Check if Question Exists
            // -----------------------------
            getQuestionId(chapterId, row.No, (err, questionId) => {

                if (err) {
                    failed++;
                    console.error(err.message);
                    return importRow(index + 1);
                }

                // ==================================
                // QUESTION ALREADY EXISTS
                // ==================================
               if (questionId) {

                    console.log(`Updating Question ${row.No}...`);

                    updateExistingQuestion(questionId, row, (err) => {

                        if (err) {
                            failed++;
                            console.error(err.message);
                            return importRow(index + 1);
                        }

                        imported++;

                        importRow(index + 1);

                    });

                }else {

                    insertNewQuestion(chapterId, row, (err) => {

                        if (err) {
                            failed++;
                            console.error(err.message);
                            return importRow(index + 1);
                        }

                        imported++;

                        importRow(index + 1);

                    });

                }

                }

            );
        });

    });
}
