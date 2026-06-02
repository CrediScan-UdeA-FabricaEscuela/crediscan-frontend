import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialData from './FinancialData';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'test-applicant-123' }),
}));

vi.mock('../api/client', () => ({
  addFinancialData: vi.fn(),
}));

import { addFinancialData } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

async function fillRequiredFields(user) {
  await user.type(screen.getByLabelText(/ingreso anual/i), '50000000');
  await user.type(screen.getByLabelText(/gastos mensuales/i), '2000000');
  await user.type(screen.getByLabelText(/deudas actuales/i), '5000000');
  await user.type(screen.getByLabelText(/valor de activos/i), '100000000');
  await user.type(screen.getByLabelText(/patrimonio declarado/i), '95000000');
  await user.type(screen.getByLabelText(/meses de historial/i), '24');
  await user.type(screen.getByLabelText(/mora últimos 12/i), '0');
  await user.type(screen.getByLabelText(/mora últimos 24/i), '0');
  await user.type(screen.getByLabelText(/productos crédito activos/i), '2');
}

beforeEach(() => {
  mockNavigate.mockClear();
  addFinancialData.mockReset();
});

// ── Domain: Form field rendering ───────────────────────────────────────────

describe('FinancialData — form field rendering', () => {
  it('renders all 9 required numeric fields', () => {
    render(<FinancialData />);
    expect(screen.getByLabelText(/ingreso anual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gastos mensuales/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/deudas actuales/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor de activos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/patrimonio declarado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meses de historial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mora últimos 12/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mora últimos 24/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/productos crédito activos/i)).toBeInTheDocument();
  });

  it('renders the optional externalBureauScore field', () => {
    render(<FinancialData />);
    expect(screen.getByPlaceholderText(/opcional/i)).toBeInTheDocument();
  });

  it('renders the hasOutstandingDefaults checkbox', () => {
    render(<FinancialData />);
    expect(screen.getByLabelText(/mora vigente/i)).toBeInTheDocument();
  });

  it('renders applicant ID in page header', () => {
    render(<FinancialData />);
    expect(screen.getByText('test-applicant-123')).toBeInTheDocument();
  });
});

// ── Domain: Submit calls API with numeric payload ──────────────────────────

describe('FinancialData — submit payload', () => {
  it('calls addFinancialData with correct numeric payload', async () => {
    const user = userEvent.setup();
    addFinancialData.mockResolvedValue({});
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(addFinancialData).toHaveBeenCalledWith('test-applicant-123', expect.objectContaining({
        annualIncome: 50000000,
        monthlyExpenses: 2000000,
        currentDebts: 5000000,
        assetsValue: 100000000,
        declaredPatrimony: 95000000,
        creditHistoryMonths: 24,
        defaultsLast12m: 0,
        defaultsLast24m: 0,
        activeCreditProducts: 2,
      }));
    });
  });

  it('sends externalBureauScore as null when field is left empty', async () => {
    const user = userEvent.setup();
    addFinancialData.mockResolvedValue({});
    render(<FinancialData />);

    await fillRequiredFields(user);
    // externalBureauScore intentionally left empty
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(addFinancialData).toHaveBeenCalledWith('test-applicant-123', expect.objectContaining({
        externalBureauScore: null,
      }));
    });
  });

  it('sends externalBureauScore as number when field has a value', async () => {
    const user = userEvent.setup();
    addFinancialData.mockResolvedValue({});
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.type(screen.getByPlaceholderText(/opcional/i), '750');
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(addFinancialData).toHaveBeenCalledWith('test-applicant-123', expect.objectContaining({
        externalBureauScore: 750,
      }));
    });
  });

  it('sends hasOutstandingDefaults as true when checkbox is checked', async () => {
    const user = userEvent.setup();
    addFinancialData.mockResolvedValue({});
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/mora vigente/i));
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(addFinancialData).toHaveBeenCalledWith('test-applicant-123', expect.objectContaining({
        hasOutstandingDefaults: true,
      }));
    });
  });
});

// ── Domain: Success flow ───────────────────────────────────────────────────

describe('FinancialData — success flow', () => {
  it('renders success alert after successful submit', async () => {
    const user = userEvent.setup();
    addFinancialData.mockResolvedValue({});
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(screen.getByText(/datos financieros guardados/i)).toBeInTheDocument();
    });
  });

  it('"Ir a Nueva Evaluación" button navigates with applicantId after success', async () => {
    const user = userEvent.setup();
    addFinancialData.mockResolvedValue({});
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));
    await waitFor(() => screen.getByText(/datos financieros guardados/i));

    await user.click(screen.getByRole('button', { name: /ir a nueva evaluación/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/nueva?applicantId=test-applicant-123');
  });
});

// ── Domain: Error flow ─────────────────────────────────────────────────────

describe('FinancialData — error flow', () => {
  it('renders error alert on API rejection', async () => {
    const user = userEvent.setup();
    addFinancialData.mockRejectedValue(new Error('Error de servidor'));
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(screen.getByText(/error de servidor/i)).toBeInTheDocument();
    });
  });
});

// ── Domain: Navigation ─────────────────────────────────────────────────────

describe('FinancialData — navigation', () => {
  it('Cancelar button navigates to /solicitantes', async () => {
    const user = userEvent.setup();
    render(<FinancialData />);

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });

  it('Volver button navigates to /solicitantes', async () => {
    const user = userEvent.setup();
    render(<FinancialData />);

    await user.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });
});

// ── Domain: Loading state ──────────────────────────────────────────────────

describe('FinancialData — loading state', () => {
  it('submit button is disabled while loading', async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    addFinancialData.mockReturnValue(new Promise((r) => { resolveSubmit = r; }));
    render(<FinancialData />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /guardar datos/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    });

    resolveSubmit({});
  });
});
