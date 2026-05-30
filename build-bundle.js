import { build } from 'esbuild';
import { glob } from 'glob';

const serverFiles = await glob('build/server/**/*.js');

await build({
  entryPoints: ['build/index.js', ...serverFiles],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outdir: 'build-bundled',
  splitting: true,
  format: 'esm',
  allowOverwrite: true,
  external: ['fsevents', 'sharp'],
});