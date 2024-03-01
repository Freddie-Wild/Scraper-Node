const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { addDays, format } = require("date-fns");
const fs = require("fs");
const today = new Date();
const formattedToday = format(today, "yyyy-MM-dd");
const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config(); 

const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function scrapeData(driver, fromDate, toDate, airport) {

  try {

  const promoCode = "";
  console.info(`Starting scrape for ${airport} from ${fromDate} to ${toDate}`);
  try {
    // BEGIN_SCRAPER_CODE
    await driver.get(`https://www.skyparksecure.com/?promo=${promoCode}`);

    let dropdown = await driver.findElement(By.className("airportSelector"));
    await dropdown.click();
    const option = await driver.findElement(By.xpath(`//select[@id='airportSelectorParking']/option[contains(text(), '${airport}')]`));
    await option.click();

    await driver.executeScript(`document.getElementById('dateAairportParking').value = '${fromDate}';`);
    await driver.executeScript(`document.getElementById('dateBairportParking').value = '${toDate}';`);
    await driver.findElement(By.id("airportParkingSearch")).click();
    await driver.wait(until.elementsLocated(By.className("parking_info_block")), 20000);
    // END_SCRAPER_CODE

    let blocks = await driver.findElements(By.className("parking_info_block"));
    let data = [];
    for (let block of blocks) {
      let productName = await block.findElement(By.tagName("h2")).getText();
      let price = await block.findElement(By.className("price")).getText();
      let oldPrice;
      try {
        oldPrice = await block.findElement(By.className("old-price")).getText();
      } catch (error) {
        oldPrice = price;
      }
      let searchDate = new Date().toISOString();
      data.push({
        airport,
        productName,
        fromDate,
        toDate,
        price,
        oldPrice,
        searchDate,
        promoCode: promoCode
      });
    }
    console.info(`Scraping completed for ${airport} from ${fromDate} to ${toDate}`);
    return data;
  } catch (error) {
    return [];
  }} catch (error) {
    console.error("Error during scraping:", error);
    await handleScrapingFailure(error)
}

async function writeToCSV(data, filename) {
  const csvWriter = createCsvWriter({
    path: filename,
    header: [
      { id: "searchDate", title: "Search Date" },
      { id: "airport", title: "Airport" },
      { id: "productName", title: "Product Name" },
      { id: "fromDate", title: "From Date" },
      { id: "toDate", title: "To Date" },
      { id: "price", title: "Discounted Price" },
      { id: "oldPrice", title: "Original Price" },
      { id: "promoCode", title: "Promo Code" },
    ],
    append: fs.existsSync(filename),
  });
  await csvWriter.writeRecords(data);
  console.info(`Data successfully written to ${filename}`);

}}

async function main() {
    let options = new chrome.Options().addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
    let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  
    try {
      await driver.get('https://www.skyparksecure.com/');
      const cookiesButton = await driver.wait(until.elementLocated(By.id("onetrust-accept-btn-handler")), 10000);
      await cookiesButton.click();
      console.log("Accepted cookies");
  
      const airports = [
        // Reference airports
        //"Birmingham", "Bristol", "East Midlands", "Edinburgh", "Gatwick", "Heathrow",
        //"Leeds Bradford", "Liverpool", "Luton", "Manchester", "Newcastle", "Southampton", "Stansted"
        "Luton"]
      for (const airport of airports) {
        let allData = [];
        for (let i = 1; i <= 90; i++) {
          const fromDate = addDays(new Date(), i);
          const toDate = addDays(fromDate, 7);
          const formattedFromDate = format(fromDate, "yyyy-MM-dd");
          const formattedToDate = format(toDate, "yyyy-MM-dd");
          console.log(`Scraping data for dates ${formattedFromDate} to ${formattedToDate}`);
          const data = await scrapeData(driver, formattedFromDate, formattedToDate, airport);
          allData.push(...data);
        }
        const filename = `Skyparks_${airport}_${formattedToday}_parking_data.csv`;
        await writeToCSV(allData, filename);
      }
    } catch (error) {
      console.error("Encountered an error", error);
    } finally {
      await driver.quit();
    }
  }

  async function handleScrapingFailure(error) {
    console.log("Attempting to repair the scraper...");
    const repairSuccessful = await attemptRepair();
    
    if (repairSuccessful) {
      console.log("Repair successful. Retrying scrape...");
      scrapeData(); // Retry scraping
    } else {
      console.error("Repair failed. Exiting.");
    }
  }

  async function attemptRepair() {
    // Fetch current HTML and analyse
    const elementsData = await fetchWebsiteHTML();
    const analysisResult = await analyzeHtmlElementsForSearch(elementsData);
    
    // Generate new Selenium code based on analysis
    const newCode = await generateSeleniumCode(analysisResult);
    await updateScraperCode(newCode)
    
    if (newCode) {
      // Dynamically update the scraper with the new code
      return true;
    }
    
    return false;
  }

  async function updateScraperCode(newCode) {
    const scraperFilePath = path.join(__dirname, 'scraper.js');
    
    try {
      // Read the current contents of the scraper file
      let content = await fs.readFile(scraperFilePath, { encoding: 'utf8' });
  
      // Define the markers that surround the code to be replaced
      const beginMarker = '// BEGIN_SCRAPER_CODE';
      const endMarker = '// END_SCRAPER_CODE';
  
      // Extract the part before and after the existing Selenium code
      const partBeforeCode = content.split(beginMarker)[0] + beginMarker;
      const partAfterCode = endMarker + content.split(endMarker)[1];
  
      // Combine them with the new code
      const updatedContent = `${partBeforeCode}\n${newCode}\n${partAfterCode}`;
  
      // Write the updated content back to the scraper file
      await fs.writeFile(scraperFilePath, updatedContent, { encoding: 'utf8' });
  
      console.log('Scraper code updated successfully.');
      return true;
    } catch (error) {
      console.error('Failed to update scraper code:', error);
      return false;
    }
  }
  
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

        console.log('Fetched website HTML elements:', elementsData);

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
    analysisContent = analysisResult.message.content;

    const seleniumPrompt = `Translate the following requirements into JavaScript Selenium WebDriver code to automate a web form submission based on the analyzed HTML elements using stricly the names in the following:\n\n${analysisContent} we should be scraping Manchester Airport for the 1st of March to the 7th of March 2024 from 01:00 to 01:00 on the website ${websiteURL}`;
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

const websiteURL = 'https://www.skyparksecure.com';
fetchWebsiteHTML(websiteURL);

  
  
  main();