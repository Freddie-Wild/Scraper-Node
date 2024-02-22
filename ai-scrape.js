const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
require('dotenv').config(); 

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

        $('input, select').each((index, element) => {
            elementsData.inputs.push({
                type: $(element).attr('type') || 'select', 
                name: $(element).attr('name'),
                placeholder: $(element).attr('placeholder'),
            });
        });

        $('button, input[type="submit"]').each((index, element) => {
            elementsData.buttons.push({
                text: $(element).attr('value') || $(element).text().trim(),
            });
        });

        await analyzeHtmlElementsForSearch(elementsData);

    } catch (error) {
        console.error('Error fetching website:', error);
    }
}

async function analyzeHtmlElementsForSearch(elementsData) {
    try {
        const prompt = `Given the following HTML elements from a webpage, identify which elements could be used to make a search for airport parking. we will be looking for fields where we can enter an Airport, a park from time, a park to time.\n\n${JSON.stringify(elementsData, null, 2)}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [{role: "user", 'content': prompt}],
            temperature: 0.5,
            max_tokens: 1024,
            n: 1,
            stop: null,
        });

        console.log("Analysis Result:", completion.choices[0]);
        await generateSeleniumCode(completion.choices[0])
    } catch (error) {
        console.error("Error analyzing HTML elements:", error);
    }
}

async function generateSeleniumCode(analysisResult) {
    const seleniumPrompt = `Translate the following requirements into JavaScript Selenium WebDriver code to automate a web form submission based on the analyzed HTML elements using stricly the names in the following:\n\n${analysisResult} we should be scraping Manchester Airport for the 1st of March to the 7th of March 2024 from 01:00 to 01:00 on the website ${websiteURL}`;
    console.log(analysisResult)
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{role: "user", 'content': seleniumPrompt}],
            temperature: 0.5,
            max_tokens: 800,
            n: 1,
            stop: null,
        });
        console.log("Generated Selenium JavaScript Code:", completion.choices[0]);
    } catch (error) {
        console.error("Error generating Selenium code:", error);
    }
}

const websiteURL = 'https://www.london-luton.co.uk/parking';
fetchWebsiteHTML(websiteURL);
