import { BrowserQRCodeReader } from 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

const videoElement = document.getElementById('video');
const resultElement = document.getElementById('result');
const qrResultElement = document.getElementById('qr-result');

const codeReader = new BrowserQRCodeReader();

// Fonction pour démarrer la caméra arrière automatiquement
async function startCamera() {
  try {
    // Récupérer tous les appareils disponibles
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    // Trouver la caméra arrière (si disponible)
    const backCamera = videoDevices.find(device => device.facing === 'environment');
    
    if (!backCamera) {
      alert('Aucune caméra arrière disponible');
      return;
    }

    // Demander l'accès à la caméra arrière spécifiquement
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: backCamera.deviceId }
    });

    videoElement.srcObject = stream;

    // Démarrer la lecture du QR code directement depuis le flux vidéo
    codeReader.decodeFromVideoDevice(null, videoElement, async (result, err) => {
      if (result) {
        console.log('QR Code détecté :', result.text);  // Afficher les données du QR Code
        qrResultElement.textContent = result.text; // Afficher le QR code détecté

        // Extraire le QRCodeSerial du QR code
        const qrData = result.text;
        const qrCodeSerial = extractQRCodeSerial(qrData);

        console.log('QRCodeSerial extrait:', qrCodeSerial); // Log pour vérifier l'extraction

        if (!qrCodeSerial) {
          // Si le QRCodeSerial n'existe pas, alerter l'utilisateur
          alert('QR Code invalide');
          resultElement.textContent = 'QR Code invalide';
        } else {
          // Envoi du QRCodeSerial pour validation dans la base de données
          const response = await fetch('https://qr-code-scanner-vgeo.onrender.com/verify-qr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrCodeSerial })
          });

          const data = await response.json();

          if (data.success) {
            resultElement.textContent = data.message; // Afficher la réponse du serveur
          } else {
            resultElement.textContent = data.message; // Afficher la réponse d'erreur
          }
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

// Fonction pour extraire le QRCodeSerial depuis les données du QR Code
function extractQRCodeSerial(data) {
  console.log('Données du QR Code:', data); // Log des données du QR Code

  const lines = data.split('\n'); // Découpe chaque ligne
  const serialLine = lines.find(line => line.includes('QRCodeSerial')); // Cherche la ligne contenant QRCodeSerial

  if (serialLine) {
    const parts = serialLine.split(':').map(item => item.trim());
    return parts[1]; // Retourne la valeur du QRCodeSerial
  }
  return null; // Si QRCodeSerial n'est pas trouvé, retourne null
}

// Lancer la caméra automatiquement au chargement de la page
window.onload = startCamera;
