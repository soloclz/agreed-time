/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				paper: '#F7F9FA', // Cool, airy white (Fuji-style base)
				ink: '#37474F',   // Soft blue-grey charcoal
				'film-accent': '#4CB5AB', // Fuji Green/Teal
				'film-accent-hover': '#3D9189',
				'film-border': '#CFD8DC', // Cool blue-grey border (improved contrast)
				'film-light': '#FFFFFF', // Pure white
			},
			fontFamily: {
				serif: ['"Shippori Mincho"', 'serif'],
				mono: ['"Space Mono"', 'monospace'],
				sans: ['"Zen Kaku Gothic New"', 'sans-serif'],
			},
		},
	},
	plugins: [],
}