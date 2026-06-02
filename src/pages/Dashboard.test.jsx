import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
  searchApplicants: vi.fn(),
  getEvaluations: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { searchApplicants, getEvaluations } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Evaluations for the current month (so evalMonth count is accurate)
function makeEvals(count, pendingCount = 0) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => ({
    evaluatedAt: now.toISOString(),
    knockedOut: false,
    hasCreditDecision: i >= pendingCount ? true : false,
  }));
}

function setupAuth(role = 'ADMIN') {
  useAuth.mockReturnValue({ auth: { role, username: 'TestUser' } });
}

function setupApi({ total = 37, evalCount = 12, pendingCount = 5 } = {}) {
  searchApplicants.mockResolvedValue({ page: { totalElements: total } });
  getEvaluations.mockResolvedValue({ content: makeEvals(evalCount, pendingCount) });
}

// ── Domain C — Dashboard Page ──────────────────────────────────────────────

describe('Dashboard — time-of-day greeting', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows "Buenos días" greeting with username in the morning', async () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    setupAuth('ADMIN');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Buenos días.*TestUser|TestUser.*Buenos días/)).toBeInTheDocument();
    });
  });

  it('shows "Buenas tardes" greeting in the afternoon', async () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    setupAuth('ADMIN');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Buenas tardes/)).toBeInTheDocument();
    });
  });

  it('shows "Buenas noches" greeting in the evening', async () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    setupAuth('ADMIN');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Buenas noches/)).toBeInTheDocument();
    });
  });
});

describe('Dashboard — stat cards loading state', () => {
  it('shows 4 stat-loading placeholders while API is pending', () => {
    // Never-resolving promises keep loading=true
    searchApplicants.mockReturnValue(new Promise(() => {}));
    getEvaluations.mockReturnValue(new Promise(() => {}));
    setupAuth('ADMIN');

    render(<Dashboard />);
    const placeholders = screen.getAllByTestId('stat-loading');
    expect(placeholders).toHaveLength(4);
  });
});

describe('Dashboard — stat cards resolved state', () => {
  it('shows totalApplicants (37) and evalMonth (12) after data loads', async () => {
    setupAuth('ADMIN');
    setupApi({ total: 37, evalCount: 12, pendingCount: 5 });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('37')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('shows the role value in the Tu rol stat card', async () => {
    setupAuth('RISK_MANAGER');
    setupApi();

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('RISK_MANAGER')).toBeInTheDocument();
    });
  });
});

describe('Dashboard — role-gated "Nueva Evaluación" action', () => {
  it('renders "Nueva Evaluación" for ADMIN', async () => {
    setupAuth('ADMIN');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      const buttons = screen.getAllByText(/Nueva Evaluación/);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('renders "Nueva Evaluación" for ANALYST', async () => {
    setupAuth('ANALYST');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      const buttons = screen.getAllByText(/Nueva Evaluación/);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('does NOT render "Nueva Evaluación" for RISK_MANAGER', async () => {
    setupAuth('RISK_MANAGER');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => expect(screen.queryByText('37')).toBeInTheDocument());
    expect(screen.queryByText(/Nueva Evaluación/)).not.toBeInTheDocument();
  });
});

describe('Dashboard — role-conditional welcome bullets', () => {
  it('shows evaluator bullet for ADMIN', async () => {
    setupAuth('ADMIN');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      expect(
        screen.getByText((_, el) =>
          el?.tagName === 'LI' && el.textContent.includes('podés registrar') && el.textContent.includes('evaluaciones'),
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows RISK_MANAGER bullet and NOT evaluator bullet for RISK_MANAGER', async () => {
    setupAuth('RISK_MANAGER');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/gestionar variables/)).toBeInTheDocument();
    });
    // Evaluator-specific text (registered solicitantes + ejecutar evaluaciones) must be absent
    expect(screen.queryByText(/podés registrar solicitantes y ejecutar/i)).not.toBeInTheDocument();
  });
});

describe('Dashboard — quick-action navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setupAuth('ADMIN');
    setupApi();
  });

  it('"Nuevo Solicitante" navigates to /solicitantes/nuevo', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await waitFor(() => screen.getByText(/Nuevo Solicitante/));
    await user.click(screen.getByRole('button', { name: /Nuevo Solicitante/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes/nuevo');
  });

  it('"Ver Solicitantes" navigates to /solicitantes', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await waitFor(() => screen.getByText(/Ver Solicitantes/));
    await user.click(screen.getByRole('button', { name: /Ver Solicitantes/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });

  it('"Ver Evaluaciones" navigates to /evaluaciones', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await waitFor(() => screen.getByText(/Ver Evaluaciones/));
    await user.click(screen.getByRole('button', { name: /Ver Evaluaciones/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones');
  });

  it('quick-action "Nueva Evaluación" navigates to /evaluaciones/nueva for ADMIN', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await waitFor(() => screen.getAllByText(/Nueva Evaluación/));
    // The quick-action one is the one inside .quick-actions (not the header one)
    const buttons = screen.getAllByRole('button', { name: /Nueva Evaluación/ });
    // Click the last occurrence (quick-action row) — at least one must exist
    await user.click(buttons[buttons.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/nueva');
  });
});

describe('Dashboard — header "Nueva Evaluación" button', () => {
  it('navigates to /evaluaciones/nueva when clicked by ADMIN', async () => {
    mockNavigate.mockClear();
    const user = userEvent.setup();
    setupAuth('ADMIN');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => screen.getAllByText(/Nueva Evaluación/));
    const buttons = screen.getAllByRole('button', { name: /Nueva Evaluación/ });
    await user.click(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/nueva');
  });
});

describe('Dashboard — "Exportar reporte" deferred feature', () => {
  it('renders a disabled "Exportar reporte" button for any authenticated user', async () => {
    setupAuth('RISK_MANAGER');
    setupApi();
    render(<Dashboard />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Exportar reporte/ });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
    });
  });
});
