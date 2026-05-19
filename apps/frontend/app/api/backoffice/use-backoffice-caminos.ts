'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface BackofficeCamino {
  id: string;
  name: string;
  verified: boolean;
  yesCount: number;
  noCount: number;
}

export async function fetchBackofficeCaminos(token: string): Promise<BackofficeCamino[]> {
  const response = await fetch(`${API_URL}/backoffice/caminos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch backoffice caminos'), {
      status: response.status,
    });
  }

  return response.json() as Promise<BackofficeCamino[]>;
}

export function useBackofficeCaminos() {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useQuery({
    queryKey: ['backoffice', 'caminos'],
    queryFn: () => fetchBackofficeCaminos(accessTokenEncoded ?? ''),
    enabled: !!accessTokenEncoded,
  });
}
