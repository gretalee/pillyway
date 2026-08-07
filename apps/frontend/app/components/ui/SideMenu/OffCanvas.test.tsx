import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { OffCanvasContent, OffCanvasPanel } from './OffCanvas';

describe('OffCanvasPanel', () => {
  it('renders as a div by default', () => {
    render(<OffCanvasPanel open={true}>content</OffCanvasPanel>);
    expect(screen.getByText('content').tagName).toBe('DIV');
  });

  it('renders as the element passed via "as"', () => {
    render(
      <OffCanvasPanel as="nav" open={true}>
        content
      </OffCanvasPanel>,
    );
    expect(screen.getByText('content').tagName).toBe('NAV');
  });

  it('is hidden (display:none) while closed', () => {
    render(<OffCanvasPanel open={false}>content</OffCanvasPanel>);
    expect(
      screen.getByText('content'),
      'closed panels must have the hidden class — with two+ SideMenus mounted, a merely inert-but-rendered panel can bleed through wherever a different open panel reveals it',
    ).toHaveClass('hidden');
  });

  it('is not display:none while open', () => {
    render(<OffCanvasPanel open={true}>content</OffCanvasPanel>);
    expect(screen.getByText('content')).not.toHaveClass('hidden');
  });

  it('is aria-hidden and inert while closed', () => {
    render(<OffCanvasPanel open={false}>content</OffCanvasPanel>);
    const el = screen.getByText('content');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveAttribute('inert');
  });

  it('is not aria-hidden or inert while open', () => {
    render(<OffCanvasPanel open={true}>content</OffCanvasPanel>);
    const el = screen.getByText('content');
    expect(el).toHaveAttribute('aria-hidden', 'false');
    expect(el).not.toHaveAttribute('inert');
  });

  it('applies left-anchored position/size classes for side="left" (the default)', () => {
    render(<OffCanvasPanel open={true}>content</OffCanvasPanel>);
    const el = screen.getByText('content');
    expect(el).toHaveClass('left-0');
    expect(el).toHaveClass('w-[var(--off-canvas-size)]');
  });

  it('applies right-anchored position classes for side="right"', () => {
    render(
      <OffCanvasPanel open={true} side="right">
        content
      </OffCanvasPanel>,
    );
    expect(screen.getByText('content')).toHaveClass('right-0');
  });

  it('applies top-anchored, vh-based size classes for side="top"', () => {
    render(
      <OffCanvasPanel open={true} side="top">
        content
      </OffCanvasPanel>,
    );
    const el = screen.getByText('content');
    expect(el).toHaveClass('top-0');
    expect(el).toHaveClass('h-[var(--off-canvas-size-vertical)]');
  });

  it('forwards extra props (id, aria-label, ...) to the underlying element', () => {
    render(
      <OffCanvasPanel open={true} id="my-panel" aria-label="My panel">
        content
      </OffCanvasPanel>,
    );
    const el = screen.getByText('content');
    expect(el).toHaveAttribute('id', 'my-panel');
    expect(el).toHaveAttribute('aria-label', 'My panel');
  });

  it('merges a custom className alongside the built-in classes', () => {
    render(
      <OffCanvasPanel open={true} className="custom-marker">
        content
      </OffCanvasPanel>,
    );
    const el = screen.getByText('content');
    expect(el).toHaveClass('custom-marker');
    expect(el).toHaveClass('fixed'); // built-in classes still present
  });
});

describe('OffCanvasContent', () => {
  it('renders its children', () => {
    render(<OffCanvasContent open={false}>content</OffCanvasContent>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('has no horizontal translate while closed (side="left", the default)', () => {
    render(<OffCanvasContent open={false}>content</OffCanvasContent>);
    expect(screen.getByText('content')).toHaveClass('translate-x-0');
  });

  it('translates by the shared off-canvas size while open, side="left"', () => {
    render(
      <OffCanvasContent open={true} side="left">
        content
      </OffCanvasContent>,
    );
    expect(screen.getByText('content')).toHaveClass('translate-x-[var(--off-canvas-size)]');
  });

  it('translates the opposite direction while open, side="right"', () => {
    render(
      <OffCanvasContent open={true} side="right">
        content
      </OffCanvasContent>,
    );
    expect(screen.getByText('content')).toHaveClass('-translate-x-[var(--off-canvas-size)]');
  });

  it('does not add the vertical-clip classes for side="left"', () => {
    render(
      <OffCanvasContent open={true} side="left">
        content
      </OffCanvasContent>,
    );
    const el = screen.getByText('content');
    expect(el).not.toHaveClass('h-dvh');
    expect(el).not.toHaveClass('overflow-hidden');
  });

  it('adds the vertical-clip classes only while open AND side="top"', () => {
    render(
      <OffCanvasContent open={true} side="top">
        content
      </OffCanvasContent>,
    );
    const el = screen.getByText('content');
    // Real regression guard: `top` needs the page clipped to one viewport's
    // height while open, or the translate has no real edge to reveal — see
    // OffCanvasContent's own comment for the full story.
    expect(el).toHaveClass('h-dvh');
    expect(el).toHaveClass('min-h-0');
    expect(el).toHaveClass('flex-none');
    expect(el).toHaveClass('overflow-hidden');
  });

  it('does not clip side="top" while closed', () => {
    render(
      <OffCanvasContent open={false} side="top">
        content
      </OffCanvasContent>
    );
    const el = screen.getByText('content');
    expect(el).not.toHaveClass('h-dvh');
    expect(el).not.toHaveClass('overflow-hidden');
  });

  it('the vertical-clip classes win over a conflicting caller className', () => {
    // Regression guard for a real bug: a caller class like `flex-1
    // min-h-full` (layout.tsx passes exactly this) would otherwise defeat
    // the clip — flex-basis:0% and min-height:auto both fight the explicit
    // h-dvh/overflow-hidden. The clip classes must always win when active.
    render(
      <OffCanvasContent open={true} side="top" className="flex-1 min-h-full">
        content
      </OffCanvasContent>,
    );
    const el = screen.getByText('content');
    expect(el).toHaveClass('flex-none');
    expect(el).toHaveClass('min-h-0');
    expect(el).not.toHaveClass('flex-1');
    expect(el).not.toHaveClass('min-h-full');
  });

  it('applies a shadow class regardless of side', () => {
    for (const side of ['left', 'right', 'top'] as const) {
      const { unmount } = render(
        <OffCanvasContent open={true} side={side}>
          content
        </OffCanvasContent>,
      );
      const el = screen.getByText('content');
      const hasShadow = Array.from(el.classList).some((cls) => cls.startsWith('shadow'));
      expect(hasShadow, `side="${side}" should render some shadow utility class`).toBe(true);
      unmount();
    }
  });
});
