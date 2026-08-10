import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('community place registry generator', () => {
	it('generates only canonical IDs and uses the place zone, not user location', () => {
		const repoRoot = resolve(process.cwd(), '..');
		const temp = mkdtempSync(join(tmpdir(), 'uppetite-registry-'));
		const placesPath = join(temp, 'places.json');
		const zonesPath = join(temp, 'zones.json');
		const outputPath = join(temp, 'registry.sql');

		writeFileSync(placesPath, JSON.stringify([
			{ id: 'place-a', name: 'A' },
			{ id: 'place-b', name: 'B' },
		]));
		writeFileSync(zonesPath, JSON.stringify([
			{ id: 'raymundo', placeIds: ['place-a'] },
			{ id: 'elsewhere-lb', placeIds: ['place-a', 'place-b'] },
		]));

		const result = spawnSync(process.execPath, [
			'scripts/generate-community-registry.mjs',
			'--places', relative(repoRoot, placesPath),
			'--zones', relative(repoRoot, zonesPath),
			'--output', relative(repoRoot, outputPath),
		], { cwd: process.cwd(), encoding: 'utf8' });

		expect(result.status).toBe(0);
		const sql = readFileSync(outputPath, 'utf8');
		expect(sql).toContain("('place-a', 'raymundo', true, now())");
		expect(sql).toContain("('place-b', 'elsewhere-lb', true, now())");
		expect(sql).not.toContain('latitude');
		expect(sql).not.toContain('longitude');

		rmSync(temp, { recursive: true, force: true });
	});
});
