import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import BurgerIcon from './BurgerIcon';

describe('BurgerIcon', () => {
  it('renders three lines', () => {
    const { container } = render(<BurgerIcon />);
    expect(container.querySelectorAll('line')).toHaveLength(3);
  });

  it('defaults to the closed (hamburger) state when no prop is given', () => {
    const { container } = render(<BurgerIcon />);
    const [top, middle, bottom] = Array.from(container.querySelectorAll('line'));
    expect(top).not.toHaveClass('rotate-45');
    expect(middle).not.toHaveClass('opacity-0');
    expect(bottom).not.toHaveClass('-rotate-45');
  });

  it('rotates the top and bottom lines into an X when open', () => {
    const { container } = render(<BurgerIcon open={true} />);
    const [top, , bottom] = Array.from(container.querySelectorAll('line'));
    expect(top).toHaveClass('rotate-45');
    expect(top).toHaveClass('translate-y-1.5');
    expect(bottom).toHaveClass('-rotate-45');
    expect(bottom).toHaveClass('-translate-y-1.5');
  });

  it('fades out the middle line when open', () => {
    const { container } = render(<BurgerIcon open={true} />);
    const middle = container.querySelectorAll('line')[1];
    expect(middle).toHaveClass('opacity-0');
  });

  it('the svg is decorative (aria-hidden) — the trigger button owns the accessible name', () => {
    const { container } = render(<BurgerIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
