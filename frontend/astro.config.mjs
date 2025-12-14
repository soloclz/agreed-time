// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

const svgCharsetHeader = () => ({
  name: 'svg-charset-header',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0] ?? '';
      if (path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0] ?? '';
      if (path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      }
      next();
    });
  },
});

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [react(), tailwind()],

  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    plugins: [svgCharsetHeader()],
  },
});
