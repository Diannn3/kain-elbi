import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const targets = [
	path.join(repoRoot, 'data', 'editorial'),
	path.join(repoRoot, 'data', 'freshie.json'),
];

const forbiddenKeys = new Set([
	'author',
	'author_id',
	'avatar',
	'avatar_url',
	'comment_text',
	'commenter',
	'commenter_id',
	'display_name',
	'profile',
	'profile_url',
	'raw_comment',
	'raw_comments',
	'raw_quote',
	'username',
	'user_id',
]);

const profilePatterns = [
	/reddit\.com\/(?:user|u)\/[A-Za-z0-9_-]+/i,
	/facebook\.com\/profile\.php\?id=\d+/i,
	/facebook\.com\/people\/[^/\s]+\/\d+/i,
];

const issues = [];

function inspect(value, location) {
	if (Array.isArray(value)) {
		value.forEach((item, index) => inspect(item, `${location}[${index}]`));
		return;
	}
	if (!value || typeof value !== 'object') {
		if (typeof value === 'string') {
			for (const pattern of profilePatterns) {
				if (pattern.test(value)) issues.push(`${location}: personal-profile URL detected`);
			}
		}
		return;
	}

	for (const [key, child] of Object.entries(value)) {
		if (forbiddenKeys.has(key.toLowerCase())) {
			issues.push(`${location}.${key}: forbidden personal-data field`);
		}
		inspect(child, `${location}.${key}`);
	}
}

async function collectFiles(target) {
	const stat = await fs.stat(target).catch(() => null);
	if (!stat) return [];
	if (stat.isFile()) return [target];

	const entries = await fs.readdir(target, { withFileTypes: true });
	const nested = await Promise.all(entries.map(async (entry) => {
		const full = path.join(target, entry.name);
		if (entry.isDirectory()) return collectFiles(full);
		return entry.name.endsWith('.json') ? [full] : [];
	}));
	return nested.flat();
}

const files = (await Promise.all(targets.map(collectFiles))).flat();

for (const file of files) {
	const raw = await fs.readFile(file, 'utf8');
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		issues.push(`${path.relative(repoRoot, file)}: invalid JSON (${error.message})`);
		continue;
	}
	inspect(parsed, path.relative(repoRoot, file));
}

if (issues.length) {
	console.error('Editorial privacy audit failed:');
	for (const issue of issues) console.error(`- ${issue}`);
	process.exit(1);
}

console.log(`Editorial privacy audit passed (${files.length} JSON files checked).`);
