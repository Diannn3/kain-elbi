import type { SupabaseClient } from '@supabase/supabase-js';

export const STAFF_ROLES = ['owner', 'places_editor', 'places_viewer'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export interface StaffIdentity {
  userId: string;
  role: StaffRole;
  active: true;
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

export function canViewPlacesOps(role: StaffRole): boolean {
  return role === 'owner' || role === 'places_editor' || role === 'places_viewer';
}

export function canEditPlaces(role: StaffRole): boolean {
  return role === 'owner' || role === 'places_editor';
}

export function isOwnerRole(role: StaffRole): boolean {
  return role === 'owner';
}

export async function getVerifiedStaffIdentity(supabase: SupabaseClient): Promise<StaffIdentity | undefined> {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) return undefined;
  const userId = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : undefined;
  if (!userId) return undefined;

  const { data, error } = await supabase
    .from('uppetite_staff_members')
    .select('user_id,role,active')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error || !data || data.user_id !== userId || data.active !== true || !isStaffRole(data.role)) return undefined;
  return { userId, role: data.role, active: true };
}
