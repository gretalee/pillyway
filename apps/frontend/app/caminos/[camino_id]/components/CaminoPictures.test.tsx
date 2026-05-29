import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaminoPictures } from './CaminoPictures';

// ── Hook mocks ────────────────────────────────────────────────────────────────

vi.mock('@/app/api/camino-pictures/use-camino-pictures', () => ({
  useCaminoPictures: vi.fn(),
}));

vi.mock('@/app/api/camino-pictures/use-upload-camino-picture', () => ({
  useUploadCaminoPicture: vi.fn(),
}));

vi.mock('@/app/api/camino-pictures/use-upload-camino-pictures', () => ({
  useUploadCaminoPictures: vi.fn(),
}));

vi.mock('@/app/api/camino-pictures/use-delete-camino-picture', () => ({
  useDeleteCaminoPicture: vi.fn(),
}));

vi.mock('@/app/api/camino-pictures/use-update-camino-picture', () => ({
  useUpdateCaminoPicture: vi.fn(),
}));

vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock('./Lightbox', () => ({
  Lightbox: () => null,
}));

// ── Named imports after mocks ─────────────────────────────────────────────────

import { useCaminoPictures } from '@/app/api/camino-pictures/use-camino-pictures';
import { useUploadCaminoPicture } from '@/app/api/camino-pictures/use-upload-camino-picture';
import { useUploadCaminoPictures } from '@/app/api/camino-pictures/use-upload-camino-pictures';
import { useDeleteCaminoPicture } from '@/app/api/camino-pictures/use-delete-camino-picture';
import { useUpdateCaminoPicture } from '@/app/api/camino-pictures/use-update-camino-picture';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGalleryPicture(overrides = {}) {
  return {
    id: 'pic-1',
    url: 'http://storage/pic.jpg',
    uploadedBy: 'user-a',
    position: 1,
    label: null as string | null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderGallery(caminoId = 'camino-1') {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }>
      <CaminoPictures caminoId={caminoId} section="gallery" />
    </QueryClientProvider>,
  );
}

// ── Default mock setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useCaminoPictures).mockReturnValue({ data: { primary: null, gallery: [] } } as any);
  vi.mocked(useUploadCaminoPicture).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  vi.mocked(useUploadCaminoPictures).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  vi.mocked(useDeleteCaminoPicture).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  vi.mocked(useUpdateCaminoPicture).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  vi.mocked(useKindeBrowserClient).mockReturnValue({
    user: { id: 'user-a' },
    accessToken: { roles: [{ key: 'pilgrim', id: 'r1', name: 'Pilgrim' }] },
  } as any);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaminoPictures — gallery section', () => {
  it('shows the pencil edit button for a pilgrim who uploaded the picture', () => {
    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture({ uploadedBy: 'user-a' })] },
    } as any);

    renderGallery();

    expect(screen.getByRole('button', { name: 'edit_label' })).toBeInTheDocument();
  });

  it('does not show the pencil edit button for a user without the pilgrim role', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      user: { id: 'user-a' },
      accessToken: { roles: [] },
    } as any);

    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture({ uploadedBy: 'user-a' })] },
    } as any);

    renderGallery();

    expect(screen.queryByRole('button', { name: 'edit_label' })).not.toBeInTheDocument();
  });

  it('clicking the pencil shows an inline input pre-filled with the current label', async () => {
    const user = userEvent.setup();

    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture({ label: 'My caption' })] },
    } as any);

    renderGallery();

    await user.click(screen.getByRole('button', { name: 'edit_label' }));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('My caption');
  });

  it('pressing Escape cancels editing without calling the update mutate', async () => {
    const user = userEvent.setup();
    const mockUpdateMutate = vi.fn();

    vi.mocked(useUpdateCaminoPicture).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);

    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture()] },
    } as any);

    renderGallery();

    await user.click(screen.getByRole('button', { name: 'edit_label' }));
    await screen.findByRole('textbox');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it('pressing Enter triggers the update mutation with the trimmed label', async () => {
    const user = userEvent.setup();
    const mockUpdateMutate = vi.fn();

    vi.mocked(useUpdateCaminoPicture).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);

    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture({ id: 'pic-1' })] },
    } as any);

    renderGallery();

    await user.click(screen.getByRole('button', { name: 'edit_label' }));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New caption');
    await user.keyboard('{Enter}');

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { pictureId: 'pic-1', label: 'New caption' },
      expect.anything(),
    );
  });

  it('pressing Enter with an empty input sends null to clear the label', async () => {
    const user = userEvent.setup();
    const mockUpdateMutate = vi.fn();

    vi.mocked(useUpdateCaminoPicture).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as any);

    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture({ id: 'pic-1', label: 'old' })] },
    } as any);

    renderGallery();

    await user.click(screen.getByRole('button', { name: 'edit_label' }));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { pictureId: 'pic-1', label: null },
      expect.anything(),
    );
  });

  it('renders the existing label as text below the thumbnail', () => {
    vi.mocked(useCaminoPictures).mockReturnValue({
      data: { primary: null, gallery: [makeGalleryPicture({ label: 'Beautiful view' })] },
    } as any);

    renderGallery();

    expect(screen.getByText('Beautiful view')).toBeInTheDocument();
  });

  it('shows the limit_reached message when the gallery upload returns a 422', async () => {
    vi.mocked(useUploadCaminoPictures).mockReturnValue({
      mutate: (_files: unknown, options: { onError?: (err: Error & { status?: number }) => void }) => {
        const err = Object.assign(new Error('Unprocessable'), { status: 422 });
        options?.onError?.(err);
      },
      isPending: false,
    } as any);

    renderGallery();

    // Trigger the file input's onChange handler directly — jsdom does not open
    // a native file picker, so we skip the button click and fire change on the
    // hidden input directly.
    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    expect(fileInput, 'gallery file input must exist').toBeTruthy();

    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] },
    });

    await waitFor(() => expect(screen.getByText('limit_reached')).toBeInTheDocument());
  });
});
