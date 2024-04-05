const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const main = require('./ms-skyparks'); // Import the function from your script

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const fs = require('fs').promises;

const port = 3000;

app.use(express.static('public')); // Serve static files
app.use(express.json()); // Support JSON-encoded bodies
app.use('/csv', express.static('csv_files'));

io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Endpoint to trigger the scrape
app.post('/scrape', async (req, res) => {
    const { days, duration, promoCode, airports } = req.body;

    try {
        await main(days, duration, promoCode, airports, (message) => {
            io.emit('log', message); // Emit the message to all connected clients
        });
        res.send({ message: 'Scraping initiated successfully!' });
    } catch (error) {
        console.error('Scraping failed:', error);
        res.status(500).send({ error: 'An error occurred during scraping.' });
    }
});




server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
