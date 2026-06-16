'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/app/components/ui/button';
import { useModalStore } from '@/store/modal-store';
import { ReactNode, useEffect, useLayoutEffect, useRef } from 'react';

interface ModalProps {
  id: string;
  title: string;
  children: ReactNode;
  onOk?: () => void;
  onDismiss?: () => void;
}

export function Modal({ id, title, children, onOk, onDismiss }: ModalProps) {
  const t = useTranslations('modal');
  const register = useModalStore((s) => s.register);
  const close = useModalStore((s) => s.close);
  const dismiss = useModalStore((s) => s.dismiss);
  const isOpen = useModalStore((s) => s.modals[id]?.isOpen ?? false);

  // Refs ensure the store always calls the latest onOk/onDismiss even if props
  // change between renders without re-registering (id stays the same).
  const onOkRef = useRef(onOk);
  const onDismissRef = useRef(onDismiss);
  useLayoutEffect(() => {
    onOkRef.current = onOk;
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    register(id, onOkRef.current ? () => onOkRef.current?.() : undefined, () =>
      onDismissRef.current?.(),
    );
  }, [id, register]);

  function handleOpenChange(open: boolean) {
    if (!open) dismiss(id);
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 isolate z-50 bg-black/10 duration-100',
            'supports-backdrop-filter:backdrop-blur-xs',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4',
            'rounded-xl bg-popover p-6 text-popover-foreground ring-1 ring-foreground/10',
            'duration-100 outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}>
          <div className="flex items-center justify-between gap-2">
            <DialogPrimitive.Title className="text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              aria-label={t('close_aria')}>
              <i className="icon-times text-base text-foreground" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <div>{children}</div>

          {onOk && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => dismiss(id)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={() => {
                  onOk();
                  close(id);
                }}>
                {t('ok')}
              </Button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
