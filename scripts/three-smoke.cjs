const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
fs.mkdirSync('artifacts', { recursive: true });

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    const loadingPage = await browser.newPage({ viewport: { width: 390, height: 950 } });
    await loadingPage.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || route.request().url().startsWith('data:') ? route.continue() : route.abort());
    let releaseTexture;
    const textureGate = new Promise(resolve => { releaseTexture = resolve; });
    await loadingPage.route('**/assets/cookie-texture.jpg', async route => { await textureGate; await route.continue(); });
    await loadingPage.goto('http://127.0.0.1:4201/quadrato', { waitUntil: 'domcontentloaded' });
    await loadingPage.getByRole('button', { name: '3D', exact: true }).click();
    await loadingPage.locator('app-cookie-3d canvas').waitFor({ state: 'attached' });
    assert.equal(await loadingPage.locator('app-cookie-3d canvas').evaluate(c => getComputedStyle(c).visibility), 'hidden', 'Untextured canvas appeared during loading');
    assert.equal(await loadingPage.locator('app-cookie-3d .surface').getAttribute('aria-busy'), 'true');
    await loadingPage.screenshot({ path: 'artifacts/3d-loading-390.png', fullPage: true });
    releaseTexture();
    await loadingPage.locator('canvas[data-ready=true]').waitFor({ timeout: 30000 });
    assert.equal(await loadingPage.locator('app-cookie-3d .surface').getAttribute('aria-busy'), 'false');
    await loadingPage.close();
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 950 }, hasTouch: width === 390 });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      for (const shape of ['cerchio', 'rettangolo', 'quadrato', 'esagono', 'cuore']) {
        await page.goto('http://127.0.0.1:4201/' + shape);
        await page.getByLabel('Prima riga', { exact: true }).fill('Auguri');
        await page.getByRole('button', { name: '3D', exact: true }).click();
        const canvas = page.locator('app-cookie-3d canvas[data-ready=true]');
        await canvas.waitFor({ timeout: 30000 });
        await canvas.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        const pixels = await canvas.evaluate(c => {
          const gl = c.getContext('webgl2');
          const bytes = new Uint8Array(c.width * c.height * 4);
          gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
          let visible = 0;
          const colors = new Set();
          for (let i = 0; i < bytes.length; i += 4) {
            if (bytes[i + 3]) { visible++; colors.add(bytes[i] + ',' + bytes[i + 1] + ',' + bytes[i + 2]); }
          }
          return { visible, colors: colors.size, total: c.width * c.height };
        });
        assert.ok(pixels.visible > pixels.total * 0.08, 'Blank/undersized 3D cookie');
        assert.ok(pixels.colors > 100, 'Texture missing');
        const before = await canvas.evaluate(c => c.toDataURL());
        await page.screenshot({ path: 'artifacts/3d-initial-' + shape + '-' + width + '.png', fullPage: true });
        const box = await canvas.boundingBox();
        if (width === 390) {
          const session = await context.newCDPSession(page);
          for (const [type, dx] of [['touchStart', 0], ['touchMove', 60], ['touchMove', 110]]) {
            await session.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 }] });
          }
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await session.detach();
        } else {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2 + 110, box.y + box.height / 2 + 40, { steps: 12 });
          await page.mouse.up();
        }
        assert.notEqual(await canvas.evaluate(c => c.toDataURL()), before, 'Rotation did not change pixels');
        await page.screenshot({ path: 'artifacts/3d-' + shape + '-' + width + '.png', fullPage: true });
        const rotated = await canvas.evaluate(c => c.toDataURL());
        await page.getByLabel('Prima riga', { exact: true }).fill('Festa');
        await page.waitForFunction(previous => document.querySelector('app-cookie-3d canvas')?.toDataURL() !== previous, rotated);
        if (shape === 'cerchio') {
          for (const family of ['PhotoShoot', 'BeckMan', 'CocoGothic']) {
            const previous = await canvas.evaluate(c => c.toDataURL());
            await page.getByRole('combobox', { name: 'Carattere', exact: true }).click();
            await page.getByRole('option', { name: family, exact: true }).click();
            await page.waitForFunction(previous => document.querySelector('app-cookie-3d canvas')?.toDataURL() !== previous, previous);
            assert.ok(await page.evaluate(family => document.fonts.check('36px "' + family + '"'), family), 'Local cookie font is not loaded');
            assert.match(await page.locator('.example-box p').evaluate(p => getComputedStyle(p).fontFamily), new RegExp(family));
          }
          await page.getByRole('tab', { name: 'Sfondo', exact: true }).click();
          const old = await canvas.evaluate(c => c.toDataURL());
          await page.getByRole('button', { name: 'Menta', exact: true }).click();
          await page.locator('input[type=file]').setInputFiles('src/assets/1.jpeg');
          await page.waitForFunction(() => !!document.querySelector('.cookie-image'));
          await page.waitForFunction(previous => document.querySelector('app-cookie-3d canvas')?.toDataURL() !== previous, old);
          await page.locator('app-cookie-3d canvas[data-has-photo=true]').waitFor();
          await page.screenshot({ path: 'artifacts/3d-photo-' + width + '.png', fullPage: true });
          await page.getByRole('tab', { name: 'Testo', exact: true }).click();
        }
        await page.getByRole('button', { name: "Continua con l'ordine" }).click();
        await page.waitForURL('**/checkout');
        const image = page.locator('.preview');
        await image.waitFor();
        await page.waitForFunction(() => document.querySelector('.preview')?.complete);
        const variation = await image.evaluate(img => {
          const c = document.createElement('canvas'); c.width = c.height = 64;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 64, 64);
          const bytes = ctx.getImageData(0, 0, 64, 64).data;
          return new Set(Array.from({ length: 4096 }, (_, i) => bytes[i * 4] + ',' + bytes[i * 4 + 1] + ',' + bytes[i * 4 + 2])).size;
        });
        assert.ok(variation > 100, 'Export from 3D mode is blank');
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: five textured 3D shapes, live text updates, mouse/touch rotation, nonblank canvas pixels, desktop/mobile layout and export from 3D.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
