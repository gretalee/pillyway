import { create } from 'zustand';
import type { OffCanvasSide } from '@/app/components/ui/SideMenu/OffCanvas';

interface SideMenuStore {
  openId: string | null;
  openSide: OffCanvasSide | null;
  open: (id: string, side: OffCanvasSide) => void;
  close: (id: string) => void;
  toggle: (id: string, side: OffCanvasSide) => void;
}

/**
 * Shared open/closed state for every SideMenu instance in the app, keyed by
 * `id`. Only one can be open at a time — the pushed page content can only
 * slide toward a single side at once — so opening one implicitly closes
 * whichever was open before. Lives outside SideMenu itself because the
 * content viewport (SideMenuViewport, which transforms the rest of the site)
 * is a sibling of the trigger/panel components in the root layout, not a
 * descendant of any single SideMenu.
 */
export const useSideMenuStore = create<SideMenuStore>()((set) => ({
  openId: null,
  openSide: null,
  open: (id, side) => set({ openId: id, openSide: side }),
  close: (id) =>
    set((state) => (state.openId === id ? { openId: null, openSide: null } : state)),
  toggle: (id, side) =>
    set((state) =>
      state.openId === id
        ? { openId: null, openSide: null }
        : { openId: id, openSide: side },
    ),
}));
