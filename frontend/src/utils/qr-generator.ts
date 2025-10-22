export function generateQRCodeUrl(room: string, cupboard: string): string {
  const payload = JSON.stringify({ room, cupboard });
  const base64Data = btoa(payload);
  const deepLinkUrl = `homeassistant://navigate/home_inventory?data=${base64Data}`;

  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    deepLinkUrl
  )}`;
}

export function downloadQRCode(room: string, cupboard: string) {
  const qrUrl = generateQRCodeUrl(room, cupboard);

  const link = document.createElement('a');
  link.href = qrUrl;
  link.download = `QR_${room}_${cupboard}.png`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
