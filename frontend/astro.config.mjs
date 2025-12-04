// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
	integrations: [react(), tailwind()],
	vite: {
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
	}
});
