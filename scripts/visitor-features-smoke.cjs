const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync('artifacts', { recursive: true });
  const errors = [];
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      await page.goto('http://127.0.0.1:4201/');
      assert.equal(await page.locator('.inspiration-card').count(), 4);
      await page.getByRole('button', { name: 'Personalizza: Matrimonio', exact: true }).click();
      await page.waitForURL('**/cuore');
      await page.getByLabel('Prima riga', { exact: true }).fill('Giulia');
      await page.getByLabel('Seconda riga', { exact: true }).fill('Marco');
      await page.getByRole('button', { name: 'Salva per dopo', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.save-feedback')?.textContent.includes('Bozza salvata'));
      await page.locator('.workflow a[href="/"]').click();
      await page.locator('.shape-link[href="/quadrato"]').click();
      assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), '');
      await page.getByLabel('Prima riga', { exact: true }).fill('Leo');
      await page.getByRole('button', { name: 'Salva per dopo', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.save-feedback')?.textContent.includes('Bozza salvata'));
      await page.locator('.workflow a[href="/"]').click();
      await page.reload();
      assert.equal(await page.locator('.saved-design-card').count(), 2);
      assert.equal(await page.locator('.saved-design-card img').count(), 2);
      await page.locator('.saved-design-section').screenshot({ path: 'artifacts/saved-list-' + width + '.png' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.getByRole('button', { name: 'Riprendi biscotto salvato: Giulia', exact: true }).click();
      assert.equal(await page.getByLabel('Seconda riga', { exact: true }).inputValue(), 'Marco');
      await page.getByLabel('Prima riga', { exact: true }).fill('Modificato');
      await page.locator('.workflow a[href="/"]').click();
      await page.getByRole('button', { name: 'Riprendi biscotto salvato: Giulia', exact: true }).click();
      assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), 'Giulia', 'Unsaved edits do not overwrite a saved biscuit');
      await page.getByLabel('Prima riga', { exact: true }).fill('Tecla');
      await page.getByRole('button', { name: 'Salva per dopo', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.save-feedback')?.textContent.includes('Bozza salvata'));
      await page.locator('.workflow a[href="/"]').click();
      assert.equal(await page.locator('.saved-design-card').count(), 2, 'Saving a resumed biscuit updates it');
      await page.getByRole('button', { name: 'Elimina biscotto salvato: Tecla', exact: true }).click();
      await page.reload();
      assert.equal(await page.locator('.saved-design-card').count(), 1);
      assert.match(await page.locator('.saved-design-section').textContent(), /Leo/);
      for (const route of ['cerchio', 'rettangolo', 'quadrato', 'esagono', 'cuore']) {
        await page.locator('.shape-link[href="/' + route + '"]').click();
        assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), '', 'A fresh biscuit does not load saved or abandoned edits');
        await page.getByLabel('Prima riga', { exact: true }).fill('Prova');
        await page.locator('.workflow a[href="/"]').click();
        await page.locator('.shape-link[href="/' + route + '"]').click();
        assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), '', 'Leaving without Save resets the editor');
        await page.reload();
        assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), '');
        await page.locator('.workflow a[href="/"]').click();
      }
      await page.getByRole('button', { name: 'Elimina biscotto salvato: Leo', exact: true }).click();
      await page.reload();
      assert.equal(await page.locator('.saved-design-section').count(), 0);
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: multiple saved biscuit previews, individual delete, reload persistence, update without duplicates and unsaved reset on all five shapes.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
