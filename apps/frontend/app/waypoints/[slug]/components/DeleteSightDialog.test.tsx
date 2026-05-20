import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteSightDialog } from './DeleteSightDialog';

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
  name = 'Catedral de Santiago',
  open = true,
  isPending = false,
  error = null as string | null,
  onOpenChange = vi.fn(),
  onConfirm = vi.fn(),
} = {}) {
  render(
    <DeleteSightDialog
      name={name}
      open={open}
      isPending={isPending}
      error={error}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />,
  );
}

describe('DeleteSightDialog — visibility', () => {
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

describe('DeleteSightDialog — cancel', () => {
  it('calls onOpenChange(false) when the cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });
    await user.click(screen.getByText('delete_cancel_action'));
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });
});

describe('DeleteSightDialog — confirm', () => {
  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm });
    await user.click(screen.getByText('delete_confirm_action'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('DeleteSightDialog — pending state', () => {
  it('disables both buttons when isPending=true', () => {
    renderDialog({ isPending: true });
    const cancelBtn = screen.getByText('delete_cancel_action').closest('button');
    const confirmBtn = screen.getByText('delete_confirm_action').closest('button');
    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();
  });
});
