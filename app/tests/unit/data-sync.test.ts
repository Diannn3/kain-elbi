import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('canonical data synchronization', () => {
	it('uses real route and collection artifacts without requiring or copying a local map bundle', () => {
		const result = spawnSync(process.execPath, ['scripts/sync-data.mjs'], {
			cwd: process.cwd(),
			encoding: 'utf8',
		});

		expect(result.status, result.stderr).toBe(0);
		const sourceMatrix = JSON.parse(readFileSync(resolve('..', 'data', 'route_matrix.json'), 'utf8'));
		const publicMatrix = JSON.parse(readFileSync(resolve('public', 'data', 'route_matrix.json'), 'utf8'));
		expect(publicMatrix.generated_at).toBe(sourceMatrix.generated_at);
		expect(publicMatrix.fixture).not.toBe(true);
		expect(existsSync(resolve('src', 'data', 'fixtures', 'route_matrix.json'))).toBe(false);
		expect(existsSync(resolve('src', 'data', 'fixtures', 'collections.json'))).toBe(false);
		expect(existsSync(resolve('public', 'map', 'uplb.pmtiles'))).toBe(false);
	});
});
