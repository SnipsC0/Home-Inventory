import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const target = document.querySelector(
  'home-assistant, ha-panel-custom, body'
) as HTMLElement;
let mount = target.querySelector('#home-inventar-root') as HTMLElement;

if (!mount) {
  mount = document.createElement('div');
  mount.id = 'home-inventar-root';
  target.appendChild(mount);
}

createRoot(mount!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
