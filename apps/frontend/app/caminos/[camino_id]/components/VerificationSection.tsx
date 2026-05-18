'use client';

import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { Button } from '@/app/components/ui/button';
import { useCaminoVoteSummary } from '@/app/api/caminos/use-camino-vote-summary';
import { useCaminoVoteMe } from '@/app/api/caminos/use-camino-vote-me';
import { useCastVote } from '@/app/api/caminos/use-cast-vote';

interface VerificationSectionProps {
  caminoId: string;
}

export function VerificationSection({ caminoId }: VerificationSectionProps) {
  const t = useTranslations('camino_detail');
  const { isAuthenticated } = useKindeBrowserClient();

  const summaryQuery = useCaminoVoteSummary(caminoId);
  const myVoteQuery = useCaminoVoteMe(caminoId);
  const mutation = useCastVote(caminoId);

  const activeVote = myVoteQuery.data?.vote;
  const yesVotes = summaryQuery.data?.yesVotes ?? 0;
  const noVotes = summaryQuery.data?.noVotes ?? 0;

  function handleVote(vote: boolean) {
    mutation.mutate({ vote });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">{t('verification_heading')}</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={isAuthenticated && activeVote === true ? 'default' : 'outline'}
          disabled={!isAuthenticated || mutation.isPending}
          onClick={() => handleVote(true)}
          aria-pressed={activeVote === true}>
          {t('vote_yes')}
        </Button>

        <Button
          variant={isAuthenticated && activeVote === false ? 'default' : 'outline'}
          disabled={!isAuthenticated || mutation.isPending}
          onClick={() => handleVote(false)}
          aria-pressed={activeVote === false}>
          {t('vote_no')}
        </Button>
      </div>

      {!isAuthenticated && (
        <p className="mt-2 text-sm text-muted-foreground">{t('vote_login_hint')}</p>
      )}

      <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
        <span>{t('vote_yes_count', { count: yesVotes })}</span>
        <span>{t('vote_no_count', { count: noVotes })}</span>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t('vote_error')}
        </p>
      )}
    </section>
  );
}
