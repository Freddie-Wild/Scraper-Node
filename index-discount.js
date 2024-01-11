const { Builder, By, until, Key } = require("selenium-webdriver");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const chrome = require("selenium-webdriver/chrome");
const { addDays, format } = require("date-fns");
const fs = require("fs");

async function scrapeData(fromDate, toDate, airport) {
  let options = new chrome.Options();
  options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");

  let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  console.info(`Starting scrape for ${airport} from ${fromDate} to ${toDate}`);

  try {
    await driver.get("https://www.skyparksecure.com/?promo=SEO12");

    const cookiesButton = await driver.wait(
      until.elementLocated(By.id("onetrust-accept-btn-handler")),
      10000
    );
    await cookiesButton.click();
    console.log("Clicked accept cookies button");

    let dropdown = await driver.findElement(By.className("airportSelector"));
    await dropdown.click();
    const option = await driver.findElement(
      By.xpath(
        `//select[@id='airportSelectorParking']/option[contains(text(), '${airport}')]`
      )
    );
    await option.click();

    await driver.executeScript(
      `document.getElementById('dateAairportParking').value = '${fromDate}';`
    );
    await driver.executeScript(
      `document.getElementById('dateBairportParking').value = '${toDate}';`
    );
    await driver.findElement(By.id("airportParkingSearch")).click();
    await driver.wait(
      until.elementsLocated(By.className("parking_info_block")),
      20000
    );

    /*
    // Wait for the "Reveal" button to be present in the DOM and click it
    console.log('Waiting for reveal button');
    const revealButton = await driver.wait(until.elementLocated(By.className('btn-reveal')), 10000);
    await revealButton.click();
    console.log('Clicked reveal button');

    // Wait for the email input field in the modal to be present in the DOM, clear it, and enter the email address
    console.log('Waiting for email input');
    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000);
    await emailInput.clear();
    await emailInput.sendKeys('test@test.com');
    console.log('Entered email address');

    // Handle submit button interaction
    try {
      const submitButtonLocator = By.css('.input-group .btn.btn-secondary');
      await driver.wait(until.elementLocated(submitButtonLocator), 10000);
      await driver.wait(until.elementIsVisible(submitButtonLocator), 10000);
      await driver.wait(until.elementToBeClickable(submitButtonLocator), 10000);
      let submitButton = await driver.findElement(submitButtonLocator);
      await submitButton.click();
    } catch (error) {
      console.error("Encountered a stale element error, re-attempting...", error);
      const submitButtonLocator = By.css('.input-group .btn.btn-secondary');
      await driver.wait(until.elementLocated(submitButtonLocator), 10000);
      await driver.wait(until.elementIsVisible(submitButtonLocator), 10000);
      await driver.wait(until.elementToBeClickable(submitButtonLocator), 10000);
      let submitButton = await driver.findElement(submitButtonLocator);
      await submitButton.click();
    }
    */

    // Wait for the results to load
    await driver.wait(until.elementsLocated(By.className('parking_info_block')), 20000);

    // Scrape the results
    let blocks = await driver.findElements(By.className('parking_info_block'));
    let data = [];

    for (let block of blocks) {
      let productName = await block.findElement(By.tagName('h2')).getText();
      let price = await block.findElement(By.className('price')).getText();
      let oldPrice;
      try {
        oldPrice = await block.findElement(By.className('old-price')).getText();
      } catch (error) {
        oldPrice = 'N/A'; // or '0', or any other default value
      }
      let searchDate = new Date().toISOString();
      data.push({ airport, productName, fromDate, toDate, price, oldPrice, searchDate });
    }
    console.info(`Scraping completed for ${airport} from ${fromDate} to ${toDate}`);
    return data;
  } finally {
    await driver.quit();
  }
}

async function writeToCSV(data, filename) {
  console.info(`Writing data to ${filename}`);
  const csvWriter = createCsvWriter({
    path: filename,
    header: [
      { id: 'searchDate', title: 'Search Date'},
      { id: "airport", title: "Airport" },
      { id: "productName", title: "Product Name" },
      { id: "fromDate", title: "From Date" },
      { id: "toDate", title: "To Date" },
      { id: "price", title: "Discounted Price" },
      { id: "oldPrice", title: "Original Price" },
    ],
    append: fs.existsSync(filename),
  });

  await csvWriter.writeRecords(data);
  console.info(`Data successfully written to ${filename}`);
}

async function main() {
  let options = new chrome.Options();
  options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");

  let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

  const airports = ["Birmingham", "Bristol", "Cardiff", "East Midlands", "Edinburgh", "Gatwick", "Glasgow", "Heathrow", "Leeds Bradford", "Liverpool", "Luton", "Manchester", "Newcastle", "Southampton"];
  const searchDate = new Date();
  console.log(`Search date: ${searchDate}`);

  for (const airport of airports) {
    const filename = `${airport}_parking_data.csv`;

    let allData = [];

    for (let i = 1; i <= 2; i++) {
      const fromDate = addDays(new Date(), i);
      const toDate = addDays(fromDate, 7);
      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");

      const data = await scrapeData(
        formattedFromDate,
        formattedToDate,
        airport
      );
      allData.push(...data);
    }

    await writeToCSV(allData, filename);
  }

  await driver.quit();
}

main();
