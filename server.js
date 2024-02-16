const express = require('express');
const bodyParser = require('body-parser');
const { scrapeData } = require('./scraper-backend.js'); 

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); 

app.post('/scrape', async (req, res) => {
  const { fromDate, toDate, airport } = req.body;

  try {
    const data = await scrapeData(fromDate, toDate, airport);
    res.json(data); 
  } catch (error) {
    res.status(500).send(`Scraping error: ${error.message}`);
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
