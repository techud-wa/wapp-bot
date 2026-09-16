const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// WhatsApp Client Initialization
const client = new Client({
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
            '--disable-gpu'
        ]
    }
});

// QR Code জেনারেট করা (রেন্ডারের Logs-এ এটি দেখতে পাবেন)
client.on('qr', (qr) => {
    console.log('--- আপনার WhatsApp দিয়ে নিচের QR Code-টি স্ক্যান করুন ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Web সফলতা সাথে রেডি হয়েছে এবং সার্ভার সক্রিয়!');
});

client.on('authenticated', () => {
    console.log('WhatsApp সেশন সফলভাবে রেজিস্টার্ড হয়েছে!');
});

client.on('auth_failure', msg => {
    console.error('Authentication সমস্যা হয়েছে:', msg);
});

// Google Apps Script থেকে মেসেজ আসার API Endpoint
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ status: 'error', message: 'Phone and message are required' });
    }

    try {
        // দেশীয় কোডসহ নম্বর ফরম্যাট করা (যেমন: 919876543210@c.us)
        const cleanPhone = phone.toString().replace(/\D/g, '');
        const formattedPhone = `${cleanPhone}@c.us`;
        
        // হোয়াটসঅ্যাপ মেসেজ সেন্ড
        await client.sendMessage(formattedPhone, message);
        console.log(`মেসেজ সফলভাবে পাঠানো হয়েছে: ${cleanPhone}`);
        
        return res.status(200).json({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
        console.error('মেসেজ পাঠাতে সমস্যা:', error);
        return res.status(500).json({ status: 'error', error: error.toString() });
    }
});

// সার্ভার চালু করা (Render পোর্ট হ্যান্ডলিং সহ)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

client.initialize();