import { BrowserQRCodeReader } from 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

const videoElement = document.getElementById('video');
const validateButton = document.getElementById('validateButton'); // Récupérer le bouton "Valider"
const codeReader = new BrowserQRCodeReader();

let qrCodeSerial = null; // Variable pour stocker le QRCodeSerial détecté

// Fonction pour démarrer la caméra automatiquement
async function startCamera() {
  try {
    // Demander l'accès à la première caméra disponible
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true // Demander simplement la première caméra disponible
    });

    // Vérifier si le flux vidéo est bien récupéré
    if (!stream) {
      alert('Impossible d\'accéder au flux vidéo');
      return;
    }

    videoElement.srcObject = stream;

    // Démarrer la lecture du QR code directement depuis le flux vidéo
    codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
      if (result) {
        console.log('QR Code détecté :', result.text);  // Afficher les données du QR Code

        // Extraire le QRCodeSerial du QR code
        const qrData = result.text;
        qrCodeSerial = extractQRCodeSerial(qrData);

        console.log('QRCodeSerial extrait:', qrCodeSerial); // Log pour vérifier l'extraction

        if (!qrCodeSerial) {
          // Si le QRCodeSerial n'existe pas, alerter l'utilisateur
          alert('QR Code invalide');
          disableButton();  // Désactiver le bouton
        } else {
          // Si le QR code est valide, activer le bouton et vérifier automatiquement son statut
          enableButton();
          checkQRCodeStatus(qrCodeSerial);  // Vérifier le statut du QR code automatiquement
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

// Fonction pour activer le bouton "Valider"
function enableButton() {
  validateButton.disabled = false; // Désactiver la propriété "disabled"
  validateButton.classList.remove('bg-gray-400', 'cursor-not-allowed'); // Retirer les classes grises
  validateButton.classList.add('bg-blue-500', 'cursor-pointer'); // Ajouter la couleur bleue pour activer le bouton
}

// Fonction pour désactiver le bouton "Valider"
function disableButton() {
  validateButton.disabled = true; // Activer la propriété "disabled"
  validateButton.classList.remove('bg-blue-500', 'cursor-pointer'); // Retirer les classes activées
  validateButton.classList.add('bg-gray-400', 'cursor-not-allowed'); // Appliquer le style gris pour un bouton désactivé
}

// Fonction pour vérifier le statut du QR code automatiquement
async function checkQRCodeStatus(serial) {
  const response = await fetch('https://qr-code-scanner-vgeo.onrender.com/verify-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrCodeSerial: serial })
  });

  const data = await response.json();
  console.log('Réponse du serveur:', data);

  if (data.success) {
    if (data.status === "pending") {
      alert('QR Code en attente de validation');
    } else if (data.status === "paid") {
      alert('QR Code déjà payé');
      disableButton(); // Désactiver le bouton si payé
    }
  } else {
    alert('QR Code invalide');
  }
}

// Lancer la caméra automatiquement au chargement de la page
window.onload = startCamera;

// Ajouter l'événement de validation quand le bouton est cliqué
validateButton.addEventListener('click', async () => {
  if (qrCodeSerial) {
    // Mettre à jour le statut du QR code avec son serial
    const response = await fetch('https://qr-code-scanner-vgeo.onrender.com/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodeSerial })
    });

    const data = await response.json();

    console.log('Réponse du serveur:', data); // Log de la réponse pour déboguer

    if (data.success) {
      alert('QR Code validé avec succès');
      disableButton(); // Désactiver le bouton après la validation
    } else {
      alert('Erreur lors de la mise à jour du statut');
    }
  }
});
