const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.COOKIE_URL || 'http://127.0.0.1:4201';
const artifacts = path.resolve('artifacts');
fs.mkdirSync(artifacts, { recursive: true });

async function checkLayout(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Horizontal overflow');
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    // Keep this check local: consent vendors, payments and email are not contacted.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === new URL(baseUrl).origin || url.protocol === 'data:' ? route.continue() : route.abort();
    });
    for (const width of [320, 360, 600, 768, 960, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['', '/rettangolo', '/contatti']) {
        await page.goto(`${baseUrl}${route}`);
        await page.locator('.site-nav').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await checkLayout(page);
        if (route === '/rettangolo') {
          const boxes = await page.locator('.shape-options a').evaluateAll(elements => elements.map(element => {
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width };
          }));
          boxes.forEach((box, index) => {
            assert.ok(box.width >= 45, `Narrow shape selector at ${width}px`);
            if (index) assert.ok(box.left >= boxes[index - 1].right, `Overlapping shapes at ${width}px`);
          });
        }
      }
      await page.goto(baseUrl);
      if (width <= 600) {
        await page.getByRole('button', { name: 'Apri menu', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Chiudi menu', exact: true }).getAttribute('aria-expanded'), 'true');
        await checkLayout(page);
        await page.locator('#header-links').getByRole('link', { name: 'Contatti', exact: true }).click();
        await page.waitForURL('**/contatti');
        assert.equal(await page.locator('#header-links').isVisible(), false);
        await page.goto(baseUrl);
      }
      await page.screenshot({ path: path.join(artifacts, `responsive-home-${width}.png`), fullPage: true });
    }
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(baseUrl);
      await page.locator('.shape-card').first().waitFor();
      assert.equal(await page.locator('.shape-card').count(), 5);
      await page.evaluate(() => document.fonts.ready);
      await checkLayout(page);
      await page.screenshot({ path: path.join(artifacts, `home-${viewport.width}.png`), fullPage: true });
      for (const shape of ['rettangolo', 'cerchio', 'quadrato', 'esagono', 'cuore']) {
        await page.goto(`${baseUrl}/${shape}`);
        await page.locator('.example-boundary').waitFor();
        await page.getByRole('tab', { name: 'Testo', exact: true }).click();
        await page.getByLabel('Prima riga', { exact: true }).fill('Auguri');
        await page.getByRole('button', { name: 'Rosso', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.example-box p')?.textContent.trim() === 'Auguri', null, { timeout: 5000 });
        assert.equal((await page.locator('.example-box p').textContent()).trim(), 'Auguri');
        await page.getByRole('tab', { name: 'Sfondo', exact: true }).click();
        await page.getByRole('tab', { name: 'Testo', exact: true }).click();
        assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), 'Auguri');
        if (shape === 'cerchio') {
          await page.getByRole('tab', { name: 'Sfondo', exact: true }).click();
          await page.getByRole('button', { name: 'Menta', exact: true }).click();
          await page.locator('input[type=file]').setInputFiles(path.resolve('src/assets/1.jpeg'));
          await page.locator('image-cropper').waitFor({ state: 'visible' });
          await page.waitForFunction(() => document.querySelector('image-cropper img')?.naturalWidth > 0);
          await page.locator('.cookie-image').waitFor({ state: 'visible' });
          assert.ok((await page.locator('.cookie-image').getAttribute('src')).startsWith('data:image/'));
        }
        assert.match(await page.locator('.cookie-shape').evaluate(element => getComputedStyle(element).backgroundImage), /cookie-texture/);
        await checkLayout(page);
        const preview = await page.locator('.example-boundary').boundingBox();
        const shapeBoxes = await page.locator('.shape-options a').evaluateAll(elements => elements.map(element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        }));
        shapeBoxes.forEach((box, index) => {
          assert.ok(box.width >= 45, 'Shape option is too narrow');
          if (index > 0) assert.ok(box.left >= shapeBoxes[index - 1].right, 'Shape options overlap');
        });
        const controls = await page.locator('.maker-controls').boundingBox();
        assert.ok(preview.x + preview.width <= controls.x || preview.y + preview.height <= controls.y, 'Controls overlap preview');
        await page.screenshot({ path: path.join(artifacts, `${shape}-${viewport.width}.png`), fullPage: true });
        await page.getByRole('button', { name: 'Continua con l\'ordine' }).click();
        await page.waitForURL('**/checkout');
        await page.locator('.preview').waitFor();
        assert.ok((await page.locator('.preview').getAttribute('src')).startsWith('data:image/png;base64,'));
        await page.getByRole('button', { name: 'Aumenta quantita', exact: true }).click();
        assert.equal(await page.getByRole('spinbutton').inputValue(), '11');
        assert.match(await page.locator('.grand-total').last().textContent(), /26,00/);
        await page.getByRole('spinbutton').fill('9');
        await page.getByRole('spinbutton').blur();
        assert.equal(await page.getByRole('button', { name: 'Vai al pagamento' }).isDisabled(), true);
        await page.getByRole('spinbutton').fill('10');
        await page.getByRole('spinbutton').blur();
        await checkLayout(page);
        await page.screenshot({ path: path.join(artifacts, `checkout-${shape}-${viewport.width}.png`), fullPage: true });
        await page.getByRole('link', { name: 'Modifica biscotto' }).click();
        await page.getByLabel('Prima riga', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), 'Auguri');
      }
      await page.goto(`${baseUrl}/contatti`);
      await page.getByRole('button', { name: 'Invia messaggio' }).click();
      assert.equal(await page.locator('mat-error').count(), 4);
      await checkLayout(page);
      await page.screenshot({ path: path.join(artifacts, `contact-${viewport.width}.png`), fullPage: true });
    }
    await page.goto(`${baseUrl}/rettangolo`);
    await page.getByLabel('Prima riga', { exact: true }).fill('Festa');
    await page.getByRole('link', { name: 'Forma Cerchio', exact: true }).click();
    await page.waitForURL('**/cerchio');
    assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), 'Festa');
    await page.getByRole('button', { name: 'Azzera personalizzazione' }).click();
    assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), '');
    await page.goto(`${baseUrl}/cerchio`);
    await page.getByRole('button', { name: 'Continua con l\'ordine' }).click();
    await page.waitForURL('**/checkout');
    await page.getByRole('link', { name: 'Scheda biscotto' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Scarica PDF' }).click();
    const download = await downloadPromise;
    const pdfPath = path.join(artifacts, download.suggestedFilename());
    await download.saveAs(pdfPath);
    assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    console.log('PASS: desktop/mobile, original texture, 5 shapes, inline editor, draft persistence across shapes/checkout, image upload/crop/export, quantity, totals, contact validation, PDF download.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
