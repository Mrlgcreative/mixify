import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { handleSpotifyCallback } from './api/spotifyAuth';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

// Retour OAuth Spotify (`?code=...`) : échange du code puis nettoyage de l'URL,
// AVANT le premier rendu (no-op hors callback).
await handleSpotifyCallback();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
