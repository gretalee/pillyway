'use client';

import { useTranslations } from 'next-intl';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import { Button, buttonVariants } from '@/app/components/ui/button';
import { useCaminoVoteSummary } from '@/app/api/caminos/use-camino-vote-summary';
import { useCaminoVoteMe } from '@/app/api/caminos/use-camino-vote-me';
import { useCastVote } from '@/app/api/caminos/use-cast-vote';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface VerificationSectionProps {
  caminoId: string;
}

export function VerificationSection({ caminoId }: VerificationSectionProps) {
  const t = useTranslations();
  const { isAuthenticated } = useKindeBrowserClient();

  const summaryQuery = useCaminoVoteSummary(caminoId);
  const myVoteQuery = useCaminoVoteMe(caminoId);
  const mutation = useCastVote(caminoId);

  const activeVote = myVoteQuery.data?.vote;
  const yesVotes = summaryQuery.data?.yesCount ?? 0;
  const noVotes = summaryQuery.data?.noCount ?? 0;

  function handleVote(vote: boolean) {
    mutation.mutate({ vote });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">
        {t('camino_detail.verification_heading')}
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={isAuthenticated && activeVote === true ? 'default' : 'outline'}
          disabled={!isAuthenticated || mutation.isPending}
          onClick={() => handleVote(true)}
          aria-pressed={activeVote === true}>
          {t('camino_detail.vote_yes')}
        </Button>

        <Button
          variant={isAuthenticated && activeVote === false ? 'default' : 'outline'}
          disabled={!isAuthenticated || mutation.isPending}
          onClick={() => handleVote(false)}
          aria-pressed={activeVote === false}>
          {t('camino_detail.vote_no')}
        </Button>

        <div className="flex items-center gap-4 text-sm border border-pillyGreen-500 bg-pillyGreen-50 rounded-md px-3 py-1 opacity-70">
          <p>{t('camino_detail.vote_yes_count', { count: yesVotes })}</p>
          <p>{t('camino_detail.vote_no_count', { count: noVotes })}</p>
        </div>
      </div>

      {!isAuthenticated && (
        <Link
          href="/api/auth/login"
          aria-label={t('header.aria_login')}
          className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'mt-4')}>
          {t('camino_detail.vote_login_hint')}
        </Link>
      )}

      {mutation.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t('camino_detail.vote_error')}
        </p>
      )}
    </section>
  );
}
