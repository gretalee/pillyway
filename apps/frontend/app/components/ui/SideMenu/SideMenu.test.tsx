import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SideMenu, SideSlider, useSideMenu } from './SideMenu';
import { useSideMenuStore } from '@/store/side-menu-store';

function resetStore() {
  useSideMenuStore.setState({ openId: null, openSide: null, sides: {} });
}

beforeEach(() => {
  resetStore();
  document.body.style.overflowY = '';
  // jsdom doesn't implement scrollTo — push-side SideMenus call it on every
  // open/close, which would otherwise spam "Not implemented" warnings.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  document.body.style.overflowY = '';
  vi.restoreAllMocks();
});

// ---------- useSideMenu ----------

function Harness({ id }: { id: string }) {
  const { isOpen, open, close, toggle } = useSideMenu(id);
  return (
    <div>
      <span data-testid={`state-${id}`}>{isOpen ? 'open' : 'closed'}</span>
      <button onClick={open}>open-{id}</button>
      <button onClick={close}>close-{id}</button>
      <button onClick={toggle}>toggle-{id}</button>
    </div>
  );
}

describe('useSideMenu', () => {
  it('starts closed', () => {
    render(<Harness id="a" />);
    expect(screen.getByTestId('state-a')).toHaveTextContent('closed');
  });

  it('open() opens it', async () => {
    const user = userEvent.setup();
    render(<Harness id="a" />);
    await user.click(screen.getByText('open-a'));
    expect(screen.getByTestId('state-a')).toHaveTextContent('open');
  });

  it('close() closes it', async () => {
    const user = userEvent.setup();
    render(<Harness id="a" />);
    await user.click(screen.getByText('open-a'));
    await user.click(screen.getByText('close-a'));
    expect(screen.getByTestId('state-a')).toHaveTextContent('closed');
  });

  it('toggle() flips open/closed', async () => {
    const user = userEvent.setup();
    render(<Harness id="a" />);
    await user.click(screen.getByText('toggle-a'));
    expect(screen.getByTestId('state-a')).toHaveTextContent('open');
    await user.click(screen.getByText('toggle-a'));
    expect(screen.getByTestId('state-a')).toHaveTextContent('closed');
  });

  it('opening one instance closes a different open instance', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness id="a" />
        <Harness id="b" />
      </>,
    );
    await user.click(screen.getByText('open-a'));
    expect(screen.getByTestId('state-a')).toHaveTextContent('open');

    await user.click(screen.getByText('open-b'));
    expect(screen.getByTestId('state-b'), 'only one SideMenu can be open at a time').toHaveTextContent(
      'open',
    );
    expect(screen.getByTestId('state-a')).toHaveTextContent('closed');
  });
});

// ---------- SideMenu — push sides (left/right/top) ----------
//
// The title button lives INSIDE the panel, which is `inert` while closed —
// so it can never be the thing that opens the menu (that's a separate
// trigger button elsewhere, e.g. BurgerMenu's header icon; not modeled by
// SideMenu itself). These tests always open via the store directly, the
// same way an external trigger would, and only click the title button once
// the panel is actually open (and therefore not inert) — its one real job
// is closing.

describe('SideMenu — push side', () => {
  it('registers its side with the store on mount', () => {
    render(
      <SideMenu id="push-menu" side="right" title="Menu">
        body
      </SideMenu>,
    );
    expect(useSideMenuStore.getState().sides['push-menu']).toBe('right');
  });

  it('is aria-hidden and inert while closed', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    const panel = document.getElementById('push-menu');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveAttribute('inert');
  });

  it('is no longer aria-hidden or inert once opened via the store', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('push-menu'));
    const panel = document.getElementById('push-menu');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(panel).not.toHaveAttribute('inert');
  });

  it('renders the title as a button with aria-expanded/aria-controls, even while closed/inert', () => {
    const { container } = render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    // Raw DOM query, not getByRole: the button is legitimately excluded from
    // the accessibility tree while its inert ancestor is closed.
    const button = container.querySelector('button');
    expect(button).toHaveTextContent('Menu');
    expect(button).toHaveAttribute('aria-controls', 'push-menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('once open, the title button is reachable and reflects aria-expanded=true', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('push-menu'));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking the title button while open closes the menu', async () => {
    const user = userEvent.setup();
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('push-menu'));

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(useSideMenuStore.getState().openId).toBeNull();
  });

  it('renders children in the scrollable body', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        <p>menu body text</p>
      </SideMenu>,
    );
    expect(screen.getByText('menu body text')).toBeInTheDocument();
  });

  it('Escape closes it while open', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('push-menu'));
    expect(useSideMenuStore.getState().openId).toBe('push-menu');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(useSideMenuStore.getState().openId).toBeNull();
  });

  it('Escape does nothing while already closed', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(useSideMenuStore.getState().openId).toBeNull();
  });

  it('locks body scroll while open and restores it on close', async () => {
    const user = userEvent.setup();
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('push-menu'));
    expect(document.body.style.overflowY).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(document.body.style.overflowY).toBe('');
  });

  it('moves focus to the title button on open', () => {
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('push-menu'));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('resets scroll to the top on open and restores the reading position on close', async () => {
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    const user = userEvent.setup();
    render(
      <SideMenu id="push-menu" side="left" title="Menu">
        body
      </SideMenu>,
    );

    act(() => useSideMenuStore.getState().open('push-menu'));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 500);
  });

  it('accessible name of the panel is the title', () => {
    render(
      <SideMenu id="push-menu" side="left" title="My Menu">
        body
      </SideMenu>,
    );
    expect(document.getElementById('push-menu')).toHaveAttribute('aria-label', 'My Menu');
  });
});

// ---------- SideMenu — bottom overlay ----------

describe('SideMenu — bottom overlay', () => {
  it('renders as a fixed, bottom-anchored overlay instead of a push panel', () => {
    render(
      <SideMenu id="bottom-menu" side="bottom" title="Overlay">
        body
      </SideMenu>,
    );
    const el = document.getElementById('bottom-menu');
    expect(el).toHaveClass('fixed');
    expect(el).toHaveClass('inset-x-0');
    expect(el).toHaveClass('bottom-0');
    expect(el).toHaveClass('max-h-[50vh]');
    // Not a push panel — must not carry OffCanvasPanel's own positioning classes.
    expect(el).not.toHaveClass('w-[var(--off-canvas-size)]');
  });

  it('is translated below the viewport (plus a buffer) while closed', () => {
    render(
      <SideMenu id="bottom-menu" side="bottom" title="Overlay">
        body
      </SideMenu>,
    );
    expect(document.getElementById('bottom-menu')).toHaveClass('translate-y-[calc(100%+8px)]');
  });

  it('translates to its resting position once opened', () => {
    render(
      <SideMenu id="bottom-menu" side="bottom" title="Overlay">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('bottom-menu'));
    expect(document.getElementById('bottom-menu')).toHaveClass('translate-y-0');
  });

  it('does not reset or restore scroll position (the page never moves for a bottom overlay)', async () => {
    const user = userEvent.setup();
    render(
      <SideMenu id="bottom-menu" side="bottom" title="Overlay">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('bottom-menu'));
    await user.click(screen.getByRole('button', { name: 'Overlay' }));

    expect(window.scrollTo, 'a bottom overlay must never call window.scrollTo').not.toHaveBeenCalled();
  });

  it('still locks body scroll while open', () => {
    render(
      <SideMenu id="bottom-menu" side="bottom" title="Overlay">
        body
      </SideMenu>,
    );
    act(() => useSideMenuStore.getState().open('bottom-menu'));
    expect(document.body.style.overflowY).toBe('hidden');
  });
});

// ---------- SideSlider ----------

describe('SideSlider', () => {
  it('does not push when nothing is open', () => {
    render(<SideSlider>content</SideSlider>);
    expect(screen.getByText('content')).toHaveClass('translate-x-0');
  });

  it('pushes toward the open side when a push-style menu is open', () => {
    act(() => useSideMenuStore.setState({ openId: 'x', openSide: 'left' }));
    render(<SideSlider>content</SideSlider>);
    expect(screen.getByText('content')).toHaveClass('translate-x-[var(--off-canvas-size)]');
  });

  it('does not push when the open menu is a bottom overlay', () => {
    // Regression guard: a bottom menu is an overlay, not a push side — the
    // page must stay exactly where it is while one is open.
    act(() => useSideMenuStore.setState({ openId: 'x', openSide: 'bottom' }));
    render(<SideSlider>content</SideSlider>);
    expect(screen.getByText('content')).toHaveClass('translate-x-0');
  });
});
