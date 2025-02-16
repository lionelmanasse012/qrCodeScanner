const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Endpoint pour vérifier le QR code
app.post('/verify-qr', (req, res) => {
  const qrCodeData = req.body.qrCode;

  // Logique de vérification (par exemple, vérifier dans une base de données ou valider un token)
  if (qrCodeData === "valide") {
    return res.json({ success: true, message: 'QR Code valide!' });
  } else {
    return res.json({ success: false, message: 'QR Code invalide.' });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
