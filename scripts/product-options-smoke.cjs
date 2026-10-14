const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.COOKIE_URL || 'http://127.0.0.1:4201/';
const route = name => process.env.COOKIE_ROUTE_MODE === 'hash' ? base + '#/' + name : new URL(name, base).href;
fs.mkdirSync('artifacts', { recursive: true });

const decodedMessage = async locator => {
  const url = new URL(await locator.getAttribute('href'));
  assert.equal(url.pathname, '/393491687845');
  return url.searchParams.get('text');
};
const noOverflow = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 950 } });
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const shape of ['cerchio', 'rettangolo', 'quadrato', 'esagono', 'cuore']) {
        await page.goto(route(shape));
        await page.getByRole('radio', { name: 'Senza lattosio', exact: true }).check();
        await page.getByLabel('Prima riga', { exact: true }).fill('Anna');
        assert.equal(await page.locator('app-maker-text').getByRole('button', { name: 'Giallo', exact: true }).count(), 1);
        assert.equal(await page.locator('app-maker-text').getByRole('button', { name: 'Ciano', exact: true }).count(), 0);
        await page.getByRole('tab', { name: 'Sfondo', exact: true }).click();
        await page.getByRole('combobox', { name: 'Copertura dello sfondo', exact: true }).click();
        await page.getByRole('option', { name: 'Pasta di zucchero', exact: true }).click();
        await page.locator('app-maker-sfondo').getByRole('button', { name: 'Giallo', exact: true }).click();
        const swatches = page.locator('app-maker-sfondo');
        assert.equal(await swatches.getByRole('button', { name: 'Bianco', exact: true }).count(), 1);
        assert.equal(await swatches.getByRole('button', { name: 'Blu Cielo', exact: true }).count(), 1);
        assert.equal(await swatches.getByRole('button', { name: 'Grigio', exact: true }).getAttribute('style'), 'background-color: rgb(184, 190, 196);');
        await noOverflow(page);
        if (shape === 'cerchio') {
          await page.getByRole('button', { name: 'Salva per dopo', exact: true }).click();
          await page.getByText('Bozza salvata su questo dispositivo.', { exact: true }).waitFor();
          await page.goto(base);
          await page.getByRole('button', { name: 'Riprendi biscotto salvato: Anna', exact: true }).click();
          assert.equal(await page.getByRole('radio', { name: 'Senza lattosio', exact: true }).isChecked(), true);
          await page.getByRole('tab', { name: 'Sfondo', exact: true }).click();
          assert.match(await page.getByRole('combobox', { name: 'Copertura dello sfondo', exact: true }).innerText(), /Pasta di zucchero/);
          await page.getByRole('link', { name: 'Forma Cuore', exact: true }).click();
          assert.equal(await page.getByRole('radio', { name: 'Senza lattosio', exact: true }).isChecked(), true);
        }
        await page.getByRole('button', { name: 'Aggiungi al carrello', exact: true }).click();
        await page.locator('.design-summary').last().waitFor();
        assert.match(await page.locator('.design-summary').last().innerText(), /Senza lattosio/);
        assert.match(await page.locator('.design-summary').last().innerText(), /Pasta di zucchero/);
      }
      await page.getByRole('radio', { name: 'Ritiro in sede', exact: true }).check();
      await page.getByLabel('Nome e cognome (facoltativo)', { exact: true }).fill('Sara');
      await page.getByLabel("Note e informazioni per l'ordine", { exact: true }).fill('Fiocco giallo & confezioni singole');
      await page.getByLabel('Data desiderata di ritiro', { exact: true }).fill('2099-12-10');
      const request = page.getByRole('link', { name: 'Richiedi ordine su WhatsApp', exact: true });
      let message = await decodedMessage(request);
      assert.match(message, /Senza lattosio/);
      assert.match(message, /Pasta di zucchero/);
      assert.match(message, /50 biscotti/);
      assert.match(message, /75,00/);
      assert.match(message, /Via Roma, 78/);
      assert.match(message, /Fiocco giallo & confezioni singole/);
      assert.match(message, /da allegare/);
      await page.reload();
      assert.equal(await page.getByRole('radio', { name: 'Ritiro in sede', exact: true }).isChecked(), true);
      assert.match(await page.getByLabel("Note e informazioni per l'ordine", { exact: true }).inputValue(), /Fiocco giallo/);
      await page.getByRole('link', { name: 'Scheda biscotto 1', exact: true }).click();
      await page.locator('.final-design').waitFor();
      assert.match(await page.locator('.final-design').innerText(), /Senza lattosio/);
      assert.match(await page.locator('.delivery-details').innerText(), /Fiocco giallo/);
      assert.match(await page.locator('.delivery-details').innerText(), /Via Roma, 78/);
      await page.getByRole('link', { name: 'Il tuo ordine', exact: true }).click();
      await page.getByRole('radio', { name: 'Spedizione', exact: true }).check();
      await page.getByLabel('Indirizzo di spedizione (facoltativo)', { exact: true }).fill('Via Esempio 1, Roma');
      message = await decodedMessage(request);
      assert.match(message, /81,00/);
      assert.match(message, /Via Esempio 1, Roma/);
      await noOverflow(page);
      await page.screenshot({ path: `artifacts/product-checkout-${width}.png`, fullPage: true });
      await page.getByLabel('Quantità biscotto 1', { exact: true }).fill('9');
      assert.ok(!await request.getAttribute('href'));
      assert.equal(await request.getAttribute('aria-disabled'), 'true');
      await page.goto(route('eventi'));
      await page.getByRole('combobox', { name: 'Occasione', exact: true }).click();
      await page.getByRole('option', { name: 'Evento aziendale', exact: true }).click();
      await page.getByLabel('Quantità desiderata', { exact: true }).fill('100');
      await page.getByLabel('Note e informazioni', { exact: true }).fill('Logo aziendale');
      const eventLink = page.getByRole('link', { name: 'Richiedi un preventivo su WhatsApp', exact: true });
      message = await decodedMessage(eventLink);
      assert.match(message, /100 biscotti/);
      assert.match(message, /Logo aziendale/);
      await noOverflow(page);
      await page.screenshot({ path: `artifacts/product-events-${width}.png`, fullPage: true });
      await page.getByLabel('Quantità desiderata', { exact: true }).fill('10.5');
      assert.ok(!await eventLink.getAttribute('href'));
      assert.equal(await eventLink.getAttribute('aria-disabled'), 'true');
      await page.goto(base);
      await noOverflow(page);
      await page.locator('.event-intro').screenshot({ path: `artifacts/product-home-events-${width}.png` });
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: all shapes, palette, recipe, covering, saved drafts, shape transfer, checkout, pickup, notes, PDF, WhatsApp, events and responsive layout.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
