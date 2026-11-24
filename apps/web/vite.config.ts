import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin in dev and prod: the API serves /trpc, Vite proxies it here.
    proxy: { '/trpc': 'http://localhost:3000' },
  },
});
