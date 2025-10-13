export async function connectToHass(maxAttempts = 100, delayMs = 100) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const hass = findHass();
    if (hass?.auth) return hass;
    await new Promise((r) => setTimeout(r, delayMs));
    attempts++;
  }
  throw new Error('Nu s-a putut conecta la Home Assistant.');
}

function findHass() {
  // cele mai comune locuri
  if (window.hass?.auth) return window.hass;
  if (window.hassConnection?.auth) return window.hassConnection;

  const ha = document.querySelector('home-assistant');
  if (ha?.hass?.auth) return ha.hass;

  const panel = document.querySelector('ha-panel-custom');
  if (panel?.hass?.auth) return panel.hass;

  // încercare în parent (iframe)
  try {
    const p = window.parent;
    if (p && p !== window) {
      if (p.hass?.auth) return p.hass;
      if (p.hassConnection?.auth) return p.hassConnection;
      const pha = p.document.querySelector('home-assistant');
      if (pha?.hass?.auth) return pha.hass;
    }
  } catch (_) {}

  return null;
}
