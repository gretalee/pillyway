import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CaminoSummary } from '@/app/api/caminos/caminos';

// ---- Module mocks -----------------------------------------------------------

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// next/link renders a plain <a> in tests.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// CaminoMainImage uses useQuery internally — stub it out to avoid needing a QueryClientProvider.
vi.mock('./CaminoMainImage', () => ({
  default: ({ caminoId }: { caminoId: string }) => (
    <div data-testid={`camino-image-${caminoId}`} />
  ),
}));

// CaminoActionsMenu is irrelevant to the filter behaviour being tested here.
vi.mock('./CaminoActionsMenu', () => ({
  CaminoActionsMenu: ({ camino }: { camino: { name: string } }) => (
    <button aria-label={`actions-${camino.name}`}>actions</button>
  ),
}));

// VerifiedBadge renders a simple span for deterministic output in tests.
vi.mock('./VerifiedBadge', () => ({
  VerifiedBadge: () => <span data-testid="verified-badge" />,
}));

// @base-ui/react Switch is used by ToggleSwitch — provide a minimal implementation
// that renders a real <button role="switch"> so userEvent can click it.
vi.mock('@base-ui/react/switch', () => ({
  Switch: {
    Root: ({
      checked,
      onCheckedChange,
      disabled,
      id,
      'aria-label': ariaLabel,
      children,
    }: {
      checked: boolean;
      onCheckedChange: (v: boolean) => void;
      disabled?: boolean;
      id?: string;
      'aria-label'?: string;
      children?: React.ReactNode;
    }) => (
      <button
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}>
        {children}
      </button>
    ),
    Thumb: () => null,
  },
}));

// -----------------------------------------------------------------------------

import { CaminoListFilter } from './CaminoListFilter';

// ---- Fixtures ---------------------------------------------------------------

const verifiedCamino: CaminoSummary = {
  id: 'c1',
  slug: 'camino-frances',
  name: 'Camino Francés',
  description: 'The classic route.',
  verified: true,
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const unverifiedCamino: CaminoSummary = {
  id: 'c2',
  slug: 'via-de-la-plata',
  name: 'Via de la Plata',
  description: 'Southern route.',
  verified: false,
  createdBy: 'user-2',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const allCaminos: CaminoSummary[] = [verifiedCamino, unverifiedCamino];

// ---- Helpers ----------------------------------------------------------------

function getSwitch() {
  return screen.getByRole('switch');
}

// ---- Tests ------------------------------------------------------------------

describe('CaminoListFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all caminos when the filter is off', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    expect(
      screen.getByText('Camino Francés'),
      'verified camino must appear',
    ).toBeInTheDocument();
    expect(
      screen.getByText('Via de la Plata'),
      'unverified camino must appear',
    ).toBeInTheDocument();
  });

  it('shows only verified caminos after toggling the switch on', async () => {
    const user = userEvent.setup();
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    await user.click(getSwitch());

    expect(
      screen.getByText('Camino Francés'),
      'verified camino must still appear',
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Via de la Plata'),
      'unverified camino must be hidden when filter is active',
    ).not.toBeInTheDocument();
  });

  it('shows all caminos again after toggling the switch off', async () => {
    const user = userEvent.setup();
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    await user.click(getSwitch()); // on
    await user.click(getSwitch()); // off

    expect(screen.getByText('Camino Francés')).toBeInTheDocument();
    expect(screen.getByText('Via de la Plata')).toBeInTheDocument();
  });

  it('shows the empty-state message when filter is on and no caminos are verified', async () => {
    const user = userEvent.setup();
    render(<CaminoListFilter caminos={[unverifiedCamino]} isPilgrim={false} />);

    await user.click(getSwitch());

    // The i18n key passes through as the key string itself.
    expect(
      screen.getByText('filter_no_verified'),
      'empty-state message must appear when no verified caminos match',
    ).toBeInTheDocument();
    expect(screen.queryByText('Via de la Plata')).not.toBeInTheDocument();
  });

  it('does NOT show the empty-state message when the list is non-empty', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);
    expect(screen.queryByText('filter_no_verified')).not.toBeInTheDocument();
  });

  it('renders the verified badge only for verified caminos', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    const badges = screen.getAllByTestId('verified-badge');
    expect(badges, 'exactly one badge for the one verified camino').toHaveLength(1);
  });

  it('renders the actions menu for pilgrims', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={true} />);

    // Our CaminoActionsMenu mock renders a button with aria-label `actions-<name>`.
    expect(screen.getByLabelText(`actions-${verifiedCamino.name}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`actions-${unverifiedCamino.name}`)).toBeInTheDocument();
  });

  it('does NOT render actions menus for non-pilgrims', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);
    expect(
      screen.queryByLabelText(`actions-${verifiedCamino.name}`),
    ).not.toBeInTheDocument();
  });

  it('renders an empty list gracefully without errors', () => {
    render(<CaminoListFilter caminos={[]} isPilgrim={false} />);
    // Empty list with filter off should NOT show the no-verified message.
    expect(screen.queryByText('filter_no_verified')).not.toBeInTheDocument();
  });

  it('camino names link to their detail pages', () => {
    render(<CaminoListFilter caminos={[verifiedCamino]} isPilgrim={false} />);

    const link = screen.getByRole('link', { name: /Camino Francés/i });
    expect(link).toHaveAttribute('href', `/caminos/${verifiedCamino.slug}`);
  });

  it('truncates long descriptions and does not break layout', () => {
    const longDescription = 'A'.repeat(700);
    const longCamino: CaminoSummary = {
      ...verifiedCamino,
      description: longDescription,
    };

    render(<CaminoListFilter caminos={[longCamino]} isPilgrim={false} />);

    // The truncated text should end with an ellipsis character and not contain
    // the full 700-char string verbatim.
    const descriptionEl = screen.getByText(/A+…/);
    expect(
      descriptionEl.textContent!.length,
      'description must be truncated',
    ).toBeLessThan(longDescription.length);
  });

  it('filter switch has correct initial aria-checked state (false)', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);
    expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('filter switch reflects aria-checked=true after being toggled on', async () => {
    const user = userEvent.setup();
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    await user.click(getSwitch());

    expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('the switch label is linked to the switch via htmlFor/id', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    // The label must be associated with the switch by id="filter-verified-switch".
    const label = screen.getByText('filter_verified_label');
    expect(label).toHaveAttribute('for', 'filter-verified-switch');
    expect(getSwitch()).toHaveAttribute('id', 'filter-verified-switch');
  });

  it('renders caminos in a list element with an accessible name', () => {
    render(<CaminoListFilter caminos={allCaminos} isPilgrim={false} />);

    // The <ul> has aria-label matching the i18n key 'title'.
    const list = screen.getByRole('list', { name: 'title' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(allCaminos.length);
  });
});
