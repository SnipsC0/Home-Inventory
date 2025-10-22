import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import App from './App';
import css from './app.css?inline';

interface HomeAssistant {
  callService: (domain: string, service: string, data?: any) => Promise<any>;
  callApi: (method: string, path: string, data?: any) => Promise<any>;
  connection: any;
  states: Record<string, any>;
  config: any;
  user: any;
  [key: string]: any;
}

interface PanelConfig {
  config?: Record<string, any>;
  [key: string]: any;
}

class HomeInventarApp extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _panel: PanelConfig | null = null;
  private _root: Root | null = null;
  private _shadowRoot: ShadowRoot;

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._shadowRoot.innerHTML = `
      <style>
        ${css}
        
        :host {
          display: block;
          height: 100%;
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        #mount-point {
          height: 100%;
          width: 100%;
          overflow: auto;
          box-sizing: border-box;
        }
      </style>
      <div id="mount-point"></div>
    `;

    const mountPoint = this._shadowRoot.getElementById(
      'mount-point'
    ) as HTMLElement;

    this._root = createRoot(mountPoint);
    this.render();
  }

  render() {
    if (this._root) {
      this._root.render(<App hass={this._hass} panel={this._panel} />);
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.render();
  }

  get hass(): HomeAssistant | null {
    return this._hass;
  }

  set panel(panel: PanelConfig) {
    this._panel = panel;
    this.render();
  }

  get panel(): PanelConfig | null {
    return this._panel;
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unmount();
    }
  }
}

customElements.define('home-inventory-app', HomeInventarApp);
