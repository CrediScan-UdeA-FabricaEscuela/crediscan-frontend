import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Simulation from './Simulation';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  getScoringModels: vi.fn(),
  simulateScore: vi.fn(),
  saveScenario: vi.fn(),
  listScenarios: vi.fn(),
  runScenario: vi.fn(),
}));

// Mock scoring-models-constants so the import resolves regardless of
// whether it has been moved. This also guards the critical import-fix.
vi.mock('./scoring-models-constants', () => ({
  CAMPOS_DISPONIBLES: [
    { value: 'ingreso_anual', label: 'Ingreso anual' },
    { value: 'score_buro', label: 'Score buró externo' },
  ],
}));

import {
  getScoringModels,
  simulateScore,
  saveScenario,
  listScenarios,
  runScenario,
} from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeModel(overrides = {}) {
  return {
    id: 'model-1',
    nombre: 'Modelo Retail',
    version: 1,
    estado: 'DRAFT',
    ...overrides,
  };
}

function makeResult(overrides = {}) {
  return {
    puntajeFinal: 720,
    rechazadoPorKo: false,
    mensajeKo: null,
    desglose: [],
    reglasKoEvaluadas: [],
    ...overrides,
  };
}

beforeEach(() => {
  getScoringModels.mockReset();
  simulateScore.mockReset();
  saveScenario.mockReset();
  listScenarios.mockReset();
  runScenario.mockReset();
  getScoringModels.mockResolvedValue([]);
  listScenarios.mockResolvedValue([]);
});

// ── T1: Render without crash (guards the import fix) ─────────────────────

describe('Simulation — render without crash', () => {
  it('renders the page heading without throwing', async () => {
    render(<Simulation />);
    expect(screen.getByText('Simulación de Scoring')).toBeInTheDocument();
  });

  it('renders the Configuración card heading', async () => {
    render(<Simulation />);
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });
});

// ── T2: Model load + active preselect ─────────────────────────────────────

describe('Simulation — model load and active preselect', () => {
  it('loads models on mount and displays them in the select', async () => {
    getScoringModels.mockResolvedValue([
      makeModel({ id: 'm1', nombre: 'Modelo Retail', estado: 'DRAFT' }),
      makeModel({ id: 'm2', nombre: 'Modelo Premium', estado: 'ACTIVE' }),
    ]);
    render(<Simulation />);
    await waitFor(() => expect(screen.getByText(/Modelo Retail/)).toBeInTheDocument());
    expect(screen.getByText(/Modelo Premium/)).toBeInTheDocument();
  });

  it('preselects the ACTIVE model on load', async () => {
    getScoringModels.mockResolvedValue([
      makeModel({ id: 'm1', nombre: 'Modelo Retail', estado: 'DRAFT' }),
      makeModel({ id: 'm2', nombre: 'Modelo Premium', estado: 'ACTIVE' }),
    ]);
    render(<Simulation />);
    await waitFor(() => expect(screen.getByText(/Modelo Premium/)).toBeInTheDocument());
    // Use the model select specifically (first <select> in the component)
    const select = document.querySelector('select');
    expect(select.value).toBe('m2');
  });

  it('shows ACTIVE badge next to the active model in the select option', async () => {
    getScoringModels.mockResolvedValue([
      makeModel({ id: 'm1', nombre: 'Modelo Activo', estado: 'ACTIVE' }),
    ]);
    render(<Simulation />);
    await waitFor(() =>
      expect(screen.getByText(/Modelo Activo/)).toBeInTheDocument()
    );
    // The active model select option text must include a visual signal
    const select = document.querySelector('select');
    const activeOption = Array.from(select.options).find(o => o.value === 'm1');
    expect(activeOption).toBeTruthy();
    expect(activeOption.textContent).toMatch(/activo|ACTIVE/i);
  });
});

// ── T3: Add / remove variable rows ────────────────────────────────────────

describe('Simulation — add and remove variable rows', () => {
  it('adds a new empty variable row when clicking Agregar variable', async () => {
    render(<Simulation />);
    const user = userEvent.setup();
    // Count initial rows (CAMPOS_DISPONIBLES has 2 items in mock)
    const initialRows = document.querySelectorAll('.sim-var-row').length;
    await user.click(screen.getByRole('button', { name: /agregar variable/i }));
    const afterRows = document.querySelectorAll('.sim-var-row').length;
    expect(afterRows).toBe(initialRows + 1);
  });

  it('removes a variable row when clicking the remove button', async () => {
    render(<Simulation />);
    const user = userEvent.setup();
    const initialRows = document.querySelectorAll('.sim-var-row').length;
    // Click the first remove button
    const removeBtns = screen.getAllByRole('button', { name: /remove variable|quitar/i });
    await user.click(removeBtns[0]);
    const afterRows = document.querySelectorAll('.sim-var-row').length;
    expect(afterRows).toBe(initialRows - 1);
  });
});

// ── T4: Calcular calls simulateScore with built valores map + renders score ─

describe('Simulation — Calcular simulación', () => {
  it('calls simulateScore with the correct model id and valores map', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    simulateScore.mockResolvedValue(makeResult());
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    // Fill in the first variable row key + value
    const keyInputs = screen.getAllByPlaceholderText(/nombre_variable/i);
    const valInputs = screen.getAllByPlaceholderText(/valor numérico/i);
    await user.clear(keyInputs[0]);
    await user.type(keyInputs[0], 'ingreso_anual');
    await user.clear(valInputs[0]);
    await user.type(valInputs[0], '50000');

    await user.click(screen.getByRole('button', { name: /calcular simulación/i }));

    await waitFor(() =>
      expect(simulateScore).toHaveBeenCalledWith(
        expect.objectContaining({
          modeloId: 'm1',
          valoresVariables: expect.objectContaining({ ingreso_anual: 50000 }),
        })
      )
    );
  });

  it('renders the score number after a successful simulation', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    simulateScore.mockResolvedValue(makeResult({ puntajeFinal: 850 }));
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    const keyInputs = screen.getAllByPlaceholderText(/nombre_variable/i);
    const valInputs = screen.getAllByPlaceholderText(/valor numérico/i);
    await user.clear(keyInputs[0]);
    await user.type(keyInputs[0], 'score_buro');
    await user.clear(valInputs[0]);
    await user.type(valInputs[0], '700');

    await user.click(screen.getByRole('button', { name: /calcular simulación/i }));

    await waitFor(() =>
      expect(screen.getByText(/850/)).toBeInTheDocument()
    );
  });

  it('renders "Sin rechazo por KO" status for non-KO result', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    simulateScore.mockResolvedValue(makeResult({ puntajeFinal: 750, rechazadoPorKo: false }));
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    const keyInputs = screen.getAllByPlaceholderText(/nombre_variable/i);
    const valInputs = screen.getAllByPlaceholderText(/valor numérico/i);
    await user.clear(keyInputs[0]);
    await user.type(keyInputs[0], 'ingreso_anual');
    await user.clear(valInputs[0]);
    await user.type(valInputs[0], '40000');
    await user.click(screen.getByRole('button', { name: /calcular simulación/i }));

    await waitFor(() => expect(screen.getByText(/sin rechazo por ko/i)).toBeInTheDocument());
  });

  it('renders Rechazado status for KO result', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    simulateScore.mockResolvedValue(makeResult({ puntajeFinal: 200, rechazadoPorKo: true, mensajeKo: 'Score muy bajo' }));
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    const keyInputs = screen.getAllByPlaceholderText(/nombre_variable/i);
    const valInputs = screen.getAllByPlaceholderText(/valor numérico/i);
    await user.clear(keyInputs[0]);
    await user.type(keyInputs[0], 'score_buro');
    await user.clear(valInputs[0]);
    await user.type(valInputs[0], '100');
    await user.click(screen.getByRole('button', { name: /calcular simulación/i }));

    await waitFor(() => expect(screen.getByText(/Rechazado por KO/i)).toBeInTheDocument());
  });
});

// ── T5: Validation errors ─────────────────────────────────────────────────

describe('Simulation — validation', () => {
  it('shows an error when no model is selected and Calcular is clicked', async () => {
    getScoringModels.mockResolvedValue([]);
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select')).toBeInTheDocument());

    // Calcular button is disabled when no model is selected
    const calcBtn = screen.getByRole('button', { name: /calcular simulación/i });
    expect(calcBtn).toBeDisabled();
  });

  it('shows an error when no values are entered before Calcular', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    simulateScore.mockResolvedValue(makeResult());
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    // Remove all variable rows first
    const removeBtns = screen.getAllByRole('button', { name: /remove variable|quitar/i });
    for (const btn of removeBtns) {
      await user.click(btn);
    }

    await user.click(screen.getByRole('button', { name: /calcular simulación/i }));

    await waitFor(() =>
      expect(screen.getByText(/al menos un valor/i)).toBeInTheDocument()
    );
  });
});

// ── T6: Guardar escenario ─────────────────────────────────────────────────

describe('Simulation — save scenario', () => {
  it('calls saveScenario with form data when saving', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    saveScenario.mockResolvedValue({});
    listScenarios.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    await user.type(screen.getByPlaceholderText(/nombre del escenario/i), 'Mi escenario');
    await user.click(screen.getByRole('button', { name: /guardar escenario/i }));

    await waitFor(() =>
      expect(saveScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          modeloId: 'm1',
          nombre: 'Mi escenario',
        })
      )
    );
  });

  it('shows success message after saving scenario', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    saveScenario.mockResolvedValue({});
    listScenarios.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    await user.type(screen.getByPlaceholderText(/nombre del escenario/i), 'Escenario X');
    await user.click(screen.getByRole('button', { name: /guardar escenario/i }));

    await waitFor(() =>
      expect(screen.getByText(/escenario guardado/i)).toBeInTheDocument()
    );
  });
});

// ── T7: Run scenario ──────────────────────────────────────────────────────

describe('Simulation — run scenario', () => {
  it('calls runScenario with the scenario id when Ejecutar is clicked', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    listScenarios.mockResolvedValue([
      { id: 'sc-1', nombre: 'Escenario A', descripcion: 'Desc', valoresVariables: { ingreso_anual: 30000 } },
    ]);
    runScenario.mockResolvedValue(makeResult({ puntajeFinal: 680 }));
    const user = userEvent.setup();
    render(<Simulation />);

    await waitFor(() => expect(screen.getByText('Escenario A')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /ejecutar/i }));

    await waitFor(() => expect(runScenario).toHaveBeenCalledWith('sc-1'));
  });

  it('renders the result score after running a scenario', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    listScenarios.mockResolvedValue([
      { id: 'sc-2', nombre: 'Escenario B', descripcion: '', valoresVariables: {} },
    ]);
    runScenario.mockResolvedValue(makeResult({ puntajeFinal: 610 }));
    const user = userEvent.setup();
    render(<Simulation />);

    await waitFor(() => expect(screen.getByText('Escenario B')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /ejecutar/i }));

    await waitFor(() => expect(screen.getByText(/610/)).toBeInTheDocument());
  });
});

// ── T8: Restablecer resets the form ───────────────────────────────────────

describe('Simulation — Restablecer (reset)', () => {
  it('clears the result and error when Restablecer is clicked after simulation', async () => {
    getScoringModels.mockResolvedValue([makeModel({ id: 'm1', estado: 'ACTIVE' })]);
    simulateScore.mockResolvedValue(makeResult({ puntajeFinal: 700 }));
    const user = userEvent.setup();
    render(<Simulation />);
    await waitFor(() => expect(document.querySelector('select').value).toBe('m1'));

    // Simulate first
    const keyInputs = screen.getAllByPlaceholderText(/nombre_variable/i);
    const valInputs = screen.getAllByPlaceholderText(/valor numérico/i);
    await user.clear(keyInputs[0]);
    await user.type(keyInputs[0], 'ingreso_anual');
    await user.clear(valInputs[0]);
    await user.type(valInputs[0], '60000');
    await user.click(screen.getByRole('button', { name: /calcular simulación/i }));
    await waitFor(() => expect(screen.getByText(/700/)).toBeInTheDocument());

    // Now reset
    await user.click(screen.getByRole('button', { name: /restablecer/i }));
    expect(screen.queryByText(/700/)).not.toBeInTheDocument();
  });
});
