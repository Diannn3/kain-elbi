const INSTALLATION_STORAGE_KEY = 'uppetite-community-installation-v1';
const ACTIONS_STORAGE_KEY = 'uppetite-community-actions-v1';
const INSTALLATION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export type CommunityActionType = 'visit_reported' | 'accuracy_confirmed';

export interface CommunityPulseRow {
	placeId: string;
	zoneId: string | null;
	visitReports30d: number;
	accuracyConfirmations30d: number;
	activeDays30d: number;
}

export interface CommunityPulseResponse {
	rows: CommunityPulseRow[];
	updatedDaily: true;
	windowDays: 30;
	minimumDailyVisitors: number;
}

interface InstallationRecord {
	id: string;
	createdAt: string;
}

interface LocalActionRecord {
	day: string;
	actions: Record<string, CommunityActionType[]>;
}

function clean(value: string | undefined): string {
	return value?.trim().replace(/\/+$/, '') ?? '';
}

function validBackendUrl(value: string): boolean {
	if (!value) return false;
	try {
		const url = new URL(value);
		if (url.protocol === 'https:') return true;
		return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
	} catch {
		return false;
	}
}

export function communityBackendConfig() {
	const url = clean(import.meta.env.PUBLIC_SUPABASE_URL);
	const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
	return {
		url,
		publishableKey,
		configured: validBackendUrl(url) && Boolean(publishableKey),
	};
}

export function manilaDay(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Manila',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	return `${value.year}-${value.month}-${value.day}`;
}

function readInstallation(): InstallationRecord | undefined {
	try {
		const raw = localStorage.getItem(INSTALLATION_STORAGE_KEY);
		if (!raw) return undefined;
		const parsed = JSON.parse(raw) as Partial<InstallationRecord>;
		if (
			typeof parsed.id !== 'string'
			|| !/^[0-9a-f-]{36}$/i.test(parsed.id)
			|| typeof parsed.createdAt !== 'string'
		) return undefined;
		const created = new Date(parsed.createdAt);
		if (!Number.isFinite(created.getTime())) return undefined;
		if (Date.now() - created.getTime() > INSTALLATION_MAX_AGE_MS) return undefined;
		return { id: parsed.id, createdAt: parsed.createdAt };
	} catch {
		return undefined;
	}
}

export function getOrCreateInstallationId(): string | undefined {
	if (typeof localStorage === 'undefined' || typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return undefined;
	const existing = readInstallation();
	if (existing) return existing.id;

	const record: InstallationRecord = {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
	};
	try {
		localStorage.setItem(INSTALLATION_STORAGE_KEY, JSON.stringify(record));
		return record.id;
	} catch {
		return undefined;
	}
}

function readLocalActions(day = manilaDay()): LocalActionRecord {
	try {
		const raw = localStorage.getItem(ACTIONS_STORAGE_KEY);
		if (!raw) return { day, actions: {} };
		const parsed = JSON.parse(raw) as Partial<LocalActionRecord>;
		if (parsed.day !== day || !parsed.actions || typeof parsed.actions !== 'object') {
			return { day, actions: {} };
		}
		return { day, actions: parsed.actions as Record<string, CommunityActionType[]> };
	} catch {
		return { day, actions: {} };
	}
}

function rememberAction(placeId: string, action: CommunityActionType) {
	const state = readLocalActions();
	const current = new Set(state.actions[placeId] ?? []);
	current.add(action);
	state.actions[placeId] = [...current];
	try {
		localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Local confirmation state is optional.
	}
}

export function hasReportedActionToday(placeId: string, action: CommunityActionType): boolean {
	if (typeof localStorage === 'undefined') return false;
	return readLocalActions().actions[placeId]?.includes(action) ?? false;
}

async function invoke<T>(functionName: string, body?: unknown): Promise<T> {
	const config = communityBackendConfig();
	if (!config.configured) throw new Error('Community backend is not configured.');

	const response = await fetch(`${config.url}/functions/v1/${functionName}`, {
		method: body === undefined ? 'GET' : 'POST',
		headers: {
			apikey: config.publishableKey,
			...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});

	if (!response.ok) {
		const message = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(message?.error || `Community request failed (${response.status}).`);
	}
	return response.json() as Promise<T>;
}

export async function reportCommunityAction(
	placeId: string,
	eventType: CommunityActionType,
): Promise<{ accepted: boolean; duplicate: boolean }> {
	const installId = getOrCreateInstallationId();
	if (!installId) throw new Error('Local storage is unavailable.');

	if (hasReportedActionToday(placeId, eventType)) {
		return { accepted: false, duplicate: true };
	}

	const result = await invoke<{ accepted: boolean; duplicate: boolean }>('community-report', {
		eventType,
		placeId,
		installId,
	});

	if (result.accepted || result.duplicate) rememberAction(placeId, eventType);
	return result;
}

export async function loadCommunityPulse(): Promise<CommunityPulseResponse> {
	return invoke<CommunityPulseResponse>('community-pulse');
}

export async function uploadCommunityPhoto(placeId: string, file: File): Promise<{ success: boolean; status: string }> {
	const config = communityBackendConfig();
	if (!config.configured) throw new Error('Community backend is not configured.');

	const installId = getOrCreateInstallationId();
	if (!installId) throw new Error('Local storage is unavailable.');

	const formData = new FormData();
	formData.append('placeId', placeId);
	formData.append('installId', installId);
	formData.append('file', file);

	const response = await fetch(`${config.url}/functions/v1/photo-upload`, {
		method: 'POST',
		headers: {
			apikey: config.publishableKey,
		},
		body: formData,
	});

	if (!response.ok) {
		const message = await response.json().catch(() => null) as { error?: string } | null;
		throw new Error(message?.error || `Photo upload failed (${response.status}).`);
	}
	
	return response.json() as Promise<{ success: boolean; status: string }>;
}

export async function loadCommunityPhotos(placeId: string): Promise<string[]> {
	const config = communityBackendConfig();
	if (!config.configured) return [];

	try {
		const response = await fetch(`${config.url}/rest/v1/uppetite_community_place_photos?place_id=eq.${encodeURIComponent(placeId)}&status=eq.approved&select=storage_path`, {
			method: 'GET',
			headers: {
				apikey: config.publishableKey,
				'Authorization': `Bearer ${config.publishableKey}`, // PostgREST requires Bearer token
			},
		});

		if (!response.ok) return [];

		const data = await response.json() as { storage_path: string }[];
		return data.map(row => `${config.url}/storage/v1/object/public/place-photos/${row.storage_path}`);
	} catch (error) {
		console.error('Failed to load photos', error);
		return [];
	}
}
