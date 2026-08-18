import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const appRoot = process.cwd();
const source = resolve(appRoot, '.vercel/output');
const destination = resolve(appRoot, '../.vercel/output');

try {
  const info = await stat(source);
  if (!info.isDirectory()) throw new Error('adapter output is not a directory');
} catch (error) {
  if (process.env.VERCEL === '1') throw new Error(`Expected @astrojs/vercel Build Output API at ${source}: ${error}`);
  console.log('No nested Vercel Build Output API found; skipping repository-root sync.');
  process.exit(0);
}

await rm(destination, { recursive: true, force: true });
await mkdir(resolve(destination, '..'), { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log(`Synced Vercel Build Output API to ${destination}.`);
