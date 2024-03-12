const axios = require("axios");
const cheerio = require("cheerio");
const { OpenAI } = require("openai");
require("dotenv").config();
const websiteURL = "https://www.skyparksecure.com";
const threadId = "thread_QfPRVO4my5TmpKXrXuyekUHp";

async function main() {
  try {
    fetchWebsiteHTML(websiteURL);
    const openai = new OpenAI(process.env.OPENAI_API_KEY);
    //const openai = new OpenAI(base_url="http://localhost:1234/v", api_key="not-needed")

    async function fetchWebsiteHTML(url) {
      try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const elementsData = {
          inputs: [],
          buttons: [],
        };

        $("input, select").each((index, element) => {
          elementsData.inputs.push({
            type: $(element).attr("type") || "select",
            name: $(element).attr("name"),
            placeholder: $(element).attr("placeholder"),
          });
        });

        $('button, input[type="submit"]').each((index, element) => {
          elementsData.buttons.push({
            text: $(element).attr("value") || $(element).text().trim(),
          });
        });

        console.log("Fetched website HTML elements:", elementsData);

        await analyzeHtmlElementsForSearch(elementsData);
      } catch (error) {
        console.error("Error fetching website:", error);
      }
    }

    async function analyzeHtmlElementsForSearch(elementsData) {
      try {
        const prompt = `Given the following HTML elements from a webpage, identify which elements could be used to make a search for airport parking. we will be looking for fields where we can enter an Airport, a park from time, a park to time.\n\n${JSON.stringify(
          elementsData,
          null,
          2
        )}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 1024,
          n: 1,
          stop: null,
        });

        console.log("Analysis Result:", completion.choices[0]);
        await generateSeleniumCode(completion.choices[0]);
      } catch (error) {
        console.error("Error analyzing HTML elements:", error);
      }
    }

    async function generateSeleniumCode(analysisResult) {
      analysisContent = analysisResult.message.content;
      try {
        const seleniumPrompt = `Translate the following requirements into JavaScript Selenium WebDriver code to automate a web form submission based on the analyzed HTML elements using stricly the names in the following:\n\n${analysisContent} we should be scraping Manchester Airport for the 1st of March to the 7th of March 2024 from 01:00 to 01:00 on the website ${websiteURL} please only include code and nothing else as this will be directly inserted into a codebase. avoid typing any other code formatting as this will be done automatically.`;

        const threadMessages = await openai.beta.threads.messages.create(
          threadId,
          { role: "user", content: seleniumPrompt }
        );

        const run = await openai.beta.threads.runs.create(threadId, {
          assistant_id: "asst_Hd2HNWpoQhzuaW6PYx2rn4D5",
        });

        let runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
          )
      
          while (runStatus.status !== 'completed') {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
          }

        const threadMessageList = await openai.beta.threads.messages.list(
          threadId,
         'limit: 20'
        );

        const lastMessage = threadMessageList.data[0].content[0].text.value;
        //console.log(threadMessageList.data[0].content[0].text.value);
        console.log(lastMessage)

      } catch (error) {
        console.error("Error during scraping:", error);
      }
    }
  } catch (error) {
    console.error("Error during scraping:", error);
  }
}
main();
