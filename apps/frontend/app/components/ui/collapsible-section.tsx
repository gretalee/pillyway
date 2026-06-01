'use client';

import { buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CollapsibleSectionProps {
  id: string;
  heading: string;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({
  id,
  heading,
  defaultOpen = true,
  className,
  buttonClassName,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;

  return (
    <section className={className} aria-labelledby={headingId}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className={cn(
          'flex w-full items-center justify-between gap-2',
          'pb-1 text-left',
          'cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          buttonClassName,
        )}>
        <span id={headingId} className="text-xl font-semibold block">
          {heading}
        </span>
        <span
          role="heading"
          aria-level={2}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <i
            className={cn(
              'icon-chevron-down text-sm font-normal transition-transform duration-200 -translate-y-[2px]',
              {
                'rotate-180': open,
              },
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        className={cn({ hidden: !open })}>
        {children}
      </div>
    </section>
  );
}
