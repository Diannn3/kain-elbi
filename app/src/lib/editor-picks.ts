export const EDITOR_PICK_TAGS = [
  'between-classes',
  'sulit',
  'with-friends',
  'coffee-tambay',
  'worth-the-walk',
  'freshie-starter',
] as const;

export type EditorPickTag = typeof EDITOR_PICK_TAGS[number];

export const EDITOR_PICK_TAG_LABELS: Record<EditorPickTag, string> = {
  'between-classes': 'Between Classes',
  sulit: 'Sulit',
  'with-friends': 'With Friends',
  'coffee-tambay': 'Coffee & Tambay',
  'worth-the-walk': 'Worth the Walk',
  'freshie-starter': 'Freshie Starter',
};

export interface EditorPickRecord {
  id: string;
  placeId: string;
  tagline: string;
  editorNote: string;
  reasonTags: EditorPickTag[];
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean ? clean.slice(0, max) : undefined;
}

export function isEditorPickTag(value: unknown): value is EditorPickTag {
  return typeof value === 'string' && (EDITOR_PICK_TAGS as readonly string[]).includes(value);
}

export function normalizeReasonTags(value: unknown): EditorPickTag[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isEditorPickTag))].slice(0, EDITOR_PICK_TAGS.length);
}

export function validateReasonTags(value: unknown): EditorPickTag[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((tag) => !isEditorPickTag(tag))) return undefined;
  return [...new Set(value as EditorPickTag[])].slice(0, EDITOR_PICK_TAGS.length);
}

export function parseEditorPickMutation(value: unknown): {
  placeId: string;
  tagline: string;
  editorNote: string;
  reasonTags: EditorPickTag[];
  published: boolean;
} | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const placeId = cleanText(raw.placeId, 128);
  const tagline = cleanText(raw.tagline, 120);
  const editorNote = cleanText(raw.editorNote, 700);
  const reasonTags = validateReasonTags(raw.reasonTags);
  if (!placeId || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(placeId) || !tagline || !editorNote || !reasonTags) return undefined;
  return {
    placeId,
    tagline,
    editorNote,
    reasonTags,
    published: raw.published === true,
  };
}

export function mapEditorPickRow(row: Record<string, unknown>): EditorPickRecord | undefined {
  const id = cleanText(row.id, 64);
  const placeId = cleanText(row.place_id, 128);
  const tagline = cleanText(row.tagline, 120);
  const editorNote = cleanText(row.editor_note, 700);
  const sortOrder = Number(row.sort_order);
  const createdAt = cleanText(row.created_at, 64);
  const updatedAt = cleanText(row.updated_at, 64);
  if (!id || !placeId || !tagline || !editorNote || !Number.isInteger(sortOrder) || sortOrder < 0 || !createdAt || !updatedAt) return undefined;
  return {
    id,
    placeId,
    tagline,
    editorNote,
    reasonTags: normalizeReasonTags(row.reason_tags),
    sortOrder,
    published: row.published === true,
    createdAt,
    updatedAt,
  };
}
