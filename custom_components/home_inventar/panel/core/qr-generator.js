/**
 * Generează și descarcă un cod QR pentru deep linking în aplicația Home Assistant
 * Format: homeassistant://navigate/home_inventar?data=base64encoded
 */
export function downloadQRCode(room, cupboard) {
  const payload = JSON.stringify({ room, cupboard });
  const base64Data = btoa(payload);

  const deepLinkUrl = `homeassistant://navigate/home_inventar?data=${base64Data}`;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    deepLinkUrl
  )}`;

  const link = document.createElement('a');
  link.href = qrApiUrl;
  link.download = `QR_${room}_${cupboard}.png`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showQRPreview(qrApiUrl, room, cupboard, deepLinkUrl);
}

/**
 * Afișează un modal cu previzualizarea codului QR și instrucțiuni
 */
function showQRPreview(qrUrl, room, cupboard, deepLinkUrl) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div style="background: var(--card-background-color);
                border-radius: 16px;
                padding: 32px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                text-align: center;">
      <h2 style="margin: 0 0 24px 0;">📱 Cod QR Generat</h2>
      
      <div style="background: white;
                  padding: 20px;
                  border-radius: 12px;
                  margin-bottom: 24px;
                  display: inline-block;">
        <img src="${qrUrl}" 
             alt="QR Code"
             style="width: 300px;
                    height: 300px;
                    display: block;" />
      </div>
      
      <div style="background: var(--secondary-background-color);
                  padding: 16px;
                  border-radius: 8px;
                  margin-bottom: 24px;
                  text-align: left;">
        <div style="font-weight: 600; margin-bottom: 8px;">📍 Destinație:</div>
        <div style="color: var(--secondary-text-color); margin-bottom: 4px;">
          🏠 <strong>Cameră:</strong> ${room}
        </div>
        <div style="color: var(--secondary-text-color);">
          🗄️ <strong>Dulap:</strong> ${cupboard}
        </div>
      </div>

      <div style="background: var(--info-color);
                  color: white;
                  padding: 16px;
                  border-radius: 8px;
                  margin-bottom: 24px;
                  text-align: left;
                  font-size: 0.9em;">
        <div style="font-weight: 600; margin-bottom: 8px;">💡 Cum funcționează:</div>
        <ol style="margin: 0; padding-left: 20px;">
          <li>Scanează codul QR cu aplicația Home Assistant pe telefon</li>
          <li>Vei fi redirecționat automat la acest dulap</li>
          <li>Poți printa și lipi codul pe dulap pentru acces rapid</li>
        </ol>
      </div>

      <div style="background: var(--secondary-background-color);
                  padding: 12px;
                  border-radius: 6px;
                  margin-bottom: 20px;
                  font-family: monospace;
                  font-size: 0.85em;
                  word-break: break-all;
                  text-align: left;
                  color: var(--secondary-text-color);">
        ${deepLinkUrl}
      </div>
      
      <button id="closeQRModal"
              style="width: 100%;
                     padding: 14px;
                     background: var(--primary-color);
                     color: white;
                     border: none;
                     border-radius: 8px;
                     cursor: pointer;
                     font-weight: 500;
                     font-size: 1em;">
        ✓ Închide
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#closeQRModal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}
