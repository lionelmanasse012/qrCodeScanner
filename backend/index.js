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
// app.use(cors({
//   origin: 'https://qrcodescanner-m728.onrender.com/', // Autoriser votre front-end
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type'],
// }));

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Endpoint pour vérifier le QR code
app.post('/verify-qr', async (req, res) => {
  const { qrCodeSerial } = req.body; // Récupération du champ `qrCodeSerial` depuis le body de la requête

  // Validation des données reçues
  if (!qrCodeSerial) {
    return res
      .status(400)
      .json({ success: false, message: 'QR Code serial manquant.' });
  }

  try {
    // Vérifie si le QR code existe dans la base de données
    const query = 'SELECT status FROM qrData WHERE qrcodeserial = $1';
    const result = await pool.query(query, [qrCodeSerial]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'QR Code invalide ou inexistant.',
      });
    }

    const { status } = result.rows[0]; // Récupère le statut actuel du QR Code

    // Renvoyer le statut trouvé dans la base de données
    return res.json({
      success: true,
      status: status, // Le statut trouvé dans la base de données
      message: `Statut du QR Code : ${status}.`, // Message basé sur le statut
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

  // Validation des données reçues
  if (!qrCodeSerial) {
    return res
      .status(400)
      .json({ success: false, message: 'QR Code serial manquant.' });
  }

  try {
    // Vérifie si le QR code existe dans la base de données
    const query = 'SELECT status FROM qrData WHERE qrcodeserial = $1';
    const result = await pool.query(query, [qrCodeSerial]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'QR Code invalide ou inexistant.',
      });
    }

    const { status } = result.rows[0];

    // Si le statut est déjà "paid", ne pas faire de mise à jour
    if (status === 'paid') {
      return res.json({
        success: false,
        message: 'QR Code déjà payé.',
      });
    }

    // Mettre à jour le statut en "paid"
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
