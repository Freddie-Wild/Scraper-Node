const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function scrapeData(fromDate, toDate, airport) {
  let driver = await new Builder().forBrowser("chrome")
                  .setChromeOptions(new chrome.Options().headless())
                  .build();

  try {
    await driver.get(`https://www.skyparksecure.com/?promo=SP20UK`);
    const cookiesButton = await driver.wait(until.elementLocated(By.id("onetrust-accept-btn-handler")), 10000);
    await cookiesButton.click();
    console.log("Accepted cookies");

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
        promoCode: "SP20UK"
      });
    }
    console.info(`Scraping completed for ${airport} from ${fromDate} to ${toDate}`);
    return data;
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error; // Rethrow the error to handle it in the calling function
  } finally {
    await driver.quit();
  }
}

module.exports = { scrapeData };
