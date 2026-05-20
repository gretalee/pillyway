export interface CanDeleteParams {
  userId: string;
  roles: string[]; // Kinde role keys, e.g. ['pilgrim', 'owner']
  createdBy: string;
  createdAt: Date | string;
  windowMs: number;
}

/**
 * Determines whether the current user may delete an entity.
 *
 * Rules:
 * - Users with the 'owner' role can always delete.
 * - The creator of an entity may delete it only within the time window.
 * - All other users may not delete.
 */
export function canDelete(params: CanDeleteParams): boolean {
  if (params.roles.includes('owner')) return true;
  if (params.userId !== params.createdBy) return false;
  const age = Date.now() - new Date(params.createdAt).getTime();
  return age <= params.windowMs;
}
