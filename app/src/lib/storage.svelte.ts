import { STORAGE_KEYS } from './storage-keys';

const STORAGE_KEY_SAVES = STORAGE_KEYS.savedPlaces;
const STORAGE_KEY_SEARCHES = STORAGE_KEYS.recentSearches;
const RECENT_ROUTE_PARAMS = ['origin', 'originMode', 'approach', 'destination', 'break', 'category', 'src', 'v'] as const;

export interface RecentSearch {
	label: string;
	url: string;
	timestamp: number;
}

function isRecentSearch(value: unknown): value is RecentSearch {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<RecentSearch>;
	return typeof candidate.label === 'string'
		&& Boolean(candidate.label.trim())
		&& typeof candidate.url === 'string'
		&& typeof candidate.timestamp === 'number'
		&& Number.isFinite(candidate.timestamp);
}

export function canonicalRecentSearchUrl(rawUrl: string): string {
	try {
		const source = new URL(rawUrl || '/picks', 'https://uppetite.local/picks');
		const params = new URLSearchParams();
		for (const key of RECENT_ROUTE_PARAMS) {
			const value = source.searchParams.get(key)?.trim();
			if (value) params.set(key, value);
		}
		const query = params.toString();
		return query ? `?${query}` : '';
	} catch {
		return '';
	}
}

class StorageState {
	savedPlaces = $state<Set<string>>(new Set());
	recentSearches = $state<RecentSearch[]>([]);
	
	constructor() {
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				const saves = window.localStorage.getItem(STORAGE_KEY_SAVES);
				if (saves) {
					const parsed: unknown = JSON.parse(saves);
					if (Array.isArray(parsed)) {
						this.savedPlaces = new Set(parsed.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())));
					}
				}
				
				const searches = window.localStorage.getItem(STORAGE_KEY_SEARCHES);
				if (searches) {
					const parsed: unknown = JSON.parse(searches);
					if (Array.isArray(parsed)) {
						this.recentSearches = parsed
							.filter(isRecentSearch)
							.map((search) => ({ ...search, label: search.label.trim(), url: canonicalRecentSearchUrl(search.url) }))
							.filter((search) => Boolean(search.url))
							.slice(0, 5);
					}
				}
			} catch {
				// Ignore malformed or unavailable local storage and keep safe defaults.
			}
		}
	}

	toggleSavedPlace(id: string) {
		if (this.savedPlaces.has(id)) {
			this.savedPlaces.delete(id);
		} else {
			this.savedPlaces.add(id);
		}
		if (typeof window !== 'undefined' && window.localStorage) {
			try { window.localStorage.setItem(STORAGE_KEY_SAVES, JSON.stringify(Array.from(this.savedPlaces))); } catch { /* optional persistence */ }
		}
	}

	isPlaceSaved(id: string) {
		return this.savedPlaces.has(id);
	}

	addRecentSearch(search: RecentSearch) {
		const url = canonicalRecentSearchUrl(search.url);
		if (!url || !search.label.trim() || !Number.isFinite(search.timestamp)) return;
		const normalized: RecentSearch = { label: search.label.trim(), url, timestamp: search.timestamp };
		this.recentSearches = this.recentSearches.filter((item) => item.url !== normalized.url);
		this.recentSearches.unshift(normalized);
		if (this.recentSearches.length > 5) this.recentSearches = this.recentSearches.slice(0, 5);
		if (typeof window !== 'undefined' && window.localStorage) {
			try { window.localStorage.setItem(STORAGE_KEY_SEARCHES, JSON.stringify(this.recentSearches)); } catch { /* optional persistence */ }
		}
	}
}

export const appStorage = new StorageState();
