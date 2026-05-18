'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';
import { useModalStore } from '@/store/modal-store';

interface ModalProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onOk?: () => void;
  onDismiss?: () => void;
}

export function Modal({ id, title, children, onOk, onDismiss }: ModalProps) {
  const register = useModalStore((s) => s.register);
  const close = useModalStore((s) => s.close);
  const isOpen = useModalStore((s) => s.modals[id]?.isOpen ?? false);

  React.useEffect(() => {
    register(id, onOk, onDismiss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleOpenChange(open: boolean) {
    if (!open) close(id);
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
              className={cn(
                'rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Schließen">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </DialogPrimitive.Close>
          </div>

          <div>{children}</div>

          {onOk && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(id)}>
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  onOk();
                  close(id);
                }}>
                OK
              </Button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
