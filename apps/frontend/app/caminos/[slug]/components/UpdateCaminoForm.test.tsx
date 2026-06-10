import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateCaminoForm } from './UpdateCaminoForm';

// ── i18n mock ──────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ── next/navigation mock ───────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── next/link mock ─────────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Kinde mock ─────────────────────────────────────────────────────────────────
// Default: unauthenticated user (user === null → canRemoveWaypoints = true, remove button visible).
const mockUseKindeBrowserClient = vi.fn();
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: () => mockUseKindeBrowserClient(),
}));

// ── Global fetch mock ─────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Suppress TanStack Query act() warnings ────────────────────────────────────
const originalConsoleError = console.error.bind(console);

// ── Fake timers (for CaminoPointRow debounce) ─────────────────────────────────
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(
    (message: unknown, ...args: unknown[]) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) return;
      originalConsoleError(message, ...args);
    },
  );
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockFetch.mockReset();
  mockPush.mockReset();
  // Default: unauthenticated (user === null → canRemoveWaypoints = true → remove button visible)
  mockUseKindeBrowserClient.mockReturnValue({
    user: null,
    accessToken: null,
    accessTokenEncoded: 'test-token',
  });

  // Default: fetch dispatcher — routes by URL pattern.
  mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url !== 'string') return Promise.resolve({ ok: false, status: 400 });

    if (url.includes('/countries')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['france', 'Germany', 'Portugal', 'spain']),
      });
    }
    if (url.includes('/camino-points/search')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/stages') && !url.includes('stages/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    // PATCH /caminos/:id
    if (opts?.method === 'PATCH') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: CAMINO_ID,
            slug: 'camino-frances',
            name: 'Updated Name',
            description: null,
            verified: false,
            createdBy: 'user-1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
            caminoPoints: [
              {
                id: 'pt-1',
                name: 'Saint-Jean-Pied-de-Port',
                country: 'france',
                description: null,
                position: 1,
              },
            ],
          }),
      });
    }
    // GET /caminos/:id
    if (url.includes('/caminos/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(CAMINO_FIXTURE),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
});

afterEach(async () => {
  await act(() => vi.runAllTimersAsync());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CAMINO_ID = 'camino-123';

const CAMINO_FIXTURE = {
  id: CAMINO_ID,
  slug: 'camino-frances',
  name: 'Camino Francés',
  description: 'The most popular route.',
  verified: false,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  caminoPoints: [
    {
      id: 'pt-1',
      name: 'Saint-Jean-Pied-de-Port',
      country: 'france',
      description: null,
      position: 1,
    },
  ],
};

// ── Wrapper ────────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeClient()}>{children}</QueryClientProvider>;
}

function renderForm(caminoId = CAMINO_ID) {
  return render(
    <Wrapper>
      <UpdateCaminoForm caminoId={caminoId} />
    </Wrapper>,
  );
}

// Wait until the form has finished loading and the name field is visible.
async function waitForForm() {
  await waitFor(() => {
    expect(screen.getByLabelText('field_name')).toBeInTheDocument();
  });
}

// Submits the form directly via a DOM event, bypassing the button's disabled
// state. react-hook-form still runs its own field validation inside handleSubmit
// before calling onSubmit.
function submitForm() {
  const form = document.querySelector('form');
  if (form) fireEvent.submit(form);
}

// ── Loading state ──────────────────────────────────────────────────────────────

describe('UpdateCaminoForm — loading', () => {
  it('shows a loading skeleton (aria-busy) while camino data is being fetched', () => {
    renderForm();
    // First synchronous render is always in loading state.
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

// ── Error state ────────────────────────────────────────────────────────────────

describe('UpdateCaminoForm — error state', () => {
  it('shows an error message when the camino cannot be loaded', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/caminos/')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (typeof url === 'string' && url.includes('/countries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (typeof url === 'string' && url.includes('/stages')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('error_loading');
    });
  });
});

// ── Pre-population ─────────────────────────────────────────────────────────────

describe('UpdateCaminoForm — pre-population', () => {
  it('pre-fills the name field with the loaded camino name', async () => {
    renderForm();
    await waitForForm();
    const nameInput = screen.getByLabelText('field_name') as HTMLInputElement;
    expect(nameInput.value).toBe('Camino Francés');
  });

  it('pre-fills the description field with the loaded camino description', async () => {
    renderForm();
    await waitForForm();
    const descInput = screen.getByLabelText('field_description') as HTMLTextAreaElement;
    expect(descInput.value).toBe('The most popular route.');
  });

  it('pre-fills the first waypoint name from the loaded camino', async () => {
    renderForm();
    await waitForForm();
    const pointNameInput = screen.getByLabelText('point_name') as HTMLInputElement;
    expect(pointNameInput.value).toBe('Saint-Jean-Pied-de-Port');
  });
});

// ── Validation ─────────────────────────────────────────────────────────────────

describe('UpdateCaminoForm — validation', () => {
  it('shows a required error when the name field is cleared and form is submitted', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await waitForForm();

    await user.clear(screen.getByLabelText('field_name'));
    submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('error_name_required');
    });
  });
});

// ── Submission ─────────────────────────────────────────────────────────────────

describe('UpdateCaminoForm — submission', () => {
  it('sends PATCH /caminos/:id with the updated name and existing point', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await waitForForm();

    const nameInput = screen.getByLabelText('field_name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Route Name');
    submitForm();

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        ([, opts]) => (opts as RequestInit)?.method === 'PATCH',
      );
      expect(patchCall).toBeDefined();
      const [patchUrl, patchOpts] = patchCall as [string, RequestInit];
      expect(patchUrl).toContain(`/caminos/${CAMINO_ID}`);
      const body = JSON.parse(patchOpts.body as string) as Record<string, unknown>;
      expect(body.name).toBe('Updated Route Name');
    });
  });

  it('navigates to the camino detail page after a successful update', async () => {
    renderForm();
    await waitForForm();
    submitForm();
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/caminos/${CAMINO_ID}`);
    });
  });

  it('shows a conflict error (409) from the server', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url !== 'string') return Promise.resolve({ ok: false, status: 400 });
      // Must include 'france' so the <select> for country has a valid option
      // and react-hook-form reads a non-empty DOM value, allowing form submit.
      if (url.includes('/countries'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(['france']) });
      if (url.includes('/stages'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/camino-points/search'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (opts?.method === 'PATCH') return Promise.resolve({ ok: false, status: 409 });
      if (url.includes('/caminos/'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(CAMINO_FIXTURE) });
      return Promise.resolve({ ok: false, status: 404 });
    });

    renderForm();
    await waitForForm();
    submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('error_conflict');
    });
  });

  it('shows a forbidden error (403) from the server', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url !== 'string') return Promise.resolve({ ok: false, status: 400 });
      if (url.includes('/countries'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(['france']) });
      if (url.includes('/stages'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/camino-points/search'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (opts?.method === 'PATCH') return Promise.resolve({ ok: false, status: 403 });
      if (url.includes('/caminos/'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(CAMINO_FIXTURE) });
      return Promise.resolve({ ok: false, status: 404 });
    });

    renderForm();
    await waitForForm();
    submitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('error_forbidden');
    });
  });
});

// ── Cancel ─────────────────────────────────────────────────────────────────────

describe('UpdateCaminoForm — cancel', () => {
  it('navigates to the camino detail page when cancel is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await waitForForm();

    await user.click(screen.getByRole('button', { name: 'cancel' }));
    expect(mockPush).toHaveBeenCalledWith(`/caminos/${CAMINO_ID}`);
  });
});

// ── Remove-waypoint authorisation ─────────────────────────────────────────────

describe('UpdateCaminoForm — remove waypoint authorisation', () => {
  it('hides the remove button for a pilgrim who is not the creator and is outside the time window', async () => {
    // User is authenticated as a pilgrim but NOT the creator (user-1) and NOT an owner.
    mockUseKindeBrowserClient.mockReturnValue({
      user: { id: 'other-user' },
      accessToken: { roles: [{ key: 'pilgrim' }] },
      accessTokenEncoded: 'other-token',
    });
    renderForm();
    await waitForForm();

    // The remove button must not be present for an unauthorised pilgrim.
    expect(
      screen.queryByRole('button', { name: 'remove_point' }),
    ).not.toBeInTheDocument();
  });

  it('shows the remove button for the camino creator within the 2-hour window', async () => {
    // user-1 is the creator; CAMINO_FIXTURE.createdAt is set to "now" so they are within the window.
    const recentCreatedAt = new Date().toISOString();
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url !== 'string') return Promise.resolve({ ok: false, status: 400 });
      if (url.includes('/countries'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(['france']) });
      if (url.includes('/camino-points/search'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/stages') && !url.includes('stages/') && opts?.method !== 'PATCH')
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/caminos/'))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...CAMINO_FIXTURE, createdAt: recentCreatedAt }),
        });
      return Promise.resolve({ ok: false, status: 404 });
    });
    mockUseKindeBrowserClient.mockReturnValue({
      user: { id: 'user-1' },
      accessToken: { roles: [{ key: 'pilgrim' }] },
      accessTokenEncoded: 'creator-token',
    });

    renderForm();
    await waitForForm();

    expect(screen.getByRole('button', { name: 'remove_point' })).toBeInTheDocument();
  });
});

// ── Reorder warning dialog ─────────────────────────────────────────────────────

describe('UpdateCaminoForm — reorder warning', () => {
  it('shows a reorder warning when removing a stage pair that has enriched data', async () => {
    // Stage with enriched data between pt-1 and pt-2.
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url !== 'string') return Promise.resolve({ ok: false, status: 400 });
      if (url.includes('/countries'))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['france', 'spain']),
        });
      if (url.includes('/camino-points/search'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (
        url.includes('/stages') &&
        !url.includes('stages/') &&
        opts?.method !== 'PATCH'
      ) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'stage-1',
                stageNumber: 1,
                startPoint: { id: 'pt-1', name: 'A', country: 'france', slug: 'a' },
                endPoint: { id: 'pt-2', name: 'B', country: 'spain', slug: 'b' },
                distance: 25, // has enriched data
                description: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
              },
            ]),
        });
      }
      if (opts?.method === 'PATCH')
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (url.includes('/caminos/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...CAMINO_FIXTURE,
              caminoPoints: [
                {
                  id: 'pt-1',
                  name: 'A',
                  country: 'france',
                  description: null,
                  position: 1,
                },
                {
                  id: 'pt-2',
                  name: 'B',
                  country: 'spain',
                  description: null,
                  position: 2,
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();

    // Wait for the form with 2 points to load.
    await waitFor(() => {
      const nameInputs = screen.getAllByLabelText('point_name');
      expect(nameInputs).toHaveLength(2);
    });

    // Remove the second point — this breaks the existing stage pair pt-1→pt-2.
    const removeButtons = screen.getAllByRole('button', { name: 'remove_point' });
    await user.click(removeButtons[1]!);

    // Submit — should trigger the reorder warning.
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('reorder_warning_title')).toBeInTheDocument();
    });
  });
});
