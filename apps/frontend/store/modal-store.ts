import { create } from 'zustand';

interface ModalInstance {
  id: string;
  isOpen: boolean;
  onOk?: () => void;
  onDismiss?: () => void;
}

interface ModalStore {
  modals: Record<string, ModalInstance>;
  register: (id: string, onOk?: () => void, onDismiss?: () => void) => void;
  open: (id: string) => void;
  /** Close without invoking any callback — use for the OK/confirm path. */
  close: (id: string) => void;
  /** Close and invoke onDismiss — use for cancel, backdrop click, and escape. */
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useModalStore = create<ModalStore>()((set, get) => ({
  modals: {},

  register: (id, onOk, onDismiss) =>
    set((state) => ({
      modals: {
        ...state.modals,
        [id]: { id, isOpen: state.modals[id]?.isOpen ?? false, onOk, onDismiss },
      },
    })),

  open: (id) =>
    set((state) => {
      const existing = state.modals[id];
      if (!existing) return state;
      return { modals: { ...state.modals, [id]: { ...existing, isOpen: true } } };
    }),

  close: (id) => {
    const modal = get().modals[id];
    if (!modal?.isOpen) return;
    set((state) => ({
      modals: { ...state.modals, [id]: { ...state.modals[id]!, isOpen: false } },
    }));
  },

  dismiss: (id) => {
    const modal = get().modals[id];
    if (!modal?.isOpen) return;
    set((state) => ({
      modals: { ...state.modals, [id]: { ...state.modals[id]!, isOpen: false } },
    }));
    modal.onDismiss?.();
  },

  dismissAll: () => {
    const { modals, dismiss } = get();
    Object.keys(modals).forEach((id) => {
      if (modals[id]?.isOpen) dismiss(id);
    });
  },
}));
