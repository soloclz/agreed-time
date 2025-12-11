// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

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
                  // rewrite: (path) => path.replace(/^\/api/, ''), // 後端路徑本身就是 /api，所以不需要 rewrite
              }
          }
      },
	},
});
