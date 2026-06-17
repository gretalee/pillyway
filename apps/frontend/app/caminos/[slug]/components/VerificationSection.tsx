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
  className?: string;
}

export function VerificationSection({ caminoId, className }: VerificationSectionProps) {
  const t = useTranslations();
  const { isAuthenticated, isLoading: authenticationLoading } = useKindeBrowserClient();

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
    <section className={className}>
      <h2 className="mb-4 text-xl font-semibold">
        {t('camino_detail.verification_heading')}
      </h2>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <div
          className={cn(
            'flex-1 max-w-full',
            'relative border border-pillyGreen-500 rounded-md pt-6 pb-4 px-3',
          )}>
          <div
            className={cn(
              'flex flex-wrap items-center gap-2 max-w-full overflow-hidden',
            )}>
            <Button
              variant={isAuthenticated && activeVote === true ? 'default' : 'outline'}
              disabled={!isAuthenticated || mutation.isPending}
              onClick={() => handleVote(true)}
              aria-pressed={activeVote === true}
              className="overflow-hidden max-w-full">
              <span className="truncate max-w-full"> {t('camino_detail.vote_yes')}</span>
            </Button>
            <Button
              variant={isAuthenticated && activeVote === false ? 'default' : 'outline'}
              disabled={!isAuthenticated || mutation.isPending}
              onClick={() => handleVote(false)}
              aria-pressed={activeVote === false}
              className="overflow-hidden max-w-full">
              <span className="truncate max-w-full"> {t('camino_detail.vote_no')}</span>
            </Button>

            <div className="flex flex-1 items-center gap-2 ml-auto">
              <i className="icon-award1 text-3xl md:text-4xl text-gray-300 md:order-3" />
              <div className="flex max-md:gap-4 md:flex-col items-start text-sm pl-2 lg:pl-6 max-md:mt-2 text-muted-foreground pr-2 whitespace-nowrap">
                <p>{t('camino_detail.vote_yes_count', { count: yesVotes })}</p>
                <p>{t('camino_detail.vote_no_count', { count: noVotes })}</p>
              </div>
            </div>

            {!isAuthenticated && !authenticationLoading && (
              <Link
                href="/api/auth/login"
                aria-label={t('header.aria_login')}
                className={cn(
                  buttonVariants({ variant: 'tertiary', size: 'lg' }),
                  'mt-4 whitespace-normal max-w-full overflow-hidden h-auto',
                )}>
                {t('camino_detail.vote_login_hint')}
              </Link>
            )}
          </div>

          <label
            className={cn(
              'absolute truncate -top-2 left-4 max-w-[90%] bg-white px-1',
              'text-sm text-pillyGreen-700 whitespace-nowrap z-10',
            )}>
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
