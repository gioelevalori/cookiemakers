const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = (process.env.COOKIE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '');
fs.mkdirSync('artifacts', { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const open = async (width, route) => {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', request => new URL(request.request().url()).origin === new URL(base).origin ? request.continue() : request.abort());
    await page.goto(base + route);
    return { page, errors };
  };
  const layout = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Horizontal overflow');
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const { page, errors } = await open(width, '/');
      await page.locator('.how-it-works').waitFor();
      assert.equal(await page.locator('.steps li').count(), 3);
      assert.equal(await page.locator('.packaging-grid article').count(), 3);
      assert.equal(await page.locator('.home-creations img').count(), 6);
      assert.match(await page.locator('.trust-actions a').first().getAttribute('href'), /google\.com\/maps/);
      await layout(page);
      if (![390, 1440].includes(width)) { await page.close(); continue; }
      await page.locator('.experience-details').screenshot({ path: `artifacts/customer-details-${width}.png` });
      await page.locator('.packaging-grid article').nth(1).getByRole('link').click();
      await page.getByRole('heading', { name: 'Raccontaci la tua idea.', exact: true }).waitFor();
      assert.match(await page.getByRole('combobox', { name: 'Idea di confezione', exact: true }).innerText(), /Scatola regalo/);
      await page.getByRole('combobox', { name: 'Occasione', exact: true }).click();
      await page.getByRole('option', { name: 'Compleanno', exact: true }).click();
      await page.getByLabel('La tua idea', { exact: true }).fill('Biscotti con fiori e una dedica nei colori salvia e crema.');
      await page.getByLabel('Quantità desiderata', { exact: true }).fill('25');
      await page.getByRole('combobox', { name: 'Misura indicativa', exact: true }).click();
      await page.getByRole('option', { name: 'Circa 6 cm', exact: true }).click();
      await page.getByLabel('Nastro coordinato', { exact: true }).check();
      const message = () => page.locator('.request-button').getAttribute('href').then(href => new URL(href).searchParams.get('text'));
      let text = await message();
      for (const detail of ['25 biscotti', 'Scatola regalo', 'Circa 6 cm', 'nastro coordinato']) assert.ok(text.includes(detail), detail);
      assert.ok(!text.includes('bigliettino'));
      await page.locator('input[type=file]').setInputFiles('src/assets/1.jpeg');
      await page.waitForFunction(() => document.querySelector('.reference-preview p')?.textContent === '1.jpeg');
      text = await message(); assert.match(text, /Foto di riferimento: 1.jpeg/);
      await page.getByRole('button', { name: 'Rimuovi foto', exact: true }).click();
      assert.ok(!(await message()).includes('Foto di riferimento'));
      await page.getByLabel('Quantità desiderata', { exact: true }).fill('9');
      assert.ok(!(await page.locator('.request-button').getAttribute('href')));
      await page.getByLabel('Quantità desiderata', { exact: true }).fill('25');
      await page.locator('input[type=file]').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
      await page.getByRole('button', { name: 'Continua senza foto', exact: true }).click();
      assert.ok((await message()).includes('25 biscotti'));
      await layout(page);
      await page.screenshot({ path: `artifacts/custom-request-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: home, packaging prefill, custom request, selected details, reference photo and validation; no messages sent.`);
      await page.close();
    }

    for (const shape of ['cerchio', 'quadrato', 'rettangolo', 'esagono', 'cuore']) {
      const { page, errors } = await open(390, '/' + shape);
      const quote = page.locator('.editor-quote'); await quote.waitFor();
      if (!(await quote.evaluate(element => element.open))) await quote.locator('summary').click();
      await page.getByLabel('Quantità del tuo biscotto', { exact: true }).fill('12');
      await quote.getByLabel('Ritiro in sede', { exact: true }).check();
      assert.match(await quote.locator('dd.quote-total').innerText(), /25,00/);
      await page.getByLabel('Quantità del tuo biscotto', { exact: true }).fill('9');
      for (const button of await page.locator('.checkout-actions button').all()) assert.equal(await button.isDisabled(), true);
      await page.getByLabel('Quantità del tuo biscotto', { exact: true }).fill('12');
      await quote.getByLabel('Spedizione', { exact: true }).check();
      assert.match(await quote.locator('dd.quote-total').innerText(), /31,00/);
      assert.match(await page.locator('.mobile-quote strong').innerText(), /31,00/);
      await page.getByRole('button', { name: "Continua con l'ordine", exact: true }).click();
      await page.getByRole('heading', { name: 'Il tuo ordine', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Quantità biscotto 1', { exact: true }).inputValue(), '12');
      assert.match(await page.locator('.grand-total').last().innerText(), /31,00/);
      await page.getByRole('button', { name: 'Modifica biscotto 1', exact: true }).click();
      await page.locator('.editor-quote').waitFor();
      await page.locator('.editor-quote summary').click();
      assert.equal(await page.getByLabel('Quantità del tuo biscotto', { exact: true }).inputValue(), '12');
      await page.getByLabel('Quantità del tuo biscotto', { exact: true }).fill('13');
      const nextShape = shape === 'quadrato' ? 'Cerchio' : 'Quadrato';
      await page.getByRole('link', { name: 'Forma ' + nextShape, exact: true }).click();
      await page.getByRole('button', { name: 'Aggiungi al carrello', exact: true }).click();
      await page.getByRole('heading', { name: 'Il tuo carrello', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Quantità biscotto 1', { exact: true }).inputValue(), '13');
      assert.match(await page.locator('.grand-total').last().innerText(), /36,00/);
      assert.deepEqual(errors, []);
      console.log(`PASS ${shape}: live price, invalid quantity, direct checkout, edit, shape change and cart keep the selected quantity.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
