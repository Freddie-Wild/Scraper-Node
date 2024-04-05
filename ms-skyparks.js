const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { addDays, format } = require("date-fns");
const fs = require("fs");
const today = new Date();
const formattedToday = format(today, "yyyy-MM-dd");
const competitor = "Skyparksecure";

async function scrapeData(driver, fromDate, toDate, airport, promoCode) {

  console.info(`Starting scrape for ${airport} from ${fromDate} to ${toDate}`);
  try {
    await driver.get(`https://www.skyparksecure.com/?promo=${promoCode}`);

    let dropdown = await driver.findElement(By.className("airportSelector"));
    await dropdown.click();
    const option = await driver.findElement(By.xpath(`//select[@id='airportSelectorParking']/option[contains(text(), '${airport}')]`));
    await option.click();

    await driver.executeScript(`document.getElementById('dateAairportParking').value = '${fromDate}';`);
    await driver.executeScript(`document.getElementById('dateBairportParking').value = '${toDate}';`);
    await driver.findElement(By.id("airportParkingSearch")).click();
    await driver.wait(until.elementsLocated(By.className("parking_info_block")), 20000);

    let blocks = await driver.findElements(By.className("parking_info_block"));
    let data = [];
    for (let block of blocks) {
      let productName = await block.findElement(By.tagName("h2")).getText();
      let priceText = await block.findElement(By.className("price")).getText();
      let oldPriceText;
      try {
        oldPriceText = await block.findElement(By.className("old-price")).getText();
      } catch (error) {
        oldPriceText = priceText;
      }
      let price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
      let oldPrice = parseFloat(oldPriceText.replace(/[^\d.-]/g, ''));
      let discountPercentage = (oldPrice !== price) ? ((oldPrice - price) / oldPrice) * 100 : 0;
      discountPercentage = parseFloat(discountPercentage.toFixed(2));
      let searchDate = new Date().toISOString();
      data.push({
        airport,
        productName,
        fromDate,
        toDate,
        price,
        oldPrice,
        discountPercentage,
        searchDate,
        promoCode: promoCode,
        competitor
      });
    }
    console.info(`Scraping completed for ${airport} from ${fromDate} to ${toDate}`);
    return data;
  } catch (error) {
    console.error("Error during scraping:", error);
    return [];
  }
}

async function writeToCSV(data, filenamePrefix) {
  let chunkSize = 50; 
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunkData = data.slice(i, i + chunkSize);
    const partNum = Math.floor(i / chunkSize) + 1; 
    const filename = `${filenamePrefix}_part${partNum}.csv`; 
    const csvWriter = createCsvWriter({
      path: filename,
      header: [
        { id: "searchDate", title: "Search_Date" },
        { id: "competitor", title: "Competitor" },
        { id: "airport", title: "Airport" },
        { id: "productName", title: "Product_Name" },
        { id: "fromDate", title: "From_Date" },
        { id: "toDate", title: "To_Date" },
        { id: "price", title: "Discounted_Price" },
        { id: "oldPrice", title: "Original_Price" },
        { id: "discountPercentage", title: "Discount_PC" },
        { id: "promoCode", title: "Promo_Code" },
      ],
      append: false, 
    });
    await csvWriter.writeRecords(chunkData);
    console.info(`Data successfully written to ${filename}`);
  }
}

async function main(days, duration, promoCode, airports, loggingCallback) {
  let options = new chrome.Options().addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
  let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  const intDuration = parseInt(duration);
  const intDays = parseInt(days);

  // Use the logging callback instead of console.log
  const log = (message) => {
      if (typeof loggingCallback === 'function') {
          loggingCallback(message);
      } else {
          console.log(message); // Fallback to console.log if loggingCallback is not a function
      }
  };

  try {
      await driver.get('https://www.skyparksecure.com/');
      // Example of using the log function
      log(`Navigated to Skyparksecure`);

      for (const airport of airports) {
          let allData = [];
          for (let i = 1; i <= intDays; i++) {
              const fromDate = addDays(new Date(), i);
              const toDate = addDays(fromDate, intDuration);

              const formattedFromDate = format(fromDate, "yyyy-MM-dd");
              const formattedToDate = format(toDate, "yyyy-MM-dd");
              log(`Scraping data for ${airport}: Dates ${formattedFromDate} to ${formattedToDate}`);
              
              const data = await scrapeData(driver, formattedFromDate, formattedToDate, airport, promoCode);
              allData.push(...data);
          }
          const filenamePrefix = `Skyparks_${airport}_${formattedToday}_parking_data`; 
          await writeToCSV(allData, filenamePrefix);
          log(`Data successfully written to ${filenamePrefix}.csv`);
      }
  } catch (error) {
      log("Encountered an error: " + error.toString());
  } finally {
      await driver.quit();
      log("Browser closed");
  }
}

module.exports = main;