import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// next-intl must be mocked for unit tests because NextIntlClientProvider
// is not present in the test tree. Mock useTranslations to return the key
// as the translated string so assertions can reference predictable values.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the locale store so we control the active locale and can spy on
// setLocale without triggering real cookie writes.
const mockSetLocale = vi.fn();
let mockLocale = 'de';

vi.mock('@/store/locale-store', () => ({
  useLocaleStore: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
  }),
}));

// Mock next/navigation — LanguageSwitcher calls router.refresh() after
// writing the cookie. Without this mock the test will throw.
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

afterEach(() => {
  vi.clearAllMocks();
  mockLocale = 'de';
});

async function renderSwitcher() {
  // Dynamic import ensures the module re-evaluates with the updated mockLocale.
  const { LanguageSwitcher } = await import('./LanguageSwitcher');
  render(<LanguageSwitcher />);
}

describe('LanguageSwitcher — rendering', () => {
  it('renders a "DE" label', async () => {
    await renderSwitcher();
    expect(screen.getByRole('button', { name: 'DE' })).toBeInTheDocument();
  });

  it('renders an "EN" label', async () => {
    await renderSwitcher();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('renders an aria-label attribute on the switcher container', async () => {
    await renderSwitcher();
    // The group element carries the aria-label.
    expect(screen.getByRole('group')).toHaveAttribute('aria-label');
  });

  it('aria-label value comes from the i18n key, not a hardcoded string', async () => {
    await renderSwitcher();
    // useTranslations mock returns the key itself — so the aria-label will be
    // the key string "aria_language_switcher", not a hardcoded EN/DE phrase.
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'aria_language_switcher');
  });
});

describe('LanguageSwitcher — active state', () => {
  it('when locale is "de", the DE button has the active/selected visual state', async () => {
    mockLocale = 'de';
    await renderSwitcher();
    const deBtn = screen.getByRole('button', { name: 'DE' });
    expect(deBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('when locale is "en", the EN button has the active/selected visual state', async () => {
    mockLocale = 'en';
    await renderSwitcher();
    const enBtn = screen.getByRole('button', { name: 'EN' });
    expect(enBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('when locale is "de", the EN button does NOT have the active state', async () => {
    mockLocale = 'de';
    await renderSwitcher();
    const enBtn = screen.getByRole('button', { name: 'EN' });
    expect(enBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('when locale is "en", the DE button does NOT have the active state', async () => {
    mockLocale = 'en';
    await renderSwitcher();
    const deBtn = screen.getByRole('button', { name: 'DE' });
    expect(deBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('active button has aria-pressed="true" (or equivalent accessible marker)', async () => {
    mockLocale = 'de';
    await renderSwitcher();
    const deBtn = screen.getByRole('button', { name: 'DE' });
    expect(deBtn.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('LanguageSwitcher — interaction', () => {
  it('clicking EN calls setLocale("en")', async () => {
    const user = userEvent.setup();
    await renderSwitcher();
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('clicking DE calls setLocale("de")', async () => {
    mockLocale = 'en';
    const user = userEvent.setup();
    await renderSwitcher();
    await user.click(screen.getByRole('button', { name: 'DE' }));
    expect(mockSetLocale).toHaveBeenCalledWith('de');
  });

  it('clicking EN calls router.refresh()', async () => {
    const user = userEvent.setup();
    await renderSwitcher();
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('clicking the already-active locale does not call setLocale again', async () => {
    // mockLocale is 'de' by default — clicking DE should be a no-op.
    const user = userEvent.setup();
    await renderSwitcher();
    await user.click(screen.getByRole('button', { name: 'DE' }));
    expect(mockSetLocale).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe('LanguageSwitcher — keyboard accessibility', () => {
  it('DE button is reachable via Tab key', async () => {
    const user = userEvent.setup();
    await renderSwitcher();
    await user.tab();
    expect(screen.getByRole('button', { name: 'DE' })).toHaveFocus();
  });

  it('EN button is reachable via Tab key', async () => {
    const user = userEvent.setup();
    await renderSwitcher();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveFocus();
  });

  it('pressing Enter on EN button calls setLocale("en")', async () => {
    const user = userEvent.setup();
    await renderSwitcher();
    // Tab twice to reach the EN button.
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('pressing Space on EN button calls setLocale("en")', async () => {
    const user = userEvent.setup();
    await renderSwitcher();
    await user.tab();
    await user.tab();
    await user.keyboard(' ');
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });
});
