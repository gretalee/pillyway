import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccommodationButton } from './DeleteAccommodationButton';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: () => ({
    accessTokenEncoded: 'test-token',
    user: { id: 'user-1' },
    accessToken: { roles: [{ key: 'owner' }] },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useRouter } from 'next/navigation';

const mockRefresh = vi.fn();

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const TEST_PROPS = {
  id: 'accom-99',
  caminoPointId: 'point-1',
  name: 'Albergue Sol',
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function renderButton(props = TEST_PROPS) {
  render(
    <QueryClientProvider client={makeClient()}>
      <DeleteAccommodationButton {...props} />
    </QueryClientProvider>,
  );
}

const originalConsoleError = console.error.bind(console);

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ refresh: mockRefresh } as unknown as ReturnType<typeof useRouter>);
  mockFetch.mockReset();
  mockRefresh.mockReset();
  vi.spyOn(console, 'error').mockImplementation((message: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('not wrapped in act')) return;
    originalConsoleError(message, ...args);
  });
});

afterEach(() => vi.restoreAllMocks());

describe('DeleteAccommodationButton — rendering', () => {
  it('renders the trash button with the correct aria-label', () => {
    renderButton();
    expect(
      screen.getByRole('button', { name: 'delete_accommodation_label' }),
    ).toBeInTheDocument();
  });

  it('does not show the dialog initially', () => {
    renderButton();
    expect(screen.queryByText('delete_confirmation_title')).not.toBeInTheDocument();
  });
});

describe('DeleteAccommodationButton — open dialog', () => {
  it('opens the confirmation dialog when the trash button is clicked', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'delete_accommodation_label' }));
    expect(screen.getByText('delete_confirmation_title')).toBeInTheDocument();
  });
});

describe('DeleteAccommodationButton — confirm delete', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true });
  });

  it('sends DELETE to /accommodations/:id with Bearer token on confirm', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'delete_accommodation_label' }));
    await user.click(screen.getByText('delete_confirm_action'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/accommodations/accom-99');
    expect(opts.method).toBe('DELETE');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
  });

  it('calls router.refresh and closes the dialog after a successful delete', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: 'delete_accommodation_label' }));
    await user.click(screen.getByText('delete_confirm_action'));
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledOnce();
      expect(screen.queryByText('delete_confirmation_title')).not.toBeInTheDocument();
    });
  });
});
