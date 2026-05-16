import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePathname } from 'next/navigation';
import { PathTracker } from './PathTracker';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

describe('PathTracker — initial mount', () => {
  it('sets navCurrentPath on first mount with no prior session', () => {
    const pathToTrack = '/caminos/abc-123/stages/1';
    vi.mocked(usePathname).mockReturnValue(pathToTrack);
    render(<PathTracker />);
    expect(sessionStorage.getItem('navCurrentPath')).toBe(pathToTrack);
    expect(sessionStorage.getItem('navPreviousPath')).toBeNull();
  });
});

describe('PathTracker — navigation tracking', () => {
  it('updates navPreviousPath when navigating from a prior non-form page', () => {
    const pathToTrack = '/caminos/abc-123/stages/1';
    const newPath = '/caminos/abc-123/stages/2';
    vi.mocked(usePathname).mockReturnValue(pathToTrack);
    const { rerender } = render(<PathTracker />);

    vi.mocked(usePathname).mockReturnValue(newPath);
    rerender(<PathTracker />);

    expect(sessionStorage.getItem('navPreviousPath')).toBe(pathToTrack);
    expect(sessionStorage.getItem('navCurrentPath')).toBe(newPath);
  });

  it('updates navPreviousPath NOT when next path is no stage url', () => {
    const pathToTrack = '/caminos/abc-123/stages/1';
    const newPath = '/caminos';
    vi.mocked(usePathname).mockReturnValue(pathToTrack);
    const { rerender } = render(<PathTracker />);

    vi.mocked(usePathname).mockReturnValue(newPath);
    rerender(<PathTracker />);

    expect(sessionStorage.getItem('navPreviousPath')).toBeNull();
    expect(sessionStorage.getItem('navCurrentPath')).toBe(pathToTrack);
  });

  it('does not update navPreviousPath when pathname has not changed', () => {
    const pathToTrack = '/caminos/abc-123/stages/1';
    vi.mocked(usePathname).mockReturnValue(pathToTrack);
    const { rerender } = render(<PathTracker />);

    vi.mocked(usePathname).mockReturnValue(pathToTrack);
    rerender(<PathTracker />);

    expect(sessionStorage.getItem('navPreviousPath')).toBeNull();
    expect(sessionStorage.getItem('navCurrentPath')).toBe(pathToTrack);
  });
});

describe('PathTracker — form path exclusion', () => {
  it('does not update sessionStorage when pathname ends with /edit', () => {
    sessionStorage.setItem('navCurrentPath', '/caminos/abc-123');
    sessionStorage.setItem('navPreviousPath', '/caminos');

    vi.mocked(usePathname).mockReturnValue('/caminos/abc-123/edit');
    render(<PathTracker />);

    expect(sessionStorage.getItem('navCurrentPath')).toBe('/caminos/abc-123');
    expect(sessionStorage.getItem('navPreviousPath')).toBe('/caminos');
  });

  it('does not update sessionStorage when pathname ends with /new', () => {
    sessionStorage.setItem('navCurrentPath', '/caminos');
    sessionStorage.setItem('navPreviousPath', '/');

    vi.mocked(usePathname).mockReturnValue('/caminos/new');
    render(<PathTracker />);

    expect(sessionStorage.getItem('navCurrentPath')).toBe('/caminos');
    expect(sessionStorage.getItem('navPreviousPath')).toBe('/');
  });
});
