import { describe, expect, it } from 'vitest';
import { parseSearchParams, serializeSearchParams } from '../../src/lib/search-state';

describe('search state', () => {
	it('clamps malformed break durations into the supported range', () => {
		expect(parseSearchParams(new URLSearchParams('origin=math&break=999')).breakMinutes).toBe(
			180,
		);
		expect(parseSearchParams(new URLSearchParams('origin=math&break=2')).breakMinutes).toBe(20);
	});

	it('omits optional empty values when serializing', () => {
		const params = serializeSearchParams({
			originId: 'math',
			originMode: 'building',
			approachSeconds: 0,
			breakMinutes: 45,
		});

		expect(params.toString()).toBe('origin=math&originMode=building&break=45');
	});

	it('preserves the Room TBA handoff protocol without adding personal schedule data', () => {
		const parsed = parseSearchParams(new URLSearchParams('src=room-tba&v=1&origin=math-building&destination=physical-sciences-building&break=55'));
		expect(parsed.sourceApp).toBe('room-tba');
		expect(parsed.protocolVersion).toBe(1);
		expect(serializeSearchParams(parsed).get('src')).toBe('room-tba');
	});

	it('preserves a coarse GPS approach duration without storing coordinates', () => {
		const parsed = parseSearchParams(
			new URLSearchParams('origin=math&originMode=nearby&approach=83&break=45'),
		);
		expect(parsed.approachSeconds).toBe(83);
		expect(serializeSearchParams(parsed).get('approach')).toBe('83');
	});
});
