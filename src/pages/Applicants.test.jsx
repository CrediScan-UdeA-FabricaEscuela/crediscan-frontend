import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Applicants from './Applicants';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
  searchApplicants: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { searchApplicants } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeApplicants(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    nombre: i === 0 ? 'Luis Martinez' : `Applicant ${i + 1}`,
    identificacion: `CC${1000 + i}`,
    tipo_empleo: 'EMPLEADO',
    ingresos_mensuales: 3000000,
    antiguedad_laboral: 24,
    telefono: '3001234567',
  }));
}

function setupAuth(role = 'ADMIN') {
  useAuth.mockReturnValue({ auth: { role, username: 'TestUser' } });
}

function setupApi({ content = makeApplicants(), totalPages = 1, totalElements = 2 } = {}) {
  searchApplicants.mockResolvedValue({ content, totalPages, totalElements });
}

beforeEach(() => {
  mockNavigate.mockClear();
  searchApplicants.mockReset();
});

// ── Domain: Row rendering ──────────────────────────────────────────────────

describe('Applicants — row rendering from data', () => {
  it('renders one row per item in content', async () => {
    setupAuth();
    setupApi({ content: makeApplicants(2) });

    render(<Applicants />);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // 1 header row + 2 data rows
      expect(rows).toHaveLength(3);
    });
  });

  it('renders an Avatar with initial "L" for name "Luis Martinez"', async () => {
    setupAuth();
    setupApi({ content: makeApplicants(1) });

    render(<Applicants />);

    await waitFor(() => {
      // Avatar renders the uppercased first initial
      expect(screen.getByText('L')).toBeInTheDocument();
    });
  });

  it('each data row contains a name cell with an Avatar element', async () => {
    setupAuth();
    setupApi({ content: makeApplicants(2) });

    render(<Applicants />);

    await waitFor(() => {
      // Two rows each have an avatar span (class "avatar")
      const avatars = document.querySelectorAll('.avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ── Domain: Search ─────────────────────────────────────────────────────────

describe('Applicants — search behavior', () => {
  it('calls searchApplicants with (query, 0) on search submit', async () => {
    const user = userEvent.setup();
    setupAuth();
    setupApi();

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    const input = screen.getByPlaceholderText(/buscar/i);
    await user.clear(input);
    await user.type(input, 'Luis');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    expect(searchApplicants).toHaveBeenCalledWith('Luis', 0);
  });

  it('Limpiar clears query and calls searchApplicants("", 0)', async () => {
    const user = userEvent.setup();
    setupAuth();
    setupApi();

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    const input = screen.getByPlaceholderText(/buscar/i);
    await user.clear(input);
    await user.type(input, 'test');

    await waitFor(() => screen.getByRole('button', { name: /limpiar/i }));
    await user.click(screen.getByRole('button', { name: /limpiar/i }));

    expect(searchApplicants).toHaveBeenCalledWith('', 0);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar/i)).toHaveValue('');
    });
  });
});

// ── Domain: Pagination ─────────────────────────────────────────────────────

describe('Applicants — pagination controls', () => {
  it('Anterior button is disabled on page 0', async () => {
    setupAuth();
    setupApi({ totalPages: 3 });

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    const anterior = screen.getByRole('button', { name: /anterior/i });
    expect(anterior).toBeDisabled();
  });

  it('Siguiente button is disabled when on the last page (totalPages === currentPage + 1)', async () => {
    setupAuth();
    setupApi({ content: makeApplicants(2), totalPages: 1, totalElements: 2 });

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    const siguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(siguiente).toBeDisabled();
  });

  it('clicking Siguiente on a non-last page increments page and calls searchApplicants', async () => {
    const user = userEvent.setup();
    setupAuth();
    setupApi({ content: makeApplicants(2), totalPages: 3, totalElements: 30 });

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    // Initially Siguiente should be enabled (3 pages, on page 0)
    const siguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(siguiente).not.toBeDisabled();

    await user.click(siguiente);

    await waitFor(() => {
      expect(searchApplicants).toHaveBeenCalledWith(expect.any(String), 1);
    });
  });
});

// ── Domain: Role-gated Evaluar ─────────────────────────────────────────────

describe('Applicants — role-gated Evaluar action', () => {
  it('renders Evaluar button for ADMIN role', async () => {
    setupAuth('ADMIN');
    setupApi();

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    expect(screen.getAllByRole('button', { name: /evaluar/i }).length).toBeGreaterThan(0);
  });

  it('renders Evaluar button for ANALYST role', async () => {
    setupAuth('ANALYST');
    setupApi();

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    expect(screen.getAllByRole('button', { name: /evaluar/i }).length).toBeGreaterThan(0);
  });

  it('does NOT render Evaluar button for RISK_MANAGER role', async () => {
    setupAuth('RISK_MANAGER');
    setupApi();

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    expect(screen.queryByRole('button', { name: /evaluar/i })).not.toBeInTheDocument();
  });
});

// ── Domain: Navigation targets ─────────────────────────────────────────────

describe('Applicants — navigation targets', () => {
  it('+ Nuevo Solicitante navigates to /solicitantes/nuevo', async () => {
    const user = userEvent.setup();
    setupAuth();
    setupApi();

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    await user.click(screen.getByRole('button', { name: /nuevo solicitante/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes/nuevo');
  });

  it('Editar navigates to /solicitantes/:id/editar', async () => {
    const user = userEvent.setup();
    setupAuth();
    const content = [{ ...makeApplicants(1)[0], id: '42' }];
    searchApplicants.mockResolvedValue({ content, totalPages: 1, totalElements: 1 });

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes/42/editar');
  });

  it('Financiero navigates to /solicitantes/:id/financiero', async () => {
    const user = userEvent.setup();
    setupAuth();
    const content = [{ ...makeApplicants(1)[0], id: '42' }];
    searchApplicants.mockResolvedValue({ content, totalPages: 1, totalElements: 1 });

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    await user.click(screen.getByRole('button', { name: /financiero/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes/42/financiero');
  });

  it('Evaluar navigates to /evaluaciones/nueva?applicantId=:id', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');
    const content = [{ ...makeApplicants(1)[0], id: '42' }];
    searchApplicants.mockResolvedValue({ content, totalPages: 1, totalElements: 1 });

    render(<Applicants />);
    await waitFor(() => screen.getByRole('table'));

    await user.click(screen.getByRole('button', { name: /evaluar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/nueva?applicantId=42');
  });
});

// ── Domain: Empty state ────────────────────────────────────────────────────

describe('Applicants — empty state', () => {
  it('renders empty-state element and no table rows when content is []', async () => {
    setupAuth();
    searchApplicants.mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });

    render(<Applicants />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron solicitantes/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

// ── Domain: Error state ────────────────────────────────────────────────────

describe('Applicants — error state', () => {
  it('renders error message and no table rows when searchApplicants rejects', async () => {
    setupAuth();
    searchApplicants.mockRejectedValue(new Error('Network error'));

    render(<Applicants />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
