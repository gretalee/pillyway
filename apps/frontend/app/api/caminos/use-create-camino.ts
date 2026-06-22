'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useMutation } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type ExistingPointPayload = { caminoPointId: string };
export type NewPointPayload = { name: string; country: string; description?: string; lat?: number; lng?: number };
export type CaminoPointPayload = ExistingPointPayload | NewPointPayload;

export interface CreateCaminoPayload {
  name: string;
  description?: string;
  caminoPoints: CaminoPointPayload[];
}

export interface CreatedCamino {
  id: string;
  slug: string;
  name: string;
}

export async function createCamino(
  payload: CreateCaminoPayload,
  token: string,
): Promise<CreatedCamino> {
  const response = await fetch(`${API_URL}/caminos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw Object.assign(new Error('Create failed'), { status: response.status });
  }

  return response.json() as Promise<CreatedCamino>;
}

export function useCreateCamino() {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation({
    mutationFn: (payload: CreateCaminoPayload) =>
      createCamino(payload, accessTokenEncoded ?? ''),
  });
}
