import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isTauri = false;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		paths: { relative: false },
		adapter: isTauri
			? adapterStatic({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false
			})
			: adapterNode({ out: 'build' }),
		prerender: {
			handleHttpError: ({ path, message }) => {
				if (path.startsWith('/api/')) return;
				console.warn(`HTTP Error: ${message} at ${path}`);
			}
		}
	}
};

export default config;