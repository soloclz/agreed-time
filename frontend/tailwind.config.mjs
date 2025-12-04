/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				paper: '#F2F0E9', // Warmer, organic beige
				ink: '#35322F',   // Soft charcoal, not pure black
				'film-accent': '#EBB02D', // Warm amber/gold (Kodak style)
				'film-accent-hover': '#D99F21',
				'film-border': '#D1CEC7', // Soft grey border
				'film-light': '#F9F7F2', // Lighter paper tone
			},
			fontFamily: {
				serif: ['"Merriweather"', 'serif'],
				mono: ['"Space Mono"', 'monospace'],
				sans: ['"Inter"', 'sans-serif'],
			},
			// Removed retro hard shadow
		},
	},
	plugins: [],
}