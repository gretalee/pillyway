'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { useCaminoPictures } from '@/app/api/camino-pictures/use-camino-pictures';
import { Lightbox } from './Lightbox';
import type { LightboxImage } from './Lightbox';

interface CaminoPicturesHeroProps {
  caminoId: string;
  caminoName: string;
}

export function CaminoPicturesHero({ caminoId, caminoName }: CaminoPicturesHeroProps) {
  const t = useTranslations('camino_detail.pictures');
  const { data } = useCaminoPictures(caminoId);
  const primary = data?.primary ?? null;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const heroImages: LightboxImage[] = primary ? [{ id: primary.id, url: primary.url }] : [];

  const openLightbox = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = e.currentTarget;
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  if (!primary) return null;

  return (
    <>
      <div className="mt-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <button
            type="button"
            aria-label={t('open_fullscreen')}
            onClick={openLightbox}
            className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <span className="sr-only">{t('open_fullscreen')}</span>
          </button>
          <Image
            src={primary.url}
            alt={caminoName}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
            unoptimized
          />
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={heroImages}
          initialIndex={0}
          currentIndex={0}
          isGalleryMode={false}
          onClose={closeLightbox}
          onNavigate={() => undefined}
        />
      )}
    </>
  );
}
