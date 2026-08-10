import { describe, expect, it } from 'vitest';
import { manilaDay } from '../../src/lib/community/backend';

describe('community backend privacy helpers', () => {
	it('uses the Asia/Manila calendar day rather than UTC', () => {
		// 2026-08-09 16:30 UTC is already Aug 10 in the Philippines.
		expect(manilaDay(new Date('2026-08-09T16:30:00Z'))).toBe('2026-08-10');
	});
});
