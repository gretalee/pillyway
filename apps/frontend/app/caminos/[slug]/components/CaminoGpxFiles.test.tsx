import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaminoGpxFiles } from './CaminoGpxFiles';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/app/api/camino-gpx-files/use-camino-gpx-files', () => ({
  useCaminoGpxFiles: vi.fn(),
}));

vi.mock('@/app/api/camino-gpx-files/use-upload-camino-gpx-file', () => ({
  useUploadCaminoGpxFile: vi.fn(),
}));

vi.mock('@/app/api/camino-gpx-files/use-delete-camino-gpx-file', () => ({
  useDeleteCaminoGpxFile: vi.fn(),
}));

vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/components/ui/modal', () => ({
  Modal: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="modal" data-title={title}>{children}</div>
  ),
}));

vi.mock('@/store/modal-store', () => ({
  useModalStore: (selector: (s: { open: () => void; close: () => void; register: () => void }) => unknown) =>
    selector({ open: vi.fn(), close: vi.fn(), register: vi.fn() }),
}));

// Named imports after mocks
import { useCaminoGpxFiles } from '@/app/api/camino-gpx-files/use-camino-gpx-files';
import { useUploadCaminoGpxFile } from '@/app/api/camino-gpx-files/use-upload-camino-gpx-file';
import { useDeleteCaminoGpxFile } from '@/app/api/camino-gpx-files/use-delete-camino-gpx-file';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

// ── Constants ─────────────────────────────────────────────────────────────────

const CAMINO_ID = 'camino-1';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function makeFile(overrides = {}) {
  return {
    id: 'gpx-file-1',
    caminoId: CAMINO_ID,
    uploadedBy: 'kinde-user-001',
    uploaderName: 'Alice',
    fileName: 'my-track',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderComponent(caminoId = CAMINO_ID) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <CaminoGpxFiles caminoId={caminoId} />
    </QueryClientProvider>,
  );
}

// ── Default mock setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useCaminoGpxFiles).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useCaminoGpxFiles>);
  vi.mocked(useUploadCaminoGpxFile).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUploadCaminoGpxFile>);
  vi.mocked(useDeleteCaminoGpxFile).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useDeleteCaminoGpxFile>);
  vi.mocked(useKindeBrowserClient).mockReturnValue({
    user: null,
    accessToken: null,
  } as unknown as ReturnType<typeof useKindeBrowserClient>);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaminoGpxFiles', () => {
  it('renders "Download GPX" button for unauthenticated users', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: 'download_button' })).toBeInTheDocument();
  });

  it('does NOT render "Upload GPX" button for unauthenticated users', () => {
    renderComponent();

    expect(screen.queryByRole('button', { name: 'upload_button' })).not.toBeInTheDocument();
  });

  it('renders "Upload GPX" button for users with the pilgrim role', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      user: { id: 'kinde-user-001' },
      accessToken: { roles: [{ key: 'pilgrim', id: 'r1', name: 'Pilgrim' }] },
    } as unknown as ReturnType<typeof useKindeBrowserClient>);

    renderComponent();

    expect(screen.getByRole('button', { name: 'upload_button' })).toBeInTheDocument();
  });

  it('shows empty-state text when file list is empty (modal must be open)', () => {
    // The modal content renders even when closed in the DOM (via Portal), so we can query it.
    vi.mocked(useCaminoGpxFiles).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    expect(screen.getByText('empty_state')).toBeInTheDocument();
  });

  it('shows file list when hook returns data', () => {
    vi.mocked(useCaminoGpxFiles).mockReturnValue({
      data: [makeFile()],
    } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    expect(screen.getByText('my-track')).toBeInTheDocument();
  });

  it('download link points to backend proxy URL (not direct S3)', () => {
    vi.mocked(useCaminoGpxFiles).mockReturnValue({
      data: [makeFile({ id: 'gpx-file-1' })],
    } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    const link = screen.getByRole('link', { name: 'my-track' });
    expect(link).toHaveAttribute(
      'href',
      `${API_URL}/caminos/${CAMINO_ID}/gpx-files/gpx-file-1/download`,
    );
  });

  it('download link does not have a "download" attribute', () => {
    vi.mocked(useCaminoGpxFiles).mockReturnValue({
      data: [makeFile()],
    } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    const link = screen.getByRole('link', { name: 'my-track' });
    expect(link).not.toHaveAttribute('download');
  });

  it('uploaderName is rendered as text, not via dangerouslySetInnerHTML', () => {
    vi.mocked(useCaminoGpxFiles).mockReturnValue({
      data: [makeFile({ uploaderName: '<script>xss</script>' })],
    } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    // Verify no script element was injected (queryByRole('script') is always null
    // because <script> has no ARIA role — check the DOM directly instead)
    expect(document.body.querySelector('script[type="text/javascript"]')).toBeNull();
    expect(document.body.querySelector('script:not([type])')).toBeNull();
    expect(screen.getByText('<script>xss</script>', { exact: false })).toBeInTheDocument();
  });

  it('delete button is visible when canDeleteGpxFile returns true (uploader)', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      user: { id: 'kinde-user-001' },
      accessToken: { roles: [{ key: 'pilgrim', id: 'r1', name: 'Pilgrim' }] },
    } as unknown as ReturnType<typeof useKindeBrowserClient>);

    vi.mocked(useCaminoGpxFiles).mockReturnValue({
      data: [makeFile({ uploadedBy: 'kinde-user-001' })],
    } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    expect(screen.getByRole('button', { name: 'delete_confirm_title' })).toBeInTheDocument();
  });

  it('delete button is NOT visible when canDeleteGpxFile returns false', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      user: { id: 'kinde-user-002' },
      accessToken: { roles: [{ key: 'pilgrim', id: 'r1', name: 'Pilgrim' }] },
    } as unknown as ReturnType<typeof useKindeBrowserClient>);

    vi.mocked(useCaminoGpxFiles).mockReturnValue({
      data: [makeFile({ uploadedBy: 'kinde-user-001' })], // different uploader
    } as unknown as ReturnType<typeof useCaminoGpxFiles>);

    renderComponent();

    expect(screen.queryByRole('button', { name: 'delete_confirm_title' })).not.toBeInTheDocument();
  });
});
