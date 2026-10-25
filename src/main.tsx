import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { applySimpleMode, getSimpleMode } from './theme/theme';

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

// Appliqué avant le premier rendu pour éviter un flash d'effets.
applySimpleMode(getSimpleMode());

// Rouvre l'application sans réseau (les titres téléchargés restent locaux).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js');
}

createRoot(container).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </StrictMode>,
);
