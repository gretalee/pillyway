import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useModalStore } from './modal-store';

// Access the store imperatively — no React rendering required for a plain
// Zustand store. Reset state between tests by calling the Zustand internal.

function resetStore() {
  useModalStore.setState({ modals: {} });
}

describe('modal-store', () => {
  beforeEach(() => {
    resetStore();
  });

  // ---------- register & open ----------

  it('register creates the modal entry with isOpen=false', () => {
    useModalStore.getState().register('dialog-1');
    const state = useModalStore.getState();
    expect(state.modals['dialog-1'], 'modal entry must exist after register').toBeDefined();
    expect(state.modals['dialog-1']?.isOpen).toBe(false);
  });

  it('register preserves isOpen when called on an already-open modal', () => {
    const { register, open } = useModalStore.getState();
    register('dialog-a');
    open('dialog-a');
    // Re-register (simulates re-render updating callbacks).
    register('dialog-a');
    expect(useModalStore.getState().modals['dialog-a']?.isOpen).toBe(true);
  });

  it('open sets isOpen=true for a registered modal', () => {
    const { register, open } = useModalStore.getState();
    register('dialog-2');
    open('dialog-2');
    expect(useModalStore.getState().modals['dialog-2']?.isOpen).toBe(true);
  });

  it('open is a no-op for an unregistered modal', () => {
    useModalStore.getState().open('nonexistent');
    // State must remain empty — no entry should have been created.
    expect(useModalStore.getState().modals['nonexistent']).toBeUndefined();
  });

  // ---------- close ----------

  it('close sets isOpen=false without calling any callback', () => {
    const onOk = vi.fn();
    const onDismiss = vi.fn();
    const { register, open, close } = useModalStore.getState();

    register('dialog-3', onOk, onDismiss);
    open('dialog-3');
    close('dialog-3');

    const modal = useModalStore.getState().modals['dialog-3'];
    expect(modal?.isOpen).toBe(false);
    expect(onOk, 'close must NOT call onOk').not.toHaveBeenCalled();
    expect(onDismiss, 'close must NOT call onDismiss').not.toHaveBeenCalled();
  });

  it('close is a no-op when modal is already closed', () => {
    const onDismiss = vi.fn();
    const { register, close } = useModalStore.getState();

    register('dialog-already-closed', undefined, onDismiss);
    // isOpen is false by default after register.
    close('dialog-already-closed');

    expect(onDismiss, 'close on closed modal must not call onDismiss').not.toHaveBeenCalled();
    expect(useModalStore.getState().modals['dialog-already-closed']?.isOpen).toBe(false);
  });

  // ---------- dismiss ----------

  it('dismiss sets isOpen=false AND calls onDismiss', () => {
    const onDismiss = vi.fn();
    const { register, open, dismiss } = useModalStore.getState();

    register('dialog-4', undefined, onDismiss);
    open('dialog-4');
    dismiss('dialog-4');

    expect(useModalStore.getState().modals['dialog-4']?.isOpen).toBe(false);
    expect(onDismiss, 'dismiss must call onDismiss exactly once').toHaveBeenCalledTimes(1);
  });

  it('dismiss does NOT call onOk', () => {
    const onOk = vi.fn();
    const { register, open, dismiss } = useModalStore.getState();

    register('dialog-5', onOk, undefined);
    open('dialog-5');
    dismiss('dialog-5');

    expect(onOk, 'dismiss must NOT call onOk').not.toHaveBeenCalled();
  });

  it('dismiss is a no-op when modal is already closed', () => {
    const onDismiss = vi.fn();
    const { register, dismiss } = useModalStore.getState();

    register('dialog-noop', undefined, onDismiss);
    dismiss('dialog-noop');

    expect(onDismiss, 'dismiss on closed modal must not call onDismiss').not.toHaveBeenCalled();
  });

  it('dismiss works when no onDismiss callback was registered', () => {
    const { register, open, dismiss } = useModalStore.getState();

    register('dialog-no-cb');
    open('dialog-no-cb');
    // Must not throw even with no callback registered.
    expect(() => dismiss('dialog-no-cb')).not.toThrow();
    expect(useModalStore.getState().modals['dialog-no-cb']?.isOpen).toBe(false);
  });

  // ---------- dismissAll ----------

  it('dismissAll closes all open modals and calls their onDismiss callbacks', () => {
    const onDismissA = vi.fn();
    const onDismissB = vi.fn();
    const { register, open, dismissAll } = useModalStore.getState();

    register('modal-a', undefined, onDismissA);
    register('modal-b', undefined, onDismissB);
    open('modal-a');
    open('modal-b');

    dismissAll();

    const state = useModalStore.getState();
    expect(state.modals['modal-a']?.isOpen).toBe(false);
    expect(state.modals['modal-b']?.isOpen).toBe(false);
    expect(onDismissA, 'dismissAll must fire onDismiss for modal-a').toHaveBeenCalledTimes(1);
    expect(onDismissB, 'dismissAll must fire onDismiss for modal-b').toHaveBeenCalledTimes(1);
  });

  it('dismissAll ignores already-closed modals', () => {
    const onDismiss = vi.fn();
    const { register, open, dismissAll } = useModalStore.getState();

    register('open-modal', undefined, onDismiss);
    register('closed-modal', undefined, onDismiss);
    open('open-modal');
    // 'closed-modal' stays closed.

    dismissAll();

    expect(onDismiss, 'onDismiss must fire only for the open modal').toHaveBeenCalledTimes(1);
  });

  // ---------- close vs dismiss semantic distinction ----------

  it('close is the OK path — onDismiss is never called', () => {
    const onDismiss = vi.fn();
    const { register, open, close } = useModalStore.getState();

    register('ok-path-modal', undefined, onDismiss);
    open('ok-path-modal');
    close('ok-path-modal');

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismiss is the cancel/escape path — onDismiss IS called', () => {
    const onDismiss = vi.fn();
    const { register, open, dismiss } = useModalStore.getState();

    register('cancel-path-modal', undefined, onDismiss);
    open('cancel-path-modal');
    dismiss('cancel-path-modal');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
