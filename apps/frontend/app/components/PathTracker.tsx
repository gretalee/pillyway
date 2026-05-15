'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const FORM_PATH_RE = /\/(edit|new)$/;

export function PathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (FORM_PATH_RE.test(pathname)) return;

    const current = sessionStorage.getItem('navCurrentPath');
    if (current && current !== pathname) {
      sessionStorage.setItem('navPreviousPath', current);
    }
    sessionStorage.setItem('navCurrentPath', pathname);
  }, [pathname]);

  return null;
}
