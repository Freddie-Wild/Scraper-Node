const { analyzeIssueWithOpenAI } = require('./aiAnalysis');
const fs = require('fs');

// Function to handle errors during scraping
async function handleScrapingError(error, driver) {
    // Log and capture the error details, console logs, etc.
    const logs = await driver.manage().logs().get("browser");
    const consoleErrors = logs || []
        .filter(entry => entry.level === 'SEVERE')
        .map(entry => entry.message);
    
    const errorInfo = {
        errorMessage: error.message,
        consoleErrors: consoleErrors.join('\n'), // Combine all console errors into a single string
        // Include other relevant information that might help in diagnosing the issue
    };

    // Capture a screenshot for debugging
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync('screenshot.png', screenshot, 'base64');

    // Now, pass the collected error information to the AI analysis function
    try {
        const aiSuggestedFix = await analyzeIssueWithOpenAI(errorInfo);

        if (aiSuggestedFix) {
            // If AI provides a fix, attempt to apply it or log it for review
            console.log("AI suggested a fix:", aiSuggestedFix);
            // Implement logic to apply the suggested fix or flag for manual review
            return aiSuggestedFix;
        } else {
            // If no fix could be suggested, escalate the error for manual intervention
            escalateError(errorInfo);
            return null;
        }
    } catch (aiError) {
        console.error("Error while attempting AI analysis:", aiError);
        escalateError({ ...errorInfo, aiError: aiError.message });
        return null;
    }
}

// Function to escalate errors when a fix can't be automatically determined
function escalateError(errorInfo) {
    // Implementation to escalate the error, such as logging, alerting, or emailing
    console.error("Escalating error, manual intervention needed:", errorInfo);
}

module.exports = { handleScrapingError };
