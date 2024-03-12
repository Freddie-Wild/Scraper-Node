const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs"); // Ensure you have this if you're checking file existence elsewhere

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
        { id: "discountPercentage", title: "Discount %" },
        { id: "promoCode", title: "Promo Code" },
      ],
      // `append` option removed as it's not directly supported
    });
    await csvWriter.writeRecords(data);
    console.info(`Data successfully written to ${filename}`);
}

module.exports = { writeToCSV };
