'use client';

import { useCaminoPictures } from '@/app/api/camino-pictures/use-camino-pictures';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const CaminoMainImage = ({
  caminoId,
  title,
  className,
}: {
  caminoId: string;
  title?: string;
  className?: string;
}) => {
  const { data } = useCaminoPictures(caminoId);
  const primary = data?.primary ?? null;

  if (!primary?.url) {
    return null;
  }

  return (
    <div className={cn('relative h-32 w-full overflow-hidden rounded-md', className)}>
      <Image
        src={primary.url}
        alt={title ?? ''}
        fill
        className="object-cover cursor-zoom-in"
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
        unoptimized
      />
    </div>
  );
};

export default CaminoMainImage;
