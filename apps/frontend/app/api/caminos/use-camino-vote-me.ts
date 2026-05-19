'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useQuery } from '@tanstack/react-query';

export { fetchMyVote, type MyVote } from './fetch-camino-vote-me';
import { fetchMyVote } from './fetch-camino-vote-me';

export function useCaminoVoteMe(caminoId: string) {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useQuery({
    queryKey: ['votes', 'me', caminoId],
    queryFn: () => fetchMyVote(caminoId, accessTokenEncoded ?? ''),
    enabled: !!caminoId && !!accessTokenEncoded,
    retry: (failureCount, error) =>
      (error as { status?: number })?.status === 404 ? false : failureCount < 3,
  });
}
