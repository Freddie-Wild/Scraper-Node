const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { addDays, format, add } = require("date-fns");
const fs = require("fs");
const { ca } = require("date-fns/locale");
const today = new Date();
const formattedToday = format(today, "yyyy-MM-dd");

async function scrapeData(driver, fromDate, toDate, airport, formattedDuration) {

  const promoCode = "COMPARE";
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
        formattedDuration,
        price,
        oldPrice,
        discountPercentage,
        searchDate,
        promoCode: promoCode
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
      { id: "formattedDuration", title: "Duration" },
      { id: "price", title: "Discounted Price" },
      { id: "oldPrice", title: "Original Price" },
      { id: "discountPercentage", title: "Discount %" },
      { id: "promoCode", title: "Promo Code" },
    ],
    append: fs.existsSync(filename),
  });
  await csvWriter.writeRecords(data);
  console.info(`Data successfully written to ${filename}`);
}

async function main() {
  let options = new chrome.Options().addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    const airports = ["Luton", "Manchester", "East Midlands", "Stansted", "Birmingham"];
    const durations = [3, 7, 14]
    for (const airport of airports) {
      let allData = []; 
      try {
        for (const duration of durations) {
          const formattedDuration = duration + 1;

          for (let i = 1; i <= 5; i++) {
            const fromDate = addDays(new Date(), i);
            const toDate = addDays(fromDate, duration);
            const formattedFromDate = format(fromDate, "yyyy-MM-dd");
            const formattedToDate = format(toDate, "yyyy-MM-dd");
            console.log(`Scraping data for dates ${formattedFromDate} to ${formattedToDate}`);
            const data = await scrapeData(driver, formattedFromDate, formattedToDate, airport, formattedDuration);
            allData.push(...data); 
          }
        }
        const formattedToday = format(new Date(), "yyyy-MM-dd");
        const filename = `Skyparks_${airport}_${formattedToday}_parking_data.csv`;
        await writeToCSV(allData, filename); 
      } catch (error) {
        console.error("Encountered an error", error);
      }
    }
  } finally {
    await driver.quit();
  }
}


main();
  
