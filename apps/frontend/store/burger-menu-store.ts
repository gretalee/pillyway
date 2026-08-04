import { create } from 'zustand';

interface BurgerMenuStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/**
 * Shared open/closed state for the push-style burger menu. Needs to live
 * outside BurgerMenu itself because the page-shift wrapper (which transforms
 * the rest of the site) is a sibling of the header in the root layout, not a
 * descendant of BurgerMenu.
 */
export const useBurgerMenuStore = create<BurgerMenuStore>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
