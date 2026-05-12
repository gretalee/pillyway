'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StageDetail, UpdateStagePayload } from './stage-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function updateStage(
  caminoId: string,
  stageNumber: number,
  payload: UpdateStagePayload,
  token: string,
): Promise<StageDetail> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/stages/${stageNumber}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw Object.assign(new Error('Update stage failed'), { status: response.status });
  }
  return response.json() as Promise<StageDetail>;
}

export function useUpdateStage() {
  const { accessTokenEncoded } = useKindeBrowserClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caminoId,
      stageNumber,
      payload,
    }: {
      caminoId: string;
      stageNumber: number;
      payload: UpdateStagePayload;
    }) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      return updateStage(caminoId, stageNumber, payload, accessTokenEncoded);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['stage', variables.caminoId, variables.stageNumber],
      });
      void queryClient.invalidateQueries({
        queryKey: ['stages', variables.caminoId],
      });
    },
  });
}
