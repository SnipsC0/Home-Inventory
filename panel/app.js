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

    const { setupGlobalStyles } = await import(`./styles.js?v=${APP_VERSION}`);
    const { connectToHass } = await import(
      `./core/hass-connection.js?v=${APP_VERSION}`
    );
    const { Api } = await import(`./core/api-handler.js?v=${APP_VERSION}`);

    setupGlobalStyles(this);

    const hass = await connectToHass();
    this.api = new Api(hass);

    this._applyDeepLinkOnce();

    const consumed = await this._checkConsumeDeepLink();
    if (consumed) return; // <--- IMPORTANT: oprește tot aici

    this.renderView(); // rulează doar dacă nu era consum
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
    // Verificăm dacă URL-ul conține /consume/ID în path
    const currentPath = window.location.pathname;
    const consumeMatch = currentPath.match(/\/consume\/(\d+)$/);

    if (!consumeMatch) return false;

    const itemId = consumeMatch[1];
    console.log('[HomeInventar] Consume deep link detected (path):', itemId);

    const content = this.querySelector('#content');
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;min-height:400px;">
        <div style="width:80px;height:80px;border:4px solid var(--primary-color);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px;"></div>
        <div style="font-size:1.3em;font-weight:600;margin-bottom:8px;">Se procesează...</div>
        <div style="color:var(--secondary-text-color);">Scădere cantitate în curs</div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    try {
      const result = await this._consumeItem(itemId);
      console.log('[HomeInventar] Consume result:', result);

      this._showConsumeResult(result, true);

      // Timeout mai lung: 8 secunde
      setTimeout(() => {
        console.log('[HomeInventar] Auto-closing consume modal');
        // Redirecționăm la path-ul de bază
        window.history.replaceState({}, '', '/home_inventar');
        this.renderView();
      }, 8000);
    } catch (error) {
      console.error('[HomeInventar] Consume error:', error);
      this._showConsumeResult({ error: error.message }, false);

      // Timeout pentru eroare: 6 secunde
      setTimeout(() => {
        window.history.replaceState({}, '', '/home_inventar');
        this.renderView();
      }, 6000);
    }
    return true;
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
      const isZeroStock = result.new_quantity === 0;

      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;min-height:500px;animation:fadeIn 0.5s ease-out;">
          
          <!-- Icon principal -->
          <div style="width:100px;height:100px;margin-bottom:24px;background:${
            isZeroStock
              ? 'var(--error-color)'
              : isLowStock
              ? 'var(--warning-color)'
              : 'var(--success-color)'
          };
                      border-radius:50%;display:flex;align-items:center;justify-content:center;
                      font-size:4em;box-shadow:0 8px 24px rgba(0,0,0,0.2);
                      animation:${
                        isLowStock || isZeroStock ? 'pulse' : 'scaleIn'
                      } 0.6s ease-out;">
            ${isZeroStock ? '🚫' : isLowStock ? '⚠️' : '✓'}
          </div>

          <!-- Titlu -->
          <div style="font-size:1.8em;font-weight:700;margin-bottom:12px;color:${
            isZeroStock
              ? 'var(--error-color)'
              : isLowStock
              ? 'var(--warning-color)'
              : 'var(--success-color)'
          };">
            ${
              isZeroStock
                ? '🚨 Stoc Epuizat!'
                : isLowStock
                ? '⚠️ Stoc Redus!'
                : '✅ Consumat cu Succes!'
            }
          </div>
          
          <!-- Card cu detalii -->
          <div style="background:var(--card-background-color);padding:32px;border-radius:16px;
                      box-shadow:0 8px 32px rgba(0,0,0,0.15);max-width:500px;width:100%;
                      margin-bottom:24px;">
            
            <!-- Nume item -->
            <div style="font-size:1.4em;font-weight:600;margin-bottom:8px;">
              📦 ${result.name}
            </div>
            
            <!-- Locație -->
            ${
              result.location
                ? `
              <div style="font-size:0.95em;color:var(--secondary-text-color);margin-bottom:24px;">
                📍 ${result.location}
              </div>
            `
                : ''
            }
            
            <!-- Comparație cantități -->
            <div style="display:flex;justify-content:center;gap:32px;margin:28px 0;">
              <!-- Înainte -->
              <div style="flex:1;max-width:120px;">
                <div style="font-size:0.9em;color:var(--secondary-text-color);margin-bottom:8px;font-weight:500;">
                  Înainte
                </div>
                <div style="font-size:3em;font-weight:700;color:var(--secondary-text-color);">
                  ${result.old_quantity}
                </div>
              </div>
              
              <!-- Arrow -->
              <div style="display:flex;align-items:center;font-size:2.5em;color:var(--primary-color);">
                →
              </div>
              
              <!-- Acum -->
              <div style="flex:1;max-width:120px;">
                <div style="font-size:0.9em;color:var(--secondary-text-color);margin-bottom:8px;font-weight:500;">
                  Acum
                </div>
                <div style="font-size:3em;font-weight:700;color:${
                  isZeroStock
                    ? 'var(--error-color)'
                    : isLowStock
                    ? 'var(--warning-color)'
                    : 'var(--success-color)'
                };">
                  ${result.new_quantity}
                </div>
              </div>
            </div>

            <!-- Alert box pentru stoc redus/epuizat -->
            ${
              isZeroStock
                ? `
              <div style="background:var(--error-color);color:white;padding:16px;border-radius:10px;margin-top:20px;">
                <div style="font-size:1.1em;font-weight:600;margin-bottom:8px;">
                  🚫 Stoc Complet Epuizat!
                </div>
                <div style="font-size:0.95em;opacity:0.95;line-height:1.5;">
                  Acest obiect s-a terminat complet.<br/>
                  Este necesară reaprovizionare imediată!
                </div>
              </div>
            `
                : isLowStock
                ? `
              <div style="background:var(--warning-color);color:white;padding:16px;border-radius:10px;margin-top:20px;">
                <div style="font-size:1.1em;font-weight:600;margin-bottom:8px;">
                  ⚠️ Atenție: Stoc Sub Minim!
                </div>
                <div style="font-size:0.95em;opacity:0.95;line-height:1.5;">
                  Cantitate minimă: ${result.min_quantity}<br/>
                  Recomandăm reaprovizionare urgentă!
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Progress bar + countdown -->
          <div style="width:100%;max-width:400px;margin-bottom:16px;">
            <div style="width:100%;height:6px;background:var(--divider-color);border-radius:3px;overflow:hidden;margin-bottom:12px;">
              <div style="height:100%;background:var(--primary-color);width:100%;animation:shrink 8s linear forwards;"></div>
            </div>
            <div style="font-size:0.95em;color:var(--secondary-text-color);">
              Se închide automat în <span id="countdown">8</span> secunde...
            </div>
          </div>

          <!-- Buton manual de închidere -->
          <button id="closeConsumeBtn" 
                  style="padding:14px 32px;background:var(--primary-color);color:white;
                         border:none;border-radius:8px;cursor:pointer;font-weight:600;
                         font-size:1.05em;transition:all 0.2s;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
            OK, Am Înțeles
          </button>
        </div>

        <style>
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { transform: scale(0.5); }
            to { transform: scale(1); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        </style>
      `;

      // Countdown logic
      let countdown = 8;
      const countdownElement = content.querySelector('#countdown');
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
          countdownElement.textContent = countdown;
        }
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Buton manual de închidere
      const closeBtn = content.querySelector('#closeConsumeBtn');
      closeBtn?.addEventListener('click', () => {
        clearInterval(countdownInterval);
        window.history.replaceState({}, '', '/home_inventar');
        this.renderView();
      });

      // Hover effect
      closeBtn?.addEventListener('mouseenter', () => {
        closeBtn.style.transform = 'translateY(-2px)';
        closeBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      });
      closeBtn?.addEventListener('mouseleave', () => {
        closeBtn.style.transform = 'translateY(0)';
        closeBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      });
    } else {
      // Modal de eroare
      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;min-height:400px;">
          <div style="width:100px;height:100px;margin-bottom:24px;background:var(--error-color);
                      border-radius:50%;display:flex;align-items:center;justify-content:center;
                      font-size:4em;box-shadow:0 8px 24px rgba(0,0,0,0.2);">
            ❌
          </div>

          <div style="font-size:1.8em;font-weight:700;margin-bottom:16px;color:var(--error-color);">
            Eroare la Consum!
          </div>
          
          <div style="background:var(--card-background-color);padding:24px;border-radius:12px;
                      box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:450px;width:100%;margin-bottom:24px;">
            <div style="color:var(--primary-text-color);margin-bottom:16px;font-size:1.1em;">
              ${result.error || 'Nu s-a putut scădea cantitatea'}
            </div>
            
            <div style="font-size:0.9em;color:var(--secondary-text-color);line-height:1.6;text-align:left;">
              <strong>Posibile cauze:</strong><br/>
              • Item-ul nu are urmărire cantitate activată<br/>
              • Cantitatea este deja 0<br/>
              • Item-ul nu mai există în baza de date
            </div>
          </div>

          <div style="font-size:0.95em;color:var(--secondary-text-color);margin-bottom:16px;">
            Redirecționare automată în <span id="errorCountdown">6</span> secunde...
          </div>

          <button id="closeErrorBtn" 
                  style="padding:14px 32px;background:var(--error-color);color:white;
                         border:none;border-radius:8px;cursor:pointer;font-weight:600;
                         font-size:1.05em;">
            Închide
          </button>
        </div>
      `;

      // Error countdown
      let countdown = 6;
      const countdownElement = content.querySelector('#errorCountdown');
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
          countdownElement.textContent = countdown;
        }
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Close button
      const closeBtn = content.querySelector('#closeErrorBtn');
      closeBtn?.addEventListener('click', () => {
        clearInterval(countdownInterval);
        window.history.replaceState({}, '', window.location.pathname);
        this.renderView();
      });
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
