/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				paper: '#F4F8FA', // Softer, lower saturation blue-grey background
				ink: '#155E75',   // Fuji Cyan 900 - dark, rich text color
				'film-accent': '#0891B2', // Fuji Cyan 600 - primary accent, buttons
				'film-accent-hover': '#0E7490', // Fuji Cyan 700 - darker hover for buttons
				'film-border': '#d4e8ed', // Matching logo border color
				'film-light': '#FFFFFF', // Pure white, for elements like inputs
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