const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// QR Code Data URL স্টোর করার জন্য ভ্যারিয়েবল
let qrCodeDataURL = '';
let isClientReady = false;

// WhatsApp Client Initialization
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
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

// QR Code জেনারেট করা
client.on('qr', async (qr) => {
    console.log('নতুন QR Code জেনারেট হয়েছে। ব্রাউজারে দেখুন।');
    try {
        // QR code কে Data URL (Base64 Image) এ কনভার্ট করা
        qrCodeDataURL = await QRCode.toDataURL(qr);
        isClientReady = false;
    } catch (err) {
        console.error('QR Code কনভার্ট করতে সমস্যা:', err);
    }
});

client.on('ready', () => {
    console.log('WhatsApp Web সফলভাবে রেডি হয়েছে এবং সার্ভার সক্রিয়!');
    isClientReady = true;
    qrCodeDataURL = ''; // স্ক্যান হয়ে গেলে QR ক্লিয়ার করে দেওয়া
});

client.on('authenticated', () => {
    console.log('WhatsApp সেশন সফলভাবে রেজিস্টার্ড হয়েছে!');
});

client.on('auth_failure', msg => {
    console.error('Authentication সমস্যা হয়েছে:', msg);
});

// ব্রাউজারে QR Code দেখানোর জন্য Route
app.get('/', (req, res) => {
    if (isClientReady) {
        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h2 style="color: green;">WhatsApp Client is Ready and Connected!</h2>
                <p>আপনার হোয়াটসঅ্যাপ বোট সক্রিয় আছে।</p>
            </div>
        `);
    }

    if (qrCodeDataURL) {
        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h2>আপনার WhatsApp দিয়ে নিচের QR Code-টি স্ক্যান করুন</h2>
                <img src="${qrCodeDataURL}" alt="WhatsApp QR Code" style="width: 300px; height: 300px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;" />
                <p style="color: gray;">স্ক্যান করা হয়ে গেলে পেজটি রিফ্রেশ করুন।</p>
            </div>
        `);
    }

    return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h2>QR Code তৈরি হচ্ছে...</h2>
            <p>অনুগ্রহ করে কয়েক সেকেন্ড পর পেজটি রিফ্রেশ (Refresh) করুন।</p>
        </div>
    `);
});

// Google Apps Script থেকে মেসেজ আসার API Endpoint
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ status: 'error', message: 'Phone and message are required' });
    }

    try {
        const cleanPhone = phone.toString().replace(/\D/g, '');
        const formattedPhone = `${cleanPhone}@c.us`;
        
        await client.sendMessage(formattedPhone, message);
        console.log(`মেসেজ সফলভাবে পাঠানো হয়েছে: ${cleanPhone}`);
        
        return res.status(200).json({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
        console.error('মেসেজ পাঠাতে সমস্যা:', error);
        return res.status(500).json({ status: 'error', error: error.toString() });
    }
});

// সার্ভার চালু করা
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

client.initialize();
