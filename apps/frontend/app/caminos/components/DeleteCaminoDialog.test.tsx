import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteCaminoDialog } from './DeleteCaminoDialog';

// ── i18n mock ──────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ── Kinde mock ─────────────────────────────────────────────────────────────────
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: () => ({ accessTokenEncoded: 'test-token' }),
}));

// ── Fetch mock ─────────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const TEST_CAMINO = { id: 'camino-42', name: 'Camino Francés' };

function renderDialog({
  camino = TEST_CAMINO as { id: string; name: string } | null,
  open = true,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
} = {}) {
  render(
    <QueryClientProvider client={makeClient()}>
      <DeleteCaminoDialog
        camino={camino}
        open={open}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </QueryClientProvider>,
  );
}

const originalConsoleError = console.error.bind(console);

beforeEach(() => {
  mockFetch.mockReset();
  vi.spyOn(console, 'error').mockImplementation(
    (message: unknown, ...args: unknown[]) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) return;
      originalConsoleError(message, ...args);
    },
  );
});

afterEach(() => vi.restoreAllMocks());

// ── Visibility ─────────────────────────────────────────────────────────────────

describe('DeleteCaminoDialog — visibility', () => {
  it('renders dialog content when open=true', () => {
    renderDialog({ open: true });
    expect(screen.getByText('delete_dialog_title')).toBeInTheDocument();
  });

  it('does not render dialog content when open=false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('delete_dialog_title')).not.toBeInTheDocument();
  });
});

// ── Content ────────────────────────────────────────────────────────────────────

describe('DeleteCaminoDialog — content', () => {
  it('renders cancel and confirm buttons', () => {
    renderDialog({});
    expect(screen.getByText('delete_dialog_cancel')).toBeInTheDocument();
    expect(screen.getByText('delete_dialog_confirm')).toBeInTheDocument();
  });
});

// ── Cancel ─────────────────────────────────────────────────────────────────────

describe('DeleteCaminoDialog — cancel', () => {
  it('calls onClose when the cancel button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onClose });
    await user.click(screen.getByText('delete_dialog_cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ── Confirm (success) ──────────────────────────────────────────────────────────

describe('DeleteCaminoDialog — confirm success', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true });
  });

  it('sends DELETE /caminos/:id with Bearer token when confirmed', async () => {
    const user = userEvent.setup();
    renderDialog({});
    await user.click(screen.getByText('delete_dialog_confirm'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/caminos/camino-42');
    expect(opts.method).toBe('DELETE');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
  });

  it('calls onClose and onSuccess after a successful delete', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onClose, onSuccess });
    await user.click(screen.getByText('delete_dialog_confirm'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });
});

// ── Confirm (error) ────────────────────────────────────────────────────────────

describe('DeleteCaminoDialog — confirm error', () => {
  it('shows the error message when the request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const user = userEvent.setup();
    renderDialog({});
    await user.click(screen.getByText('delete_dialog_confirm'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('delete_dialog_error');
    });
  });

  it('does not call onSuccess when the request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSuccess });
    await user.click(screen.getByText('delete_dialog_confirm'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

// ── Pending state ──────────────────────────────────────────────────────────────

describe('DeleteCaminoDialog — pending state', () => {
  it('shows loading text and disables the cancel button while pending', async () => {
    // Fetch never resolves — mutation stays in pending state.
    mockFetch.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderDialog({});
    await user.click(screen.getByText('delete_dialog_confirm'));
    await waitFor(() => {
      expect(screen.getByText('delete_dialog_deleting')).toBeInTheDocument();
    });
    const cancelBtn = screen.getByText('delete_dialog_cancel').closest('button');
    expect(cancelBtn).toBeDisabled();
  });
});
