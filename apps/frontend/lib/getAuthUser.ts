import { cache } from 'react';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export interface UserRole {
  id: string;
  key: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  roles: UserRole[];
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
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
});
