import type { Anchor } from './types';

function normalize(value: string): string {
	return value.trim().toLocaleLowerCase();
}

export function filterBuildingAnchors(anchors: Anchor[], query: string): Anchor[] {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) return anchors;

	const startsWith: Anchor[] = [];
	const contains: Anchor[] = [];

	for (const anchor of anchors) {
		const normalizedName = normalize(anchor.name);
		if (normalizedName.startsWith(normalizedQuery)) startsWith.push(anchor);
		else if (normalizedName.includes(normalizedQuery)) contains.push(anchor);
	}

	return [...startsWith, ...contains];
}
