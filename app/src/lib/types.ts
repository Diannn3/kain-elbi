export type Category =
	| 'cafe'
	| 'restaurant'
	| 'fast_food'
	| 'food_court'
	| 'bakery_deli'
	| 'kiosk_stall'
	| 'other';

export type RecordStatus = 'candidate' | 'closed' | 'unusable';
export type ConfidenceLabel =
	| 'Multiple sources agree'
	| 'Hours listed'
	| 'Limited place information';

export interface PlaceSource {
	source: string;
	sourceId: string;
}

export interface Place {
	id: string;
	name: string;
	lat: number;
	lon: number;
	category: Category;
	cuisine: string[];
	phone: string | null;
	website: string | null;
	openingHours: string | null;
	recordStatus: RecordStatus;
	sources: PlaceSource[];
	confidenceLabel: ConfidenceLabel;
	hasParseableHours: boolean;
}

export interface Anchor {
	id: string;
	name: string;
	lat: number;
	lon: number;
}

export interface RouteMatrixV1 {
	schema_version: 1;
	generated_at: string;
	walking_speed_mps: number;
	anchors: Record<string, Anchor>;
	anchor_to_place_seconds: Record<string, Record<string, number>>;
	place_to_anchor_seconds: Record<string, Record<string, number>>;
	anchor_to_anchor_seconds: Record<string, Record<string, number>>;
}

export interface SearchContext {
	originId: string;
	originMode: 'building' | 'nearby';
	approachSeconds: number;
	destinationId?: string;
	breakMinutes: number;
	preferredCategory?: Category;
}

export interface SmartPick {
	place: Place;
	timeRemainingSeconds: number;
	totalWalkSeconds: number;
	detourSeconds?: number;
	score: number;
	explanation: string;
	confidence: ConfidenceLabel;
}

export interface Collection {
	id: string;
	slug: string;
	title: string;
	description: string;
	researchDate: string;
	evidenceCount: number;
	sourceUrls: string[];
	coverVariant: 'sun' | 'leaf' | 'forest';
	placeIds: string[];
}
