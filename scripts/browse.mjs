#!/usr/bin/env node
// Reusable headless-Chromium driver for manually verifying pages in the running dev app.
// Usage:
//   node scripts/browse.mjs <path> [--port=4200] [--viewport=WIDTHxHEIGHT] [--click=<selector>] [--screenshot=/tmp/out.png] [--html=<selector>]
//
// Examples:
//   node scripts/browse.mjs /login --screenshot=/tmp/login.png
//   node scripts/browse.mjs /login --viewport=375x700 --click=".some-button" --screenshot=/tmp/after.png
//   node scripts/browse.mjs /home --html=".ul-navbar__logo"
//
// Requires: dev server already running (npm start / ng serve), default http://localhost:4200.

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.slice(2).split('=');
      return [k, rest.join('=') || true];
    })
);

const path = positional[0] ?? '/';
const port = flags.port ?? 4200;
const url = flags.url ?? `http://localhost:${port}${path}`;

const [width, height] = (flags.viewport ?? '1280x800').split('x').map(Number);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width, height } })).newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

// domcontentloaded, not networkidle: Angular dev-server HMR keeps a live-reload
// connection open, which prevents 'networkidle' from ever resolving.
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

if (flags.click) {
  await page.locator(flags.click).first().click();
  await page.waitForTimeout(400);
}

if (flags.html) {
  const html = await page.locator(flags.html).first().evaluate((el) => el.innerHTML);
  console.log(`--- innerHTML of "${flags.html}" ---`);
  console.log(html);
}

if (flags.screenshot) {
  await page.screenshot({ path: flags.screenshot });
  console.log('screenshot saved:', flags.screenshot);
}

if (consoleErrors.length) {
  console.log('console errors:', JSON.stringify(consoleErrors, null, 2));
}

await browser.close();
