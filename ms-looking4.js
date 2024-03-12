const { Builder, By, until, Options, logging } = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { addDays, format } = require("date-fns");
const fs = require("fs");
const today = new Date()
const formattedToday = format(today, "yyyy-MM-dd")

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeData(driver, fromDate, toDate, airport) {
  const promoCode = "";
  console.info(`Starting scrape for ${airport} from ${fromDate} to ${toDate}`);
  try {
    await driver.get(`https://www.looking4.com/uk/airport-parking`);

    
    // Wait and click the search input to open the dropdown
    const searchInput = await driver.wait(until.elementLocated(By.id('searchInput')), 10000);
    await searchInput.click();

    // Wait for the dropdown to appear and be clickable
    await driver.wait(until.elementLocated(By.css('.input-dropdown')), 10000);
    const airportList = await driver.findElements(By.css('.input-dropdown-item'));
    for (let item of airportList) {
      const text = await item.getText();
      if (text.includes(airport)) {
        await driver.executeScript("arguments[0].click();", item);
        break;
      }
    }


    // Set from and to dates using JavaScript Executor
    await driver.executeScript(`document.getElementById('fromDateInput').value = '${fromDate}';`);
    await driver.executeScript(`document.getElementById('toDateInput').value = '${toDate}';`);


    // Click the submit button to search
    const submitButton = await driver.findElement(By.className('submit'));
    await driver.executeScript("arguments[0].click();", submitButton);

    // Wait for the results to be displayed
    await driver.wait(until.elementsLocated(By.className("product-card__container")), 20000);

    // Now scrape the product cards for information
    let blocks = await driver.findElements(By.className("product-card__container"));
    let data = [];
    for (let block of blocks) {
      let productName = await block.findElement(By.className("product-card__header-category")).getText();
      let price = await block.findElement(By.className("product-card__header-price-now")).getText();
      let oldPrice;
      try {
        oldPrice = await block.findElement(By.className("old-price")).getText();
      } catch (error) {
        oldPrice = price; // If there is no old price, use the current price
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
        promoCode
      });
    }
    console.info(`Scraping completed for ${airport} from ${fromDate} to ${toDate}`);
    return data;
  } catch (error) {
    console.error("Error during scraping:", error);
    return [];
  }
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
}

async function main() {
  const options = new chrome.Options();
  options.addArguments("--headless","--no-sandbox", "--disable-dev-shm-usage", "--disable-web-security", "--disable-features=SameSiteByDefaultCookies");
  
  const logPrefs = new logging.Preferences();
  logPrefs.setLevel(logging.Type.BROWSER, logging.Level.OFF); // Or use a different level as needed
  options.setLoggingPrefs(logPrefs);
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    try {
      await driver.get('https://www.looking4.com/uk/airport-parking');
      const cookiesButton = await driver.wait(until.elementLocated(By.id("onetrust-accept-btn-handler")), 10000);
      await cookiesButton.click();
      console.log("Accepted cookies");
  
      const airports = [
        //"Birmingham", "Bristol", "East Midlands", "Edinburgh", "Gatwick", "Heathrow",
        //"Leeds Bradford", "Liverpool", "Luton", "Manchester", "Newcastle", "Southampton", "Stansted"
        "Manchester", "East Midlands", "Stansted"]
      for (const airport of airports) {
        let allData = [];
        for (let i = 1; i <= 5; i++) {
          const fromDate = addDays(new Date(), i);
          const toDate = addDays(fromDate, 8);
          const formattedFromDate = format(fromDate, "yyyy-MM-dd");
          const formattedToDate = format(toDate, "yyyy-MM-dd");
          console.log(`Scraping data for dates ${formattedFromDate} to ${formattedToDate}`);
          const data = await scrapeData(driver, formattedFromDate, formattedToDate, airport);
          allData.push(...data);
        }
        const filename = `looking4_${airport}_parking_data_${formattedToday}.csv`;
        await writeToCSV(allData, filename);
      }
    } catch (error) {
      console.error("Encountered an error", error);
    } finally {
      await driver.quit();
    }
  }
  
  main();