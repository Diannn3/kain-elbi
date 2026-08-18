import type { PlaceFeedbackCategory } from '../place-feedback';

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
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getOrCreateInstallationId(storage = globalThis.localStorage): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(INSTALLATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InstallationRecord>;
      const created = new Date(parsed.createdAt ?? '').getTime();
      if (typeof parsed.id === 'string' && Number.isFinite(created) && Date.now() - created < INSTALLATION_MAX_AGE_MS) {
        return parsed.id;
      }
    }
  } catch {
    // Ignore corrupt local storage payload and replace below.
  }

  const generated = globalThis.crypto?.randomUUID?.();
  if (!generated) return null;
  try {
    storage.setItem(
      INSTALLATION_STORAGE_KEY,
      JSON.stringify({ id: generated, createdAt: new Date().toISOString() } satisfies InstallationRecord),
    );
    return generated;
  } catch {
    return null;
  }
}

function readLocalActionRecord(storage = globalThis.localStorage): LocalActionRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ACTIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalActionRecord>;
    if (typeof parsed.day !== 'string' || !parsed.actions || typeof parsed.actions !== 'object') return null;
    return {
      day: parsed.day,
      actions: parsed.actions as Record<string, CommunityActionType[]>,
    };
  } catch {
    return null;
  }
}

export function hasReportedActionToday(
  placeId: string,
  eventType: CommunityActionType,
  storage = globalThis.localStorage,
  now = new Date(),
): boolean {
  const today = manilaDay(now);
  const record = readLocalActionRecord(storage);
  if (!record || record.day !== today) return false;
  return record.actions[placeId]?.includes(eventType) ?? false;
}

export function rememberAction(
  placeId: string,
  eventType: CommunityActionType,
  storage = globalThis.localStorage,
  now = new Date(),
): void {
  if (!storage) return;
  const today = manilaDay(now);
  const existing = readLocalActionRecord(storage);
  const nextActions = existing && existing.day === today ? { ...existing.actions } : {};
  const currentPlaceActions = new Set(nextActions[placeId] ?? []);
  currentPlaceActions.add(eventType);
  nextActions[placeId] = [...currentPlaceActions];
  try {
    storage.setItem(
      ACTIONS_STORAGE_KEY,
      JSON.stringify({ day: today, actions: nextActions } satisfies LocalActionRecord),
    );
  } catch {
    // Local storage full or blocked.
  }
}

async function invoke<T>(functionName: string, payload?: unknown): Promise<T> {
  const config = communityBackendConfig();
  if (!config.configured) {
    throw new Error('Community backend is not configured.');
  }

  const response = await fetch(`${config.url}/functions/v1/${functionName}`, {
    method: payload ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      apikey: config.publishableKey,
    },
    body: payload ? JSON.stringify(payload) : undefined,
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

export async function reportPlaceFeedback(
  placeId: string,
  category: PlaceFeedbackCategory,
): Promise<{ accepted: boolean; duplicate: boolean }> {
  const installId = getOrCreateInstallationId();
  if (!installId) throw new Error('Local storage is unavailable.');
  return invoke<{ accepted: boolean; duplicate: boolean }>('place-feedback', { placeId, category, installId });
}

export async function loadCommunityPulse(): Promise<CommunityPulseResponse> {
  return invoke<CommunityPulseResponse>('community-pulse');
}

export async function uploadCommunityPhoto(placeId: string, file: File, termsVersion: string): Promise<{ success: boolean; status: string }> {
  const config = communityBackendConfig();
  if (!config.configured) throw new Error('Community backend is not configured.');

  const installId = getOrCreateInstallationId();
  if (!installId) throw new Error('Local storage is unavailable.');

  const formData = new FormData();
  formData.append('placeId', placeId);
  formData.append('installId', installId);
  formData.append('file', file);
  formData.append('termsVersion', termsVersion);

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
    const response = await fetch(`${config.url}/functions/v1/community-photos?placeId=${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: { apikey: config.publishableKey },
    });
    if (!response.ok) return [];

    const data = await response.json() as { urls?: unknown };
    return Array.isArray(data.urls)
      ? data.urls.filter((value): value is string => typeof value === 'string' && value.startsWith('https://'))
      : [];
  } catch (error) {
    console.error('Failed to load photos', error);
    return [];
  }
}
