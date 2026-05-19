import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Modal } from './modal';
import { useModalStore } from '@/store/modal-store';

// Mock next-intl so the component works without a real IntlProvider.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const MODAL_ID = 'test-modal';

function resetStore() {
  useModalStore.setState({ modals: {} });
}

/**
 * Opens the modal imperatively through the store so we can test the rendered
 * state without needing a trigger button inside the test render.
 */
function openModal() {
  act(() => {
    useModalStore.getState().open(MODAL_ID);
  });
}

describe('Modal', () => {
  beforeEach(() => {
    resetStore();
  });

  it('is not visible before being opened', () => {
    render(
      <Modal id={MODAL_ID} title="Test dialog">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByText('Test dialog')).not.toBeInTheDocument();
  });

  it('renders title and children when opened', async () => {
    render(
      <Modal id={MODAL_ID} title="My Modal">
        <p>Dialog body text</p>
      </Modal>,
    );
    openModal();

    expect(await screen.findByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Dialog body text')).toBeInTheDocument();
  });

  it('renders OK and Cancel buttons only when onOk is provided', async () => {
    render(
      <Modal id={MODAL_ID} title="Confirm" onOk={() => {}}>
        <p>Are you sure?</p>
      </Modal>,
    );
    openModal();

    // Modal i18n keys pass through as the key name itself (mocked useTranslations).
    expect(await screen.findByText('ok')).toBeInTheDocument();
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('does NOT render OK/Cancel buttons when onOk is omitted', async () => {
    render(
      <Modal id={MODAL_ID} title="Info">
        <p>Information only</p>
      </Modal>,
    );
    openModal();

    await screen.findByText('Info');
    expect(screen.queryByText('ok')).not.toBeInTheDocument();
    expect(screen.queryByText('cancel')).not.toBeInTheDocument();
  });

  it('OK button calls onOk then closes without calling onDismiss', async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    const onDismiss = vi.fn();

    render(
      <Modal id={MODAL_ID} title="Confirm" onOk={onOk} onDismiss={onDismiss}>
        <p>Content</p>
      </Modal>,
    );
    openModal();

    await user.click(await screen.findByText('ok'));

    expect(onOk, 'onOk must be called exactly once when OK is clicked').toHaveBeenCalledTimes(1);
    expect(onDismiss, 'onDismiss must NOT be called on the OK path').not.toHaveBeenCalled();
    // Modal should now be closed.
    await waitFor(() =>
      expect(useModalStore.getState().modals[MODAL_ID]?.isOpen).toBe(false),
    );
  });

  it('Cancel button calls dismiss which fires onDismiss, not onOk', async () => {
    const user = userEvent.setup();
    const onOk = vi.fn();
    const onDismiss = vi.fn();

    render(
      <Modal id={MODAL_ID} title="Confirm" onOk={onOk} onDismiss={onDismiss}>
        <p>Content</p>
      </Modal>,
    );
    openModal();

    await user.click(await screen.findByText('cancel'));

    expect(onDismiss, 'onDismiss must be called when Cancel is clicked').toHaveBeenCalledTimes(1);
    expect(onOk, 'onOk must NOT be called on the cancel path').not.toHaveBeenCalled();
    await waitFor(() =>
      expect(useModalStore.getState().modals[MODAL_ID]?.isOpen).toBe(false),
    );
  });

  it('X (close) button calls dismiss which fires onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <Modal id={MODAL_ID} title="Closeable" onDismiss={onDismiss}>
        <p>Content</p>
      </Modal>,
    );
    openModal();

    // The X button is identified by aria-label which resolves to the i18n key "close_aria".
    const closeButton = await screen.findByLabelText('close_aria');
    await user.click(closeButton);

    expect(onDismiss, 'onDismiss must fire when X button is clicked').toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(useModalStore.getState().modals[MODAL_ID]?.isOpen).toBe(false),
    );
  });

  it('stale-closure fix: onOk ref reflects the latest prop without re-mounting', async () => {
    const user = userEvent.setup();
    const firstCallback = vi.fn();
    const laterCallback = vi.fn();

    const { rerender } = render(
      <Modal id={MODAL_ID} title="Ref test" onOk={firstCallback}>
        <p>Content</p>
      </Modal>,
    );
    openModal();

    // Update the prop AFTER the modal is already registered.
    rerender(
      <Modal id={MODAL_ID} title="Ref test" onOk={laterCallback}>
        <p>Content</p>
      </Modal>,
    );

    await user.click(await screen.findByText('ok'));

    expect(laterCallback, 'latest onOk must be called, not the stale first one').toHaveBeenCalledTimes(1);
    expect(firstCallback, 'stale first callback must NOT be called').not.toHaveBeenCalled();
  });
});
