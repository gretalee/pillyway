'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BackButton() {
  const router = useRouter();
  const t = useTranslations('waypoint_detail');

  function handleClick() {
    const previousPath = sessionStorage.getItem('navPreviousPath');
    router.push(previousPath ?? '/caminos');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ChevronLeft className="size-4" aria-hidden="true" />
      {t('back_label')}
    </button>
  );
}
