// Builds docs/demo.gif: screenshots scripts/gif/frame.html at N board-laying
// stages with Playwright (system Chrome), assembles with gifenc.
// Run: node scripts/gif/build.mjs  (deps live in this folder, not the package)
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const FRAMES = 22;          // board-laying frames
const HOLD_START = 3;       // extra copies of frame 0
const HOLD_END = 8;         // extra copies of the final frame
const DELAY_MS = 110;

const frames = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 640, height: 360 },
  deviceScaleFactor: 2,
});

await mkdir(path.join(here, 'shots'), { recursive: true });

async function shot(rows, name) {
  await page.goto('file:///' + path.join(here, 'frame.html').replace(/\\/g, '/') + '?rows=' + rows);
  await page.waitForTimeout(60);
  const file = path.join(here, 'shots', name + '.png');
  await page.screenshot({ path: file });
  return readFile(file);
}

const shots = [];
for (let i = 0; i <= FRAMES; i++) {
  const rows = Math.round((i / FRAMES) * 18);
  shots.push(await shot(rows, 'f' + String(i).padStart(2, '0')));
}
await browser.close();

const start = shots[0];
const end = shots[shots.length - 1];
const sequence = [start, start, start, ...shots, ...Array(HOLD_END).fill(end)];

const gif = GIFEncoder();
for (const png of sequence) {
  const data = PNG.sync.read(png);
  const palette = quantize(data.data, 255);
  const index = applyPalette(data.data, palette);
  gif.writeFrame(index, data.width, data.height, { palette, delay: DELAY_MS });
}
gif.finish();

const out = path.join(repo, 'docs', 'demo.gif');
await writeFile(out, Buffer.from(gif.bytes()));
const kb = (await stat(out)).size / 1024;
console.log(`demo.gif written: ${kb.toFixed(0)} KB, ${sequence.length} frames`);

