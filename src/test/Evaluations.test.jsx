import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Evaluations from '../pages/Evaluations';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../api/client', () => ({
  searchEvaluations: vi.fn(),
  getEvaluationsExportUrl: vi.fn(() => 'http://test/export'),
}));

function renderWithAuth(role) {
  window.localStorage.setItem('token', 'tok');
  window.localStorage.setItem('role', role);
  window.localStorage.setItem('username', 'tester');
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Evaluations />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('<Evaluations />', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows ID lookup form to ANALYST and warns no search permission', async () => {
    renderWithAuth('ANALYST');
    expect(screen.getByText(/Consultar Evaluación por ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Tu rol no permite listar evaluaciones/i)).toBeInTheDocument();
  });

  it('renders advanced search and table when ADMIN', async () => {
    const { searchEvaluations } = await import('../api/client');
    searchEvaluations.mockResolvedValue({
      content: [{
        evaluationId: '11111111-2222-3333-4444-555555555555',
        applicantName: 'Juan Perez',
        evaluatedAt: '2026-05-10T10:00:00Z',
        score: 720.5,
        riskLevel: 'LOW',
        decisionStatus: 'APPROVED',
        analista: 'jperez',
      }],
      pageNumber: 0,
      pageSize: 25,
      totalElements: 1,
      totalPages: 1,
    });

    renderWithAuth('ADMIN');

    expect(screen.getByText(/Búsqueda Avanzada/i)).toBeInTheDocument();
    await waitFor(() => expect(searchEvaluations).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
    // El backend envía enums en inglés (LOW/APPROVED); la UI los muestra traducidos.
    // "Aprobado" y "Bajo" aparecen como filtro-checkbox y en la fila: aceptamos múltiples.
    expect(screen.getAllByText('Aprobado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bajo').length).toBeGreaterThan(0);
  });

  it('shows empty state when no results', async () => {
    const { searchEvaluations } = await import('../api/client');
    searchEvaluations.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0 });
    renderWithAuth('RISK_MANAGER');
    await waitFor(() => expect(searchEvaluations).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/No se encontraron evaluaciones/i)).toBeInTheDocument());
  });
});
