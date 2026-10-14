const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.COOKIE_URL || 'http://127.0.0.1:4201/';
const route = name => process.env.COOKIE_ROUTE_MODE === 'hash' ? base + '#/' + name : new URL(name, base).href;
fs.mkdirSync('artifacts', { recursive: true });

async function verifyImages(page, selector) {
  for (const image of await page.locator(selector).all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(image => image.decode());
    assert.equal(await image.evaluate(image => image.naturalWidth > 0), true);
  }
}
async function verifyLayout(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  const logo = await page.locator('.brand').boundingBox();
  const cart = await page.locator('.cart-link').boundingBox();
  assert.ok(logo.x + logo.width <= cart.x, 'Logo and cart do not overlap');
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 390, 600, 720, 760, 768, 980, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 950 } });
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.locator('.bakery-story').scrollIntoViewIfNeeded();
      await verifyImages(page, '.bakery-story img');
      await verifyLayout(page);
      assert.equal(await page.locator('.shape-link').count(), 5);
      await page.locator('.bakery-story').screenshot({ path: `artifacts/bakery-home-${width}.png` });
      await page.getByRole('link', { name: 'Dentro il laboratorio', exact: true }).click();
      await page.getByRole('heading', { name: 'Nonna Delizia', exact: true }).waitFor();
      await verifyImages(page, '.bakery-page img');
      await verifyLayout(page);
      assert.equal(await page.locator('.story-section').count(), 3);
      assert.match(await page.locator('.food-information').innerText(), /non sostituiscono/);
      assert.doesNotMatch(await page.locator('.bakery-page').innerText(), /niente chimica|collezione della settimana/);
      if (width <= 760) {
        await page.getByRole('button', { name: 'Apri menu', exact: true }).click();
        await page.locator('.nav-links').getByRole('link', { name: 'Il laboratorio', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Chiudi menu', exact: true }).click();
      } else {
        const nav = await page.locator('.nav-links').boundingBox();
        const logo = await page.locator('.brand').boundingBox();
        const cart = await page.locator('.cart-link').boundingBox();
        assert.ok(nav.x >= logo.x + logo.width && nav.x + nav.width <= cart.x, 'Expanded navigation fits');
      }
      await page.screenshot({ path: `artifacts/bakery-about-${width}.png`, fullPage: true });
      const whatsapp = page.getByRole('link', { name: 'Parliamone su WhatsApp', exact: true });
      assert.equal(new URL(await whatsapp.getAttribute('href')).pathname, '/393491687845');
      await page.getByRole('link', { name: 'Il tuo evento', exact: true }).click();
      await page.getByRole('heading', { name: 'Biscotti per eventi', exact: true }).waitFor();
      assert.match(await page.locator('.event-materials').innerText(), /cialda di zucchero/);
      await page.getByRole('link', { name: 'Dal nostro laboratorio', exact: true }).click();
      await page.getByRole('heading', { name: 'Nonna Delizia', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Personalizza un biscotto', exact: true }).click();
      await page.locator('.shape-link').first().waitFor();
      await page.locator('.shape-link[href$="/cerchio"]').click();
      await page.getByLabel('Prima riga', { exact: true }).fill('Per te');
      await page.locator('app-cookie-ingredients summary').click();
      assert.match(await page.locator('app-cookie-ingredients').innerText(), /Richiedi la lista completa/);
      await verifyLayout(page);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: brochure content, source images, navigation, responsive layout, event and configurator links, separate ingredient information.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
