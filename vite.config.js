import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/versent_traning/',
  server: {
    host: true,
    port: 5177,
    proxy: {
      '/api/pollinations/audio': {
        target: 'https://audio.pollinations.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pollinations\/audio/, ''),
      },
      '/api/pollinations': {
        target: 'https://text.pollinations.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pollinations/, ''),
      },
    },
  },
});
