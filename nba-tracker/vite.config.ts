import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['nba-frontend-fcd3.onrender.com'], // Allow external access from this Render domain.
  },
});
