import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonVariants } from '@/app/components/ui/button';
import type { CaminoSummary } from '@/app/api/caminos/caminos';
import type { AuthUser } from '@/lib/getAuthUser';
import { CaminoListFilter } from './CaminoListFilter';

interface CaminoListProps {
  caminos: CaminoSummary[];
  user: AuthUser | null;
}

export async function CaminoList({ caminos, user }: CaminoListProps) {
  const t = await getTranslations('caminos');

  const isPilgrim = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  return (
    <section className="mt-8">
      {caminos.length === 0 ? (
        <>
          {isPilgrim && (
            <div className="mb-6">
              <Link href="/caminos/new" className={buttonVariants({ variant: 'default' })}>
                {t('create_link')}
              </Link>
            </div>
          )}
          <p className="text-muted-foreground">{t('empty')}</p>
        </>
      ) : (
        <CaminoListFilter caminos={caminos} isPilgrim={isPilgrim} />
      )}
    </section>
  );
}
