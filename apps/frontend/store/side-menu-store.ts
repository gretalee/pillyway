import { create } from 'zustand';
import type { OffCanvasSide } from '@/app/components/ui/SideMenu/OffCanvas';

interface SideMenuStore {
  openId: string | null;
  openSide: OffCanvasSide | null;
  /** Each SideMenu registers its own side once on mount — the single source
   * of truth for which way it pushes content — so callers of `open`/`toggle`
   * (e.g. header trigger buttons) only ever need the `id`. */
  sides: Record<string, OffCanvasSide>;
  registerSide: (id: string, side: OffCanvasSide) => void;
  open: (id: string) => void;
  close: (id: string) => void;
  toggle: (id: string) => void;
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
export const useSideMenuStore = create<SideMenuStore>()((set, get) => ({
  openId: null,
  openSide: null,
  sides: {},
  registerSide: (id, side) =>
    set((state) => (state.sides[id] === side ? state : { sides: { ...state.sides, [id]: side } })),
  open: (id) => set({ openId: id, openSide: get().sides[id] ?? 'left' }),
  close: (id) =>
    set((state) => (state.openId === id ? { openId: null, openSide: null } : state)),
  toggle: (id) =>
    set((state) =>
      state.openId === id
        ? { openId: null, openSide: null }
        : { openId: id, openSide: state.sides[id] ?? 'left' },
    ),
}));
