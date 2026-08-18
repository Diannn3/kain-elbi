import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const publicDir = resolve(root, 'public');
const repoDataDir = resolve(root, '../data');
const adapterStaticDir = resolve(root, '.vercel/output/static');
const repoVercelStaticDir = resolve(root, '../.vercel/output/static');
const forbiddenNames = [
  'place_audit.json',
  'place_feedback.json',
];
const forbiddenContent = [
  /SUPABASE_SECRET_KEY/i,
  /sb_secret_[a-z0-9_-]+/i,
  /refresh_token/i,
  /uppetite_staff_access_audit/i,
  /dedupe_token/i,
];

async function walk(dir) {
  const out = [];
  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await walk(path));
      else out.push(path);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return out;
}

const files = [
  ...await walk(publicDir),
  ...await walk(dist),
  ...await walk(repoDataDir),
  ...await walk(adapterStaticDir),
  ...await walk(repoVercelStaticDir),
];
const violations = [];
for (const path of files) {
  const rel = relative(root, path).split(sep).join('/');
  if (forbiddenNames.some((name) => rel.endsWith('/' + name) || rel === name)) {
    violations.push(`${rel}: private Ops snapshot must not be public`);
    continue;
  }
  const info = await stat(path);
  if (info.size > 2_000_000 || /\.(?:png|jpe?g|gif|webp|woff2?|ico|map)$/i.test(path)) continue;
  let text;
  try { text = await readFile(path, 'utf8'); } catch { continue; }
  for (const pattern of forbiddenContent) {
    if (pattern.test(text)) violations.push(`${rel}: matched forbidden private-data pattern ${pattern}`);
  }
}
if (violations.length) {
  console.error('Private-data audit FAILED:\n' + violations.map((v) => `- ${v}`).join('\n'));
  process.exit(1);
}
console.log(`Private-data audit PASS (${files.length} public/dist files inspected).`);
