import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import type { AuthUser } from '@/providers/AuthContext';

export async function getAuthUser(): Promise<AuthUser | null> {
  const { getUser, getRoles } = getKindeServerSession();
  const kindeUser = await getUser();
  if (!kindeUser) return null;
  const roles = await getRoles();
  return {
    id: kindeUser.id,
    email: kindeUser.email ?? null,
    firstName: kindeUser.given_name ?? null,
    lastName: kindeUser.family_name ?? null,
    picture: kindeUser.picture ?? null,
    roles: roles ?? [],
  };
}
