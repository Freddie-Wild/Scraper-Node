const { Builder, By, until, Options, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { format, addDays } = require('date-fns');
const { scrapeData } = require('./scraper');
const { writeToCSV } = require('./writer');
const { handleScrapingError } = require('./errorHandling');

const today = new Date();
const formattedToday = format(today, "yyyy-MM-dd");

async function main() {
    const options = new chrome.Options();
    options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
    
    const logPrefs = new logging.Preferences();
    logPrefs.setLevel(logging.Type.BROWSER, logging.Level.SEVERE);
    options.setLoggingPrefs(logPrefs);    const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

    try {
        await driver.get('https://www.skyparksecure.com/');
        const cookiesButton = await driver.wait(until.elementLocated(By.id("onetrust-accept-btn-handler")), 10000);
        await cookiesButton.click();
        console.log("Accepted cookies");

        const airports = ["Stansted", "East Midlands"];
        for (const airport of airports) {
            let allData = [];
            for (let i = 1; i <= 2; i++) {
                const fromDate = addDays(today, i);
                const toDate = addDays(fromDate, 7);
                const formattedFromDate = format(fromDate, "yyyy-MM-dd");
                const formattedToDate = format(toDate, "yyyy-MM-dd");
                console.log(`Scraping data for dates ${formattedFromDate} to ${formattedToDate}`);
                try {
                    const data = await scrapeData(driver, formattedFromDate, formattedToDate, airport);
                    allData.push(...data);
                } catch (error) {
                    console.error(`Error scraping data for ${airport} on dates ${formattedFromDate} to ${formattedToDate}`, error);
                    await handleScrapingError(error, driver);
                }
            }
            const filename = `Skyparks_${airport}_${formattedToday}_parking_data.csv`;
            await writeToCSV(allData, filename);
        }
    } catch (error) {
        console.error("Encountered an error during initial setup", error);
    } finally {
        await driver.quit();
    }
}

main().catch(error => console.error("Error in main execution", error));
