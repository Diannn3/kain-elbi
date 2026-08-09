import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const tests = [
	'a direct place deep link closes in place without adding modal history',
	'one-way mode discloses the omitted return trip',
	'map initializes inside the unified Smart Picks experience',
	'selecting a map shortlist place focuses its camera and marker without opening details'
];

for (const test of tests) {
	console.log(`\n\n--- Running: ${test} ---`);
	const result = spawnSync('npm', ['run', 'test:e2e', '--', '-g', test, '--project=mobile-chromium'], {
		stdio: 'inherit',
		env: process.env
	});
	console.log(`Exit code: ${result.status}`);
}
