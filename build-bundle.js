import { build } from 'esbuild';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = '.';
const outdir = join(root, 'build-bundled');
const buildDir = join(root, 'build');

if (!existsSync(join(buildDir, 'index.js'))) {
	console.error('Missing build/index.js — run `vite build` first.');
	process.exit(1);
}

rmSync(outdir, { recursive: true, force: true });

await build({
	entryPoints: { index: join(buildDir, 'index.js') },
	bundle: true,
	platform: 'node',
	target: 'node22',
	outdir,
	format: 'esm',
	allowOverwrite: true,
	external: ['fsevents', 'sharp'],
	packages: 'bundle',
	ignoreAnnotations: true
});

cpSync(join(buildDir, 'client'), join(outdir, 'client'), { recursive: true });

if (existsSync(join(buildDir, 'prerendered'))) {
	cpSync(join(buildDir, 'prerendered'), join(outdir, 'prerendered'), { recursive: true });
}

const bundled = readFileSync(join(outdir, 'index.js'), 'utf8');
const assetRefs = new Set(
	[...bundled.matchAll(/_app\/immutable\/[^"'`\s]+\.(?:js|css|woff2?)/g)].map((m) => m[0])
);

const missing = [...assetRefs].filter((ref) => !existsSync(join(outdir, 'client', ref)));
if (missing.length > 0) {
	console.error('build-bundled client assets are out of sync with the server manifest.');
	console.error('Missing files (first 10):');
	for (const ref of missing.slice(0, 10)) {
		console.error(`  - ${ref}`);
	}
	process.exit(1);
}

// Drop stale hashed assets left over from prior builds (prevents 404 mismatches).
const clientRoot = join(outdir, 'client', '_app', 'immutable');
const referenced = new Set([...assetRefs].map((ref) => ref.replace('_app/immutable/', '')));

function pruneStaleFiles(dir) {
	if (!existsSync(dir)) return;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			pruneStaleFiles(full);
			continue;
		}
		const rel = relative(clientRoot, full);
		const plain = rel.replace(/\.(br|gz)$/, '');
		if (!referenced.has(plain)) {
			rmSync(full);
		}
	}
}

pruneStaleFiles(clientRoot);

const buildId = new Date().toISOString();
writeFileSync(join(outdir, 'BUILD_ID'), buildId);

console.log(`build-bundled ready (${assetRefs.size} assets verified, id ${buildId})`);
