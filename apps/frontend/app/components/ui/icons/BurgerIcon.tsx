import { cn } from '@/lib/utils';

interface BurgerIconProps {
  open?: boolean;
}

const lineClassName =
  '[transform-box:fill-box] origin-center transition-transform duration-500 ease-in-out';

function BurgerIcon({ open = false }: BurgerIconProps) {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true">
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
        className={cn(lineClassName, open && 'translate-y-1.5 rotate-45')}
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        className={cn(
          'transition-opacity duration-300 delay-100 ease-out',
          open && 'opacity-0',
        )}
      />
      <line
        x1="3"
        y1="18"
        x2="21"
        y2="18"
        className={cn(lineClassName, open && '-translate-y-1.5 -rotate-45')}
      />
    </svg>
  );
}

export default BurgerIcon;
