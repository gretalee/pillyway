import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaminoActionsMenu } from './CaminoActionsMenu';
import { DeleteCaminoDialog } from './DeleteCaminoDialog';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

// ── i18n mock ──────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ── Kinde mock ─────────────────────────────────────────────────────────────────
// TEST_CAMINO.createdBy matches user-1 and createdAt is 1 min ago — within window.
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: vi.fn(),
}));

// ── next/navigation mock ───────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// ── DropdownMenu mock ──────────────────────────────────────────────────────────
// Avoid Base UI portal/ResizeObserver issues in jsdom by rendering the trigger
// and items as plain elements while preserving all click handlers.
vi.mock('@/app/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <>{children}</>,
  DropdownMenuTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" data-testid="actions-trigger" {...props}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => (
    <div data-testid="actions-menu">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// ── DeleteCaminoDialog mock ────────────────────────────────────────────────────
// Wrapped in vi.fn() so tests can call mockImplementationOnce for specific scenarios.
// Default implementation renders a minimal dialog stand-in.
vi.mock('./DeleteCaminoDialog', () => ({
  DeleteCaminoDialog: vi.fn(),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TEST_CAMINO = {
  id: 'camino-99',
  name: 'Camino del Norte',
  createdBy: 'user-1',
  createdAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago — within window
};

function renderMenu(camino = TEST_CAMINO) {
  render(<CaminoActionsMenu camino={camino} />);
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  camino: { id: string; name: string } | null;
};

function defaultDialogImpl({ open, onClose, camino }: DialogProps) {
  if (!open) return <></>;
  return (
    <div role="dialog" data-testid="delete-dialog" data-camino-id={camino?.id}>
      <button onClick={onClose}>close-dialog</button>
    </div>
  );
}

beforeEach(() => {
  vi.mocked(useKindeBrowserClient).mockReturnValue({
    user: { id: 'user-1' },
    accessToken: { roles: [{ key: 'pilgrim' }] },
  } as unknown as ReturnType<typeof useKindeBrowserClient>);
  vi.mocked(DeleteCaminoDialog).mockImplementation(defaultDialogImpl);
});

afterEach(() => vi.clearAllMocks());

// ── Trigger ────────────────────────────────────────────────────────────────────

describe('CaminoActionsMenu — trigger', () => {
  it('renders the trigger button with an aria-label', () => {
    renderMenu();
    const trigger = screen.getByTestId('actions-trigger');
    expect(trigger).toBeInTheDocument();
    // useTranslations mock returns the key — the aria-label value is the key.
    expect(trigger).toHaveAttribute('aria-label', 'actions_menu_aria');
  });
});

// ── Edit action ────────────────────────────────────────────────────────────────

describe('CaminoActionsMenu — edit action', () => {
  it('navigates to /caminos/:id/update when the edit item is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByText('menu_change_data'));
    expect(mockPush).toHaveBeenCalledWith(`/caminos/${TEST_CAMINO.id}/update`);
  });
});

// ── Delete action ──────────────────────────────────────────────────────────────

describe('CaminoActionsMenu — delete action', () => {
  it('opens the delete dialog when the delete item is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('menu_delete'));
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('passes the correct camino id to the delete dialog', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByText('menu_delete'));
    expect(screen.getByTestId('delete-dialog')).toHaveAttribute(
      'data-camino-id',
      TEST_CAMINO.id,
    );
  });

  it('closes the delete dialog when its onClose callback is triggered', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByText('menu_delete'));
    await user.click(screen.getByText('close-dialog'));
    expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
  });

  it('calls router.refresh when the delete dialog signals success', async () => {
    // mockImplementation (not Once) is needed because the initial render calls
    // DeleteCaminoDialog with open=false, which would consume a mockImplementationOnce.
    vi.mocked(DeleteCaminoDialog).mockImplementation(
      ({ open, onSuccess }: DialogProps) =>
        open ? <button onClick={onSuccess}>trigger-success</button> : <></>,
    );
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByText('menu_delete'));
    await user.click(screen.getByText('trigger-success'));
    expect(mockRefresh).toHaveBeenCalledOnce();
  });
});

// ── Delete hidden when not authorized ─────────────────────────────────────────

describe('CaminoActionsMenu — delete hidden when not authorized', () => {
  it('does NOT render the delete menu item when the user is neither owner nor creator', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValueOnce({
      user: { id: 'other-user' },
      accessToken: { roles: [{ key: 'pilgrim' }] },
    } as unknown as ReturnType<typeof useKindeBrowserClient>);
    renderMenu();
    expect(screen.queryByText('menu_delete')).not.toBeInTheDocument();
  });
});
