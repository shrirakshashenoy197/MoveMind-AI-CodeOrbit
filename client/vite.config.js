import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['movemind-ai-ui-ux-redesign.v0.build'],
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
