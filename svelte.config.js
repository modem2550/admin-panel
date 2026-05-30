import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		paths: { relative: false },
		// Tauri bundles this output as the embedded Node sidecar (see src-tauri/lib.rs).
		adapter: adapterNode({ out: 'build' }),
		prerender: {
			handleHttpError: ({ path, message }) => {
				if (path.startsWith('/api/')) return;
				console.warn(`HTTP Error: ${message} at ${path}`);
			}
		}
	}
};

export default config;