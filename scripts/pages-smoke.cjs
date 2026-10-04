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
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin || route.request().url().startsWith('data:') ? route.continue() : route.abort());
      const response = await page.goto(base);
      assert.equal(response.status(), 200);
      await page.locator('.shape-link').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.match(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /Fraunces/);
      await page.locator('.shape-link[href$="/quadrato"]').click();
      await page.waitForURL('**/#/quadrato');
      await page.reload();
      await page.getByLabel('Prima riga', { exact: true }).fill('Auguri');
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
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: 'artifacts/pages-3d-' + width + '.png', fullPage: true });
      await page.getByRole('button', { name: "Continua con l'ordine" }).click();
      await page.waitForURL('**/#/checkout');
      await page.locator('.preview').waitFor();
      assert.ok((await page.locator('.preview').getAttribute('src')).startsWith('data:image/png'));
      await page.goto(base + '#/contatti');
      const contactResponse = await page.reload();
      assert.equal(contactResponse.status(), 200);
      await page.getByRole('button', { name: 'Invia messaggio' }).waitFor();
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
