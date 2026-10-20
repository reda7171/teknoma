const http = require('http');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const PORT = parseInt(process.env.WHATSAPP_PORT || '3001', 10);
const AUTH_DIR = path.join(process.cwd(), 'data', 'whatsapp_auth');

// Assurer l'existence du dossier data
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// État global du gateway
let sock = null;
let connectionStatus = 'INITIALIZING'; // 'INITIALIZING' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
let currentQR = null;
let connectedUser = null;
let lastError = null;

async function startWhatsApp() {
    try {
        connectionStatus = 'CONNECTING';
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['Riwaya Store', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    currentQR = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
                    connectionStatus = 'SCAN_QR';
                    console.log('[WhatsApp Gateway] Nouveau QR Code prêt à être scanné.');
                } catch (qrErr) {
                    console.error('[WhatsApp Gateway] Erreur génération QR DataURL:', qrErr);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                lastError = lastDisconnect?.error?.message || null;
                connectedUser = null;
                currentQR = null;

                console.log(`[WhatsApp Gateway] Connexion fermée (code: ${statusCode}). Reconnexion : ${shouldReconnect}`);

                if (shouldReconnect) {
                    connectionStatus = 'CONNECTING';
                    setTimeout(() => startWhatsApp(), 5000);
                } else {
                    connectionStatus = 'DISCONNECTED';
                    try {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    } catch (_) {}
                    setTimeout(() => startWhatsApp(), 3000);
                }
            } else if (connection === 'open') {
                connectionStatus = 'CONNECTED';
                currentQR = null;
                lastError = null;

                const userJid = sock.user?.id || '';
                const cleanPhone = userJid.split(':')[0] || userJid.split('@')[0];
                connectedUser = {
                    id: userJid,
                    name: sock.user?.name || 'Riwaya Store',
                    phone: `+${cleanPhone}`
                };
                console.log(`[WhatsApp Gateway] Connecté avec succès ! Téléphone : +${cleanPhone}`);
            }
        });
    } catch (err) {
        console.error('[WhatsApp Gateway] Erreur critique démarrage socket:', err);
        connectionStatus = 'DISCONNECTED';
        lastError = err.message;
        setTimeout(() => startWhatsApp(), 10000);
    }
}

// Fonction pour formater un numéro de téléphone marocain ou international en JID WhatsApp
function formatToJid(phone) {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
        clean = '212' + clean.substring(1);
    } else if (clean.length === 9) {
        clean = '212' + clean;
    }
    return `${clean}@s.whatsapp.net`;
}

// Serveur HTTP local
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // GET /status
    if (req.method === 'GET' && url.pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            status: connectionStatus,
            qr: currentQR,
            user: connectedUser,
            error: lastError,
            port: PORT,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // POST /send
    if (req.method === 'POST' && url.pathname === '/send') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                if (connectionStatus !== 'CONNECTED' || !sock) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'WhatsApp non connecté. Veuillez scanner le QR code d\'abord.'
                    }));
                    return;
                }

                const data = JSON.parse(body || '{}');
                const { to, message } = data;

                if (!to || !message) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Champs "to" et "message" requis.' }));
                    return;
                }

                const jid = formatToJid(to);
                const result = await sock.sendMessage(jid, { text: message });

                console.log(`[WhatsApp Gateway] Message envoyé avec succès à ${jid}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    messageId: result?.key?.id,
                    recipient: jid
                }));
            } catch (sendErr) {
                console.error('[WhatsApp Gateway] Erreur envoi message:', sendErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: sendErr.message }));
            }
        });
        return;
    }

    // POST /logout
    if (req.method === 'POST' && url.pathname === '/logout') {
        try {
            if (sock) {
                await sock.logout().catch(() => {});
            }
            try {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            } catch (_) {}

            connectedUser = null;
            currentQR = null;
            connectionStatus = 'INITIALIZING';

            setTimeout(() => startWhatsApp(), 1000);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Session déconnectée. Nouveau QR en cours de génération.' }));
        } catch (logoutErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: logoutErr.message }));
        }
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Endpoint non trouvé' }));
});

const HOST = process.env.WHATSAPP_HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
    console.log(`[WhatsApp Gateway] Serveur en écoute sur http://${HOST}:${PORT}`);
    startWhatsApp();
});
