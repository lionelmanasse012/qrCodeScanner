import express from 'express';
import bodyParser from 'body-parser';
import { Pool } from 'pg'; // PostgreSQL

const app = express();
const port = 3000;

// Configuration de la base de données PostgreSQL
const pool = new Pool({
  connectionString: "postgresql://qrcodedb_8ucn_user:JVanRXMtzrPrqnpGezvLP1IHZnx1AcWD@dpg-cupdo35svqrc73f041vg-a.frankfurt-postgres.render.com/qrcodedb_8ucn",
  ssl: {
    rejectUnauthorized: false, // Désactive la vérification du certificat SSL (important pour Render)
  },
});

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Endpoint pour vérifier et mettre à jour le QR code
app.post('/verify-qr', async (req, res) => {
  const qrCodeSerial = req.body.qrCodeSerial; // On s'attend à ce que qrCodeSerial soit envoyé dans la requête

  // Validation des données reçues
  if (!qrCodeSerial) {
    return res.status(400).json({ success: false, message: 'QR Code serial manquant.' });
  }

  try {
    // Vérifie si le QR code existe dans la base de données
    const query = 'SELECT status FROM qrData WHERE qrCodeSerial = $1';
    const result = await pool.query(query, [qrCodeSerial]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'QR Code invalide ou inexistant.' });
    }

    const status = result.rows[0].status; // Récupère le statut actuel du QR Code

    if (status === 'paid') {
      // Si le QR code est déjà payé, renvoyer un message
      return res.json({
        success: false,
        message: 'QR Code déjà payé.',
      });
    } else if (status === 'pending') {
      // Si le statut est "pending", mettre à jour vers "paid"
      const updateQuery = 'UPDATE qrData SET status = $1 WHERE qrCodeSerial = $2';
      await pool.query(updateQuery, ['paid', qrCodeSerial]);

      return res.json({
        success: true,
        message: 'QR Code validé avec succès, statut mis à jour en "paid".',
      });
    } else {
      // Cas où le statut est autre chose (ajoute cette gestion si nécessaire)
      return res.json({
        success: false,
        message: `Statut non valide pour l'opération : ${status}.`,
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification/mise à jour du QR Code:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la vérification/mise à jour du QR Code.',
    });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
