'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PATH_NO_FORM = /\/(edit|new|update)$/;
const PATH_STAGE_VIEW = /^\/caminos\/[a-z0-9-]+\/stages\/\d+$/;

export function PathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (PATH_NO_FORM.test(pathname)) return;
    if (!PATH_STAGE_VIEW.test(pathname)) return;

    const current = sessionStorage.getItem('navCurrentPath');
    if (current && current !== pathname) {
      sessionStorage.setItem('navPreviousPath', current);
    }
    sessionStorage.setItem('navCurrentPath', pathname);
  }, [pathname]);

  return null;
}
