import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const runNode = (script, args, env = process.env) => spawnSync(process.execPath, [script, ...args], {
	stdio: 'inherit',
	env,
});

const npmCli = process.env.npm_execpath;
if (!npmCli) {
	console.error('npm_execpath is unavailable; run this script through npm run test:e2e.');
	process.exit(1);
}

const build = runNode(npmCli, ['run', 'build'], {
	...process.env,
	PUBLIC_MAPTILER_KEY: 'playwright-test-key',
});
if (build.status !== 0) process.exit(build.status ?? 1);

const preview = spawn(process.execPath, ['scripts/test-preview.mjs'], { stdio: 'inherit' });
let ready = false;
for (let attempt = 0; attempt < 50; attempt += 1) {
	try {
		const response = await fetch('http://127.0.0.1:4322/');
		if (response.ok) {
			ready = true;
			break;
		}
	} catch {
		// The foreground preview is still starting.
	}
	await new Promise((resolve) => setTimeout(resolve, 100));
}

if (!ready) {
	preview.kill();
	console.error('Playwright preview did not become ready on port 4322.');
	process.exit(1);
}

const playwrightCli = resolve('node_modules/@playwright/test/cli.js');
const tests = runNode(playwrightCli, ['test', ...process.argv.slice(2)], {
	...process.env,
	PLAYWRIGHT_SKIP_WEBSERVER: '1',
});
preview.kill();
process.exit(tests.status ?? 1);
