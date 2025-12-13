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
			// Removed custom font family definitions to use Tailwind's default system font stacks.
			// This eliminates external font downloads for improved performance.
		},
	},
	corePlugins: {
		preflight: false,
	},
	plugins: [],
}
