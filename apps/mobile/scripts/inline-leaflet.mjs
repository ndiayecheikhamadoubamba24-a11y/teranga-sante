// Copie Leaflet (node_modules) dans un module TypeScript embarqué dans l'app, pour ne plus charger
// la bibliothèque depuis un CDN tiers (unpkg.com). À relancer après une mise à jour de « leaflet » :
//   npm run inline-leaflet
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dist = require.resolve('leaflet/dist/leaflet.js').replace(/leaflet\.js$/, '');
const { version } = require('leaflet/package.json');
// « </ » est neutralisé pour que le code puisse vivre dans une balise <script> ou <style>.
const safe = (s) => s.replace(/<\//g, '<\\/');
const js = safe(readFileSync(dist + 'leaflet.js', 'utf8'));
const css = safe(readFileSync(dist + 'leaflet.css', 'utf8'));
writeFileSync(
  new URL('../src/components/map/leaflet-assets.ts', import.meta.url),
  `// Fichier généré par scripts/inline-leaflet.mjs — ne pas modifier à la main.\n// Leaflet ${version} — © Volodymyr Agafonkin, licence BSD-2-Clause.\n/* eslint-disable */\nexport const LEAFLET_VERSION = ${JSON.stringify(version)};\nexport const LEAFLET_CSS = ${JSON.stringify(css)};\nexport const LEAFLET_JS = ${JSON.stringify(js)};\n`,
);
console.log(`leaflet ${version} embarqué (${Math.round((js.length + css.length) / 1024)} ko)`);
