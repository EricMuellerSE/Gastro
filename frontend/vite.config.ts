import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Im Entwicklungsmodus werden API-Aufrufe an das Node-Backend weitergeleitet
    proxy: { '/api': 'http://localhost:3001' },
  },
});
