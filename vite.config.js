import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true
    // Proxy eliminado: Ya no necesitamos redirigir a server.js
  }
});