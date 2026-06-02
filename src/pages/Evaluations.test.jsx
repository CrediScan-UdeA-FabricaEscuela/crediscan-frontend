import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Evaluations from './Evaluations';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
  searchEvaluations: vi.fn(),
  getEvaluationsExportUrl: vi.fn(() => '/mock-export-url'),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { searchEvaluations } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRows(count = 1) {
  return Array.from({ length: count }, (_, i) => ({
    evaluationId: `uuid-00${i + 1}`,
    applicantName: `Solicitante ${i + 1}`,
    evaluatedAt: '2024-01-15T10:00:00Z',
    score: 750.5,
    riskLevel: 'HIGH',
    decisionStatus: 'APPROVED',
    analista: 'analyst1',
  }));
}

function setupAuth(role = 'ADMIN') {
  useAuth.mockReturnValue({ auth: { role, username: 'TestUser' } });
}

function setupApi({ content = makeRows(), totalPages = 1, totalElements = 1 } = {}) {
  searchEvaluations.mockResolvedValue({ content, totalPages, totalElements, pageNumber: 0 });
}

beforeEach(() => {
  mockNavigate.mockClear();
  searchEvaluations.mockReset();
});

// ── Phase 2.2: RISK_BADGE bug-fix assertion ────────────────────────────────

describe('Evaluations — RISK_BADGE bug fix: HIGH maps to badge-HIGH', () => {
  it('renders badge-HIGH class (not badge-success, badge-error, or badge-DRAFT)', async () => {
    setupAuth('ADMIN');
    setupApi({
      content: [{ ...makeRows(1)[0], riskLevel: 'HIGH' }],
    });

    render(<Evaluations />);

    await waitFor(() => {
      const badges = document.querySelectorAll('.badge-HIGH');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    expect(document.querySelector('.badge-success')).not.toBeInTheDocument();
    expect(document.querySelector('.badge-error')).not.toBeInTheDocument();
    // badge-DRAFT should not be used for HIGH
    const highBadge = document.querySelector('.badge-HIGH');
    expect(highBadge).not.toBeNull();
    expect(highBadge.classList.contains('badge-DRAFT')).toBe(false);
  });
});

// ── Phase 2.3: RISK_BADGE exhaustive ──────────────────────────────────────

describe('Evaluations — RISK_BADGE exhaustive class mapping', () => {
  const cases = [
    ['VERY_HIGH', 'badge-VERY_HIGH'],
    ['REJECTED', 'badge-REJECTED'],
    ['LOW', 'badge-LOW'],
    ['VERY_LOW', 'badge-VERY_LOW'],
    ['MEDIUM', 'badge-MEDIUM'],
  ];

  cases.forEach(([nivel, expectedClass]) => {
    it(`nivel=${nivel} renders ${expectedClass}`, async () => {
      setupAuth('ADMIN');
      setupApi({ content: [{ ...makeRows(1)[0], riskLevel: nivel }] });

      render(<Evaluations />);

      await waitFor(() => {
        const badge = document.querySelector(`.${expectedClass}`);
        expect(badge).not.toBeNull();
      });
    });
  });
});

// ── Phase 2.4: DECISION_BADGE ─────────────────────────────────────────────

describe('Evaluations — DECISION_BADGE class mapping', () => {
  const cases = [
    ['APPROVED', 'badge-APPROVED'],
    ['REJECTED', 'badge-REJECTED'],
    ['MANUAL_REVIEW', 'badge-MANUAL_REVIEW'],
    ['ESCALATED', 'badge-ESCALATED'],
  ];

  cases.forEach(([decision, expectedClass]) => {
    it(`decision=${decision} renders ${expectedClass}`, async () => {
      setupAuth('ADMIN');
      setupApi({ content: [{ ...makeRows(1)[0], decisionStatus: decision }] });

      render(<Evaluations />);

      await waitFor(() => {
        const badge = document.querySelector(`.${expectedClass}`);
        expect(badge).not.toBeNull();
      });
    });
  });
});

// ── Phase 2.5: Role-gating canSearch=true ─────────────────────────────────

describe('Evaluations — canSearch=true renders full search UI', () => {
  it('ADMIN sees filter form, results area, and by-ID lookup', async () => {
    setupAuth('ADMIN');
    setupApi();

    render(<Evaluations />);

    await waitFor(() => {
      // by-ID lookup always visible
      expect(screen.getByPlaceholderText(/uuid de la evaluaci/i)).toBeInTheDocument();
    });

    // filter form rendered (date inputs present)
    expect(screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/).length).toBeGreaterThanOrEqual(1);
  });

  it('RISK_MANAGER sees filter form', async () => {
    setupAuth('RISK_MANAGER');
    setupApi();

    render(<Evaluations />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/uuid de la evaluaci/i)).toBeInTheDocument();
    });
    expect(screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/).length).toBeGreaterThanOrEqual(1);
  });
});

// ── Phase 2.6: Role-gating canSearch=false ────────────────────────────────

describe('Evaluations — canSearch=false renders restricted UI', () => {
  it('VIEWER sees informational alert and by-ID lookup but no filter date inputs', () => {
    useAuth.mockReturnValue({ auth: { role: 'VIEWER', username: 'TestUser' } });

    render(<Evaluations />);

    // by-ID lookup still visible
    expect(screen.getByPlaceholderText(/uuid de la evaluaci/i)).toBeInTheDocument();

    // informational alert visible
    expect(screen.getByText(/tu rol no permite listar/i)).toBeInTheDocument();

    // filter date inputs NOT present
    expect(screen.queryByLabelText(/desde/i)).not.toBeInTheDocument();
  });
});

// ── Phase 2.7: canEvaluate=true ───────────────────────────────────────────

describe('Evaluations — canEvaluate=true shows Nueva Evaluación button', () => {
  it('ADMIN sees Nueva Evaluación button', () => {
    setupAuth('ADMIN');

    render(<Evaluations />);

    expect(screen.getByRole('button', { name: /nueva evaluaci/i })).toBeInTheDocument();
  });
});

// ── Phase 2.8: canEvaluate=false ──────────────────────────────────────────

describe('Evaluations — canEvaluate=false hides Nueva Evaluación button', () => {
  it('RISK_MANAGER does NOT see Nueva Evaluación button', () => {
    setupAuth('RISK_MANAGER');

    render(<Evaluations />);

    expect(screen.queryByRole('button', { name: /nueva evaluaci/i })).not.toBeInTheDocument();
  });
});

// ── Phase 2.9: By-ID nav ──────────────────────────────────────────────────

describe('Evaluations — by-ID lookup navigation', () => {
  it('submitting a non-empty UUID navigates to /evaluaciones/:id', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');

    render(<Evaluations />);

    const input = screen.getByPlaceholderText(/uuid de la evaluaci/i);
    await user.type(input, 'my-uuid-123');
    await user.click(screen.getByRole('button', { name: /ver evaluaci/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/my-uuid-123');
  });

  // ── Phase 2.10: Empty ID ──────────────────────────────────────────────────
  it('submitting empty lookup does NOT call navigate', () => {
    setupAuth('ADMIN');

    render(<Evaluations />);

    const submitBtn = screen.getByRole('button', { name: /ver evaluaci/i });
    // button should be disabled with empty input — just confirm no navigation
    expect(submitBtn).toBeDisabled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── Phase 2.11: Filter search invocation ─────────────────────────────────

describe('Evaluations — Buscar triggers searchEvaluations at page 0', () => {
  it('clicking Buscar calls searchEvaluations with criteria and page 0', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');
    // Initial auto-load on mount
    searchEvaluations.mockResolvedValue({ content: [], totalPages: 0, totalElements: 0, pageNumber: 0 });

    render(<Evaluations />);

    // Wait for initial load to settle
    await waitFor(() => expect(searchEvaluations).toHaveBeenCalled());

    searchEvaluations.mockClear();
    searchEvaluations.mockResolvedValue({ content: [], totalPages: 0, totalElements: 0, pageNumber: 0 });

    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(searchEvaluations).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 })
      );
    });
  });
});

// ── Phase 2.12: Export disabled before search ─────────────────────────────

describe('Evaluations — export buttons disabled before search', () => {
  it('CSV and PDF export buttons are disabled on initial render (canSearch=true, no search done)', () => {
    setupAuth('ADMIN');
    // Prevent auto-load from setting hasSearched
    searchEvaluations.mockReturnValue(new Promise(() => {})); // never resolves

    render(<Evaluations />);

    const csvBtn = screen.getByRole('button', { name: /csv/i });
    const pdfBtn = screen.getByRole('button', { name: /pdf/i });

    expect(csvBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();
  });
});

// ── Phase 2.13: Export enabled after results ──────────────────────────────

describe('Evaluations — export buttons enabled after results load', () => {
  it('CSV and PDF export buttons are enabled after search returns rows', async () => {
    setupAuth('ADMIN');
    setupApi({ content: makeRows(1) });

    render(<Evaluations />);

    await waitFor(() => {
      const csvBtn = screen.getByRole('button', { name: /csv/i });
      const pdfBtn = screen.getByRole('button', { name: /pdf/i });
      expect(csvBtn).not.toBeDisabled();
      expect(pdfBtn).not.toBeDisabled();
    });
  });
});

// ── Phase 2.14: Pagination Anterior disabled on page 0 ───────────────────

describe('Evaluations — pagination: Anterior disabled on page 0', () => {
  it('Anterior button is disabled when currentPage=0', async () => {
    setupAuth('ADMIN');
    setupApi({ content: makeRows(1), totalPages: 3 });

    render(<Evaluations />);

    await waitFor(() => screen.getByRole('table'));

    const anterior = screen.getByRole('button', { name: /anterior/i });
    expect(anterior).toBeDisabled();
  });
});

// ── Phase 2.15: Pagination Siguiente disabled on last page ────────────────

describe('Evaluations — pagination: Siguiente disabled on last page', () => {
  it('Siguiente button is disabled when currentPage === totalPages - 1', async () => {
    setupAuth('ADMIN');
    setupApi({ content: makeRows(1), totalPages: 2 });

    render(<Evaluations />);

    await waitFor(() => screen.getByRole('table'));

    // page=0 returned, totalPages=2 — page 0 is NOT the last page, Siguiente enabled
    const siguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(siguiente).not.toBeDisabled();

    // Now mock a second page response and simulate being on last page
    searchEvaluations.mockResolvedValue({ content: makeRows(1), totalPages: 2, totalElements: 2, pageNumber: 1 });
    await userEvent.setup().click(siguiente);

    await waitFor(() => {
      const sig2 = screen.getByRole('button', { name: /siguiente/i });
      expect(sig2).toBeDisabled();
    });
  });
});
