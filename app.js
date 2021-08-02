const { Client } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const {body, validationResult} = require('express-validator');
const socketIO = require("socket.io");
const http = require("http");
const fs = require('fs');
const {phoneNumberFormatter} = require('./helpers/formatter');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extend: true }));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ 
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ]
    }, 
    session: sessionCfg 
});

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('!pong');
    }
});

client.initialize();

io.on('connection', function (socket) {
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR code received, scan please!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'whatsapp is ready!');
        socket.emit('message', 'whatsapp is ready!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'whatsapp is authenticated!');
        socket.emit('message', 'whatsapp is authenticated!');
        console.log('AUTHENTICATED', session);
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });
});

const checkRegisteredNumber = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}

// Send message
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req).formatWith(({msg}) => {
        return msg;
    });

    if(!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        })
    }
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if(!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
        });
    }

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        })
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

server.listen(8000, function () {
    console.log("App running on : " + 8000);
});