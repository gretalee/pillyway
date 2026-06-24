import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const basicStyles = cn(
  'group/button shrink-0 transition-all select-none cursor-pointer',
  'pt-1 inline-flex items-center justify-start',
  'rounded-sm outline-none text-sm font-medium whitespace-nowrap',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'active:not-aria-[haspopup]:translate-y-px',
  'disabled:pointer-events-none disabled:opacity-50',
  'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
  'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  '[&_[class*="icon-"]]:-translate-y-[2px] [&_[class^="icon-"]]:-translate-y-[2px]',
);
const buttonVariants = cva(basicStyles, {
  variants: {
    variant: {
      default:
        'bg-primary text-primary-foreground hover:bg-primary/80 [a]:hover:bg-primary/80',
      outline:
        'border border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
      secondary:
        'border bg-secondary text-secondary-foreground hover:border-secondary-foreground aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
      tertiary:
        'bg-pillyGreen-600 hover:bg-pillyGreen-500 text-white font-semibold aria-expanded:bg-pillyGreen-600 data-[state=open]:bg-pillyGreen-600',
      ghost:
        'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
      destructive:
        'border bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default:
        'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      xs: "h-6 gap-1 rounded-[min(var(--radius-sm),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      sm: "h-7 gap-1 rounded-[min(var(--radius-sm),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
      lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      xl: 'h-10 gap-1.5 px-3 text-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      icon: 'size-8',
      'icon-xs':
        "justify-center size-6 rounded-[min(var(--radius-sm),10px)] in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-3",
      'icon-sm':
        "justify-center size-7 rounded-[min(var(--radius-sm),12px)] in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
      'icon-lg':
        'justify-center size-9 [&_svg:not([class*=\'size-\'])]:size-4 [&_[class*="icon-"]]:text-lg [&_[class^="icon-"]]:text-lg',
      'icon-xl':
        "justify-center size-10 [&_svg:not([class*='size-'])]:size-5 [&_[class*='icon-']]:text-xl [&_[class^='icon-']]:text-xl",
    },
  },

  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
