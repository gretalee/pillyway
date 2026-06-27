import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CaminoSummary, PaginatedCaminosResponse } from '@/app/api/caminos/caminos';

// ---- Module mocks -----------------------------------------------------------

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('nprogress', () => ({
  default: { start: vi.fn(), done: vi.fn() },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      // Basic interpolation for pagination_page_info etc.
      return key + ':' + JSON.stringify(params);
    }
    return key;
  },
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

// CaminoMainImage uses useQuery internally — stub it out.
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

// Countries uses Tooltip which relies on Base UI — stub to avoid portal issues.
vi.mock('./Countries', () => ({
  default: ({ countries }: { countries: string[] }) => (
    <span data-testid="countries">{countries.join(', ')}</span>
  ),
}));

// @base-ui/react Switch is used by ToggleSwitch — provide a minimal implementation.
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

// @base-ui/react/tooltip is used by Tooltip — stub with a simple wrapper.
vi.mock('@base-ui/react/tooltip', () => ({
  Tooltip: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({
      children,
      render: renderProp,
      className,
      'aria-label': ariaLabel,
    }: {
      children?: React.ReactNode;
      render?: React.ReactElement;
      className?: string;
      'aria-label'?: string;
    }) => {
      if (renderProp) {
        return (
          <span className={className} aria-label={ariaLabel}>
            {children}
          </span>
        );
      }
      return (
        <button className={className} aria-label={ariaLabel}>
          {children}
        </button>
      );
    },
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Positioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Popup: ({ children }: { children: React.ReactNode }) => (
      <div role="tooltip">{children}</div>
    ),
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
  countries: ['france', 'spain'],
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const unverifiedCamino: CaminoSummary = {
  id: 'c2',
  slug: 'via-de-la-plata',
  name: 'Via de la Plata',
  description: 'Southern route.',
  verified: false,
  countries: ['spain'],
  createdBy: 'user-2',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function makeResult(
  data: CaminoSummary[],
  overrides?: Partial<PaginatedCaminosResponse>,
): PaginatedCaminosResponse {
  return {
    data,
    total: data.length,
    page: 1,
    totalPages: 1,
    availableCountries: ['france', 'spain'],
    ...overrides,
  };
}

const defaultResult = makeResult([verifiedCamino, unverifiedCamino]);

// ---- Helpers ----------------------------------------------------------------

function getSwitch() {
  return screen.getByRole('switch');
}

// ---- Tests ------------------------------------------------------------------

describe('CaminoListFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all caminos in the result', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.getByText('Camino Francés'), 'verified camino must appear').toBeInTheDocument();
    expect(screen.getByText('Via de la Plata'), 'unverified camino must appear').toBeInTheDocument();
  });

  it('calls router.push with verified=true when switch is toggled on', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    await user.click(getSwitch());

    expect(mockPush, 'router.push must be called with verified filter').toHaveBeenCalledWith(
      '/caminos?verified=true',
    );
  });

  it('calls router.push without verified when switch is toggled off', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={true}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    await user.click(getSwitch());

    expect(mockPush, 'router.push must remove verified from URL').toHaveBeenCalledWith('/caminos');
  });

  it('shows filter_empty when result is empty with active filter', () => {
    render(
      <CaminoListFilter
        result={makeResult([], { total: 0, totalPages: 0 })}
        isPilgrim={false}
        currentVerified={true}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(
      screen.getByText('filter_empty'),
      'must show filter_empty when no caminos match active filter',
    ).toBeInTheDocument();
  });

  it('shows empty (not filter_empty) when result is empty without any filter', () => {
    render(
      <CaminoListFilter
        result={makeResult([], { total: 0, totalPages: 0, availableCountries: [] })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.queryByText('filter_empty')).not.toBeInTheDocument();
  });

  it('renders country filter chips from availableCountries', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    // i18n mock returns key unchanged, so tCodes('france') === 'france'
    expect(screen.getByRole('button', { name: 'france' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'spain' })).toBeInTheDocument();
  });

  it('country chip has aria-pressed=false when not selected', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.getByRole('button', { name: 'france' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('country chip has aria-pressed=true when country is in currentCountries', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={['france']}
        currentPage={1}
      />,
    );

    expect(screen.getByRole('button', { name: 'france' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'spain' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a country chip calls router.push with that country added', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'france' }));

    expect(mockPush).toHaveBeenCalledWith('/caminos?countries=france');
  });

  it('clicking an already-selected country chip removes it from the URL', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={['france', 'spain']}
        currentPage={1}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'france' }));

    expect(mockPush).toHaveBeenCalledWith('/caminos?countries=spain');
  });

  it('filter changes reset page to 1 in the URL', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={3}
      />,
    );

    await user.click(getSwitch());

    // page must not appear (page 1 is default, omitted)
    expect(mockPush).toHaveBeenCalledWith('/caminos?verified=true');
  });

  it('does not render pagination when there is only one page', () => {
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { totalPages: 1 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.queryByLabelText('pagination_previous')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('pagination_next')).not.toBeInTheDocument();
  });

  it('renders pagination buttons when there are multiple pages', () => {
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 2 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.getByLabelText('pagination_previous')).toBeInTheDocument();
    expect(screen.getByLabelText('pagination_next')).toBeInTheDocument();
  });

  it('previous button is disabled on the first page', () => {
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 2 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.getByLabelText('pagination_previous')).toBeDisabled();
    expect(screen.getByLabelText('pagination_next')).not.toBeDisabled();
  });

  it('next button is disabled on the last page', () => {
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 2 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={2}
      />,
    );

    expect(screen.getByLabelText('pagination_next')).toBeDisabled();
    expect(screen.getByLabelText('pagination_previous')).not.toBeDisabled();
  });

  it('clicking next page calls router.push with page incremented', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 3 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    await user.click(screen.getByLabelText('pagination_next'));

    expect(mockPush).toHaveBeenCalledWith('/caminos?page=2');
  });

  it('clicking previous page calls router.push with page decremented', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 3 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={3}
      />,
    );

    await user.click(screen.getByLabelText('pagination_previous'));

    expect(mockPush).toHaveBeenCalledWith('/caminos?page=2');
  });

  it('page 1 is omitted from the URL (page=1 never appears)', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 3 })}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={2}
      />,
    );

    await user.click(screen.getByLabelText('pagination_previous'));

    expect(mockPush).toHaveBeenCalledWith('/caminos');
  });

  it('renders the verified badge only for verified caminos', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    const badges = screen.getAllByTestId('verified-badge');
    expect(badges, 'exactly one badge for the one verified camino').toHaveLength(1);
  });

  it('renders the actions menu for pilgrims', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={true}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.getByLabelText(`actions-${verifiedCamino.name}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`actions-${unverifiedCamino.name}`)).toBeInTheDocument();
  });

  it('does NOT render actions menus for non-pilgrims', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(screen.queryByLabelText(`actions-${verifiedCamino.name}`)).not.toBeInTheDocument();
  });

  it('camino names link to their detail pages', () => {
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino])}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    const link = screen.getByRole('link', { name: /Camino Francés/i });
    expect(link).toHaveAttribute('href', `/caminos/${verifiedCamino.slug}`);
  });

  it('truncates long descriptions', () => {
    const longDescription = 'A'.repeat(700);
    render(
      <CaminoListFilter
        result={makeResult([{ ...verifiedCamino, description: longDescription }])}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    const descEl = screen.getByText(/A+…/);
    expect(descEl.textContent!.length, 'description must be truncated').toBeLessThan(
      longDescription.length,
    );
  });

  it('filter switch reflects currentVerified prop as aria-checked', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={true}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('filter switch has aria-checked=false when currentVerified is false', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('the switch label is linked to the switch via htmlFor/id', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    const label = screen.getByText('filter_verified_label');
    expect(label).toHaveAttribute('for', 'filter-verified-switch');
    expect(getSwitch()).toHaveAttribute('id', 'filter-verified-switch');
  });

  it('renders caminos in a list element with an accessible name', () => {
    render(
      <CaminoListFilter
        result={defaultResult}
        isPilgrim={false}
        currentVerified={false}
        currentCountries={[]}
        currentPage={1}
      />,
    );

    const list = screen.getByRole('list', { name: 'title' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(defaultResult.data.length);
  });

  it('preserves existing filter state when changing page', async () => {
    const user = userEvent.setup();
    render(
      <CaminoListFilter
        result={makeResult([verifiedCamino], { total: 12, totalPages: 3 })}
        isPilgrim={false}
        currentVerified={true}
        currentCountries={['spain']}
        currentPage={1}
      />,
    );

    await user.click(screen.getByLabelText('pagination_next'));

    expect(mockPush).toHaveBeenCalledWith('/caminos?verified=true&countries=spain&page=2');
  });
});
