'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLastPath } from '@/app/components/PathTracker';

export function BackButton() {
  const router = useRouter();
  const t = useTranslations('waypoint_detail');

  function handleClick() {
    const lastPath = getLastPath();
    if (lastPath) {
      router.push(lastPath);
    } else {
      router.push('/caminos');
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <i className="icon-chevron-left text-xl" aria-hidden="true" />
      {t('back_label')}
    </button>
  );
}
