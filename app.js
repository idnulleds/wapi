const express = require('express');
const whatsapp = require('whatsapp-web.js');
const qrcode = require('qrcode');
const app = express();
require('dotenv').config();

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const cors = require('cors');

const port = process.env.PORT || 3000;
let qrData = null;
let client;
let isLoggedIn = false;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inisialisasi Client
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
    console.log('QR Code received');
    qrcode.toDataURL(qr, (err, url) => {
        qrData = url;
    });
});

client.on('ready', () => {
    console.log('Client is ready');
    isLoggedIn = true;
});

client.on('authenticated', (session) => {
    console.log('Authenticated');
});

client.on('disconnected', () => {
    console.log('Client was logged out');
    isLoggedIn = false;
});

// Endpoint untuk menampilkan QR Code
app.get('/qr', (req, res) => {
    if (!qrData) {
        res.send('QR Code is not available yet, please wait...');
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

// Endpoint untuk mengirim pesan
app.post('/send', async (req, res) => {
    if (!isLoggedIn) {
        return res.status(400).send('Client is not logged in yet');
    }

    const { number, message } = req.body;

    try {
        const send = await client.sendMessage(number, message);
        res.send(send);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Mulai client
client.initialize();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
