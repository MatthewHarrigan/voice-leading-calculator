// Capture screenshots of each page (light + dark) against a running preview server.
import { chromium } from '@playwright/test';

const BASE = process.env.SHOT_BASE ?? 'http://127.0.0.1:4173';
const OUT = process.env.SHOT_OUT ?? '/tmp/vlc-shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const pages = [
  ['library', '/'],
  ['progressions', '/progressions'],
  ['studies', '/chapters'],
  ['studies-ch3', '/chapters/tensions-on-top'],
  ['sequence', '/sequence'],
  ['melody', '/melody'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// Seed a chart so the sequence builder shows real content. (Fresh context already
// starts with empty localStorage; we must NOT clear on every navigation.)
await page.goto(`${BASE}/sequence`);
await page.getByLabel('Preset').selectOption('built-in:major-ii-v-i-9ths');
await page.getByRole('button', { name: 'Load' }).click();
await page.waitForTimeout(500);

for (const theme of ['light', 'dark']) {
  // Set theme via the toggle if needed.
  const current = await page.evaluate(() => document.documentElement.dataset.theme);
  if (current !== theme) {
    await page.getByRole('button', { name: 'Toggle colour theme' }).click();
    await page.waitForTimeout(150);
  }
  for (const [name, path] of pages) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}-${theme}.png`, fullPage: false });
  }
}

await browser.close();
console.log('screenshots written to', OUT);
