import { build } from 'esbuild';
import { glob } from 'glob';

const serverChunks = await glob('build/server/**/*.js');

await build({
  entryPoints: {
    'index': 'build/index.js',
    ...Object.fromEntries(
      serverChunks.map(f => [
        f.replace('build/', '').replace('.js', ''),
        f
      ])
    )
  },
  bundle: true,
  platform: 'node',
  target: 'node22',
  outdir: 'build-bundled',
  format: 'esm',
  allowOverwrite: true,
  external: ['fsevents', 'sharp'],
  packages: 'bundle',
  ignoreAnnotations: true,  // ← แก้ปัญหา sideEffects: false
});