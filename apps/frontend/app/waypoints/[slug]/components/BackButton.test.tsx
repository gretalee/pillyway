import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackButton } from './BackButton';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { useRouter } from 'next/navigation';

const mockPush = vi.fn();

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
  mockPush.mockReset();
  sessionStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('BackButton — rendering', () => {
  it('renders a button with the back_label translation key', () => {
    render(<BackButton />);
    expect(screen.getByRole('button', { name: /back_label/i })).toBeInTheDocument();
  });
});

describe('BackButton — navigation', () => {
  it('calls router.push with the stored navPreviousPath when one is set', async () => {
    sessionStorage.setItem('navPreviousPath', '/waypoints/my-stage');
    const user = userEvent.setup();
    render(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/waypoints/my-stage');
  });

  it('falls back to /caminos when sessionStorage has no navPreviousPath', async () => {
    const user = userEvent.setup();
    render(<BackButton />);
    await user.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/caminos');
  });
});
