const { Builder, By, until, Key } = require('selenium-webdriver');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const chrome = require('selenium-webdriver/chrome');
const { addDays, format } = require('date-fns');
const fs = require('fs');

async function scrapeData(fromDate, toDate, airport) {
    let options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

        console.info(`Starting scrape for ${airport} from ${fromDate} to ${toDate}`);

    try {
        await driver.get('https://www.skyparksecure.com/?promo=SEO12');
        await driver.wait(until.elementLocated(By.id('onetrust-accept-btn-handler')), 10000).click();

        let dropdown = await driver.findElement(By.className('airportSelector'));
        await dropdown.click();
        const option = await driver.findElement(By.xpath(`//select[@id='airportSelectorParking']/option[contains(text(), '${airport}')]`));
        await option.click();

        await driver.executeScript(`document.getElementById('dateAairportParking').value = '${fromDate}';`);
        await driver.executeScript(`document.getElementById('dateBairportParking').value = '${toDate}';`);
        await driver.findElement(By.id('airportParkingSearch')).click();
        await driver.wait(until.elementsLocated(By.className('parking_info_block')), 20000);

        let blocks = await driver.findElements(By.className('parking_info_block'));
        let data = [];

        for (let block of blocks) {
            let productName = await block.findElement(By.tagName('h2')).getText();
            let price = await block.findElement(By.className('price')).getText();
            data.push({ airport, productName, fromDate, toDate, price });
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
            {id: 'airport', title: 'Airport'},
            {id: 'productName', title: 'Product Name'},
            {id: 'fromDate', title: 'From Date'},
            {id: 'toDate', title: 'To Date'},
            {id: 'price', title: 'Price'}
        ],
        append: fs.existsSync(filename)
    });

    await csvWriter.writeRecords(data);
    console.info(`Data successfully written to ${filename}`);
}

async function main() {
    const airport = 'Manchester';
    const filename = `${airport}_parking_data.csv`; 

    let allData = [];

    for (let i = 1; i <= 30; i++) {
        const fromDate = addDays(new Date(), i);
        const toDate = addDays(fromDate, 7);
        const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
        const formattedToDate = format(toDate, 'yyyy-MM-dd');

        const data = await scrapeData(formattedFromDate, formattedToDate, airport);
        allData.push(...data); 
    }

    await writeToCSV(allData, filename); 
}

main();