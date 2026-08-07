import { describe, it, expect, beforeEach } from 'vitest';

import { useSideMenuStore } from './side-menu-store';

// Access the store imperatively — no React rendering required for a plain
// Zustand store. Reset state between tests by calling the Zustand internal.

function resetStore() {
  useSideMenuStore.setState({ openId: null, openSide: null, sides: {} });
}

describe('side-menu-store', () => {
  beforeEach(() => {
    resetStore();
  });

  // ---------- initial state ----------

  it('starts with nothing open and no registered sides', () => {
    const state = useSideMenuStore.getState();
    expect(state.openId).toBeNull();
    expect(state.openSide).toBeNull();
    expect(state.sides).toEqual({});
  });

  // ---------- registerSide ----------

  it('registerSide records the side for an id', () => {
    useSideMenuStore.getState().registerSide('menu-a', 'right');
    expect(useSideMenuStore.getState().sides['menu-a']).toBe('right');
  });

  it('registerSide with the same side again does not create a new sides object', () => {
    useSideMenuStore.getState().registerSide('menu-a', 'right');
    const sidesBefore = useSideMenuStore.getState().sides;

    useSideMenuStore.getState().registerSide('menu-a', 'right');

    expect(
      useSideMenuStore.getState().sides,
      're-registering the same side must be a no-op (same object reference), so it never triggers extra renders',
    ).toBe(sidesBefore);
  });

  it('registerSide with a different side updates it and creates a new sides object', () => {
    useSideMenuStore.getState().registerSide('menu-a', 'left');
    const sidesBefore = useSideMenuStore.getState().sides;

    useSideMenuStore.getState().registerSide('menu-a', 'top');

    expect(useSideMenuStore.getState().sides['menu-a']).toBe('top');
    expect(useSideMenuStore.getState().sides).not.toBe(sidesBefore);
  });

  it('registerSide corrects openSide when the registering id is the one currently open', () => {
    // Regression guard: if a menu's side changes (or it re-registers) while
    // it's the open one, openSide must move with it — otherwise SideSlider
    // keeps pushing the stale direction (e.g. a right-side panel with a
    // left push).
    const { registerSide, open } = useSideMenuStore.getState();
    registerSide('menu-a', 'left');
    open('menu-a');
    expect(useSideMenuStore.getState().openSide).toBe('left');

    registerSide('menu-a', 'right');

    const state = useSideMenuStore.getState();
    expect(state.openSide, 'openSide must follow the newly-registered side for the open menu').toBe(
      'right',
    );
    expect(state.sides['menu-a']).toBe('right');
  });

  it('registerSide does NOT touch openSide when a different menu is the one currently open', () => {
    const { registerSide, open } = useSideMenuStore.getState();
    registerSide('menu-a', 'left');
    registerSide('menu-b', 'top');
    open('menu-a');

    registerSide('menu-b', 'right');

    expect(
      useSideMenuStore.getState().openSide,
      're-registering a menu that is not the open one must not affect openSide',
    ).toBe('left');
  });

  // ---------- open ----------

  it('open sets openId and openSide from the registered side', () => {
    const { registerSide, open } = useSideMenuStore.getState();
    registerSide('burger', 'left');
    open('burger');

    const state = useSideMenuStore.getState();
    expect(state.openId).toBe('burger');
    expect(state.openSide).toBe('left');
  });

  it('open falls back to "left" for a never-registered id', () => {
    useSideMenuStore.getState().open('unregistered-menu');

    const state = useSideMenuStore.getState();
    expect(state.openId).toBe('unregistered-menu');
    expect(state.openSide, 'unregistered menus must default to left, never crash or stay null').toBe(
      'left',
    );
  });

  it('opening a second menu replaces the first — only one can be open at a time', () => {
    const { registerSide, open } = useSideMenuStore.getState();
    registerSide('left-menu', 'left');
    registerSide('bottom-menu', 'bottom');

    open('left-menu');
    open('bottom-menu');

    const state = useSideMenuStore.getState();
    expect(state.openId, 'opening a second menu must close the first').toBe('bottom-menu');
    expect(state.openSide).toBe('bottom');
  });

  // ---------- close ----------

  it('close clears openId/openSide when the given id is the one open', () => {
    const { registerSide, open, close } = useSideMenuStore.getState();
    registerSide('menu-a', 'right');
    open('menu-a');

    close('menu-a');

    const state = useSideMenuStore.getState();
    expect(state.openId).toBeNull();
    expect(state.openSide).toBeNull();
  });

  it('close is a no-op if a different menu is currently open', () => {
    const { registerSide, open, close } = useSideMenuStore.getState();
    registerSide('menu-a', 'left');
    registerSide('menu-b', 'right');
    open('menu-a');

    close('menu-b');

    expect(
      useSideMenuStore.getState().openId,
      'closing an id that is not the currently-open one must not touch state',
    ).toBe('menu-a');
  });

  it('close is a no-op when nothing is open', () => {
    useSideMenuStore.getState().close('anything');
    expect(useSideMenuStore.getState().openId).toBeNull();
  });

  // ---------- toggle ----------

  it('toggle opens a closed menu with its registered side', () => {
    const { registerSide, toggle } = useSideMenuStore.getState();
    registerSide('menu-a', 'top');

    toggle('menu-a');

    const state = useSideMenuStore.getState();
    expect(state.openId).toBe('menu-a');
    expect(state.openSide).toBe('top');
  });

  it('toggle closes the same menu if it is already open', () => {
    const { registerSide, toggle } = useSideMenuStore.getState();
    registerSide('menu-a', 'top');
    toggle('menu-a');

    toggle('menu-a');

    const state = useSideMenuStore.getState();
    expect(state.openId).toBeNull();
    expect(state.openSide).toBeNull();
  });

  it('toggling a different menu while one is open switches to the new one', () => {
    const { registerSide, toggle } = useSideMenuStore.getState();
    registerSide('menu-a', 'left');
    registerSide('menu-b', 'bottom');
    toggle('menu-a');

    toggle('menu-b');

    const state = useSideMenuStore.getState();
    expect(state.openId).toBe('menu-b');
    expect(state.openSide).toBe('bottom');
  });
});
