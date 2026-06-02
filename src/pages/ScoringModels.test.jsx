import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoringModels from './ScoringModels';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  getScoringModels: vi.fn(),
  createScoringModel: vi.fn(),
  activateModel: vi.fn(),
  deleteScoringModel: vi.fn(),
  getKnockoutRules: vi.fn(),
  createKnockoutRule: vi.fn(),
  deleteKnockoutRule: vi.fn(),
  compareScoringModels: vi.fn(),
}));

import {
  getScoringModels,
  createScoringModel,
  activateModel,
  deleteScoringModel,
  getKnockoutRules,
  createKnockoutRule,
  deleteKnockoutRule,
  compareScoringModels,
} from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeModel(overrides = {}) {
  return {
    id: 'model-1',
    nombre: 'Modelo Retail',
    version: 1,
    estado: 'DRAFT',
    descripcion: 'Test model',
    ...overrides,
  };
}

function makeRule(overrides = {}) {
  return {
    id: 'rule-1',
    campo: 'score_buro',
    operador: 'GT',
    umbral: 500,
    prioridad: 1,
    mensaje: 'Score muy bajo',
    ...overrides,
  };
}

beforeEach(() => {
  getScoringModels.mockReset();
  createScoringModel.mockReset();
  activateModel.mockReset();
  deleteScoringModel.mockReset();
  getKnockoutRules.mockReset();
  createKnockoutRule.mockReset();
  deleteKnockoutRule.mockReset();
  compareScoringModels.mockReset();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

// ── T1: Models list renders with correct badge classes ─────────────────────

describe('ScoringModels — models list: badge classes', () => {
  it('renders badge-ACTIVE class for ACTIVE model', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'ACTIVE' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('ACTIVE')).toBeInTheDocument());
    expect(document.querySelector('.badge-ACTIVE')).toBeInTheDocument();
  });

  it('renders badge-DRAFT class for DRAFT model', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'DRAFT' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('DRAFT')).toBeInTheDocument());
    expect(document.querySelector('.badge-DRAFT')).toBeInTheDocument();
  });

  it('renders badge-INACTIVE class for INACTIVE model', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'INACTIVE' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('INACTIVE')).toBeInTheDocument());
    expect(document.querySelector('.badge-INACTIVE')).toBeInTheDocument();
  });

  it('renders model nombre and version', async () => {
    getScoringModels.mockResolvedValue([makeModel({ nombre: 'Modelo Retail', version: 2 })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('Modelo Retail')).toBeInTheDocument());
    expect(screen.getByText('v2')).toBeInTheDocument();
  });
});

// ── T2: Empty state renders ModelIcon (not emoji) ──────────────────────────

describe('ScoringModels — empty state', () => {
  it('renders the empty-state-icon container when no models', async () => {
    getScoringModels.mockResolvedValue([]);
    render(<ScoringModels />);
    await waitFor(() =>
      expect(screen.getByText('No hay modelos de scoring configurados.')).toBeInTheDocument()
    );
    const iconContainer = document.querySelector('.empty-state-icon');
    expect(iconContainer).toBeInTheDocument();
    // Must not contain the old emoji
    expect(iconContainer.textContent).not.toContain('🏗');
    // Should contain an SVG (ModelIcon)
    expect(iconContainer.querySelector('svg')).toBeInTheDocument();
  });
});

// ── T3: Create form toggle + submit ───────────────────────────────────────

describe('ScoringModels — create form', () => {
  it('toggles the create form when clicking the Crear Modelo button', async () => {
    getScoringModels.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => screen.getByText('No hay modelos de scoring configurados.'));

    const createBtn = screen.getByRole('button', { name: /crear modelo/i });
    await user.click(createBtn);
    expect(screen.getByRole('heading', { name: /nuevo modelo/i })).toBeInTheDocument();

    // Click the toggle button (now shows "Cancelar" as the header action)
    await user.click(screen.getAllByRole('button', { name: /cancelar/i })[0]);
    expect(screen.queryByRole('heading', { name: /nuevo modelo/i })).not.toBeInTheDocument();
  });

  it('calls createScoringModel with form data on submit and shows success alert', async () => {
    getScoringModels.mockResolvedValue([]);
    createScoringModel.mockResolvedValue({ id: 'new-1', nombre: 'Nuevo', version: 1, estado: 'DRAFT' });
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => screen.getByText('No hay modelos de scoring configurados.'));

    await user.click(screen.getByRole('button', { name: /crear modelo/i }));
    await user.type(screen.getByPlaceholderText(/ej: modelo retail/i), 'Mi Modelo');
    await user.click(screen.getByRole('button', { name: /crear modelo/i }));

    await waitFor(() =>
      expect(createScoringModel).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Mi Modelo' })
      )
    );
  });
});

// ── T4: Activar button behavior ────────────────────────────────────────────

describe('ScoringModels — Activar button', () => {
  it('shows Activar button for DRAFT model', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'DRAFT' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('DRAFT')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument();
  });

  it('does NOT show Activar button for ACTIVE model', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'ACTIVE' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('ACTIVE')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /activar/i })).not.toBeInTheDocument();
  });

  it('calls activateModel with model id when clicked', async () => {
    activateModel.mockResolvedValue({});
    getScoringModels.mockResolvedValue([makeModel({ id: 'model-abc', estado: 'DRAFT' })]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /activar/i }));
    await waitFor(() => expect(activateModel).toHaveBeenCalledWith('model-abc'));
  });
});

// ── T5: Eliminar button behavior ───────────────────────────────────────────

describe('ScoringModels — Eliminar button', () => {
  it('shows Eliminar button only for DRAFT models', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'DRAFT' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('DRAFT')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('does NOT show Eliminar button for ACTIVE models', async () => {
    getScoringModels.mockResolvedValue([makeModel({ estado: 'ACTIVE' })]);
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('ACTIVE')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('calls deleteScoringModel after confirm dialog', async () => {
    deleteScoringModel.mockResolvedValue({});
    getScoringModels.mockResolvedValue([makeModel({ id: 'model-del', nombre: 'Borrable', estado: 'DRAFT' })]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => expect(deleteScoringModel).toHaveBeenCalledWith('model-del'));
  });
});

// ── T6: KO expand toggle + rules list + operator badge ────────────────────

describe('ScoringModels — KO expand panel', () => {
  it('loads getKnockoutRules when expanding a model row', async () => {
    getKnockoutRules.mockResolvedValue([makeRule()]);
    getScoringModels.mockResolvedValue([makeModel()]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('Modelo Retail')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ko rules/i }));
    await waitFor(() => expect(getKnockoutRules).toHaveBeenCalledWith('model-1'));
  });

  it('renders KO rules with base .badge class (not .badge-DRAFT) for operator', async () => {
    getKnockoutRules.mockResolvedValue([makeRule({ operador: 'GT' })]);
    getScoringModels.mockResolvedValue([makeModel()]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('Modelo Retail')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ko rules/i }));
    await waitFor(() => expect(screen.getByText('GT')).toBeInTheDocument());

    const operatorBadge = screen.getByText('GT').closest('.badge');
    expect(operatorBadge).toBeInTheDocument();
    expect(operatorBadge).not.toHaveClass('badge-DRAFT');
  });
});

// ── T7: Add KO rule form ───────────────────────────────────────────────────

describe('ScoringModels — Add KO rule form', () => {
  it('calls createKnockoutRule with form data and appends new rule', async () => {
    getKnockoutRules.mockResolvedValue([]);
    const newRule = makeRule({ id: 'rule-new', campo: 'score_buro', operador: 'LT', umbral: 300, mensaje: 'Score bajo', prioridad: 1 });
    createKnockoutRule.mockResolvedValue(newRule);
    getScoringModels.mockResolvedValue([makeModel()]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('Modelo Retail')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ko rules/i }));
    await waitFor(() => screen.getByRole('button', { name: /agregar regla/i }));
    await user.click(screen.getByRole('button', { name: /agregar regla/i }));

    const umbralInput = screen.getByPlaceholderText('0');
    await user.type(umbralInput, '300');
    const mensajeInput = screen.getByPlaceholderText(/descripción del rechazo/i);
    await user.type(mensajeInput, 'Score bajo');

    await user.click(screen.getByRole('button', { name: /guardar regla/i }));
    await waitFor(() => expect(createKnockoutRule).toHaveBeenCalledWith(
      'model-1',
      expect.objectContaining({ umbral: 300, mensaje: 'Score bajo' })
    ));
  });
});

// ── T8: Delete KO rule ────────────────────────────────────────────────────

describe('ScoringModels — Delete KO rule', () => {
  it('calls deleteKnockoutRule after confirm and removes rule from list', async () => {
    getKnockoutRules.mockResolvedValue([makeRule({ id: 'rule-del' })]);
    deleteKnockoutRule.mockResolvedValue({});
    getScoringModels.mockResolvedValue([makeModel()]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('Modelo Retail')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ko rules/i }));
    await waitFor(() => screen.getByText('Score muy bajo'));

    // The delete button in KO rules table is a small btn-xs btn-danger with "✕" text
    const deleteButtons = screen.getAllByRole('button');
    const koDeleteBtn = deleteButtons.find(b => b.classList.contains('btn-xs'));
    expect(koDeleteBtn).toBeTruthy();
    await user.click(koDeleteBtn);

    await waitFor(() => expect(deleteKnockoutRule).toHaveBeenCalledWith('model-1', 'rule-del'));
  });
});

// ── T9: Compare panel ─────────────────────────────────────────────────────

describe('ScoringModels — Compare panel', () => {
  it('shows compare error when no models selected', async () => {
    getScoringModels.mockResolvedValue([
      makeModel({ id: '1', nombre: 'ModelA', estado: 'ACTIVE' }),
      makeModel({ id: '2', nombre: 'ModelB', estado: 'ACTIVE' }),
    ]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('ModelA')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /comparar modelos/i }));
    await user.click(screen.getByRole('button', { name: /^comparar$/i }));

    await waitFor(() =>
      expect(screen.getByText(/seleccioná los dos modelos/i)).toBeInTheDocument()
    );
  });

  it('shows error when same model selected for both', async () => {
    getScoringModels.mockResolvedValue([
      makeModel({ id: '1', nombre: 'ModelA', estado: 'ACTIVE' }),
      makeModel({ id: '2', nombre: 'ModelB', estado: 'ACTIVE' }),
    ]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('ModelA')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /comparar modelos/i }));

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    await user.selectOptions(selects[1], '1');
    await user.click(screen.getByRole('button', { name: /^comparar$/i }));

    await waitFor(() =>
      expect(screen.getByText(/seleccioná modelos distintos/i)).toBeInTheDocument()
    );
  });

  it('calls compareScoringModels and renders compare-pre on success', async () => {
    const compareData = { diferencias: ['campo1'], resumen: 'ok' };
    compareScoringModels.mockResolvedValue(compareData);
    getScoringModels.mockResolvedValue([
      makeModel({ id: '1', nombre: 'ModelA', estado: 'ACTIVE' }),
      makeModel({ id: '2', nombre: 'ModelB', estado: 'ACTIVE' }),
    ]);
    const user = userEvent.setup();
    render(<ScoringModels />);
    await waitFor(() => expect(screen.getByText('ModelA')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /comparar modelos/i }));

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    await user.selectOptions(selects[1], '2');
    await user.click(screen.getByRole('button', { name: /^comparar$/i }));

    await waitFor(() =>
      expect(compareScoringModels).toHaveBeenCalledWith('1', '2')
    );
    await waitFor(() => expect(document.querySelector('.compare-pre')).toBeInTheDocument());
  });
});
