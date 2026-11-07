import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        train: resolve(__dirname, 'train/index.html'),
        raf: resolve(__dirname, 'raf/index.html'),
        museum: resolve(__dirname, 'museum/index.html'),
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
