const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync('artifacts', { recursive: true });
  const errors = [];
  try {
    for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1440, 950]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width <= 390 });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      await page.goto('http://127.0.0.1:4201/');
      const canvas = page.locator('.showcase canvas[data-ready=true]');
      await canvas.waitFor({ timeout: 30000 });
      const centeredText = await page.locator('.showcase-source').evaluate(el => {
        const cookie = el.querySelector('.cookie-shape').getBoundingClientRect();
        const text = el.querySelector('p').getBoundingClientRect();
        return Math.abs(text.y + text.height / 2 - cookie.y - cookie.height / 2) < 1;
      });
      assert.equal(centeredText, true, 'Homepage dedication is centered on the biscuit');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const beforeMotion = await canvas.evaluate(c => c.toDataURL());
      await page.waitForTimeout(350);
      assert.notEqual(await canvas.evaluate(c => c.toDataURL()), beforeMotion, 'Initial gentle motion is visible');
      const pixels = await canvas.evaluate(c => {
        const gl = c.getContext('webgl2');
        const data = new Uint8Array(c.width * c.height * 4);
        gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        let count = 0, left = c.width, right = 0, top = c.height, bottom = 0;
        const colors = new Set();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          count++;
          colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
          const x = i / 4 % c.width, y = c.height - 1 - Math.floor(i / 4 / c.width);
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        const rect = c.getBoundingClientRect();
        return { count, colors: colors.size, left: rect.left + left / c.width * rect.width, right: rect.left + right / c.width * rect.width, top: rect.top + top / c.height * rect.height, bottom: rect.top + bottom / c.height * rect.height };
      });
      assert.ok(pixels.count > 3000 && pixels.colors > 100, 'Cookie and original photographic texture are visible');
      const copy = await page.locator('.showcase-copy').boundingBox();
      const editor = await page.locator('.showcase-editor').boundingBox();
      const intersects = box => pixels.left < box.x + box.width && pixels.right > box.x && pixels.top < box.y + box.height && pixels.bottom > box.y;
      assert.equal(intersects(copy), false, 'Cookie does not overlap the heading');
      assert.equal(intersects(editor), false, 'Cookie does not overlap the dedication editor');
      const shapeSection = await page.locator('.shape-section').boundingBox();
      assert.ok(shapeSection.y < height, 'The next section is visible in the first viewport');
      console.log({ width, pixels, copy, editor });
      await page.screenshot({ path: 'artifacts/showcase-' + width + '.png', fullPage: true });
      const x = (pixels.left + pixels.right) / 2, y = (pixels.top + pixels.bottom) / 2;
      const beforeDrag = await canvas.evaluate(c => c.toDataURL());
      if (width <= 390) {
        const session = await page.context().newCDPSession(page);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 8; step++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 6, y: y + step }] });
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 45, y + 10, { steps: 8 });
        await page.mouse.up();
      }
      assert.notEqual(await canvas.evaluate(c => c.toDataURL()), beforeDrag, 'Cookie can be rotated');
      const beforeText = await canvas.evaluate(c => c.toDataURL());
      await page.getByLabel('La tua dedica', { exact: true }).fill('Auguri');
      await page.waitForTimeout(1000);
      assert.notEqual(await canvas.evaluate(c => c.toDataURL()), beforeText, 'Dedication updates the 3D cookie');
      await page.getByRole('button', { name: 'Crea questo biscotto' }).click();
      await page.waitForURL('**/cerchio');
      assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), 'Auguri');
      const centeredDesign = await page.locator('.example-boundary').evaluate(el => {
        const cookie = el.querySelector('.cookie-shape').getBoundingClientRect();
        const text = el.querySelector('.example-box p').getBoundingClientRect();
        return Math.abs(text.y + text.height / 2 - cookie.y - cookie.height / 2) < 1;
      });
      assert.equal(centeredDesign, true, 'Configurator dedication is centered on the biscuit');
      await page.getByRole('button', { name: 'Sposta testo', exact: true }).click();
      await page.waitForTimeout(700);
      const handle = await page.locator('.text-move-handle').boundingBox();
      const beforePosition = await page.locator('.example-box').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2 + 25, handle.y + handle.height / 2 + 25, { steps: 8 });
      await page.mouse.up();
      const afterPosition = await page.locator('.example-box').boundingBox();
      assert.ok(afterPosition.x - beforePosition.x > 15 && afterPosition.y - beforePosition.y > 15, 'Centered text remains draggable');
      await page.getByRole('button', { name: 'Ripristina posizione testo', exact: true }).click();
      await page.getByRole('button', { name: 'Aggiungi riga', exact: true }).click();
      await page.getByLabel('Seconda riga', { exact: true }).fill('Buon');
      assert.equal(await page.locator('.example-boundary').evaluate(el => {
        const cookie = el.querySelector('.cookie-shape').getBoundingClientRect();
        const text = el.querySelector('.example-box p').getBoundingClientRect();
        return Math.abs(text.y + text.height / 2 - cookie.y - cookie.height / 2) < 1;
      }), true, 'Restored multi-line text is centered too');
      await page.goto('http://127.0.0.1:4201/');
      await page.getByLabel('La tua dedica', { exact: true }).fill('Festa');
      await page.locator('.shape-link[href="/cuore"]').click();
      await page.waitForURL('**/cuore');
      assert.equal(await page.getByLabel('Prima riga', { exact: true }).inputValue(), 'Festa');
      await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto('http://127.0.0.1:4201/');
    const canvas = reduced.locator('.showcase canvas[data-ready=true]');
    await canvas.waitFor({ timeout: 30000 });
    await reduced.waitForTimeout(800);
    const still = await canvas.evaluate(c => c.toDataURL());
    await reduced.waitForTimeout(350);
    assert.equal(await canvas.evaluate(c => c.toDataURL()), still, 'Reduced motion disables automatic movement');
    await reduced.close();
    assert.deepEqual(errors, []);
    console.log('PASS: responsive homepage showcase, textured canvas, gentle motion, rotation, live dedication, draft handoff and reduced-motion preference.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
