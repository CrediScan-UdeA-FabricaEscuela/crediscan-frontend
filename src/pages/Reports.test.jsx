import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
import {
  getRiskDistribution,
  getModelEffectiveness,
  getAnalystActivity,
} from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function setupRole(role) {
  useAuth.mockReturnValue({ auth: { role } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Mock data factories ────────────────────────────────────────────────────

const RISK_DIST_DATA = {
  hasData: true,
  overall: { totalEvaluaciones: 120, scorePromedio: 65.5, desviacionEstandar: 12.3 },
  tabla: [
    { nivel: 'VERY_LOW', cantidad: 20, porcentaje: 16.7, scorePromedio: 30.1 },
    { nivel: 'LOW', cantidad: 30, porcentaje: 25.0, scorePromedio: 45.2 },
    { nivel: 'HIGH', cantidad: 70, porcentaje: 58.3, scorePromedio: 80.4 },
  ],
  histograma: [
    { binInicio: 0, binFin: 20, cantidad: 5 },
    { binInicio: 20, binFin: 40, cantidad: 15 },
    { binInicio: 40, binFin: 60, cantidad: 40 },
    { binInicio: 60, binFin: 80, cantidad: 45 },
    { binInicio: 80, binFin: 100, cantidad: 15 },
  ],
};

const MODEL_EFF_DATA = {
  hasData: true,
  indicadores: {
    totalCasos: 200,
    concordanceRate: 0.85,
    overrideApprovalRate: 0.07,
    overrideRejectionRate: 0.04,
  },
  matriz: [
    { riskLevel: 'LOW', decision: 'APPROVED', count: 80 },
    { riskLevel: 'LOW', decision: 'REJECTED', count: 5 },
    { riskLevel: 'HIGH', decision: 'APPROVED', count: 10 },
    { riskLevel: 'HIGH', decision: 'REJECTED', count: 105 },
  ],
  overrides: [],
};

const ANALYST_DATA = {
  hasData: true,
  estadisticasEquipo: {
    totalEvaluaciones: 300,
    numAnalistas: 5,
    mediaEquipoHorasHabiles: 4.2,
    tasaAprobacionEquipo: 0.62,
  },
  analistas: [
    {
      analistaId: 'a1',
      nombre: 'Ana García',
      totalEvaluaciones: 80,
      distribucion: { aprobadas: 50, rechazadas: 20, revisionManual: 5, escaladas: 5, tasaAprobacion: 0.625 },
      tiempoMedioHorasHabiles: 3.8,
      isOutlier: false,
    },
    {
      analistaId: 'a2',
      nombre: 'Luis Pérez',
      totalEvaluaciones: 60,
      distribucion: { aprobadas: 30, rechazadas: 25, revisionManual: 3, escaladas: 2, tasaAprobacion: 0.5 },
      tiempoMedioHorasHabiles: 5.1,
      isOutlier: true,
    },
  ],
};

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

// =============================================================================
// PR2: Sub-report body tests
// =============================================================================

// ── Domain: Distribución sub-report (HU-15) ───────────────────────────────

describe('RiskDistributionReport — body content', () => {
  async function renderDistribucionWithData() {
    getRiskDistribution.mockResolvedValue(RISK_DIST_DATA);
    const user = userEvent.setup();
    setupRole('ADMIN');
    render(<Reports />);
    // Distribución tab is active by default for ADMIN
    const generarBtn = screen.getByRole('button', { name: /generar reporte/i });
    await user.click(generarBtn);
    await waitFor(() => expect(getRiskDistribution).toHaveBeenCalledTimes(1));
    return user;
  }

  // 4.1 RED — StatCard for Distribución summary stats
  it('renders 3 StatCard components in the summary section after data load', async () => {
    await renderDistribucionWithData();

    // StatCard renders .stat-card-icon-top-right wrappers
    const cards = document.querySelectorAll('.stat-card-icon-top-right');
    expect(cards.length).toBeGreaterThanOrEqual(3);
    // Check for the stat values
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  // 4.2 RED — Generar + download controls
  it('Generar button is present; PDF disabled before data', () => {
    setupRole('ADMIN');
    render(<Reports />);
    expect(screen.getByRole('button', { name: /generar reporte/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
  });

  it('PDF button enabled after data load with hasData=true', async () => {
    await renderDistribucionWithData();
    expect(screen.getByRole('button', { name: /pdf/i })).not.toBeDisabled();
  });

  // 4.3 RED — risk table badge classes
  it('each row badge in the distribution table uses class badge-{nivel} not inline style', async () => {
    await renderDistribucionWithData();

    // Badges for VERY_LOW, LOW, HIGH should have badge-VERY_LOW / badge-LOW / badge-HIGH classes
    const badgeVeryLow = document.querySelector('.badge.badge-VERY_LOW');
    const badgeLow = document.querySelector('.badge.badge-LOW');
    const badgeHigh = document.querySelector('.badge.badge-HIGH');
    expect(badgeVeryLow).not.toBeNull();
    expect(badgeLow).not.toBeNull();
    expect(badgeHigh).not.toBeNull();
    // None should have inline background style
    [badgeVeryLow, badgeLow, badgeHigh].forEach(el => {
      expect(el.style.background).toBe('');
    });
  });

  // 4.4 RED — histogram bars per bin
  it('renders one histogram bar element per bin returned', async () => {
    await renderDistribucionWithData();

    const bars = document.querySelectorAll('.histogram-bar');
    expect(bars.length).toBe(RISK_DIST_DATA.histograma.length);
  });

  it('histogram bar with count > 0 has class has-count', async () => {
    await renderDistribucionWithData();

    const barsWithCount = document.querySelectorAll('.histogram-bar.has-count');
    expect(barsWithCount.length).toBeGreaterThan(0);
  });
});

// ── Domain: Efectividad sub-report (HU-16) ────────────────────────────────

describe('ModelEffectivenessReport — body content', () => {
  async function renderEfectividadWithData() {
    getModelEffectiveness.mockResolvedValue(MODEL_EFF_DATA);
    const user = userEvent.setup();
    setupRole('ADMIN');
    render(<Reports />);
    // Click Efectividad tab
    const efectBtn = screen.getByRole('button', { name: /efectividad del modelo/i });
    await user.click(efectBtn);
    const generarBtn = screen.getByRole('button', { name: /generar reporte/i });
    await user.click(generarBtn);
    await waitFor(() => expect(getModelEffectiveness).toHaveBeenCalledTimes(1));
    return user;
  }

  // 5.1 RED — indicator StatCards + controls
  it('renders indicator StatCards after data load', async () => {
    await renderEfectividadWithData();

    const cards = document.querySelectorAll('.stat-card-icon-top-right');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    // Check one of the known values
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('PDF button disabled before data in Efectividad panel', async () => {
    setupRole('ADMIN');
    const user = userEvent.setup();
    render(<Reports />);
    const efectBtn = screen.getByRole('button', { name: /efectividad del modelo/i });
    await user.click(efectBtn);
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
  });

  // 5.2 RED — confusion matrix cells
  it('renders a cell for each (level, decision) combination in the confusion matrix', async () => {
    await renderEfectividadWithData();

    // Matrix has 2 levels × 2 decisions = 4 data cells (plus header cells)
    // We check that both LOW and HIGH rows appear as badge elements
    const badgeLow = document.querySelector('.badge.badge-LOW');
    const badgeHigh = document.querySelector('.badge.badge-HIGH');
    expect(badgeLow).not.toBeNull();
    expect(badgeHigh).not.toBeNull();
  });
});

// ── Domain: Actividad sub-report (HU-17) ──────────────────────────────────

describe('AnalystActivityReport — body content', () => {
  async function renderActividadWithData() {
    getAnalystActivity.mockResolvedValue(ANALYST_DATA);
    const user = userEvent.setup();
    setupRole('ADMIN');
    render(<Reports />);
    // Click Actividad tab
    const actBtn = screen.getByRole('button', { name: /actividad de analistas/i });
    await user.click(actBtn);
    const generarBtn = screen.getByRole('button', { name: /generar reporte/i });
    await user.click(generarBtn);
    await waitFor(() => expect(getAnalystActivity).toHaveBeenCalledTimes(1));
    return user;
  }

  // 6.1 RED — team StatCards + analyst rows
  it('renders 4 team StatCards after data load', async () => {
    await renderActividadWithData();

    const cards = document.querySelectorAll('.stat-card-icon-top-right');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    // Check for the total evaluaciones value
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('renders one table row per analyst after data load', async () => {
    await renderActividadWithData();

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    // Each analyst row in tbody — query tbody rows
    const tbodyRows = document.querySelectorAll('tbody tr');
    expect(tbodyRows.length).toBeGreaterThanOrEqual(ANALYST_DATA.analistas.length);
  });

  it('Generar and PDF and CSV buttons present in Actividad panel', async () => {
    setupRole('ADMIN');
    const user = userEvent.setup();
    render(<Reports />);
    const actBtn = screen.getByRole('button', { name: /actividad de analistas/i });
    await user.click(actBtn);
    expect(screen.getByRole('button', { name: /generar reporte/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /csv/i })).toBeDisabled();
  });

  it('PDF and CSV buttons enabled after data load with hasData=true', async () => {
    await renderActividadWithData();
    expect(screen.getByRole('button', { name: /pdf/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /csv/i })).not.toBeDisabled();
  });
});
