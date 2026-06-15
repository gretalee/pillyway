export function canDeleteGpxFile(
  userId: string | null | undefined,
  roles: string[],
  uploadedBy: string,
): boolean {
  if (!userId) return false;
  if (roles.includes('owner')) return true;
  return userId === uploadedBy;
}
