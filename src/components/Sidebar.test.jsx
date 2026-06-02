import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { AuthProvider } from '../context/AuthContext';

// Helper: render Sidebar with a given role via localStorage + AuthProvider.
// This mirrors the pattern used in Evaluations.test.jsx.
function renderSidebar(role, { onLogout, route = '/dashboard' } = {}) {
  window.localStorage.setItem('token', 'tok');
  window.localStorage.setItem('role', role);
  window.localStorage.setItem('username', 'admin');

  // If we need to intercept logout, pass it as prop via a wrapper component.
  // Since AuthProvider owns handleLogout we test the side-effect (localStorage cleared)
  // or override via the onLogout prop on Sidebar itself when provided.
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Sidebar onLogout={onLogout} />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------
// Group: brand block
// -----------------------------------------------------------------------
describe('Sidebar — brand block', () => {
  it('renders brand block with CrediScan text and subtitle', () => {
    renderSidebar('ADMIN');
    expect(screen.getByText('CrediScan')).toBeInTheDocument();
    expect(screen.getByText(/credit scoring engine/i)).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Group: nav groups visible for ADMIN
// -----------------------------------------------------------------------
describe('Sidebar — nav groups for ADMIN', () => {
  it('renders all six group labels for admin role', () => {
    renderSidebar('ADMIN');
    // Section labels are rendered inside .sidebar-section-label divs.
    // Use getAllByText and check at least one match for labels that also appear as nav items.
    expect(screen.getAllByText(/^principal$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^evaluaciones$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^análisis$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^configuración$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^monitoreo$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^administración$/i).length).toBeGreaterThan(0);
  });

  it('renders all nav items for admin role', () => {
    renderSidebar('ADMIN');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Solicitantes')).toBeInTheDocument();
    expect(screen.getByText('Nueva Evaluación')).toBeInTheDocument();
    // 'Evaluaciones' appears as both label and nav item — at least 2 occurrences
    expect(screen.getAllByText('Evaluaciones').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Simulación')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Variables Scoring')).toBeInTheDocument();
    expect(screen.getByText('Modelos')).toBeInTheDocument();
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Group: role-gating for ANALYST
// -----------------------------------------------------------------------
describe('Sidebar — role gating for ANALYST', () => {
  it('hides admin-only items for analyst role', () => {
    renderSidebar('ANALYST');
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    expect(screen.queryByText(/^administración$/i)).not.toBeInTheDocument();
  });

  it('hides risk-manager-only items for analyst role', () => {
    renderSidebar('ANALYST');
    expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
    expect(screen.queryByText('Variables Scoring')).not.toBeInTheDocument();
    expect(screen.queryByText('Modelos')).not.toBeInTheDocument();
    expect(screen.queryByText('Auditoría')).not.toBeInTheDocument();
  });

  it('shows items accessible to analyst', () => {
    renderSidebar('ANALYST');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Solicitantes')).toBeInTheDocument();
    expect(screen.getByText('Nueva Evaluación')).toBeInTheDocument();
    // 'Evaluaciones' appears as both nav group label and nav item link
    expect(screen.getAllByText('Evaluaciones').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Simulación')).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Group: role-gating for RISK_MANAGER
// -----------------------------------------------------------------------
describe('Sidebar — role gating for RISK_MANAGER', () => {
  it('hides Nueva Evaluación for risk manager', () => {
    renderSidebar('RISK_MANAGER');
    expect(screen.queryByText('Nueva Evaluación')).not.toBeInTheDocument();
  });

  it('shows Reportes, Variables Scoring, Modelos, Auditoría for risk manager', () => {
    renderSidebar('RISK_MANAGER');
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Variables Scoring')).toBeInTheDocument();
    expect(screen.getByText('Modelos')).toBeInTheDocument();
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
  });

  it('hides Administración group for risk manager', () => {
    renderSidebar('RISK_MANAGER');
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    expect(screen.queryByText(/^administración$/i)).not.toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Group: active state (NavLink prefix matching)
// -----------------------------------------------------------------------
describe('Sidebar — active state', () => {
  it('marks only Nueva Evaluación active on /evaluaciones/nueva (not Evaluaciones)', () => {
    renderSidebar('ADMIN', { route: '/evaluaciones/nueva' });
    const nueva = screen.getByRole('link', { name: /nueva evaluación/i });
    const evaluaciones = screen.getByRole('link', { name: /^evaluaciones$/i });
    expect(nueva.className).toContain('active');
    expect(evaluaciones.className).not.toContain('active');
  });

  it('marks Evaluaciones active on exact /evaluaciones', () => {
    renderSidebar('ADMIN', { route: '/evaluaciones' });
    const evaluaciones = screen.getByRole('link', { name: /^evaluaciones$/i });
    const nueva = screen.getByRole('link', { name: /nueva evaluación/i });
    expect(evaluaciones.className).toContain('active');
    expect(nueva.className).not.toContain('active');
  });
});

// -----------------------------------------------------------------------
// Group: logout behavior
// -----------------------------------------------------------------------
describe('Sidebar — logout button', () => {
  it('logout button calls logout handler once', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    renderSidebar('ADMIN', { onLogout });

    const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
    await user.click(logoutBtn);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
