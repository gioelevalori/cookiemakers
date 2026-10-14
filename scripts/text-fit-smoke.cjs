const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 950 }, isMobile: true, hasTouch: true });
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      let limited = false;
      for (const shape of ['cerchio', 'rettangolo', 'quadrato', 'esagono', 'cuore']) {
        await page.goto('http://127.0.0.1:4201/' + shape);
        await page.getByLabel('Prima riga', { exact: true }).fill('Auguri');
        await page.evaluate(() => document.fonts.ready);
        const minus = page.getByRole('button', { name: 'Riduci dimensione', exact: true });
        while (await minus.isEnabled()) await minus.tap();
        await page.getByRole('button', { name: 'Sposta testo', exact: true }).click();
        await page.waitForTimeout(700);
        const handle = await page.locator('.text-move-handle').boundingBox();
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
        await page.mouse.down();
        await page.mouse.move(handle.x + handle.width / 2 + 45, handle.y + handle.height / 2 + 25, { steps: 8 });
        await page.mouse.up();
        const plus = page.getByRole('button', { name: 'Aumenta dimensione', exact: true });
        while (await plus.isEnabled()) await plus.tap();
        const maximum = Number(await page.locator('.font-size output').textContent());
        if (maximum < 43) limited = true;
        assert.equal(await plus.isDisabled(), true);
        const currentScale = await page.evaluate(() => visualViewport.scale);
        assert.equal(currentScale, 1);
        await page.getByRole('button', { name: 'Ripristina posizione testo', exact: true }).click();
        if (maximum < 43) assert.equal(await plus.isEnabled(), true, 'Centering restores available space');
        console.log({ width, shape, maximum });
      }
      assert.equal(limited, true, 'At least one shape limits growth before the generic maximum when moved near its edge');
      await page.close();
    }
    console.log('PASS: the plus button respects shape/text position and preserves mobile zoom behavior.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
