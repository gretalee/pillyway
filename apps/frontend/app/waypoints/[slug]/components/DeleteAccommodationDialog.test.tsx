import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccommodationDialog } from './DeleteAccommodationDialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const originalConsoleError = console.error.bind(console);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation((message: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('not wrapped in act')) return;
    originalConsoleError(message, ...args);
  });
});

afterEach(() => vi.restoreAllMocks());

function renderDialog({
  name = 'Albergue Sol',
  open = true,
  isPending = false,
  onOpenChange = vi.fn(),
  onConfirm = vi.fn(),
} = {}) {
  render(
    <DeleteAccommodationDialog
      name={name}
      open={open}
      isPending={isPending}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />,
  );
}

describe('DeleteAccommodationDialog — visibility', () => {
  it('does not render content when open=false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('delete_confirmation_title')).not.toBeInTheDocument();
  });

  it('renders title and cancel/confirm buttons when open=true', () => {
    renderDialog({ open: true });
    expect(screen.getByText('delete_confirmation_title')).toBeInTheDocument();
    expect(screen.getByText('delete_cancel_action')).toBeInTheDocument();
    expect(screen.getByText('delete_confirm_action')).toBeInTheDocument();
  });
});

describe('DeleteAccommodationDialog — cancel', () => {
  it('calls onOpenChange(false) when the cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });
    await user.click(screen.getByText('delete_cancel_action'));
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });
});

describe('DeleteAccommodationDialog — confirm', () => {
  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm });
    await user.click(screen.getByText('delete_confirm_action'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('DeleteAccommodationDialog — pending state', () => {
  it('disables both buttons when isPending=true', () => {
    renderDialog({ isPending: true });
    const cancelBtn = screen.getByText('delete_cancel_action').closest('button');
    const confirmBtn = screen.getByText('delete_confirm_action').closest('button');
    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();
  });
});
