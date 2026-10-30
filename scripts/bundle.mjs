// Bundles the engine into a single browser-ready IIFE for the GitHub Pages demo.
// Output docs/engine.js is committed so the demo works offline from raw.githack / Pages.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'WallboardEngine',
  outfile: 'docs/engine.js',
  minify: true,
  sourcemap: false,
  logLevel: 'info',
});
