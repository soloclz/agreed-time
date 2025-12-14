// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

const svgCharsetHeader = () => ({
  name: 'svg-charset-header',
  /** @param {import('vite').ViteDevServer} server */
  configureServer(server) {
    server.middlewares.use((/** @type {import('http').IncomingMessage} */ req, /** @type {import('http').ServerResponse} */ res, /** @type {import('vite').Connect.NextFunction} */ next) => {
      const path = req.url?.split('?')[0] ?? '';
      if (path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      }
      next();
    });
  },
  /** @param {import('vite').PreviewServer} server */
  configurePreviewServer(server) {
    server.middlewares.use((/** @type {import('http').IncomingMessage} */ req, /** @type {import('http').ServerResponse} */ res, /** @type {import('vite').Connect.NextFunction} */ next) => {
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
