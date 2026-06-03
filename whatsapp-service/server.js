const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// URL du backend Python (à adapter selon l'environnement)
const FASTAPI_WEBHOOK_URL = process.env.FASTAPI_WEBHOOK_URL || 'http://127.0.0.1:8000/api/whatsapp/webhook';

// Stocker les sessions actives par restaurant_id
// Format: { "1": { client: Client, qr: "data:image/png...", status: "STARTING"|"QR_READY"|"CONNECTED" } }
const sessions = {};

// 1. Route pour obtenir le statut ou initialiser une session
app.get('/api/whatsapp/session/:restaurantId', async (req, res) => {
    const restaurantId = req.params.restaurantId;

    if (!sessions[restaurantId]) {
        // Initialiser une nouvelle session
        console.log(`Initialisation session pour Maquis ID: ${restaurantId}`);
        sessions[restaurantId] = {
            status: "STARTING",
            qr: null,
            client: new Client({
                authStrategy: new LocalAuth({ clientId: `maquis_${restaurantId}` }),
                puppeteer: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                }
            })
        };

        const client = sessions[restaurantId].client;

        client.on('qr', async (qrText) => {
            console.log(`QR Code généré pour Maquis ID: ${restaurantId}`);
            try {
                const qrDataUrl = await qrcode.toDataURL(qrText);
                sessions[restaurantId].qr = qrDataUrl;
                sessions[restaurantId].status = "QR_READY";
            } catch (err) {
                console.error("Erreur génération QR", err);
            }
        });

        client.on('ready', () => {
            console.log(`WhatsApp PRÊT pour Maquis ID: ${restaurantId}`);
            sessions[restaurantId].status = "CONNECTED";
            sessions[restaurantId].qr = null;
        });

        client.on('message', async (msg) => {
            // Ne pas répondre aux messages de statuts ou de groupe
            if (msg.from === 'status@broadcast' || msg.from.includes('@g.us')) return;

            console.log(`[Maquis ${restaurantId}] Message reçu de ${msg.from}: ${msg.body}`);

            // Transférer le message au backend Python (FastAPI)
            try {
                await axios.post(FASTAPI_WEBHOOK_URL, {
                    message: msg.body,
                    phone: msg.from,
                    restaurant_id: parseInt(restaurantId)
                });
            } catch (err) {
                console.error(`Erreur transfert webhook pour Maquis ${restaurantId}:`, err.message);
            }
        });

        client.on('disconnected', (reason) => {
            console.log(`WhatsApp déconnecté pour Maquis ID: ${restaurantId} - Raison: ${reason}`);
            delete sessions[restaurantId];
        });

        client.initialize();
    }

    // Renvoyer le statut actuel
    const session = sessions[restaurantId];
    res.json({
        restaurant_id: restaurantId,
        status: session.status,
        qr: session.qr
    });
});

// 2. Route pour que FastAPI demande l'envoi d'un message
app.post('/api/whatsapp/send', async (req, res) => {
    const { restaurant_id, to, message } = req.body;

    if (!restaurant_id || !to || !message) {
        return res.status(400).json({ error: "Paramètres manquants (restaurant_id, to, message)" });
    }

    const session = sessions[restaurant_id];
    if (!session || session.status !== "CONNECTED") {
        return res.status(400).json({ error: "Le téléphone de ce maquis n'est pas connecté à WhatsApp." });
    }

    try {
        await session.client.sendMessage(to, message);
        console.log(`[Maquis ${restaurant_id}] Réponse envoyée à ${to}`);
        res.json({ success: true });
    } catch (err) {
        console.error(`Erreur envoi message pour Maquis ${restaurant_id}:`, err);
        res.status(500).json({ error: "Échec de l'envoi WhatsApp" });
    }
});

// 3. Route pour demander un code de liaison (Pairing Code)
app.post('/api/whatsapp/pair/:restaurantId', async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: "Le numéro de téléphone est requis." });
    }

    const session = sessions[restaurantId];
    if (!session || !session.client) {
        return res.status(400).json({ error: "La session WhatsApp n'est pas initialisée." });
    }

    try {
        // Demander le code de liaison à WhatsApp (format attendu: XXXXXXXX)
        const pairingCode = await session.client.requestPairingCode(phoneNumber);
        console.log(`Code de liaison généré pour ${phoneNumber}: ${pairingCode}`);
        res.json({ code: pairingCode });
    } catch (err) {
        console.error("Erreur génération pairing code:", err);
        res.status(500).json({ error: "Impossible de générer le code. Vérifiez le format du numéro." });
    }
});

// 4. Déconnexion explicite
app.delete('/api/whatsapp/session/:restaurantId', async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const session = sessions[restaurantId];

    if (session) {
        try {
            await session.client.destroy();
        } catch(e) {}
        delete sessions[restaurantId];
    }
    
    res.json({ success: true, message: "Déconnecté" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Service WhatsApp démarré sur le port ${PORT}`);
});
