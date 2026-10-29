import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ID = /^[0-9a-f-]{36}$/;

// Keeps each order (with its images) on disk between the Stripe session and the payment webhook.
// Stripe metadata is limited to short strings, so images cannot travel through Stripe.
export function createFileStore(dir) {
  const file = id => {
    if (!ID.test(id)) throw new Error('Invalid order id');
    return join(dir, `${id}.json`);
  };

  return {
    async save(id, order) {
      await mkdir(dir, { recursive: true });
      const target = file(id);
      await writeFile(`${target}.tmp`, JSON.stringify(order));
      await rename(`${target}.tmp`, target);
    },

    async load(id) {
      try {
        return JSON.parse(await readFile(file(id), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    },

    /** Deletes orders older than maxAgeMs: abandoned checkouts and orders already emailed. */
    async prune(maxAgeMs, now = Date.now()) {
      let names;
      try { names = await readdir(dir); } catch { return 0; }
      let removed = 0;
      for (const name of names.filter(name => name.endsWith('.json'))) {
        const path = join(dir, name);
        if (now - (await stat(path)).mtimeMs > maxAgeMs) {
          await rm(path, { force: true });
          removed++;
        }
      }
      return removed;
    }
  };
}
