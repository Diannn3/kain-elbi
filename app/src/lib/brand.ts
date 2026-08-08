export const brand = {
	maroonDeep: '#5C1016',
	maroon: '#9B111E',
	maroonInk: '#470C11',
	orange: '#E66A19',
	cream: '#FFF9F1',
	sand: '#F2E8DC',
	charcoal: '#292725',
	olive: '#66651F',
	white: '#FFFFFF',
} as const;

export type BrandColor = (typeof brand)[keyof typeof brand];
