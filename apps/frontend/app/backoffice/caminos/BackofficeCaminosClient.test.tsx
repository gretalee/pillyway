import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BackofficeCamino } from '@/app/api/backoffice/use-backoffice-caminos';

// ---- Module mocks -----------------------------------------------------------

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString().slice(0, 10),
  }),
}));

// Kinde — all backoffice calls require an access token.
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: () => ({ accessTokenEncoded: 'backoffice-token' }),
}));

// @base-ui/react Dialog — render a simple open/close mechanism.
// The Close component in the real library calls the Root's onOpenChange(false)
// internally. We replicate that via a React context so the aria-label close
// button actually triggers the dismiss path in Modal.
vi.mock('@base-ui/react/dialog', () => {
  const { createContext, useContext } = require('react');
  const DialogCtx = createContext(null as ((o: boolean) => void) | null);

  const Root = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    children: React.ReactNode;
  }) => (
    <DialogCtx.Provider value={onOpenChange}>
      <div data-testid="dialog-root" data-open={open}>
        {open ? children : null}
      </div>
    </DialogCtx.Provider>
  );

  const Portal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const Backdrop = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Popup = ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  );
  const Title = ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>;
  const Close = ({
    children,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    'aria-label'?: string;
  }) => {
    const onOpenChange = useContext(DialogCtx);
    return (
      <button aria-label={ariaLabel} onClick={() => onOpenChange?.(false)}>
        {children}
      </button>
    );
  };

  return { Dialog: { Root, Portal, Backdrop, Popup, Title, Close } };
});

// @base-ui/react Switch — minimal role="switch" implementation.
vi.mock('@base-ui/react/switch', () => ({
  Switch: {
    Root: ({
      checked,
      onCheckedChange,
      disabled,
      'aria-label': ariaLabel,
    }: {
      checked: boolean;
      onCheckedChange: (v: boolean) => void;
      disabled?: boolean;
      'aria-label'?: string;
    }) => (
      <button
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}>
        {ariaLabel}
      </button>
    ),
    Thumb: () => null,
  },
}));

// @base-ui/react Button — pass-through.
vi.mock('@base-ui/react/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

// lucide-react icons.
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
}));

// TanStack Query hooks.
vi.mock('@/app/api/backoffice/use-backoffice-caminos', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/app/api/backoffice/use-backoffice-caminos')>();
  return { ...original, useBackofficeCaminos: vi.fn() };
});

vi.mock('@/app/api/backoffice/use-camino-votes-detail', () => ({
  useCaminoVotesDetail: vi.fn(),
}));

vi.mock('@/app/api/caminos/use-set-camino-verified', () => ({
  useSetCaminoVerified: vi.fn(),
}));

// -----------------------------------------------------------------------------

import { BackofficeCaminosClient } from './BackofficeCaminosClient';
import { useBackofficeCaminos } from '@/app/api/backoffice/use-backoffice-caminos';
import { useCaminoVotesDetail } from '@/app/api/backoffice/use-camino-votes-detail';
import { useSetCaminoVerified } from '@/app/api/caminos/use-set-camino-verified';
import { useModalStore } from '@/store/modal-store';

// ---- Fixtures ---------------------------------------------------------------

const caminos: BackofficeCamino[] = [
  { id: 'c1', name: 'Camino Francés', verified: true, yesCount: 10, noCount: 2 },
  { id: 'c2', name: 'Via de la Plata', verified: false, yesCount: 3, noCount: 7 },
];

// ---- Helpers ----------------------------------------------------------------

function setupDefaultMocks(overrides: {
  caminos?: BackofficeCamino[] | null;
  isLoading?: boolean;
  isError?: boolean;
  mutate?: ReturnType<typeof vi.fn>;
  isPending?: boolean;
} = {}) {
  const mutate = overrides.mutate ?? vi.fn();
  const isPending = overrides.isPending ?? false;

  vi.mocked(useBackofficeCaminos).mockReturnValue({
    data: overrides.caminos !== undefined ? (overrides.caminos ?? undefined) : caminos,
    isLoading: overrides.isLoading ?? false,
    isError: overrides.isError ?? false,
  } as ReturnType<typeof useBackofficeCaminos>);

  vi.mocked(useCaminoVotesDetail).mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof useCaminoVotesDetail>);

  vi.mocked(useSetCaminoVerified).mockReturnValue({
    mutate,
    isPending,
  } as unknown as ReturnType<typeof useSetCaminoVerified>);

  return { mutate };
}

function resetModalStore() {
  useModalStore.setState({ modals: {} });
}

// ---- Tests ------------------------------------------------------------------

describe('BackofficeCaminosClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetModalStore();
  });

  // ---------- Loading / error states ----------

  it('renders a loading indicator while data is being fetched', () => {
    setupDefaultMocks({ caminos: undefined, isLoading: true });
    render(<BackofficeCaminosClient />);
    // The loading state renders an ellipsis paragraph.
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('renders an error alert when the data fetch fails', () => {
    setupDefaultMocks({ caminos: undefined, isError: true });
    render(<BackofficeCaminosClient />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toContain('error_loading');
  });

  // ---------- Table rendering ----------

  it('renders a table row for each camino', () => {
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    expect(screen.getByText('Camino Francés')).toBeInTheDocument();
    expect(screen.getByText('Via de la Plata')).toBeInTheDocument();
  });

  it('renders yesCount and noCount for each camino', () => {
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    // Camino Francés: yesCount=10, noCount=2
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Via de la Plata: yesCount=3, noCount=7
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders verified toggle switches with correct aria-checked state', () => {
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    const switches = screen.getAllByRole('switch');
    expect(switches, 'one switch per camino').toHaveLength(2);

    // Camino Francés is verified=true.
    const francesSwitch = screen.getByLabelText(
      /toggle_aria.*Camino Francés/i,
    );
    expect(francesSwitch).toHaveAttribute('aria-checked', 'true');

    // Via de la Plata is verified=false.
    const plateSwitch = screen.getByLabelText(/toggle_aria.*Via de la Plata/i);
    expect(plateSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('does not render the table when caminos is undefined', () => {
    setupDefaultMocks({ caminos: null });
    render(<BackofficeCaminosClient />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // ---------- Toggle verified interaction ----------

  it('calls verifyMutation.mutate with toggled value when a switch is clicked', async () => {
    const user = userEvent.setup();
    const { mutate } = setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    // Click the switch for "Camino Francés" (currently verified=true → expect false).
    const francesSwitch = screen.getByLabelText(/toggle_aria.*Camino Francés/i);
    await user.click(francesSwitch);

    expect(mutate, 'mutate must be called on toggle').toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      { id: 'c1', payload: { verified: false } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('shows a per-row error alert when the toggle mutation fails', async () => {
    let capturedOnError: (() => void) | undefined;
    const mutate = vi.fn((_args, opts: { onError: () => void }) => {
      capturedOnError = opts.onError;
    });
    setupDefaultMocks({ mutate });
    render(<BackofficeCaminosClient />);

    const francesSwitch = screen.getByLabelText(/toggle_aria.*Camino Francés/i);
    const user = userEvent.setup();
    await user.click(francesSwitch);

    // Trigger the error callback — wrap in act because it calls setToggleErrors.
    act(() => {
      capturedOnError?.();
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('toggle_error');
  });

  it('disables all switches while a mutation is pending', () => {
    setupDefaultMocks({ isPending: true });
    render(<BackofficeCaminosClient />);

    const switches = screen.getAllByRole('switch');
    switches.forEach((sw) => {
      expect(sw, 'every switch must be disabled during pending mutation').toBeDisabled();
    });
  });

  // ---------- Modal interaction ----------

  it('opens the votes modal when the details button is clicked', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    const detailsButtons = screen.getAllByText('details_button');
    await user.click(detailsButtons[0]!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the vote-detail loading state inside the modal while fetching', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    vi.mocked(useCaminoVotesDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useCaminoVotesDetail>);
    render(<BackofficeCaminosClient />);

    const detailsButtons = screen.getAllByText('details_button');
    await user.click(detailsButtons[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('…')).toBeInTheDocument();
  });

  it('shows the empty-votes message when no vote details are returned', async () => {
    vi.mocked(useCaminoVotesDetail).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useCaminoVotesDetail>);

    const user = userEvent.setup();
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    const detailsButtons = screen.getAllByText('details_button');
    await user.click(detailsButtons[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('modal_empty')).toBeInTheDocument();
  });

  it('renders vote rows inside the modal when vote details are present', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    vi.mocked(useCaminoVotesDetail).mockReturnValue({
      data: [
        { vote: true, updatedAt: '2025-03-01T10:00:00.000Z' },
        { vote: false, updatedAt: '2025-03-02T10:00:00.000Z' },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useCaminoVotesDetail>);
    render(<BackofficeCaminosClient />);

    const detailsButtons = screen.getAllByText('details_button');
    await user.click(detailsButtons[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('modal_vote_yes')).toBeInTheDocument();
    expect(within(dialog).getByText('modal_vote_no')).toBeInTheDocument();
  });

  it('clears selectedCaminoId (resets modal state) when the modal is dismissed', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);

    const detailsButtons = screen.getAllByText('details_button');
    await user.click(detailsButtons[0]!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Dismiss via the X button (aria-label key = "close_aria").
    const closeButton = screen.getByLabelText('close_aria');
    await user.click(closeButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // ---------- Heading / structure ----------

  it('renders the page heading', () => {
    setupDefaultMocks();
    render(<BackofficeCaminosClient />);
    expect(screen.getByRole('heading', { level: 1, name: 'heading' })).toBeInTheDocument();
  });
});
