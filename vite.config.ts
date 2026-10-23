import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Port figé : l'origine http://localhost:5173 est autorisée côté backend (CORS)
  // et côté bucket R2 (lecture audio + upload).
  server: { port: 5173, strictPort: true, open: false },
  build: { target: 'es2022', sourcemap: true },
});
