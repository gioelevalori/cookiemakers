const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.COOKIE_URL || 'http://127.0.0.1:4202/cookiemakers/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const shape of ['cerchio', 'rettangolo', 'quadrato', 'esagono', 'cuore']) {
      for (const mode of ['2D', '3D']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
        await page.goto(`${base}#/${shape}`, { waitUntil: 'domcontentloaded' });
        if (mode === '2D') {
          await page.getByLabel('Prima riga', { exact: true }).fill('Da cancellare');
          await page.getByRole('button', { name: 'Aggiungi riga' }).click();
          await page.getByLabel('Seconda riga', { exact: true }).fill('Seconda');
          await page.getByRole('button', { name: 'Rosso', exact: true }).click();
          await page.getByRole('tab', { name: 'Sfondo', exact: true }).click();
          await page.getByRole('button', { name: 'Menta', exact: true }).click();
          await page.locator('input[type=file]').setInputFiles('src/assets/1.jpeg');
          await page.locator('.cookie-image').waitFor();
          await page.getByRole('button', { name: 'Ricomincia da zero', exact: true }).click();
          assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), '');
          assert.equal(await page.getByLabel('Seconda riga', { exact: true }).count(), 0);
          assert.equal(await page.locator('.cookie-image').count(), 0);
          await page.reload({ waitUntil: 'domcontentloaded' });
          const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-design-v1')).draft);
          for (const key of ['testoInput', 'testoDueInput', 'testoTreInput', 'croppedImage', 'originalImage', 'originalImageName', 'selectedColor', 'selectedColorSfondo']) assert.equal(draft[key], '');
          assert.equal(draft.fontSize, 36);
          assert.equal(draft.selectedFontFamily, 'CocoGothic');
          assert.deepEqual(draft.textPosition, { x: 0, y: 0 });
        }
        if (mode === '3D') await page.getByRole('button', { name: '3D', exact: true }).click();
        await page.getByRole('button', { name: "Continua con l'ordine" }).click();
        await page.locator('.preview').waitFor();
        const visibleCookie = await page.locator('.preview').evaluate(async image => {
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let cookiePixels = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > pixels[i + 2] + 20 && pixels[i] > 140 && pixels[i + 3] > 200) cookiePixels++;
          }
          return cookiePixels / (canvas.width * canvas.height);
        });
        assert.ok(visibleCookie > 0.2, `${shape} ${mode}: missing cookie`);
        assert.doesNotMatch(await page.locator('.design-summary dl').innerText(), /Carattere|Colore testo|Testo/);
        await page.getByRole('link', { name: 'Scheda biscotto' }).click();
        await page.locator('.final-image').waitFor();
        for (const selector of ['.specifications', '.palette', '.source-photo', '.cropped-photo', '.delivery-details']) {
          assert.equal(await page.locator(selector).count(), 0, `${shape} ${mode}: unused ${selector}`);
        }
        console.log(`PASS ${shape} ${mode}: visible cookie; summary contains only selected options.`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
