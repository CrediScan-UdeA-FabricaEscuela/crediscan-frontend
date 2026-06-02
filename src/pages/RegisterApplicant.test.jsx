import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterApplicant from './RegisterApplicant';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
  registerApplicant: vi.fn(),
}));

import { registerApplicant } from '../api/client';

beforeEach(() => {
  mockNavigate.mockClear();
  registerApplicant.mockReset();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function getField(name) {
  return document.querySelector(`input[name="${name}"], select[name="${name}"]`);
}

async function fillRequiredFields(user) {
  await user.type(screen.getByPlaceholderText(/Ej: Juan García/i), 'Carlos Lopez');
  await user.type(screen.getByPlaceholderText(/Ej: 1234567890/i), '1122334455');
  await user.type(getField('fecha_nacimiento'), '1990-05-15');
  await user.type(getField('ingresos_mensuales'), '2500000');
  await user.type(getField('antiguedad_laboral'), '36');
}

// ── Domain: Field rendering ────────────────────────────────────────────────

describe('RegisterApplicant — field rendering', () => {
  it('renders all 8 form fields with correct name attributes', () => {
    render(<RegisterApplicant />);

    expect(getField('nombre')).not.toBeNull();
    expect(getField('identificacion')).not.toBeNull();
    expect(getField('fecha_nacimiento')).not.toBeNull();
    expect(getField('tipo_empleo')).not.toBeNull();
    expect(getField('ingresos_mensuales')).not.toBeNull();
    expect(getField('antiguedad_laboral')).not.toBeNull();
    expect(getField('direccion')).not.toBeNull();
    expect(getField('correo_electronico')).not.toBeNull();
  });

  it('renders 4 employment type options in the select', () => {
    render(<RegisterApplicant />);

    const options = screen.getAllByRole('option');
    const values = options.map((o) => o.value);
    expect(values).toContain('EMPLEADO');
    expect(values).toContain('INDEPENDIENTE');
    expect(values).toContain('PENSIONADO');
    expect(values).toContain('DESEMPLEADO');
    expect(options).toHaveLength(4);
  });
});

// ── Domain: onChange updates form state ───────────────────────────────────

describe('RegisterApplicant — onChange behavior', () => {
  it('typing in nombre field updates the input value', async () => {
    const user = userEvent.setup();
    render(<RegisterApplicant />);

    const nombreInput = screen.getByPlaceholderText(/Ej: Juan García/i);
    await user.type(nombreInput, 'Ana Torres');

    expect(nombreInput).toHaveValue('Ana Torres');
  });

  it('typing in identificacion field updates its value', async () => {
    const user = userEvent.setup();
    render(<RegisterApplicant />);

    const idInput = screen.getByPlaceholderText(/Ej: 1234567890/i);
    await user.type(idInput, '9876543210');

    expect(idInput).toHaveValue('9876543210');
  });
});

// ── Domain: Submit behavior ────────────────────────────────────────────────

describe('RegisterApplicant — submit behavior', () => {
  it('calls registerApplicant with correct payload (numbers coerced) on submit', async () => {
    const user = userEvent.setup();
    registerApplicant.mockResolvedValue({});
    render(<RegisterApplicant />);

    await user.type(screen.getByPlaceholderText(/Ej: Juan García/i), 'Carlos Lopez');
    await user.type(screen.getByPlaceholderText(/Ej: 1234567890/i), '1122334455');
    await user.type(getField('fecha_nacimiento'), '1990-05-15');
    await user.type(getField('ingresos_mensuales'), '2500000');
    await user.type(getField('antiguedad_laboral'), '36');
    await user.type(screen.getByPlaceholderText(/Calle, ciudad/i), 'Calle 10 # 5-20');
    await user.type(screen.getByPlaceholderText(/ejemplo@correo\.com/i), 'carlos@test.com');

    await user.click(screen.getByRole('button', { name: /registrar solicitante/i }));

    await waitFor(() => {
      expect(registerApplicant).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Carlos Lopez',
          identificacion: '1122334455',
          tipo_empleo: 'EMPLEADO',
          ingresos_mensuales: 2500000,
          antiguedad_laboral: 36,
          direccion: 'Calle 10 # 5-20',
          correo_electronico: 'carlos@test.com',
        }),
      );
    });
  });

  it('navigates to /solicitantes on successful submit', async () => {
    const user = userEvent.setup();
    registerApplicant.mockResolvedValue({});
    render(<RegisterApplicant />);

    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: /registrar solicitante/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
    });
  });

  it('displays error message when registerApplicant rejects', async () => {
    const user = userEvent.setup();
    registerApplicant.mockRejectedValue(new Error('Solicitante ya existe'));
    render(<RegisterApplicant />);

    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: /registrar solicitante/i }));

    await waitFor(() => {
      expect(screen.getByText('Solicitante ya existe')).toBeInTheDocument();
    });
  });

  it('submit button is disabled while loading (promise pending)', async () => {
    const user = userEvent.setup();
    let resolveApi;
    registerApplicant.mockImplementation(
      () => new Promise((res) => { resolveApi = res; }),
    );
    render(<RegisterApplicant />);

    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: /registrar solicitante/i }));

    // While the promise is pending, the submit button must be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    });

    // Resolve to avoid hanging promise
    resolveApi({});
  });
});

// ── Domain: Cancel button ──────────────────────────────────────────────────

describe('RegisterApplicant — cancel button', () => {
  it('cancel button navigates to /solicitantes', async () => {
    const user = userEvent.setup();
    render(<RegisterApplicant />);

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });
});

// ── Domain: Back link ──────────────────────────────────────────────────────

describe('RegisterApplicant — back link', () => {
  it('back link renders and navigates to /solicitantes on click', async () => {
    const user = userEvent.setup();
    render(<RegisterApplicant />);

    const backLink = screen.getByRole('button', { name: /volver a solicitantes/i });
    expect(backLink).toBeInTheDocument();

    await user.click(backLink);
    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });
});
