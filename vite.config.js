import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Esto expone el servidor en la red local (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080', // Usar IP explícita es más seguro que localhost
        changeOrigin: true,
        secure: false
      }
    }
  }
});


