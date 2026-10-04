const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

async function main() {
  const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4201/';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync('artifacts', { recursive: true });
  try {
    for (const width of [390, 1440]) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const context = await browser.newContext({ viewport: { width, height: 950 } });
        const page = await context.newPage();
        if (attempt === 1) {
          await page.addInitScript(() => {
            const drawImage = CanvasRenderingContext2D.prototype.drawImage;
            CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
              if (!window.__captureSkipped && source instanceof HTMLImageElement && source.src.startsWith('data:image/svg+xml') && source.src.includes('foreignObject')) {
                window.__captureSkipped = true;
                return;
              }
              return drawImage.call(this, source, ...args);
            };
          });
        }
        await page.route('**/assets/cookie-texture.jpg', async route => {
          await new Promise(resolve => setTimeout(resolve, 800));
          await route.continue();
        });
        await page.goto(base + 'rettangolo', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '3D', exact: true }).click();
        const canvas = page.locator('canvas[data-ready=true]');
        await canvas.waitFor({ timeout: 30000 });
        const pixels = await canvas.evaluate(c => {
          const gl = c.getContext('webgl2');
          const bytes = new Uint8Array(c.width * c.height * 4);
          gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
          let dark = 0, visible = 0;
          for (let i = 0; i < bytes.length; i += 4) {
            if (bytes[i + 3] < 200) continue;
            visible++;
            if (Math.max(bytes[i], bytes[i + 1], bytes[i + 2]) < 40) dark++;
          }
          return { visible, dark, fraction: dark / visible };
        });
        console.log({ width, attempt, pixels });
        await page.screenshot({ path: 'artifacts/rectangle-cold-' + width + '-' + attempt + '.png', fullPage: true });
        assert.ok(pixels.visible > 1000 && pixels.fraction < 0.01, 'First textured frame must not be black');
        if (attempt === 1) assert.equal(await page.evaluate(() => window.__captureSkipped), true, 'Cold empty rasterization was exercised');
        await context.close();
      }
    }
    console.log('PASS: first rectangle frame is textured with a fresh cache and delayed image loading.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
