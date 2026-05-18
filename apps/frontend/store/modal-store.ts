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
  close: (id: string) => void;
  closeAll: () => void;
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
    modal.onDismiss?.();
  },
  closeAll: () => {
    const { modals, close } = get();
    Object.keys(modals).forEach((id) => {
      if (modals[id]?.isOpen) close(id);
    });
  },
}));
