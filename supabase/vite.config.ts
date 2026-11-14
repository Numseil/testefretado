import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O base './' garante que os assets funcionem em qualquer subcaminho do GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
