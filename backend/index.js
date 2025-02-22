import express from 'express';
import bodyParser from 'body-parser';
import pkg from 'pg'; // PostgreSQL package
import cors from 'cors'; // CORS package

const { Pool } = pkg;
const app = express();
const port = 3000;

// Configuration de la base de données PostgreSQL
const pool = new Pool({
  connectionString:
    'postgresql://qrcodedb_8ucn_user:JVanRXMtzrPrqnpGezvLP1IHZnx1AcWD@dpg-cupdo35svqrc73f041vg-a.frankfurt-postgres.render.com/qrcodedb_8ucn',
  ssl: {
    rejectUnauthorized: false, // Désactive la vérification du certificat SSL (important pour Render)
  },
});

// Middleware pour gérer CORS
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'https://qrcodescanner-m728.onrender.com'], // Allow multiple domains
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Endpoint pour vérifier le QR code
app.post('/verify-qr', async (req, res) => {
  const { qrCodeSerial } = req.body;

  if (!qrCodeSerial) {
    return res
      .status(400)
      .json({ success: false, message: 'QR Code serial manquant.' });
  }

  try {
    const query = 'SELECT status FROM qrData WHERE qrcodeserial = $1';
    const result = await pool.query(query, [qrCodeSerial]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'QR Code invalide ou inexistant.',
      });
    }

    const { status } = result.rows[0];

    return res.json({
      success: true,
      status,
      message: `Statut du QR Code : ${status}.`,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du QR Code:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la vérification du QR Code.',
    });
  }
});

// Endpoint pour mettre à jour le statut du QR code
app.post('/update-status', async (req, res) => {
  const { qrCodeSerial } = req.body;

  if (!qrCodeSerial) {
    return res
      .status(400)
      .json({ success: false, message: 'QR Code serial manquant.' });
  }

  try {
    const query = 'SELECT status FROM qrData WHERE qrcodeserial = $1';
    const result = await pool.query(query, [qrCodeSerial]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'QR Code invalide ou inexistant.',
      });
    }

    const { status } = result.rows[0];

    if (status === 'paid') {
      return res.json({
        success: false,
        message: 'QR Code déjà payé.',
      });
    }

    const updateQuery = 'UPDATE qrData SET status = $1 WHERE qrcodeserial = $2';
    await pool.query(updateQuery, ['paid', qrCodeSerial]);

    return res.json({
      success: true,
      message: 'Statut mis à jour avec succès.',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du QR Code:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la mise à jour du QR Code.',
    });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
