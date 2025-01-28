const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Middleware to parse JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let qrData = null;
let isAuthenticated = false;

// Initialize WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth(), // Using LocalAuth to store session
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

// When the QR code is received
client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrcode.toDataURL(qr, (err, url) => {
    qrData = url;
  });
});

// When authenticated successfully
client.on('authenticated', () => {
  console.log('Client authenticated');
  isAuthenticated = true;
});

// When client is ready to send and receive messages
client.on('ready', () => {
  console.log('Client is ready');
});

// Listen for messages and auto-reply
client.on('message', async (msg) => {
  console.log('MESSAGE RECEIVED', msg);
  if (msg.body === 'Hi') {
    msg.reply('Hello!');
  }
  if (msg.body === 'How are you?') {
    msg.reply('I am fine, thank you!');
  }
});

// Initialize WhatsApp client
client.initialize();

// Routes

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to WhatsApp Web API');
});

// QR Code route for user to scan
app.get('/qr', (req, res) => {
  if (!qrData) {
    res.send('QR code is not available yet. Please wait...');
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

// Send message route
app.post('/send-message', async (req, res) => {
  if (!isAuthenticated) {
    return res.send('Client is not authenticated, please scan the QR code first.');
  }

  const { number, message } = req.body;
  try {
    const sendMessage = await client.sendMessage(number, message);
    res.send({ success: true, response: sendMessage });
  } catch (error) {
    console.log(error);
    res.send({ success: false, error: error.message });
  }
});

// Get all chats
app.get('/chats', async (req, res) => {
  if (!isAuthenticated) {
    return res.send('Client is not authenticated, please scan the QR code first.');
  }

  try {
    const chats = await client.getChats();
    res.send({ success: true, chats });
  } catch (error) {
    console.log(error);
    res.send({ success: false, error: error.message });
  }
});

// Get messages from a specific chat
app.get('/chat/:id/messages', async (req, res) => {
  const { id } = req.params;

  if (!isAuthenticated) {
    return res.send('Client is not authenticated, please scan the QR code first.');
  }

  try {
    const chat = await client.getChatById(id);
    const messages = await chat.fetchMessages();
    res.send({ success: true, messages });
  } catch (error) {
    console.log(error);
    res.send({ success: false, error: error.message });
  }
});

// Logout route to log out the client
app.get('/logout', async (req, res) => {
  if (!isAuthenticated) {
    return res.send('Client is not authenticated');
  }

  await client.logout();
  isAuthenticated = false;
  res.send('Client logged out');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
