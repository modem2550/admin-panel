import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	server: {
		port: 5173,
		strictPort: true,
		host: '127.0.0.1',
		hmr: {
			protocol: 'ws',
			host: '127.0.0.1',
			port: 5173
		}
	},

	ssr: {
		noExternal: [],
		external: ['ffmpeg-static', 'ffprobe-static']
	},

	build: {
		sourcemap: false
	}
});
