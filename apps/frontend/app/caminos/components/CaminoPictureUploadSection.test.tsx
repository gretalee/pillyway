import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaminoPictureUploadSection } from './CaminoPictureUploadSection';

// ── next/image mock ────────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  // Strip next/image-specific props that are not valid on a plain <img> element.
  default: ({ fill: _fill, sizes: _sizes, ...rest }: { fill?: boolean; sizes?: string; src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...rest} />
  ),
}));

// ── i18n mock ──────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ── Kinde mock (default — overridden per test) ─────────────────────────────────
const mockUseKindeBrowserClient = vi.fn();
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: () => mockUseKindeBrowserClient(),
}));

// ── Hook mocks ─────────────────────────────────────────────────────────────────
const mockUseCaminoPictures = vi.fn();
vi.mock('@/app/api/camino-pictures/use-camino-pictures', () => ({
  useCaminoPictures: (...args: unknown[]) => mockUseCaminoPictures(...args),
}));

const mockUploadMutate = vi.fn();
const mockUseUploadCaminoPicture = vi.fn();
vi.mock('@/app/api/camino-pictures/use-upload-camino-picture', () => ({
  useUploadCaminoPicture: (...args: unknown[]) => mockUseUploadCaminoPicture(...args),
}));

const mockDeleteMutate = vi.fn();
const mockUseDeleteCaminoPicture = vi.fn();
vi.mock('@/app/api/camino-pictures/use-delete-camino-picture', () => ({
  useDeleteCaminoPicture: (...args: unknown[]) => mockUseDeleteCaminoPicture(...args),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePicture(
  overrides: Partial<{
    id: string;
    url: string;
    uploadedBy: string;
    position: number;
    label: string | null;
    createdAt: string;
  }> = {},
) {
  return {
    id: 'pic-1',
    url: 'http://storage/pic.jpg',
    uploadedBy: 'user-a',
    position: 1,
    label: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderSection(caminoId = 'camino-1') {
  render(
    <QueryClientProvider client={makeClient()}>
      <CaminoPictureUploadSection caminoId={caminoId} />
    </QueryClientProvider>,
  );
}

/** Kinde identity helpers */
function kindeNonPilgrim(userId = 'user-a') {
  return {
    user: { id: userId },
    accessToken: { roles: [] },
  };
}

function kindePilgrim(userId = 'user-a') {
  return {
    user: { id: userId },
    accessToken: {
      roles: [{ key: 'pilgrim', id: 'r1', name: 'Pilgrim' }],
    },
  };
}

function kindePilgrimOwner(userId = 'user-a') {
  return {
    user: { id: userId },
    accessToken: {
      roles: [
        { key: 'pilgrim', id: 'r1', name: 'Pilgrim' },
        { key: 'owner', id: 'r2', name: 'Owner' },
      ],
    },
  };
}

/** Default upload/delete mutation stubs */
function defaultUploadMutation() {
  return { mutate: mockUploadMutate, isPending: false, variables: undefined };
}

function defaultDeleteMutation() {
  return { mutate: mockDeleteMutate, isPending: false };
}

// ── Setup / Teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseCaminoPictures.mockReturnValue({ data: { primary: null, gallery: [] } });
  mockUseUploadCaminoPicture.mockReturnValue(defaultUploadMutation());
  mockUseDeleteCaminoPicture.mockReturnValue(defaultDeleteMutation());
  mockUseKindeBrowserClient.mockReturnValue(kindeNonPilgrim());
});

afterEach(() => vi.restoreAllMocks());

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CaminoPictureUploadSection', () => {
  // ── Role gating: upload controls ──────────────────────────────────────────

  it('does not render upload buttons for a non-pilgrim user', () => {
    mockUseKindeBrowserClient.mockReturnValue(kindeNonPilgrim());
    renderSection();
    // Both upload buttons should be absent
    expect(screen.queryByText('upload_main')).not.toBeInTheDocument();
    expect(screen.queryByText('upload_gallery')).not.toBeInTheDocument();
  });

  // ── Role gating: delete button for non-pilgrim ────────────────────────────

  it('does not show a delete button for a non-pilgrim even if they uploaded the picture', () => {
    mockUseKindeBrowserClient.mockReturnValue(kindeNonPilgrim('user-a'));
    // Picture was uploaded by the same user — but role check must still block delete
    mockUseCaminoPictures.mockReturnValue({
      data: { primary: makePicture({ uploadedBy: 'user-a' }), gallery: [] },
    });
    renderSection();
    expect(screen.queryByRole('button', { name: 'delete' })).not.toBeInTheDocument();
  });

  // ── Role gating: pilgrim sees delete for own picture ──────────────────────

  it('shows a delete button for a pilgrim who uploaded the picture', () => {
    mockUseKindeBrowserClient.mockReturnValue(kindePilgrim('user-a'));
    mockUseCaminoPictures.mockReturnValue({
      data: { primary: makePicture({ uploadedBy: 'user-a' }), gallery: [] },
    });
    renderSection();
    expect(screen.getByRole('button', { name: 'delete' })).toBeInTheDocument();
  });

  // ── Role gating: pilgrim does NOT see delete for others' picture ──────────

  it('does not show a delete button for a pilgrim viewing a picture uploaded by someone else', () => {
    mockUseKindeBrowserClient.mockReturnValue(kindePilgrim('user-a'));
    mockUseCaminoPictures.mockReturnValue({
      data: { primary: makePicture({ uploadedBy: 'user-b' }), gallery: [] },
    });
    renderSection();
    expect(screen.queryByRole('button', { name: 'delete' })).not.toBeInTheDocument();
  });

  // ── Role gating: owner sees delete for any picture ────────────────────────

  it('shows a delete button for an owner (pilgrim + owner) even for pictures uploaded by other users', () => {
    mockUseKindeBrowserClient.mockReturnValue(kindePilgrimOwner('user-a'));
    mockUseCaminoPictures.mockReturnValue({
      data: { primary: makePicture({ uploadedBy: 'user-b' }), gallery: [] },
    });
    renderSection();
    expect(screen.getByRole('button', { name: 'delete' })).toBeInTheDocument();
  });

  // ── 422 error mapping ─────────────────────────────────────────────────────

  it('shows the limit_reached message when the upload mutation errors with status 422', async () => {
    mockUseKindeBrowserClient.mockReturnValue(kindePilgrim('user-a'));
    // No primary yet so the "upload main" button is visible
    mockUseCaminoPictures.mockReturnValue({ data: { primary: null, gallery: [] } });

    // Stub mutate to immediately call onError with a 422-like error object
    const fakeError = Object.assign(new Error('Unprocessable'), { status: 422 });
    mockUseUploadCaminoPicture.mockReturnValue({
      ...defaultUploadMutation(),
      mutate: vi.fn(
        (_payload: unknown, callbacks?: { onError?: (err: unknown) => void }) => {
          callbacks?.onError?.(fakeError);
        },
      ),
    });

    renderSection();

    // Grab the hidden file input for the primary picture upload
    const fileInput = document
      .querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput, 'primary file input must be in the DOM').toBeTruthy();

    const dummyFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('limit_reached');
    });
  });
});
