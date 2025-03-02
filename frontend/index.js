import { BrowserQRCodeReader } from 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

const videoElement = document.getElementById('video');
const codeReader = new BrowserQRCodeReader();

let qrCodeSerial = null;
let scanning = false;  // Etat pour savoir si le scan est en cours
let videoStream = null;  // Flux vidéo

// Fonction pour démarrer la caméra et le scan
async function startCamera() {
  try {
    // Récupérer la liste des périphériques vidéo (caméras)
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    // Vérifier s'il existe des caméras vidéo disponibles
    if (videoDevices.length === 0) {
      Swal.fire('Erreur', 'Aucune caméra disponible. Assurez-vous que votre appareil en dispose.', 'error');
      return;
    }

    // Utiliser le premier périphérique vidéo disponible
    const firstCamera = videoDevices[0];

    // Obtenir le flux vidéo du premier périphérique vidéo
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: firstCamera.deviceId }
      }
    });

    if (!stream) {
      Swal.fire('Erreur', 'Impossible d\'accéder au flux vidéo', 'error');
      return;
    }

    // Si un flux vidéo existant est présent, on l'arrête avant d'en démarrer un nouveau
    if (videoStream) {
      const tracks = videoStream.getTracks();
      tracks.forEach(track => track.stop());
    }

    videoElement.srcObject = stream;
    videoStream = stream;  // Sauvegarder le flux pour pouvoir l'arrêter plus tard
    scanning = true;
    scanQRCode();  // Démarre le scan
  } catch (error) {
    console.error('Erreur d\'accès à la caméra:', error);
    Swal.fire('Erreur', 'Impossible d\'accéder à la caméra. Vérifie les permissions.', 'error');
  }
}

// Fonction pour scanner le QR Code
function scanQRCode() {
  if (!scanning) return;

  codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
    if (result) {

      // Si un QR Code a déjà été détecté, on arrête le scan
      if (qrCodeSerial) return;

      qrCodeSerial = extractQRCodeSerial(result.text);

      if (!qrCodeSerial) {
        Swal.fire('QR Code invalide', 'Essayez un autre QR Code.', 'error').then(() => {
          scanning = true;  // Relancer le scan après l'alerte
          scanQRCode();  // Recommencer à scanner
        });
      } else {
        checkQRCodeStatus(qrCodeSerial);
      }

      stopScanning(); // Arrêter le scan après la détection
    } else if (err) {
      console.warn(err.message);
    }
  });
}

// Fonction pour extraire le QRCodeSerial
function extractQRCodeSerial(data) {
  const lines = data.split('\n');
  const serialLine = lines.find(line => line.includes('QRCodeSerial'));

  if (serialLine) {
    const parts = serialLine.split(':').map(item => item.trim());
    return parts[1];
  }
  return null;
}

// Fonction pour vérifier le statut du QR code
async function checkQRCodeStatus(serial) {
  showLoadingAlert('Vérification en cours...'); // Afficher le loader pendant la vérification

  try {
    const response = await fetch('https://qr-code-scanner-vgeo.onrender.com/verify-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodeSerial: serial })
    });

    const data = await response.json();

    hideAlert(); // Fermer le loader après la réponse

    if (data.success) {
      if (data.status === "pending") {
        // Afficher le modal avec les options "Annuler" et "Payer"
        Swal.fire({
          title: 'Ticket valide',
          text: 'Souhaitez-vous payer maintenant ?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Payer',
          cancelButtonText: 'Annuler',
        }).then(async (result) => {
          if (result.isConfirmed) {
            await payTicket(serial); // Mettre à jour la base de données
          } else {
            resetScan(); // Relancer le scan si l'utilisateur annule
          }
        });
      } else if (data.status === "paid") {
        Swal.fire('QR Code déjà payé', 'Ce ticket a déjà été utilisé.', 'error').then(() => {
          resetScan();
        });
      }
    } else {
      Swal.fire('QR Code invalide', 'Veuillez scanner un autre QR Code.', 'error').then(() => {
        resetScan();
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du QR Code:', error);
    hideAlert();
    Swal.fire('Erreur', 'Une erreur est survenue lors de la vérification.', 'error').then(() => {
      resetScan();
    });
  }
}

// Fonction pour payer le ticket (mise à jour de la base de données)
async function payTicket(serial) {
  showLoadingAlert('Paiement en cours...'); // Afficher le loader pendant le paiement

  try {
    const response = await fetch('https://qr-code-scanner-vgeo.onrender.com/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodeSerial: serial })
    });

    const data = await response.json();

    hideAlert(); // Fermer le loader après la réponse

    if (data.success) {
      Swal.fire('Succès', 'QR Code validé et payé avec succès.', 'success').then(() => {
        resetScan();
      });
    } else {
      Swal.fire('Erreur', 'Impossible de mettre à jour le statut.', 'error').then(() => {
        resetScan();
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    hideAlert();
    Swal.fire('Erreur', 'Une erreur est survenue lors du paiement.', 'error').then(() => {
      resetScan();
    });
  }
}

// Fonction pour réinitialiser le scan après l'alerte
function resetScan() {
  qrCodeSerial = null;  // Réinitialiser le QR Code serial
  scanning = true;  // Relancer le scan après l'alerte
  scanQRCode();  // Recommencer à scanner
}

// Fonction pour afficher un loader SweetAlert2 avec un message dynamique
function showLoadingAlert(message) {
  Swal.fire({
    title: message,  // Utiliser le message dynamique
    text: 'Veuillez patienter',
    icon: 'info',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
}

// Fonction pour fermer l'alerte SweetAlert2
function hideAlert() {
  Swal.close();
}

// Fonction pour arrêter le scan
function stopScanning() {
  scanning = false;
  console.log('Scan arrêté');
}

// Lancer la caméra au chargement
window.onload = startCamera;
