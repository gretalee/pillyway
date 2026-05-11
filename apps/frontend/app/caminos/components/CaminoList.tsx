import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from '@/app/components/ui/button';
import type { CaminoSummary } from '@/app/api/caminos';
import type { AuthUser } from '@/lib/getAuthUser';
import { CaminoActionsMenu } from './CaminoActionsMenu';

const DESCRIPTION_MAX = 665;

function truncateAtSentence(text: string): string {
  if (text.length <= DESCRIPTION_MAX) return text;
  const sub = text.slice(0, DESCRIPTION_MAX);
  const lastPeriod = sub.lastIndexOf('.');
  if (lastPeriod > 0) return sub.slice(0, lastPeriod + 1) + '…';
  return sub + '…';
}

interface CaminoListProps {
  caminos: CaminoSummary[];
  user: AuthUser | null;
}

export async function CaminoList({ caminos, user }: CaminoListProps) {
  const t = await getTranslations('caminos');

  const canModify = user?.roles.some((r) => r.key === 'pilgrim' || r.key === 'owner') ?? false;
  const isPilgrim = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  return (
    <section className="mt-8">
      {isPilgrim && (
        <div className="mb-6">
          <Link href="/caminos/new" className={buttonVariants({ variant: 'default' })}>
            {t('create_link')}
          </Link>
        </div>
      )}

      {caminos.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-4" aria-label={t('title')}>
          {caminos.map((camino) => (
            <li
              key={camino.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/caminos/${camino.id}`} className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">{camino.name}</h2>
                  {camino.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {truncateAtSentence(camino.description)}
                    </p>
                  )}
                </Link>

                <div className="flex shrink-0 items-center gap-2">
                  {camino.verified && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t('verified')}
                    </span>
                  )}

                  {canModify && <CaminoActionsMenu camino={camino} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
