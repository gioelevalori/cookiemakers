const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = (process.env.COOKIE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '');
fs.mkdirSync('artifacts', { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      const originals = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/pasqua-\d\d\.webp$/.test(request.url())) originals.push(request.url()); });
      await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      await page.goto(base + '/galleria');
      await page.getByRole('heading', { name: 'Galleria', exact: true }).waitFor();
      assert.equal(await page.locator('.collection').count(), 1);
      assert.equal(await page.locator('.photo-card').count(), 10);
      assert.equal(await page.locator('.collection-nav').innerText(), 'Pasqua\n10 foto\nsouth');
      assert.doesNotMatch(await page.locator('.collection-nav').innerText(), /Natale/);
      for (const image of await page.locator('.photo-card img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(async image => { await image.decode(); if (!image.naturalWidth) throw new Error('Missing gallery image'); });
      }
      assert.equal(originals.length, 0, 'Originals load only when a photo is opened');
      await page.locator('.photo-card').first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.locator('img').evaluate(image => image.decode());
      assert.match(await dialog.locator('.dialog-header').innerText(), /1 \/ 10/);
      await page.getByRole('button', { name: 'Foto successiva', exact: true }).click();
      assert.match(await dialog.locator('#photo-title').innerText(), /Un coniglietto tra i fiori/);
      await page.keyboard.press('ArrowLeft');
      assert.match(await dialog.locator('.dialog-header').innerText(), /1 \/ 10/);
      await page.keyboard.press('ArrowLeft');
      assert.match(await dialog.locator('.dialog-header').innerText(), /10 \/ 10/);
      await dialog.locator('img').evaluate(image => image.decode());
      assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth + 1), false);
      await page.screenshot({ path: `artifacts/gallery-dialog-${width}.png` });
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), false);
      assert.equal(await page.locator('.photo-card').first().evaluate(element => element === document.activeElement), true);
      await page.locator('.photo-card').nth(2).click();
      await page.getByRole('button', { name: 'Chiudi foto', exact: true }).click();
      assert.equal(await dialog.isVisible(), false);
      await page.evaluate(() => scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `artifacts/gallery-${width}.png`, fullPage: true });
      if (width <= 960) await page.getByRole('button', { name: 'Apri menu', exact: true }).click();
      await page.locator('#header-links').getByRole('link', { name: 'Biscotti', exact: true }).click();
      await page.getByRole('link', { name: 'Guarda la galleria', exact: true }).click();
      await page.getByRole('heading', { name: 'Galleria', exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: 10 local photos, only Easter, full-size viewer, keyboard and focus, responsive header, home link and no overflow.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
