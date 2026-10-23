import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Port figé : l'origine http://localhost:5173 est autorisée côté backend (CORS)
  // et côté bucket R2 (lecture audio + upload).
  server: { port: 5173, strictPort: true, open: false },
  // Le pré-bundling dev cible par défaut safari14, qu'esbuild 0.28 ne sait plus
  // transformer (destructuring) : on aligne sur la cible de build.
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  build: { target: 'es2022', sourcemap: true },
});
