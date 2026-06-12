'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Lightbox, type LightboxImage } from './Lightbox';

export interface GalleryPicture {
  id: string;
  url: string;
  label?: string | null;
}

interface PictureGalleryProps {
  pictures: GalleryPicture[];
  className?: string;
  renderThumbnailOverlay?: (picture: GalleryPicture, index: number) => React.ReactNode;
  renderAfterThumbnail?: (picture: GalleryPicture, index: number) => React.ReactNode;
}

export function PictureGallery({
  pictures,
  className,
  renderThumbnailOverlay,
  renderAfterThumbnail,
}: PictureGalleryProps) {
  const t = useTranslations('picture_gallery');
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const images: LightboxImage[] = pictures.map((p) => ({
    id: p.id,
    url: p.url,
    label: p.label,
  }));

  const openLightbox = useCallback((index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = e.currentTarget;
    setCurrentIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setCurrentIndex(null);
    if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, []);

  if (pictures.length === 0) return null;

  return (
    <>
      <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
        {pictures.map((picture, index) => (
          <li key={picture.id} className="flex flex-col gap-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <button
                type="button"
                aria-label={t('open_fullscreen')}
                onClick={(e) => openLightbox(index, e)}
                className={cn(
                  'absolute inset-0 z-10 cursor-zoom-in',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}>
                <span className="sr-only">{t('open_fullscreen')}</span>
              </button>
              <Image
                src={picture.url}
                alt={picture.label ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                unoptimized
              />
              {renderThumbnailOverlay?.(picture, index)}
            </div>
            {renderAfterThumbnail?.(picture, index)}
          </li>
        ))}
      </ul>

      {currentIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={currentIndex}
          currentIndex={currentIndex}
          isGalleryMode={pictures.length > 1}
          onClose={closeLightbox}
          onNavigate={setCurrentIndex}
        />
      )}
    </>
  );
}
