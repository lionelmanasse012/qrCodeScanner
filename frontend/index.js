import { BrowserQRCodeReader } from 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

const videoElement = document.getElementById('video');
const resultElement = document.getElementById('result');
const qrResultElement = document.getElementById('qr-result');

const codeReader = new BrowserQRCodeReader();

// Fonction pour démarrer la caméra automatiquement
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;

    // Démarrer la lecture du QR code directement depuis le flux vidéo
    codeReader.decodeFromVideoDevice(null, videoElement, async (result, err) => {
      if (result) {
        console.log('QR Code détecté :', result.text);
        qrResultElement.textContent = result.text; // Afficher le QR code détecté

        // Envoi de la donnée au serveur pour validation
        const response = await fetch('https://qr-code-scanner.onrender.com/verify-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ qrCode: result.text })
        });

        const data = await response.json();

        if (data.success) {
          resultElement.textContent = data.message; // Afficher la réponse du serveur
        } else {
          resultElement.textContent = data.message; // Afficher la réponse d'erreur
        }
      } else if (err) {
        console.warn(err.message); // Afficher les erreurs mineures
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'accès à la caméra:', error);
    alert('Impossible d\'accéder à la caméra. Vérifie les permissions.');
  }
}

// Lancer la caméra automatiquement au chargement de la page
window.onload = startCamera;
