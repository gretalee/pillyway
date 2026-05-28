'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface LightboxImage {
  id: string;
  url: string;
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  isGalleryMode: boolean;
  onClose: () => void;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function Lightbox({
  images,
  isGalleryMode,
  onClose,
  currentIndex,
  onNavigate,
}: LightboxProps) {
  const t = useTranslations('camino_detail.pictures.lightbox');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const canGoPrev = isGalleryMode && currentIndex > 0;
  const canGoNext = isGalleryMode && currentIndex < images.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev) onNavigate(currentIndex - 1);
  }, [canGoPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canGoNext) onNavigate(currentIndex + 1);
  }, [canGoNext, currentIndex, onNavigate]);

  // Focus the close button when the lightbox opens
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Overlay click closes the lightbox */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        ref={closeButtonRef}
        type="button"
        aria-label={t('close')}
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <X size={20} aria-hidden="true" />
      </button>

      {/* Prev button */}
      {canGoPrev && (
        <button
          type="button"
          aria-label={t('prev')}
          onClick={handlePrev}
          className="absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
      )}

      {/* Next button */}
      {canGoNext && (
        <button
          type="button"
          aria-label={t('next')}
          onClick={handleNext}
          className="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative z-10 max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}>
        <Image
          src={currentImage.url}
          alt=""
          width={1200}
          height={900}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          style={{ width: 'auto', height: 'auto', maxHeight: '90vh', maxWidth: '90vw' }}
          priority
          unoptimized
        />
      </div>

      {/* Position indicator */}
      {isGalleryMode && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
