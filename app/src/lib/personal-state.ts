import type { Anchor } from './types';

export const PERSONAL_STORAGE_KEY = 'uppetite-personal-v1';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimetableEntry {
  id: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  course: string;
  anchorId: string;
}

export interface PersonalState {
  version: 1;
  timetable: TimetableEntry[];
}

export const emptyPersonalState = (): PersonalState => ({
  version: 1,
  timetable: [],
});

function cleanText(value: unknown, max = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean ? clean.slice(0, max) : undefined;
}

function safeTime(value: unknown): string | undefined {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
}

function minutesOfDay(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function normalizePersonalState(value: unknown): PersonalState {
  const fallback = emptyPersonalState();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return fallback;

  const timetable: TimetableEntry[] = Array.isArray(raw.timetable)
    ? raw.timetable.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      const day = Number(row.day);
      const startTime = safeTime(row.startTime);
      const endTime = safeTime(row.endTime);
      const course = cleanText(row.course, 60);
      if (!validId(row.id) || !Number.isInteger(day) || day < 0 || day > 6 || !startTime || !endTime || minutesOfDay(endTime) <= minutesOfDay(startTime) || !course || !validId(row.anchorId)) return [];
      return [{ id: row.id, day: day as Weekday, startTime, endTime, course, anchorId: row.anchorId }];
    })
    : [];

  return { version: 1, timetable };
}

export function readPersonalState(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): PersonalState {
  if (!storage) return emptyPersonalState();
  try {
    const raw = storage.getItem(PERSONAL_STORAGE_KEY);
    return raw ? normalizePersonalState(JSON.parse(raw)) : emptyPersonalState();
  } catch {
    return emptyPersonalState();
  }
}

export function writePersonalState(state: PersonalState, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(normalizePersonalState(state)));
    return true;
  } catch {
    return false;
  }
}

function manilaClock(now: Date): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = weekdays[values.weekday ?? ''];
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  if (day === undefined || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    return { day: now.getDay() as Weekday, minutes: now.getHours() * 60 + now.getMinutes() };
  }
  return { day, minutes: hour * 60 + minute };
}

export function nextClass(state: PersonalState, anchors: Anchor[], now = new Date()): { entry: TimetableEntry; anchor: Anchor; startsInMinutes: number } | undefined {
  const clock = manilaClock(now);
  const currentDay = clock.day;
  const nowMinutes = clock.minutes;
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  return state.timetable
    .filter((entry) => anchorById.has(entry.anchorId))
    .map((entry) => {
      const dayOffset = (entry.day - currentDay + 7) % 7;
      let startsInMinutes = dayOffset * 1440 + minutesOfDay(entry.startTime) - nowMinutes;
      if (dayOffset === 0 && startsInMinutes < 0) startsInMinutes += 7 * 1440;
      return { entry, anchor: anchorById.get(entry.anchorId)!, startsInMinutes };
    })
    .sort((a, b) => a.startsInMinutes - b.startsInMinutes)[0];
}

export function createLocalId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${random}`.replace(/[^a-zA-Z0-9._:-]/g, '-');
}
