const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { addDays, format } = require("date-fns");
const fs = require("fs");
const airport = 'Luton'

async function scrapeData(driver, fromDate, toDate) {

 
  console.info(`Starting scrape for Luton from ${fromDate} to ${toDate}`);
  try {
    await driver.get(`https://parking.london-luton.co.uk/search?dateFrom=${fromDate}&timeFrom=08:00&dateTo=${toDate}&timeTo=20:00&direction=OUTBOUND&returnTrip=true`);

    console.log('url loaded')
    await driver.wait(until.elementsLocated(By.css(".product-list .product-card")), 20000);

    let blocks = await driver.findElements(By.css(".product-list .product-card"));
    console.log(`Found ${blocks.length} blocks`);    let data = [];
    for (let block of blocks) {

        await driver.wait(until.elementsLocated(By.css(".product-card__header")), 20000);

       
        let productNameText = await block.findElement(By.css(".product-card__header")).getText();
        let productName = productNameText.trim().toLowerCase(); // Normalize the text
        
        if (productName.includes("fast track") || productName.includes("donation")) {
            continue; // Skip this iteration and move to the next block
        }
        
        // Execute script within the context of the block to get the price
        let price = await driver.executeScript("return arguments[0].querySelector('.text-2xl.font-bold').textContent;", block);
        
        let oldPrice;
        try {
          oldPrice = await block.findElement(By.className("old-price")).getText();
        } catch (error) {
          oldPrice = price; // If there's no old price, use the current price
        }
        
        let searchDate = new Date().toISOString();
        data.push({
          airport: 'Luton',
          productName,
          fromDate,
          toDate,
          price,
          oldPrice,
          searchDate,
          promoCode: 'None'
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
    let options = new chrome.Options().addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
    let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  
    try {
      await driver.get('https://www.skyparksecure.com/');
      const cookiesButton = await driver.wait(until.elementLocated(By.id("onetrust-accept-btn-handler")), 10000);
      await cookiesButton.click();
      console.log("Accepted cookies");
  
      const airports = [
        //"Birmingham", "Bristol", "East Midlands", "Edinburgh", "Gatwick", "Heathrow",
        //"Leeds Bradford", "Liverpool", "Luton", "Manchester", "Newcastle", "Southampton", "Stansted"
        "Luton"]
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
        const filename = `${airport}_parking_data.csv`;
        await writeToCSV(allData, filename);
      }
    } catch (error) {
      console.error("Encountered an error", error);
    } finally {
      await driver.quit();
    }
  }
  
  main();