import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reports from './Reports';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/client', () => ({
  getRiskDistribution: vi.fn(),
  getRiskDistributionPdfUrl: vi.fn(() => '/pdf'),
  getModelEffectiveness: vi.fn(),
  getModelEffectivenessPdfUrl: vi.fn(() => '/pdf'),
  getAnalystActivity: vi.fn(),
  getAnalystActivityPdfUrl: vi.fn(() => '/pdf'),
  getAnalystActivityCsvUrl: vi.fn(() => '/csv'),
}));

import { useAuth } from '../context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────

function setupRole(role) {
  useAuth.mockReturnValue({ auth: { role } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Domain: Tab role-gating ────────────────────────────────────────────────

describe('Reports — tab role-gating', () => {
  it('ADMIN sees exactly 3 tabs: Distribución de Riesgo, Efectividad del Modelo, Actividad de Analistas', () => {
    setupRole('ADMIN');
    render(<Reports />);

    const tabs = screen.getAllByRole('button', { name: /distribución de riesgo|efectividad del modelo|actividad de analistas/i });
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('button', { name: /distribución de riesgo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /efectividad del modelo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /actividad de analistas/i })).toBeInTheDocument();
  });

  it('RISK_MANAGER sees exactly 2 tabs: Distribución de Riesgo and Efectividad del Modelo; Actividad not present', () => {
    setupRole('RISK_MANAGER');
    render(<Reports />);

    const tabs = screen.getAllByRole('button', { name: /distribución de riesgo|efectividad del modelo/i });
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole('button', { name: /distribución de riesgo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /efectividad del modelo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actividad de analistas/i })).not.toBeInTheDocument();
  });

  it('CREDIT_SUPERVISOR sees exactly 2 tabs: Efectividad del Modelo and Actividad de Analistas; Distribución not present', () => {
    setupRole('CREDIT_SUPERVISOR');
    render(<Reports />);

    const tabs = screen.getAllByRole('button', { name: /efectividad del modelo|actividad de analistas/i });
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole('button', { name: /efectividad del modelo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /actividad de analistas/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /distribución de riesgo/i })).not.toBeInTheDocument();
  });

  it('VIEWER role sees no tab bar and sees access-denied alert', () => {
    setupRole('VIEWER');
    render(<Reports />);

    expect(screen.queryByRole('button', { name: /distribución de riesgo|efectividad del modelo|actividad de analistas/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no tiene acceso|no tienes acceso|rol no tiene acceso/i)).toBeInTheDocument();
  });

  it('unknown/anonymous role sees no tab bar and sees access-denied alert', () => {
    setupRole(undefined);
    render(<Reports />);

    expect(screen.queryByRole('button', { name: /distribución de riesgo|efectividad del modelo|actividad de analistas/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no tiene acceso|no tienes acceso|rol no tiene acceso/i)).toBeInTheDocument();
  });
});

// ── Domain: Tab switching ──────────────────────────────────────────────────

describe('Reports — tab switching', () => {
  it('ADMIN default active tab is Distribución de Riesgo (first tab in availableTabs)', () => {
    setupRole('ADMIN');
    render(<Reports />);

    const distBtn = screen.getByRole('button', { name: /distribución de riesgo/i });
    expect(distBtn.className).toMatch(/active/);
  });

  it('clicking Efectividad del Modelo tab gives it the active class', async () => {
    const user = userEvent.setup();
    setupRole('ADMIN');
    render(<Reports />);

    const efectBtn = screen.getByRole('button', { name: /efectividad del modelo/i });
    await user.click(efectBtn);

    expect(efectBtn.className).toMatch(/active/);
  });

  it('after clicking Efectividad, Distribución tab no longer has active class', async () => {
    const user = userEvent.setup();
    setupRole('ADMIN');
    render(<Reports />);

    const distBtn = screen.getByRole('button', { name: /distribución de riesgo/i });
    const efectBtn = screen.getByRole('button', { name: /efectividad del modelo/i });

    await user.click(efectBtn);

    expect(distBtn.className).not.toMatch(/\bactive\b/);
    expect(efectBtn.className).toMatch(/\bactive\b/);
  });
});

// ── Domain: Tab styling — adopts .tabs / .tab-btn classes ─────────────────

describe('Reports — tab class adoption (no inline styles)', () => {
  it('tab wrapper has class "tabs"', () => {
    setupRole('ADMIN');
    render(<Reports />);

    // The .tabs container is a div wrapping the tab buttons
    const tabsContainer = document.querySelector('.tabs');
    expect(tabsContainer).not.toBeNull();
  });

  it('each tab button has class "tab-btn"', () => {
    setupRole('ADMIN');
    render(<Reports />);

    const tabBtns = document.querySelectorAll('.tab-btn');
    expect(tabBtns.length).toBeGreaterThanOrEqual(3);
  });
});
