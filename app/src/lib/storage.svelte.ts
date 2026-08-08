const STORAGE_KEY_SAVES = 'kain-elbi-saved-places';
const STORAGE_KEY_SEARCHES = 'kain-elbi-recent-searches';

export interface RecentSearch {
	label: string;
	url: string;
	timestamp: number;
}

class StorageState {
	savedPlaces = $state<Set<string>>(new Set());
	recentSearches = $state<RecentSearch[]>([]);
	
	constructor() {
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				const saves = window.localStorage.getItem(STORAGE_KEY_SAVES);
				if (saves) {
					const parsed = JSON.parse(saves);
					if (Array.isArray(parsed)) this.savedPlaces = new Set(parsed);
				}
				
				const searches = window.localStorage.getItem(STORAGE_KEY_SEARCHES);
				if (searches) {
					const parsed = JSON.parse(searches);
					if (Array.isArray(parsed)) this.recentSearches = parsed;
				}
			} catch (e) {
				// ignore in environments without localStorage
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
			try { window.localStorage.setItem(STORAGE_KEY_SAVES, JSON.stringify(Array.from(this.savedPlaces))); } catch (e) {}
		}
	}

	isPlaceSaved(id: string) {
		return this.savedPlaces.has(id);
	}

	addRecentSearch(search: RecentSearch) {
		this.recentSearches = this.recentSearches.filter(s => s.url !== search.url);
		this.recentSearches.unshift(search);
		if (this.recentSearches.length > 5) {
			this.recentSearches = this.recentSearches.slice(0, 5);
		}
		if (typeof window !== 'undefined' && window.localStorage) {
			try { window.localStorage.setItem(STORAGE_KEY_SEARCHES, JSON.stringify(this.recentSearches)); } catch (e) {}
		}
	}
}

export const appStorage = new StorageState();
