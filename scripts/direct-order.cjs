const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.COOKIE_URL || 'http://127.0.0.1:4202/cookiemakers/';
fs.mkdirSync('artifacts', { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 390, 600, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      await page.goto(base);
      const logo = await page.locator('.brand').boundingBox();
      assert.ok(logo.width >= 100 && logo.height >= 40, 'The header logo must remain visible');
      const cart = await page.locator('.cart-link').boundingBox();
      assert.ok(cart.x >= logo.x + logo.width);
      if (width <= 600) {
        const hamburger = await page.locator('.menu-toggle').boundingBox();
        assert.ok(hamburger.x + hamburger.width <= logo.x);
        assert.equal(await page.locator('.cart-link').isVisible(), true);
        await page.getByRole('button', { name: 'Apri menu', exact: true }).click();
        await page.locator('#header-links').getByRole('link', { name: 'Contatti', exact: true }).click();
        assert.equal(await page.locator('#header-links').isVisible(), false);
      } else {
        const links = await page.locator('.nav-links').boundingBox();
        assert.ok(links.x >= logo.x + logo.width);
        assert.ok(cart.x >= links.x + links.width);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `artifacts/header-${width}.png` });
      if (![390, 1440].includes(width)) { await page.close(); continue; }
      await page.goto(`${base}#/cerchio`);
      await page.getByLabel('Prima riga', { exact: true }).fill('Anna');
      await page.getByRole('button', { name: 'Aggiungi al carrello', exact: true }).click();
      await page.locator('.design-summary').waitFor();
      const originalCart = await page.evaluate(() => localStorage.getItem('cookie-cart-v1'));
      for (const shape of ['quadrato', 'rettangolo', 'esagono', 'cuore', 'cerchio']) {
        await page.goto(`${base}#/${shape}`);
        await page.getByRole('button', { name: 'Ricomincia da zero', exact: true }).click();
        await page.getByLabel('Prima riga', { exact: true }).fill('Luca');
        assert.equal(await page.getByRole('button', { name: 'Aggiungi al carrello', exact: true }).count(), 1);
        await page.getByRole('button', { name: "Continua con l'ordine", exact: true }).click();
        await page.getByRole('heading', { name: 'Il tuo ordine', exact: true }).waitFor();
        assert.equal(await page.locator('.design-summary').count(), 1);
        assert.match(await page.locator('.design-summary').innerText(), /Luca/);
        assert.doesNotMatch(await page.locator('.design-summary').innerText(), /Anna/);
        assert.equal(await page.evaluate(() => localStorage.getItem('cookie-cart-v1')), originalCart);
      }
      await page.getByLabel('Quantità biscotto 1', { exact: true }).fill('12');
      await page.reload();
      assert.equal(await page.getByLabel('Quantità biscotto 1', { exact: true }).inputValue(), '12');
      assert.match(await page.locator('.grand-total').last().innerText(), /31,00/);
      await page.getByRole('link', { name: 'Scheda biscotto 1', exact: true }).click();
      await page.locator('.final-image').waitFor();
      assert.match(await page.locator('.specifications').innerText(), /Luca/);
      assert.match(await page.locator('.final-design').innerText(), /12 biscotti/);
      await page.getByRole('link', { name: 'Il tuo ordine', exact: true }).click();
      await page.getByRole('heading', { name: 'Il tuo ordine', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Modifica biscotto 1', exact: true }).click();
      await page.getByLabel('Prima riga', { exact: true }).fill('Sara');
      await page.getByRole('button', { name: "Continua con l'ordine", exact: true }).click();
      await page.locator('.design-summary').waitFor();
      assert.match(await page.locator('.design-summary').innerText(), /Sara/);
      assert.equal(await page.evaluate(() => localStorage.getItem('cookie-cart-v1')), originalCart);
      await page.screenshot({ path: `artifacts/direct-order-${width}.png`, fullPage: true });
      await page.locator('.cart-link').click();
      await page.getByRole('heading', { name: 'Il tuo carrello', exact: true }).waitFor();
      assert.match(await page.locator('.design-summary').innerText(), /Anna/);
      assert.doesNotMatch(await page.locator('.design-summary').innerText(), /Sara/);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: header positions, both buttons, direct order on all shapes, reload, quantities, PDF, edit and cart isolation.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
