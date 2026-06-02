import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewEvaluation from './NewEvaluation';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('../api/client', () => ({
  searchApplicants: vi.fn(),
  getActiveModel: vi.fn(),
  executeEvaluation: vi.fn(),
}));

import { searchApplicants, getActiveModel, executeEvaluation } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeApplicant(overrides = {}) {
  return {
    id: '1',
    nombre: 'Carlos Perez',
    identificacion: 'CC123456',
    tipo_empleo: 'EMPLEADO',
    ...overrides,
  };
}

function makeModel(overrides = {}) {
  return {
    id: 'model-1',
    nombre: 'Modelo Básico',
    version: '1.0',
    ...overrides,
  };
}

function setupActiveModel(model = makeModel()) {
  getActiveModel.mockResolvedValue(model);
}

function setupNoActiveModel() {
  getActiveModel.mockResolvedValue(null);
}

function setupSearch(content = [makeApplicant()]) {
  searchApplicants.mockResolvedValue({ content });
}

beforeEach(() => {
  mockNavigate.mockClear();
  searchApplicants.mockReset();
  getActiveModel.mockReset();
  executeEvaluation.mockReset();
  mockSearchParams = new URLSearchParams();
});

// ── T1: Page renders step 1 + step 2 cards ─────────────────────────────────

describe('NewEvaluation — page structure', () => {
  it('renders Paso 1 and Paso 2 card headings', async () => {
    setupActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => {
      expect(screen.getByText(/Paso 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Paso 2/i)).toBeInTheDocument();
    });
  });

  it('renders the back-link button to Evaluaciones', async () => {
    setupActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });
});

// ── T2: ?applicantId= prefill ─────────────────────────────────────────────

describe('NewEvaluation — ?applicantId prefill', () => {
  it('calls searchApplicants("", 0, 100) and selects matching applicant when applicantId param present', async () => {
    mockSearchParams = new URLSearchParams('applicantId=1');
    const applicant = makeApplicant({ id: '1', nombre: 'Ana Torres' });
    searchApplicants.mockResolvedValue({ content: [applicant] });
    setupActiveModel();

    render(<NewEvaluation />);

    await waitFor(() => {
      expect(searchApplicants).toHaveBeenCalledWith('', 0, 100);
      expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    });
  });

  it('does not call prefill search when no applicantId param', async () => {
    mockSearchParams = new URLSearchParams();
    setupSearch([]);
    setupActiveModel();

    render(<NewEvaluation />);

    await waitFor(() => getActiveModel.mock.calls.length > 0);

    expect(searchApplicants).not.toHaveBeenCalledWith('', 0, 100);
  });
});

// ── T3: Search form submit ────────────────────────────────────────────────

describe('NewEvaluation — search form', () => {
  it('calls searchApplicants with typed query on form submit', async () => {
    const user = userEvent.setup();
    setupActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => screen.getByPlaceholderText(/buscar/i));

    await user.type(screen.getByPlaceholderText(/buscar/i), 'Carlos');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(searchApplicants).toHaveBeenCalledWith('Carlos', 0, 10);
    });
  });

  it('does not call searchApplicants when query is empty', async () => {
    const user = userEvent.setup();
    setupActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => screen.getByRole('button', { name: /buscar/i }));
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    expect(searchApplicants).not.toHaveBeenCalled();
  });
});

// ── T4: Selecting from results ────────────────────────────────────────────

describe('NewEvaluation — applicant selection', () => {
  it('hides search results and shows confirmed strip after clicking Seleccionar', async () => {
    const user = userEvent.setup();
    setupActiveModel();
    const applicant = makeApplicant({ nombre: 'Luis Garcia' });
    searchApplicants.mockResolvedValue({ content: [applicant] });

    render(<NewEvaluation />);

    await waitFor(() => screen.getByPlaceholderText(/buscar/i));

    await user.type(screen.getByPlaceholderText(/buscar/i), 'Luis');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => screen.getByRole('button', { name: /seleccionar/i }));
    await user.click(screen.getByRole('button', { name: /seleccionar/i }));

    await waitFor(() => {
      expect(screen.getByText('Luis Garcia')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /seleccionar/i })).not.toBeInTheDocument();
    });
  });
});

// ── T5: Cambiar resets selection ──────────────────────────────────────────

describe('NewEvaluation — Cambiar button', () => {
  it('resets selected applicant and shows search form again', async () => {
    const user = userEvent.setup();
    setupActiveModel();
    const applicant = makeApplicant({ nombre: 'Maria Lopez' });
    searchApplicants.mockResolvedValue({ content: [applicant] });

    render(<NewEvaluation />);

    await waitFor(() => screen.getByPlaceholderText(/buscar/i));
    await user.type(screen.getByPlaceholderText(/buscar/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    await waitFor(() => screen.getByRole('button', { name: /seleccionar/i }));
    await user.click(screen.getByRole('button', { name: /seleccionar/i }));
    await waitFor(() => screen.getByText('Maria Lopez'));

    await user.click(screen.getByRole('button', { name: /cambiar/i }));

    await waitFor(() => {
      expect(screen.queryByText('Maria Lopez')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
    });
  });
});

// ── T6: Active model loaded ───────────────────────────────────────────────

describe('NewEvaluation — active model display', () => {
  it('shows model name and ACTIVO badge when model is loaded', async () => {
    setupActiveModel(makeModel({ nombre: 'Modelo Premium', version: '2.1' }));
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Premium')).toBeInTheDocument();
      expect(screen.getByText('ACTIVO')).toBeInTheDocument();
    });
  });
});

// ── T7: No active model ───────────────────────────────────────────────────

describe('NewEvaluation — no active model', () => {
  it('shows warning alert with Modelos de Scoring button when no model is active', async () => {
    setupNoActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => {
      expect(screen.getByText(/modelos de scoring/i)).toBeInTheDocument();
    });

    // The warning alert must contain the button
    const warningEl = document.querySelector('.alert.warning');
    expect(warningEl).not.toBeNull();
  });

  it('clicking Modelos de Scoring navigates to /modelos', async () => {
    const user = userEvent.setup();
    setupNoActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => screen.getByRole('button', { name: /modelos de scoring/i }));
    await user.click(screen.getByRole('button', { name: /modelos de scoring/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/modelos');
  });
});

// ── T8: Submit disabled when no applicant ────────────────────────────────

describe('NewEvaluation — submit button disabled states', () => {
  it('Ejecutar Evaluacion button is disabled when no applicant is selected', async () => {
    setupActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => screen.getByRole('button', { name: /ejecutar/i }));

    expect(screen.getByRole('button', { name: /ejecutar/i })).toBeDisabled();
  });

  // ── T9: Submit disabled when no active model ───────────────────────────

  it('Ejecutar Evaluacion button is disabled when no active model', async () => {
    setupNoActiveModel();
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => screen.getByRole('button', { name: /ejecutar/i }));

    expect(screen.getByRole('button', { name: /ejecutar/i })).toBeDisabled();
  });
});

// ── T10: onSubmit calls executeEvaluation and navigates ──────────────────

describe('NewEvaluation — submit flow', () => {
  it('calls executeEvaluation with applicantId and modelId, then navigates to evaluation', async () => {
    const user = userEvent.setup();
    const applicant = makeApplicant({ id: 'app-42', nombre: 'Pedro Ruiz' });
    const model = makeModel({ id: 'mdl-7' });
    setupActiveModel(model);
    searchApplicants.mockResolvedValue({ content: [applicant] });
    executeEvaluation.mockResolvedValue({ id: 'eval-99' });

    render(<NewEvaluation />);

    // Select applicant
    await waitFor(() => screen.getByPlaceholderText(/buscar/i));
    await user.type(screen.getByPlaceholderText(/buscar/i), 'Pedro');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    await waitFor(() => screen.getByRole('button', { name: /seleccionar/i }));
    await user.click(screen.getByRole('button', { name: /seleccionar/i }));
    await waitFor(() => screen.getByText('Pedro Ruiz'));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /ejecutar/i });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(executeEvaluation).toHaveBeenCalledWith({
        applicantId: 'app-42',
        modelId: 'mdl-7',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/eval-99');
    });
  });
});

// ── T11: API error on search ──────────────────────────────────────────────

describe('NewEvaluation — API error states', () => {
  it('shows error alert when searchApplicants throws', async () => {
    const user = userEvent.setup();
    setupActiveModel();
    searchApplicants.mockRejectedValue(new Error('Network failure'));

    render(<NewEvaluation />);

    await waitFor(() => screen.getByPlaceholderText(/buscar/i));
    await user.type(screen.getByPlaceholderText(/buscar/i), 'Carlos');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });

    const errorEl = document.querySelector('.alert.error');
    expect(errorEl).not.toBeNull();
  });

  // ── T12: API error on submit ──────────────────────────────────────────

  it('shows error alert when executeEvaluation throws', async () => {
    const user = userEvent.setup();
    const applicant = makeApplicant({ id: 'app-1' });
    const model = makeModel({ id: 'mdl-1' });
    setupActiveModel(model);
    searchApplicants.mockResolvedValue({ content: [applicant] });
    executeEvaluation.mockRejectedValue(new Error('Server error'));

    render(<NewEvaluation />);

    await waitFor(() => screen.getByPlaceholderText(/buscar/i));
    await user.type(screen.getByPlaceholderText(/buscar/i), 'Carlos');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    await waitFor(() => screen.getByRole('button', { name: /seleccionar/i }));
    await user.click(screen.getByRole('button', { name: /seleccionar/i }));
    await waitFor(() => screen.getByText(applicant.nombre));

    await user.click(screen.getByRole('button', { name: /ejecutar/i }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    const errorEl = document.querySelector('.alert.error');
    expect(errorEl).not.toBeNull();
  });
});

// ── T13: Loading model spinner ────────────────────────────────────────────

describe('NewEvaluation — loading model state', () => {
  it('shows loading-wrapper with spinner while model is loading', async () => {
    getActiveModel.mockReturnValue(new Promise(() => {})); // never resolves
    setupSearch([]);

    render(<NewEvaluation />);

    await waitFor(() => {
      const loadingEl = document.querySelector('.loading-wrapper');
      expect(loadingEl).not.toBeNull();
    });
  });
});
