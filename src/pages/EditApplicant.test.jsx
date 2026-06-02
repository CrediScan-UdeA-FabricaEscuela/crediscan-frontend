import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditApplicant from './EditApplicant';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '42' }),
}));

vi.mock('../api/client', () => ({
  getApplicant: vi.fn(),
  updateApplicant: vi.fn(),
  searchApplicants: vi.fn(),
}));

import { getApplicant, updateApplicant, searchApplicants } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeApplicant(overrides = {}) {
  return {
    id: '42',
    nombre: 'Juan Pérez',
    tipo_empleo: 'EMPLEADO',
    ingresos_mensuales: 3000000,
    antiguedad_laboral: 24,
    telefono: '3001234567',
    direccion: 'Calle 123',
    correo_electronico: 'juan@example.com',
    ...overrides,
  };
}

beforeEach(() => {
  mockNavigate.mockClear();
  getApplicant.mockReset();
  updateApplicant.mockReset();
  searchApplicants.mockReset();
});

// ── Domain: Loading state ──────────────────────────────────────────────────

describe('EditApplicant — loading state', () => {
  it('renders .loading-wrapper while getApplicant is pending', () => {
    getApplicant.mockReturnValue(new Promise(() => {}));

    render(<EditApplicant />);

    expect(document.querySelector('.loading-wrapper')).toBeInTheDocument();
  });

  it('does not render the form while loading', () => {
    getApplicant.mockReturnValue(new Promise(() => {}));

    render(<EditApplicant />);

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});

// ── Domain: Load and prefill ───────────────────────────────────────────────

describe('EditApplicant — load prefills form fields', () => {
  it('prefills nombre from getApplicant response', async () => {
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Juan Pérez')).toBeInTheDocument();
    });
  });

  it('prefills telefono from getApplicant response', async () => {
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('3001234567')).toBeInTheDocument();
    });
  });

  it('prefills correo_electronico from getApplicant response', async () => {
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('juan@example.com')).toBeInTheDocument();
    });
  });

  it('accepts phone field mapped from applicant.phone when telefono is absent', async () => {
    getApplicant.mockResolvedValue(makeApplicant({ telefono: undefined, phone: '3009999999' }));

    render(<EditApplicant />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('3009999999')).toBeInTheDocument();
    });
  });
});

// ── Domain: Fallback fetch ─────────────────────────────────────────────────

describe('EditApplicant — fallback fetch when getApplicant rejects', () => {
  it('prefills form via searchApplicants when getApplicant rejects', async () => {
    getApplicant.mockRejectedValue(new Error('Not found'));
    searchApplicants.mockResolvedValue({
      content: [makeApplicant({ nombre: 'Fallback User' })],
    });

    render(<EditApplicant />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Fallback User')).toBeInTheDocument();
    });
  });

  it('shows error when both getApplicant and searchApplicants fail to find the applicant', async () => {
    getApplicant.mockRejectedValue(new Error('Not found'));
    searchApplicants.mockResolvedValue({ content: [] });

    render(<EditApplicant />);

    await waitFor(() => {
      expect(screen.getByText(/solicitante no encontrado/i)).toBeInTheDocument();
    });
  });
});

// ── Domain: Submit — happy path ────────────────────────────────────────────

describe('EditApplicant — submit builds payload and navigates', () => {
  it('calls updateApplicant with id and non-empty field payload on submit', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockResolvedValue({});

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(updateApplicant).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({ nombre: 'Juan Pérez' }),
      );
    });
  });

  it('navigates to /solicitantes after successful submit', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockResolvedValue({});

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
    });
  });

  it('payload only includes non-empty fields (omits empty strings)', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant({ direccion: '' }));
    updateApplicant.mockResolvedValue({});

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      const [, payload] = updateApplicant.mock.calls[0];
      expect(payload).not.toHaveProperty('direccion');
    });
  });
});

// ── Domain: Submit — error state ──────────────────────────────────────────

describe('EditApplicant — submit error shows alert', () => {
  it('renders .alert.error with error message when updateApplicant rejects', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockRejectedValue(new Error('Error del servidor'));

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
    });
  });

  it('does not navigate when updateApplicant rejects', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockRejectedValue(new Error('Error del servidor'));

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── Domain: Saving state ───────────────────────────────────────────────────

describe('EditApplicant — saving state while submit is in-flight', () => {
  it('disables the submit button while saving', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockReturnValue(new Promise(() => {}));

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
    });
  });

  it('shows .spinner inside the submit button while saving', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockReturnValue(new Promise(() => {}));

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });
  });

  it('saving spinner has no inline borderTopColor style', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());
    updateApplicant.mockReturnValue(new Promise(() => {}));

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      const spinner = document.querySelector('.spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner.style.borderTopColor).toBe('');
    });
  });
});

// ── Domain: Form action buttons use Button primitive ──────────────────────

describe('EditApplicant — form action buttons', () => {
  it('Cancelar button is a <button> element with class btn-secondary', async () => {
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    const cancelar = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelar.tagName).toBe('BUTTON');
    expect(cancelar.className).toContain('btn-secondary');
  });

  it('Cancelar button navigates to /solicitantes when clicked', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });

  it('submit button has type="submit"', async () => {
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    expect(submitBtn).toHaveAttribute('type', 'submit');
  });
});

// ── Domain: Back-link ──────────────────────────────────────────────────────

describe('EditApplicant — back-link', () => {
  it('back-link button has class back-link', async () => {
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    const backBtn = screen.getByRole('button', { name: /volver/i });
    expect(backBtn.className).toContain('back-link');
  });

  it('back-link navigates to /solicitantes when clicked', async () => {
    const user = userEvent.setup();
    getApplicant.mockResolvedValue(makeApplicant());

    render(<EditApplicant />);

    await waitFor(() => screen.getByDisplayValue('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: /volver/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });
});
