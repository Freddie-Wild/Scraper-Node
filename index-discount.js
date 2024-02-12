const { Builder, By, until, Key } = require("selenium-webdriver");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const chrome = require("selenium-webdriver/chrome");
const { addDays, format } = require("date-fns");
const fs = require("fs");

async function scrapeData(fromDate, toDate, airport) {
  let options = new chrome.Options();
  options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");

  let promoCode = "SP20UK";

  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  console.info(`Starting scrape for ${airport} from ${fromDate} to ${toDate}`);

  try {
    await driver.get(`https://www.skyparksecure.com/?promo=${promoCode}`);

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

    await driver.wait(
      until.elementsLocated(By.className("parking_info_block")),
      20000
    );

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
        promoCode
      });
    }

    console.info(
      `Scraping completed for ${airport} from ${fromDate} to ${toDate}`
    );
    return data;
  } finally {
    console.log("finished");
  }
}

async function writeToCSV(data, filename) {
  console.info(`Writing data to ${filename}`);
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
  let options = new chrome.Options();
  options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    const airports = [
      "Birmingham",
      "Bristol",
      "Cardiff",
      "East Midlands",
      "Edinburgh",
      "Gatwick",
      "Glasgow",
      "Heathrow",
      "Leeds Bradford",
      "Liverpool",
      "Luton",
      "Manchester",
      "Newcastle",
      "Southampton",
    ];
    const searchDate = new Date();
    console.log(`Search date: ${searchDate}`);

    for (const airport of airports) {
      const filename = `${airport}_parking_data.csv`;

      let allData = [];

      const webdriver = require("selenium-webdriver");

      for (let i = 1; i <= 2; i++) {
        console.log(`starting iteration ${i}`);
        try {
          const fromDate = addDays(new Date(), i);
          const toDate = addDays(fromDate, 7);
          const formattedFromDate = format(fromDate, "yyyy-MM-dd");
          const formattedToDate = format(toDate, "yyyy-MM-dd");
          console.log(
            `Scraping data for dates ${formattedFromDate} to ${formattedToDate}`
          );
          const data = await scrapeData(
            formattedFromDate,
            formattedToDate,
            airport
          );
          allData.push(...data);
          console.log(`Finished iteration ${i}`);
        } catch (error) {
          if (error instanceof webdriver.error.StaleElementReferenceError) {
            console.error(
              "Encountered a stale element error, skipping this iteration...",
              error
            );
            continue;
          } else {
            console.error("Encountered an error, re-throwing...", error);
            throw error;
          }
        }
      }

      await writeToCSV(allData, filename);
    }
  } catch (error) {
    console.error("Encountered an error", error);
  } finally {
  await driver.quit();
  }
}

main();
