import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { PathTracker, getLastPath } from './PathTracker';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockPathname = (path: string) => vi.mocked(usePathname).mockReturnValue(path);

const STAGE_PATH = '/caminos/via-francigena/stages/3';
const LAST_PATH_KEY = 'pilly_lastPath';

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('PathTracker', () => {
  describe('stores the path when on a stage view route', () => {
    it('saves a stage path to sessionStorage', () => {
      mockPathname(STAGE_PATH);
      render(<PathTracker />);
      expect(sessionStorage.getItem(LAST_PATH_KEY)).toBe(STAGE_PATH);
    });

    it('updates sessionStorage when the path changes to another stage', () => {
      const secondPath = '/caminos/via-francigena/stages/5';
      mockPathname(STAGE_PATH);
      const { rerender } = render(<PathTracker />);

      mockPathname(secondPath);
      rerender(<PathTracker />);

      expect(sessionStorage.getItem(LAST_PATH_KEY)).toBe(secondPath);
    });
  });

  describe('does NOT store the path for non-stage routes', () => {
    it.each([
      '/caminos/via-francigena',
      '/caminos/via-francigena/stages/3/edit',
      '/caminos/via-francigena/stages/new',
      '/caminos/via-francigena/update',
      '/caminos',
      '/',
    ])('ignores path: %s', (path) => {
      mockPathname(path);
      render(<PathTracker />);
      expect(sessionStorage.getItem(LAST_PATH_KEY)).toBeNull();
    });
  });

  describe('does NOT overwrite an existing stored path with a non-stage path', () => {
    it('keeps the previously stored stage path after navigating to an edit page', () => {
      mockPathname(STAGE_PATH);
      const { rerender } = render(<PathTracker />);

      mockPathname('/caminos/via-francigena/stages/3/edit');
      rerender(<PathTracker />);

      expect(sessionStorage.getItem(LAST_PATH_KEY)).toBe(STAGE_PATH);
    });
  });

  describe('renders nothing', () => {
    it('returns null and produces no DOM output', () => {
      mockPathname(STAGE_PATH);
      const { container } = render(<PathTracker />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});

describe('getLastPath', () => {
  it('returns null when sessionStorage is empty', () => {
    expect(getLastPath()).toBeNull();
  });

  it('returns the stored path after PathTracker has saved it', () => {
    mockPathname(STAGE_PATH);
    render(<PathTracker />);
    expect(getLastPath()).toBe(STAGE_PATH);
  });
});
