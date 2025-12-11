// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [react(), tailwind()],

  vite: {
      server: {
          proxy: {
              '/api': {
                  target: 'http://localhost:3000',
                  changeOrigin: true,
                  // rewrite: (path) => path.replace(/^\/api/, ''), // 後端路徑本身就是 /api，所以不需要 rewrite
              }
          }
      },
      build: {
          // Enable cache busting with content hashing
          assetsInlineLimit: 0,
          rollupOptions: {
              output: {
                  // Add hashes to filenames for cache busting
                  entryFileNames: 'entry.[hash].js',
                  chunkFileNames: 'chunks/chunk.[hash].js',
                  assetFileNames: 'assets/asset.[hash][extname]'
              }
          }
      }
	},
});