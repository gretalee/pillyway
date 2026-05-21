'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function ToggleSwitch({
  id,
  checked,
  onCheckedChange,
  disabled,
  'aria-label': ariaLabel,
  className,
}: ToggleSwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border border-transparent',
        'bg-input transition-colors outline-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        'data-checked:bg-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}>
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-4 rounded-full bg-background shadow-sm transition-transform',
          'translate-x-0.5 data-checked:translate-x-full',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
