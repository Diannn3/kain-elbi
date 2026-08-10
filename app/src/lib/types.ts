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

export interface PlacePrice {
	mealLowPhp: number;
	mealHighPhp?: number;
	verifiedAt: string;
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
	independentSourceCount: number;
	overtureConfidence: number | null;
	operatingStatus: string | null;
	confidenceLabel: ConfidenceLabel;
	hasParseableHours: boolean;

	/**
	 * UPPETITE-maintained enrichment. These values are optional because the
	 * open-data catalog must remain useful even if enrichment is unavailable.
	 */
	aliases?: string[];
	addedAt?: string | null;
	lastReviewedAt?: string | null;
	price?: PlacePrice | null;
}

export interface PlaceEnrichmentEntry {
	aliases: string[];
	addedAt?: string;
	lastReviewedAt?: string;
	price?: PlacePrice;
}

export interface PlaceEnrichmentData {
	version: 1;
	places: Record<string, PlaceEnrichmentEntry>;
}

export interface Anchor {
	id: string;
	name: string;
	lat: number;
	lon: number;
	legacy_id?: string;
	graph_node_index?: number;
	graph_node_osm_id?: number;
	snap_distance_m?: number;
	snap_status?: 'good' | 'review' | 'unsupported';
}

export interface RouteLeg {
	seconds: number;
	meters?: number;
	graph_meters?: number;
	from_snap_meters?: number;
	to_snap_meters?: number;
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

export interface RouteMatrixV2 {
	schema_version: 2;
	generated_at: string;
	walking_speed_mps: number;
	routing: {
		source: string;
		repository?: string | null;
		ref?: string | null;
		graph_sha256?: string;
		weight?: string;
		note?: string;
		snap_thresholds_m?: {
			good: number;
			place_max: number;
			anchor_max: number;
		};
	};
	anchors: Record<string, Anchor>;
	unsupported_anchors?: Record<string, Anchor>;
	place_snaps?: Record<string, {
		graph_node_index: number;
		graph_node_osm_id: number;
		snap_distance_m: number;
		status: 'good' | 'review' | 'unsupported';
	}>;
	anchor_to_place: Record<string, Record<string, RouteLeg>>;
	place_to_anchor: Record<string, Record<string, RouteLeg>>;
	anchor_to_anchor: Record<string, Record<string, RouteLeg>>;
}

export type RouteMatrix = RouteMatrixV1 | RouteMatrixV2;

export interface SearchContext {
	originId: string;
	originMode: 'building' | 'nearby';
	approachSeconds: number;
	destinationId?: string;
	breakMinutes: number;
	preferredCategory?: Category;
	sourceApp?: 'room-tba';
	protocolVersion?: 1;
}

export type AvailabilityStatus =
	| 'open_at_arrival'
	| 'closes_during_stop'
	| 'closed_at_arrival'
	| 'unknown';

export interface SmartPickScoreBreakdown {
	routeFit: number;
	efficiency: number;
	category: number;
	confidence: number;
}

export interface SmartPick {
	place: Place;
	timeRemainingSeconds: number;
	totalWalkSeconds: number;
	walkToPlaceSeconds: number;
	walkFromPlaceSeconds: number;
	directWalkSeconds?: number;
	detourSeconds?: number;
	arrivalAt: string;
	estimatedDepartureAt: string;
	availability: AvailabilityStatus;
	score: number;
	scoreBreakdown: SmartPickScoreBreakdown;
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

export interface FoodZone {
	id: string;
	name: string;
	shortName: string;
	description: string;
	priority: number;
	bounds: {
		minLat: number;
		maxLat: number;
		minLon: number;
		maxLon: number;
	} | null;
	placeIds: string[];
	placeCount: number;
}

export interface FreshieSituation {
	id: string;
	title: string;
	description: string;
	explore_query: string;
}

export interface FreshieGlossaryItem {
	term: string;
	definition: string;
}

export interface FreshieMention {
	placeId: string;
	sourceId: string;
	claimType: string;
	summary: string;
}

export interface FreshieSource {
	name: string;
	type: string;
	url: string;
	publishedAt: string;
	accessLevel: string;
	authorityLevel: string;
}

export interface FreshieData {
	version: number;
	researchDate: string;
	intro: string;
	starterCollectionId: string;
	sourceNote: string;
	situations: FreshieSituation[];
	glossary: FreshieGlossaryItem[];
	mentions: FreshieMention[];
	sources: Record<string, FreshieSource>;
}


export type FoodEventStatus = 'scheduled' | 'cancelled';

export interface FoodEvent {
	id: string;
	title: string;
	description: string;
	startAt: string;
	endAt: string;
	locationName: string;
	lat?: number;
	lon?: number;
	organizer?: string;
	foodTags: string[];
	sourceUrl: string;
	status: FoodEventStatus;
}

export interface FoodEventsData {
	version: 1;
	events: FoodEvent[];
}

export interface CommunityImpactMetrics {
	placesAdded: number;
	placesCorrected: number;
	hoursChecked: number;
	eventsPublished: number;
}

export interface CommunityImpactData {
	version: 1;
	month: string;
	generatedAt: string | null;
	metrics: CommunityImpactMetrics;
}
