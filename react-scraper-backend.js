const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

async function scrapeData(fromDate, toDate, promoCode, airport) {
  let options = new chrome.Options().addArguments(
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage"
  );
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  try {
    console.info(
      `Starting scrape for ${airport} from ${fromDate} to ${toDate}`
    );
    await driver.get(`https://www.skyparksecure.com/?promo=${promoCode}`);

    try {
      const cookiesButton = await driver.wait(
        until.elementLocated(By.id("onetrust-accept-btn-handler")),
        10000
      );
      await driver.wait(until.elementIsVisible(cookiesButton), 10000);
      await cookiesButton.click();
      console.log("Accepted cookies.");
    } catch (error) {
      console.log("Cookie consent button not found or not clickable:", error);
    }
    try {
        let dropdown = await driver.findElement(By.className("airportSelector"));
        await dropdown.click();
        const option = await driver.findElement(By.xpath(`//select[@id='airportSelectorParking']/option[contains(text(), '${airport}')]`));
        await option.click();
        console.log("Selected airport:", airport);
    } catch (error) {
      console.error("Error selecting airport:", error);
    }

    try {
    await driver.executeScript(`document.getElementById('dateAairportParking').value = '${fromDate}';`);
    await driver.executeScript(`document.getElementById('dateBairportParking').value = '${toDate}';`);
    await driver.findElement(By.id("airportParkingSearch")).click();
    console.log("Set date and clicked search.");
    } catch (error) {
      console.error("Error setting date and clicking search:", error);
    }

    


    let currentUrl = await driver.getCurrentUrl();
        console.log(currentUrl);
    await driver.wait(until.elementsLocated(By.className("parking_info_block")), 10000);



    let blocks = await driver.wait(until.elementsLocated(By.className("parking_info_block")), 10000);



        console.log("Found parking info blocks:", blocks.length);
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
    console.log(
      `Scraping completed for ${airport} from ${fromDate} to ${toDate}`
    );
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error; // Rethrow error to be caught by the calling function
  } finally {
    await driver.quit();
  }
  return data;
}

app.post("/scrape", async (req, res) => {
  const { fromDate, toDate, promoCode, airport, duration } = req.body;
  // Assuming duration is handled by your frontend and is not relevant for this specific scraping function
  try {
    // You may want to adjust how you handle the date range and duration here
    const data = await scrapeData(fromDate, toDate, promoCode, airport);
    res.json(data);
  } catch (error) {
    res.status(500).send("Error during scraping process.");
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
