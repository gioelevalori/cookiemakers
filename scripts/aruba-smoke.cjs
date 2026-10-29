const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve('dist/aruba/browser');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };

// Local static preview of the packaged files; Apache rules still need a check on Aruba.
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + pathname);
  if (pathname === '/.htaccess') { response.writeHead(403).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (file === root) file = path.join(root, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (!/^\/(?:cgi-bin|\.well-known)(?:\/|$)/.test(pathname) && ['GET', 'HEAD'].includes(request.method) && (request.headers.accept || '').includes('text/html')) {
      file = path.join(root, 'index.html');
    } else { response.writeHead(404).end(); return; }
  }
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  if (path.basename(file) === 'index.html') response.setHeader('Cache-Control', 'no-cache');
  if (request.method === 'HEAD') response.end();
  else fs.createReadStream(file).pipe(response);
});

(async () => {
  const configuration = JSON.parse(fs.readFileSync('angular.json', 'utf8')).projects.cookieMaker.architect.build.configurations;
  assert.equal(configuration.aruba.baseHref, '/');
  assert.equal(configuration['github-pages'].fileReplacements[0].with, 'src/app/environment.pages.ts');
  const rules = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
  assert.match(rules, /REQUEST_FILENAME/);
  assert.match(rules, /cgi-bin/);
  assert.match(rules, /well-known/);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync('artifacts', { recursive: true });
  try {
    assert.equal((await fetch(base + '/missing.js')).status, 404);
    assert.equal((await fetch(base + '/.well-known/missing', { headers: { Accept: 'text/html' } })).status, 404);
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 950 }, hasTouch: width === 390 });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      const failedAssets = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) failedAssets.push(response.url()); });
      for (const route of ['/', '/galleria', '/eventi', '/chisiamo', '/su-misura', '/contatti', '/cerchio', '/rettangolo', '/quadrato', '/cuore', '/esagono']) {
        assert.equal((await page.goto(base + route)).status(), 200);
        await page.locator('main h1').waitFor();
        assert.equal(await page.locator('base').getAttribute('href'), '/');
        assert.equal(new URL(page.url()).hash, '');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      assert.equal((await page.reload()).status(), 200);
      await page.getByLabel('Prima riga', { exact: true }).fill('Aruba');
      await page.getByRole('button', { name: '3D', exact: true }).click();
      const canvas = page.locator('app-cookie-3d canvas[data-ready=true]');
      await canvas.waitFor({ timeout: 30000 });
      await canvas.scrollIntoViewIfNeeded();
      const colored = await canvas.evaluate(canvas => {
        const gl = canvas.getContext('webgl2');
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let count = 0;
        for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 3] > 200 && pixels[index] > pixels[index + 2] + 20) count++;
        return count;
      });
      assert.ok(colored > 500, 'The textured biscuit renders nonblank warm pixels');
      const before = await canvas.evaluate(canvas => canvas.toDataURL());
      const bounds = await canvas.boundingBox();
      const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
      if (width === 390) {
        const session = await context.newCDPSession(page);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 6, y: y + i * 2 }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 60, y + 20, { steps: 8 });
        await page.mouse.up();
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(before === await canvas.evaluate(canvas => canvas.toDataURL()), false, 'Touch/mouse rotates the biscuit');
      await canvas.screenshot({ path: `artifacts/aruba-3d-${width}.png` });
      await page.getByRole('button', { name: "Continua con l'ordine", exact: true }).click();
      await page.locator('.design-summary').waitFor();
      await page.locator('.preview').evaluate(image => image.decode());
      assert.match(await page.locator('.design-summary').innerText(), /Aruba/);
      assert.equal(await page.getByRole('button', { name: 'Vai al pagamento', exact: true }).isEnabled(), true, 'Aruba pays through /api/checkout-session.php');
      assert.equal(await page.getByRole('button', { name: 'Prova pagamento Stripe', exact: true }).count(), 0);
      const url = new URL(await page.getByRole('link', { name: 'Richiedi ordine su WhatsApp', exact: true }).getAttribute('href'));
      assert.equal(url.pathname, '/393491687845');
      assert.match(url.searchParams.get('text'), /Aruba/);
      await page.screenshot({ path: `artifacts/aruba-checkout-${width}.png`, fullPage: true });
      assert.deepEqual(failedAssets, []);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: production assets, path routes, refresh, original fonts and texture, 3D rotation, order export, WhatsApp and disabled payment demo.`);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
