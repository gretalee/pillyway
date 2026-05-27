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

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <div className="flex flex-1 flex-wrap items-center gap-2 relative border border-pillyGreen-500 rounded-md pt-6 pb-4 px-3">
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

          <div className="flex max-md:gap-2 lg:flex-col items-start text-sm pl-2 lg:pl-6 max-md:mt-2 text-muted-foreground pr-2">
            <p>{t('camino_detail.vote_yes_count', { count: yesVotes })}</p>
            <p>{t('camino_detail.vote_no_count', { count: noVotes })}</p>
          </div>

          {!isAuthenticated ||
            (true && (
              <Link
                href="/api/auth/login"
                aria-label={t('header.aria_login')}
                className={cn(
                  buttonVariants({ variant: 'tertiary', size: 'lg' }),
                  'mt-4 whitespace-normal max-w-full overflow-hidden h-auto',
                )}>
                {t('camino_detail.vote_login_hint')}
              </Link>
            ))}

          <label className="absolute truncate -top-2 left-4 right-4 bg-white px-1 text-sm text-pillyGreen-700 whitespace-nowrap">
            {t('camino_detail.verification_label')}
          </label>
        </div>
      </div>

      {mutation.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t('camino_detail.vote_error')}
        </p>
      )}
    </section>
  );
}
