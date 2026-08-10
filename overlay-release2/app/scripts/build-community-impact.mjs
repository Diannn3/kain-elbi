import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function parseArgs(argv) {
	const result = {};
	for (let index = 0; index < argv.length; index += 1) {
		const item = argv[index];
		if (!item.startsWith('--')) continue;
		result[item.slice(2)] = argv[index + 1];
		index += 1;
	}
	return result;
}

function parseCsv(source) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];

		if (quoted) {
			if (char === '"' && next === '"') {
				field += '"';
				index += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') quoted = true;
		else if (char === ',') { row.push(field); field = ''; }
		else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
		else field += char;
	}

	if (field.length || row.length) {
		row.push(field.replace(/\r$/, ''));
		rows.push(row);
	}
	return rows.filter((candidate) => candidate.some((value) => value.trim()));
}

function normalizeHeader(value) {
	return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function monthFromDate(value) {
	const parsed = new Date(value);
	if (!Number.isFinite(parsed.getTime())) return '';
	return parsed.toISOString().slice(0, 7);
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) throw new Error('Usage: node scripts/build-community-impact.mjs --input <sheet-export.csv> [--month YYYY-MM] [--output ../data/community_impact.json]');

const targetMonth = args.month ?? new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(targetMonth)) throw new Error('--month must use YYYY-MM');

const csv = await readFile(resolve(process.cwd(), args.input), 'utf8');
const rows = parseCsv(csv);
if (rows.length < 1) throw new Error('CSV export is empty');

const headers = rows[0].map(normalizeHeader);
for (const key of ['contribution_type', 'status', 'merged_at']) {
	if (!headers.includes(key)) throw new Error(`CSV must contain a ${key} column`);
}

const metrics = { placesAdded: 0, placesCorrected: 0, hoursChecked: 0, eventsPublished: 0 };

for (const values of rows.slice(1)) {
	const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']));
	if (row.status.toUpperCase() !== 'MERGED') continue;
	if (monthFromDate(row.merged_at) !== targetMonth) continue;

	switch (row.contribution_type.toUpperCase()) {
		case 'ADD_PLACE': metrics.placesAdded += 1; break;
		case 'SUGGEST_EDIT': metrics.placesCorrected += 1; break;
		case 'HOURS_CHECKED': metrics.hoursChecked += 1; break;
		case 'EVENT': metrics.eventsPublished += 1; break;
	}
}

const output = { version: 1, month: targetMonth, generatedAt: new Date().toISOString(), metrics };
const outputPath = resolve(process.cwd(), args.output ?? '../data/community_impact.json');
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote community impact for ${targetMonth} to ${outputPath}\n`);
