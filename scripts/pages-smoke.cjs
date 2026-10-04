const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

async function main() {
  let server;
  let base = process.env.PAGES_URL;
  if (!base) {
    const root = path.resolve('dist/cookie-maker/browser');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };
    server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(root, pathname.replace(/^\/cookiemakers\//, '') || 'index.html');
      if (!pathname.startsWith('/cookiemakers/') || !file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404); response.end(); return;
      }
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + server.address().port + '/cookiemakers/';
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  fs.mkdirSync('artifacts', { recursive: true });
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 }, hasTouch: width <= 390 });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      const response = await page.goto(base);
      assert.equal(response.status(), 200);
      await page.locator('.shape-link').first().waitFor();
      const homeHexagon = await page.locator('.cookie-shape.hexagon').boundingBox();
      assert.ok(Math.abs(homeHexagon.width / homeHexagon.height - 2 / Math.sqrt(3)) < 0.002);
      await page.evaluate(() => document.fonts.ready);
      assert.match(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /Fraunces/);
      await page.locator('.shape-link[href$="/quadrato"]').click();
      await page.waitForURL('**/#/quadrato');
      await page.reload();
      await page.getByLabel('Prima riga', { exact: true }).fill('Auguri');
      assert.equal(await page.locator('.text-selection').count(), 0, 'Typing does not activate movement');
      assert.equal(await page.locator('app-maker-text').evaluate(el => el.querySelector('.font-size').compareDocumentPosition(el.querySelector('.swatches')) & Node.DOCUMENT_POSITION_FOLLOWING), 4, 'Text size precedes color');
      await page.getByRole('button', { name: 'Sposta testo', exact: true }).click();
      await page.locator('.text-move-handle').waitFor();
      await page.waitForTimeout(700);
      const handle = page.locator('.text-move-handle');
      const initial = await page.locator('.example-box').boundingBox();
      const initialBoundary = await page.locator('.example-boundary').boundingBox();
      const target = await handle.boundingBox();
      const x = target.x + target.width / 2, y = target.y + target.height / 2;
      if (width <= 390) {
        const session = await page.context().newCDPSession(page);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 8; step++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 4, y: y + step * 5 }] });
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 32, y + 40, { steps: 8 });
        await page.mouse.up();
      }
      const moved = await page.locator('.example-box').boundingBox();
      assert.ok(moved.x - initial.x > 20 && moved.y - initial.y > 25, 'Move handle drags text with mouse/touch: ' + JSON.stringify({ initial, moved }));
      await page.screenshot({ path: 'artifacts/text-position-' + width + '.png', fullPage: true });
      await page.getByRole('button', { name: 'Fatto', exact: true }).click();
      assert.equal(await page.locator('.text-selection').count(), 0, 'Finishing movement hides the selection');
      await page.getByRole('button', { name: 'Sposta testo', exact: true }).click();
      await page.waitForTimeout(700);
      const resetPosition = page.getByRole('button', { name: 'Ripristina posizione testo', exact: true });
      assert.match(await resetPosition.textContent(), /Ripristina posizione/);
      await resetPosition.click();
      const centered = await page.locator('.example-box').boundingBox();
      const centeredBoundary = await page.locator('.example-boundary').boundingBox();
      assert.ok(Math.abs(centered.x - centeredBoundary.x - initial.x + initialBoundary.x) < 1 && Math.abs(centered.y - centeredBoundary.y - initial.y + initialBoundary.y) < 1);
      assert.match(await page.getByRole('combobox', { name: 'Carattere', exact: true }).textContent(), /CocoGothic/);
      await page.getByRole('button', { name: '3D', exact: true }).click();
      const canvas = page.locator('canvas[data-ready=true]');
      await canvas.waitFor({ timeout: 30000 });
      const visible = await canvas.evaluate(c => {
        const gl = c.getContext('webgl2');
        const bytes = new Uint8Array(c.width * c.height * 4);
        gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        return bytes.some((value, i) => i % 4 === 3 && value > 0);
      });
      assert.equal(visible, true);
      await page.getByRole('button', { name: 'Sposta testo', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('app-cookie-3d'));
      await handle.waitFor({ state: 'visible' });
      await page.getByRole('button', { name: '3D', exact: true }).click();
      await canvas.waitFor({ timeout: 30000 });
      await page.screenshot({ path: 'artifacts/position-controls-' + width + '.png', fullPage: true });
      const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(el => { const b = el.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && b.left >= 0; }).map(el => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width })));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, JSON.stringify(overflowing));
      await page.screenshot({ path: 'artifacts/pages-3d-' + width + '.png', fullPage: true });
      await page.getByRole('button', { name: 'Sposta testo', exact: true }).click();
      await handle.waitFor({ state: 'visible' });
      await page.getByRole('button', { name: "Continua con l'ordine" }).click();
      await page.waitForURL('**/#/checkout');
      await page.locator('.preview').waitFor();
      assert.ok((await page.locator('.preview').getAttribute('src')).startsWith('data:image/png'));
      const selectionPixels = await page.locator('.preview').evaluate(async image => {
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === 32 && data[i + 1] === 90 && data[i + 2] === 72 && data[i + 3] > 200) count++;
        }
        return count;
      });
      assert.equal(selectionPixels, 0, 'Movement controls are excluded from the exported biscuit');
      await page.goto(base + '#/contatti');
      const contactResponse = await page.reload();
      assert.equal(contactResponse.status(), 200);
      await page.getByRole('button', { name: 'Invia messaggio' }).waitFor();
      await page.goto(base + '#/esagono');
      const hexagon = page.locator('.cookie-shape.hexagon');
      await hexagon.waitFor();
      const bounds = await hexagon.boundingBox();
      assert.ok(Math.abs(bounds.width / bounds.height - 2 / Math.sqrt(3)) < 0.002, 'Regular hexagon proportions');
      assert.equal(await hexagon.evaluate(el => getComputedStyle(el).clipPath), 'polygon(25% 0px, 75% 0px, 100% 50%, 75% 100%, 25% 100%, 0px 50%)', 'Original flat-top orientation');
      await page.screenshot({ path: 'artifacts/hexagon-2d-' + width + '.png', fullPage: true });
      await page.getByRole('button', { name: '3D', exact: true }).click();
      await page.locator('canvas[data-ready=true]').waitFor({ timeout: 30000 });
      await page.screenshot({ path: 'artifacts/hexagon-3d-' + width + '.png', fullPage: true });
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: GitHub Pages base path, hash route refresh, original cookie fonts, site typography, textured 3D and checkout on desktop/mobile.');
  } finally {
    await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
