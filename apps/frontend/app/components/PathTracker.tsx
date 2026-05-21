'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const LAST_PATH_KEY = 'pilly_lastPath';

const PATH_NO_FORM = /\/(edit|new|update)$/;
const PATH_STAGE_VIEW = /^\/caminos\/[a-z0-9-]+\/stages\/\d+$/;

export const getLastPath = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(LAST_PATH_KEY);
};

export function PathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (PATH_NO_FORM.test(pathname)) return;
    if (!PATH_STAGE_VIEW.test(pathname)) return;

    sessionStorage.setItem(LAST_PATH_KEY, pathname);
  }, [pathname]);

  return null;
}
