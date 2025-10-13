const urlParams = new URLSearchParams(window.location.search);
const APP_VERSION = urlParams.get('v') || Date.now();

window.STATIC_BASE = '/home_inventar_static';
window.HomeInventarVersion = APP_VERSION;

class HomeInventarApp extends HTMLElement {
  constructor() {
    super();
    this.api = null;
    this.state = {
      currentView: 'rooms',
      selectedRoom: null,
      selectedCupboard: null,
      selectedShelf: null,
    };
    this._initialized = false;
    this._viewModules = {};
  }

  async connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;

    this.innerHTML = `
      <ha-card header="📦 Home Inventar">
        <div class="card-content" style="padding: 16px;">
          <div id="content"></div>
        </div>
      </ha-card>
    `;

    // ✅ Dynamic imports cu cache busting
    const { setupGlobalStyles } = await import(`./styles.js?v=${APP_VERSION}`);
    const { connectToHass } = await import(
      `./core/hass-connection.js?v=${APP_VERSION}`
    );
    const { Api } = await import(`./core/api-handler.js?v=${APP_VERSION}`);

    setupGlobalStyles(this);

    // Conectare la Home Assistant + API client
    const hass = await connectToHass();
    this.api = new Api(hass);

    // Deep link (?data=base64{room,cupboard})
    this._applyDeepLinkOnce();

    // Check pentru consumare QR (?consume=item_id)
    await this._checkConsumeDeepLink();

    // Render inițial
    this.renderView();
  }

  _applyDeepLinkOnce() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    if (!dataParam) return;

    try {
      const { room, cupboard } = JSON.parse(atob(dataParam));
      this.state.selectedRoom = room || null;
      this.state.selectedCupboard = cupboard || null;
      this.state.currentView =
        this.state.selectedRoom && this.state.selectedCupboard
          ? 'shelves'
          : 'rooms';
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {
      console.warn('Invalid deep link, ignored.');
    }
  }

  async _checkConsumeDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const consumeParam = urlParams.get('consume');

    if (!consumeParam) return;

    // Afișează loading
    const content = this.querySelector('#content');
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;">
        <div style="font-size:3em;margin-bottom:16px;">⏳</div>
        <div style="font-size:1.2em;font-weight:600;margin-bottom:8px;">Se procesează...</div>
        <div style="color:var(--secondary-text-color);">Scădere cantitate în curs</div>
      </div>
    `;

    try {
      // Consumă item-ul
      const result = await this._consumeItem(consumeParam);

      // Afișează success
      this._showConsumeResult(result, true);

      // Clear URL după 3 secunde și redirect la rooms
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
        this.renderView();
      }, 10000);
    } catch (error) {
      // Afișează eroare
      this._showConsumeResult({ error: error.message }, false);

      // Clear URL după 5 secunde
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
        this.renderView();
      }, 10000);
    }
  }

  async _consumeItem(itemId) {
    const response = await fetch(`/api/home_inventar/consume/${itemId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.api.hass.auth.data.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Eroare la consumare');
    }

    return await response.json();
  }

  _showConsumeResult(result, success) {
    const content = this.querySelector('#content');

    if (success) {
      const isLowStock = result.is_low_stock;

      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;">
          <div style="font-size:4em;margin-bottom:16px;">${
            isLowStock ? '⚠️' : '✅'
          }</div>
          <div style="font-size:1.5em;font-weight:700;margin-bottom:16px;color:${
            isLowStock ? 'var(--error-color)' : 'var(--success-color)'
          };">
            Cantitate Scăzută!
          </div>
          
          <div style="background:var(--card-background-color);padding:24px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;">
            <div style="font-size:1.2em;font-weight:600;margin-bottom:12px;">
              📦 ${result.name}
            </div>
            
            <div style="display:flex;justify-content:center;gap:24px;margin:20px 0;">
              <div>
                <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px;">Înainte</div>
                <div style="font-size:2em;font-weight:700;color:var(--secondary-text-color);">${
                  result.old_quantity
                }</div>
              </div>
              
              <div style="display:flex;align-items:center;font-size:1.5em;color:var(--secondary-text-color);">→</div>
              
              <div>
                <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px;">Acum</div>
                <div style="font-size:2em;font-weight:700;color:${
                  isLowStock ? 'var(--error-color)' : 'var(--success-color)'
                };">${result.new_quantity}</div>
              </div>
            </div>

            ${
              isLowStock
                ? `
              <div style="background:var(--error-color);color:white;padding:12px;border-radius:8px;margin-top:16px;font-size:0.9em;">
                <strong>⚠️ Stoc Redus!</strong><br/>
                Cantitate minimă: ${result.min_quantity}
              </div>
            `
                : ''
            }

            ${
              result.new_quantity === 0
                ? `
              <div style="background:var(--warning-color);color:white;padding:12px;border-radius:8px;margin-top:16px;font-size:0.9em;">
                <strong>🚨 Stoc Epuizat!</strong><br/>
                Nu mai sunt bucăți disponibile
              </div>
            `
                : ''
            }
          </div>

          <div style="margin-top:24px;color:var(--secondary-text-color);font-size:0.9em;">
            Redirecționare automată în 3 secunde...
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;">
          <div style="font-size:4em;margin-bottom:16px;">❌</div>
          <div style="font-size:1.5em;font-weight:700;margin-bottom:16px;color:var(--error-color);">
            Eroare!
          </div>
          
          <div style="background:var(--card-background-color);padding:24px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;width:100%;">
            <div style="color:var(--secondary-text-color);margin-bottom:16px;">
              ${result.error || 'Nu s-a putut scădea cantitatea'}
            </div>
            
            <div style="font-size:0.85em;color:var(--secondary-text-color);">
              Posibile cauze:<br/>
              • Item-ul nu are urmărire activată<br/>
              • Cantitatea este deja 0<br/>
              • Item-ul nu mai există
            </div>
          </div>

          <div style="margin-top:24px;color:var(--secondary-text-color);font-size:0.9em;">
            Redirecționare automată în 5 secunde...
          </div>
        </div>
      `;
    }
  }

  async _loadViewModule(viewName) {
    if (this._viewModules[viewName]) {
      return this._viewModules[viewName];
    }

    const viewMap = {
      rooms: `${window.STATIC_BASE}/views/rooms-view.js`,
      cupboards: `${window.STATIC_BASE}/views/cupboards-view.js`,
      shelves: `${window.STATIC_BASE}/views/shelves-view.js`,
      organizers: `${window.STATIC_BASE}/views/organizers-view.js`,
      items: `${window.STATIC_BASE}/views/items-view.js`,
      'all-items': `${window.STATIC_BASE}/views/all-items-view.js`,
    };

    const modulePath = viewMap[viewName];
    if (!modulePath) {
      console.error('Unknown view:', viewName);
      return null;
    }

    try {
      const module = await import(`${modulePath}?v=${APP_VERSION}`);
      this._viewModules[viewName] = module;
      return module;
    } catch (error) {
      console.error(`Error loading view ${viewName}:`, error);
      return null;
    }
  }

  async renderView() {
    const content = this.querySelector('#content');
    const s = this.state;

    console.log('Rendering view:', s.currentView, 'Version:', APP_VERSION);

    const viewModule = await this._loadViewModule(s.currentView);
    if (!viewModule) {
      content.innerHTML =
        '<div style="padding:20px;color:var(--error-color);">Eroare la încărcarea view-ului</div>';
      return;
    }

    try {
      if (s.currentView === 'rooms') {
        await viewModule.renderRoomsView(this, content);
      } else if (s.currentView === 'cupboards') {
        await viewModule.renderCupboardsView(this, content);
      } else if (s.currentView === 'shelves') {
        await viewModule.renderShelvesView(this, content);
      } else if (s.currentView === 'organizers') {
        await viewModule.renderOrganizersView(this, content);
      } else if (s.currentView === 'items') {
        await viewModule.renderItemsView(this, content);
      } else if (s.currentView === 'all-items') {
        console.log('Rendering all-items view');
        await viewModule.renderAllItemsView(this, content);
      }
    } catch (error) {
      console.error('Error rendering view:', error);
      content.innerHTML = `<div style="padding:20px;color:var(--error-color);">Eroare: ${error.message}</div>`;
    }
  }
}

if (!customElements.get('home-inventar-app')) {
  customElements.define('home-inventar-app', HomeInventarApp);
}

console.log('Home Inventar App loaded - Version:', APP_VERSION);
