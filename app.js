const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
const cors = require('cors');

// Setup CORS
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Middleware to parse JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the WhatsApp client
let client;
let qrData = null;
let isAuthenticated = false;

// Function to initialize WhatsApp client
function initClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            if (err) {
                console.error('Error generating QR Code: ', err);
                return;
            }
            qrData = url;
        });
    });

    client.on('authenticated', () => {
        isAuthenticated = true;
        console.log('Client authenticated');
    });

    client.on('ready', () => {
        console.log('Client is ready');
    });

    client.on('disconnected', () => {
        isAuthenticated = false;
        console.log('Client disconnected');
    });

    client.initialize();
}

// Initialize the WhatsApp client on startup
initClient();

// Routes
app.get('/', (req, res) => {
    res.send('WhatsApp API is running. Use /qr to get the login QR code.');
});

// Endpoint to serve QR code
app.get('/qr', (req, res) => {
    if (!qrData) {
        res.send('QR Code not available yet, please wait...');
    } else {
        res.send(`
            <h1>Scan the QR Code to Log in</h1>
            <img src="${qrData}" />
            <p>Once scanned, you will be logged in.</p>
            <script>
                setTimeout(function() {
                    window.location.reload(1);
                }, 5000);
            </script>
        `);
    }
});

// Endpoint to check if authenticated
app.get('/status', (req, res) => {
    if (isAuthenticated) {
        res.send('Client is authenticated');
    } else {
        res.send('Client is not authenticated');
    }
});

// Send message API
app.post('/send', async (req, res) => {
    if (!isAuthenticated) {
        return res.send('Client is not authenticated. Please scan the QR code first.');
    }
    const { number, message } = req.body;
    try {
        const send = await client.sendMessage(number, message);
        res.send(send);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error sending message');
    }
});

// Send media API
app.post('/sendMedia', async (req, res) => {
    if (!isAuthenticated) {
        return res.send('Client is not authenticated. Please scan the QR code first.');
    }
    const { number, mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) {
        return res.send('Please provide a media URL');
    }

    try {
        const media = await MessageMedia.fromUrl(mediaUrl);
        const send = await client.sendMessage(number, media, { caption });
        res.send(send);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error sending media');
    }
});

// Server listener
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
