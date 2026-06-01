import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

// https://tauri.app/start/frontend/vite/
export default defineConfig({
	plugins: [sveltekit()],

	clearScreen: false,

	server: {
		port: 5173,
		strictPort: true,
		host: host || '127.0.0.1',
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 5183
				}
			: {
					protocol: 'ws',
					host: '127.0.0.1',
					port: 5173
				},
		watch: {
			ignored: ['**/src-tauri/**']
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
