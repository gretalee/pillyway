'use client';

import { useTranslations } from 'next-intl';

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message }: AccessDeniedProps) {
  const t = useTranslations('caminos_new');

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <p className="text-base font-medium text-destructive">
        {message ?? t('access_denied')}
      </p>
    </div>
  );
}
