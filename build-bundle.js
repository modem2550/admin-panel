import { build } from 'esbuild';

await build({
  entryPoints: ['build/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'build-bundled/index.js',
  format: 'esm',
  allowOverwrite: true,
  external: ['fsevents', 'sharp', './server/*', '../server/*'],
});