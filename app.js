require("dotenv").config();
const fs = require("fs");
const PublicGoogleSheetsParser = require("public-google-sheets-parser");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

const parser = new PublicGoogleSheetsParser(SPREADSHEET_ID);

class FAQ {
  constructor(row) {
    this.question = row["Question (markdown)"];
    this.answer = row["Answer (markdown)"];
    this.status = row["Status"];
    this.module = row["Module"];
  }
}

parser
  .parse(SPREADSHEET_ID, SHEET_NAME)
  .then((items) => {
    const lessonsDictionary = {};

    items.forEach((row) => {
      // Skip questions labeled as TODO or BACKLOG
      if (row["Status"] !== "DONE") {
        return;
      }

      const lessons = row["LAB/Exercise"]
        ? row["LAB/Exercise"]
            .trim()
            .split(",")
            .map((e) => e.trim())
        : ["Unknown"];

      lessons.forEach((lesson) => {
        // Remove empty strings generated when parsing lesson names
        if (lesson === "") return;

        const faq = new FAQ(row);

        // Construct lesson name string: MODULE + LESSON NAME
        const lessonName = faq.module + " " + lesson;
        if (!lessonsDictionary[lessonName]) {
          lessonsDictionary[lessonName] = [];
        }

        lessonsDictionary[lessonName].push(faq);
      });
    });

    delete lessonsDictionary[" "];

    // Add default questions labeled as "ALL LABS" to all lessons
    for (const lessonName in lessonsDictionary) {
      console.log("HERE HERE HERE -> lesson:", `"${lessonName}"`);
      if (
        lessonName !== "Labs (ALL) ALL LABS START" &&
        lessonName !== "Labs (ALL) ALL LABS END"
      ) {
        const startFAQs = lessonsDictionary["Labs (ALL) ALL LABS START"];
        const endFAQs = lessonsDictionary["Labs (ALL) ALL LABS END"];
        const currentLessonFAQs = lessonsDictionary[lessonName];

        const lessonFAQsComplete = [
          ...startFAQs,
          ...currentLessonFAQs,
          ...endFAQs,
        ];

        lessonsDictionary[lessonName] = lessonFAQsComplete;
      }
    }

    // Remove the arrays with default questions "ALL LABS START" and "ALL LABS END"
    delete lessonsDictionary["Labs (ALL) ALL LABS START"];
    delete lessonsDictionary["Labs (ALL) ALL LABS END"];

    // Final result as json
    fs.writeFile(
      "all-faqs.json",
      JSON.stringify(lessonsDictionary),
      function (err) {
        if (err) throw err;
        console.log("complete");
      }
    );

    // Convert FAQ objects into a string for each lesson
    for (const lesson in lessonsDictionary) {
      let lessonText = `
# ${lesson}
      
## FAQs

`;

      lessonsDictionary[lesson].forEach((faq) => {
        lessonText += `
<details>
  <summary>${faq.question}</summary>
  
  ${faq.answer}

  <br>

  [Back to top](#faqs)

</details>

`;
      });

      // Format the markdown file name
      const fileName = lesson.toLowerCase().replace(" ", "-").replace("|", "");

      // Write to a file
      fs.writeFile(
        __dirname + `/markdown/${fileName}.md`,
        lessonText,
        function (err) {
          if (err) throw err;
          console.log(`done - ${fileName}`);
        }
      );
    }
  })
  .catch((error) => {
    console.log("ERROR", error);
  });
