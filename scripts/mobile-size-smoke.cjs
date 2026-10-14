const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      for (const shape of ['cerchio', 'rettangolo', 'quadrato', 'esagono', 'cuore']) {
        await page.goto('http://127.0.0.1:4201/' + shape);
        const increase = page.getByRole('button', { name: 'Aumenta dimensione', exact: true });
        const decrease = page.getByRole('button', { name: 'Riduci dimensione', exact: true });
        await increase.scrollIntoViewIfNeeded();
        assert.equal(await increase.evaluate(el => getComputedStyle(el).touchAction), 'manipulation');
        assert.equal(await decrease.evaluate(el => getComputedStyle(el).touchAction), 'manipulation');
        const before = await page.evaluate(() => visualViewport.scale);
        for (let i = 0; i < 7; i++) await increase.tap();
        assert.equal(await page.locator('.font-size output').textContent(), '43');
        assert.equal(await increase.isDisabled(), true);
        assert.equal(await page.evaluate(() => visualViewport.scale), before, 'Rapid plus taps must not zoom the page');
        for (let i = 0; i < 7; i++) await decrease.tap();
        assert.equal(await page.locator('.font-size output').textContent(), '36');
        assert.equal(await page.evaluate(() => visualViewport.scale), before, 'Rapid minus taps must not zoom the page');
        const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
        assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(viewport), 'Page zoom remains available');
      }
      await page.close();
    }
    console.log('PASS: repeated mobile plus/minus taps change text size without page zoom on all five shapes; user zoom remains enabled.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
