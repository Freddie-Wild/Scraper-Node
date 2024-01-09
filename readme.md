# Airport Parking Data Scraper

This project is a web scraper that collects parking data for various airports.

## Description

The script scrapes parking data for the following airports:

- Birmingham
- Bristol
- Cardiff
- East Midlands
- Edinburgh
- Gatwick
- Glasgow
- Heathrow
- Leeds Bradford
- Liverpool
- Luton
- Manchester
- Newcastle
- Southampton

For each airport, the script collects parking data for the next two weeks and writes the data to a CSV file.

## How to Run

1. Install the required dependencies:

```bash
npm install
```

```node index-discount.js```

## Output

The script will create a CSV file for each airport in the project directory. Each file will contain parking data for the next two weeks.

## Dependencies

This project uses the following dependencies:

Selenium WebDriver: For automating web browser interaction.
date-fns: For manipulating JavaScript dates in a browser & Node.js.
