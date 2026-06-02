import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoringVariables from './ScoringVariables';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  getScoringVariables: vi.fn(),
  createScoringVariable: vi.fn(),
  updateScoringVariable: vi.fn(),
}));

import { getScoringVariables, createScoringVariable, updateScoringVariable } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeVariable(overrides = {}) {
  return {
    id: 'var-001',
    nombre: 'ingreso_anual',
    descripcion: 'Ingreso anual del solicitante',
    tipo: 'NUMERIC',
    peso: 0.35,
    rangos: [
      { limiteInferior: 0, limiteSuperior: 5000, puntaje: 30, etiqueta: 'Bajo' },
      { limiteInferior: 5001, limiteSuperior: 15000, puntaje: 70, etiqueta: 'Alto' },
    ],
    ...overrides,
  };
}

function setupApi(variables = [makeVariable()]) {
  getScoringVariables.mockResolvedValue(variables);
}

beforeEach(() => {
  getScoringVariables.mockReset();
  createScoringVariable.mockReset();
  updateScoringVariable.mockReset();
  // ScoringVariables.jsx calls window.scrollTo in openEdit
  window.scrollTo = vi.fn();
});

// ── 1: Renders page header ─────────────────────────────────────────────────

describe('ScoringVariables — page header', () => {
  it('renders h2 "Variables de Scoring"', async () => {
    setupApi([]);
    render(<ScoringVariables />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Variables de Scoring'));
  });
});

// ── 2: Variable count subtitle ────────────────────────────────────────────

describe('ScoringVariables — variable count subtitle', () => {
  it('shows "N variables configuradas"', async () => {
    setupApi([makeVariable(), makeVariable({ id: 'var-002' })]);
    render(<ScoringVariables />);
    await waitFor(() => expect(screen.getByText('2 variables configuradas')).toBeInTheDocument());
  });
});

// ── 3: Loading state ──────────────────────────────────────────────────────

describe('ScoringVariables — loading state', () => {
  it('shows spinner and "Cargando variables..." while fetching', () => {
    getScoringVariables.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ScoringVariables />);
    expect(screen.getByText(/Cargando variables/i)).toBeInTheDocument();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });
});

// ── 4: Empty state — SettingsIcon ─────────────────────────────────────────

describe('ScoringVariables — empty state', () => {
  it('renders SettingsIcon SVG, not ⚙ emoji text', async () => {
    setupApi([]);
    render(<ScoringVariables />);

    await waitFor(() => {
      expect(screen.getByText(/No hay variables de scoring/i)).toBeInTheDocument();
    });

    // SettingsIcon renders an SVG inside the empty-state-icon div
    const iconWrapper = document.querySelector('.empty-state-icon');
    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper.querySelector('svg')).not.toBeNull();

    // No raw ⚙ emoji as text node
    expect(iconWrapper.textContent.trim()).not.toBe('⚙');
  });
});

// ── 5: Table renders variables ────────────────────────────────────────────

describe('ScoringVariables — table renders variables', () => {
  it('renders label from CAMPOS_DISPONIBLES, peso as %, rangos count', async () => {
    setupApi([makeVariable()]);
    render(<ScoringVariables />);

    await waitFor(() => {
      // label resolved from CAMPOS_DISPONIBLES
      expect(screen.getByText('Ingreso anual')).toBeInTheDocument();
      // peso: 0.35 → "35%"
      expect(screen.getByText('35%')).toBeInTheDocument();
      // rangos count
      expect(screen.getByText('2 rangos')).toBeInTheDocument();
    });
  });
});

// ── 6: tipo NUMERIC badge ─────────────────────────────────────────────────

describe('ScoringVariables — tipo badge: NUMERIC', () => {
  it('cell has className containing "badge-tipo-NUMERIC"', async () => {
    setupApi([makeVariable({ tipo: 'NUMERIC' })]);
    render(<ScoringVariables />);

    await waitFor(() => {
      const badge = document.querySelector('.badge-tipo-NUMERIC');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe('NUMERIC');
    });
  });
});

// ── 7: tipo CATEGORICAL badge ─────────────────────────────────────────────

describe('ScoringVariables — tipo badge: CATEGORICAL', () => {
  it('cell has className containing "badge-tipo-CATEGORICAL"', async () => {
    setupApi([makeVariable({ tipo: 'CATEGORICAL' })]);
    render(<ScoringVariables />);

    await waitFor(() => {
      const badge = document.querySelector('.badge-tipo-CATEGORICAL');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe('CATEGORICAL');
    });
  });
});

// ── 8: Editar button goes through Button primitive ────────────────────────

describe('ScoringVariables — Editar button uses Button primitive', () => {
  it('Editar button has btn-secondary and btn-sm classes (via Button)', async () => {
    setupApi([makeVariable()]);
    render(<ScoringVariables />);

    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /editar/i });
      // Button primitive with size="sm" variant="secondary" emits "btn-secondary btn-sm"
      expect(editBtn.className).toContain('btn-secondary');
      expect(editBtn.className).toContain('btn-sm');
    });
  });
});

// ── 9: No inline light colors in rendered output ──────────────────────────

describe('ScoringVariables — no inline light colors', () => {
  it('no rendered element has inline style containing #fff, #ddd, #e5e7eb, or --primary', async () => {
    setupApi([makeVariable()]);
    const { container } = render(<ScoringVariables />);

    await waitFor(() => {
      expect(screen.getByText('Ingreso anual')).toBeInTheDocument();
    });

    const allElements = container.querySelectorAll('[style]');
    allElements.forEach(el => {
      const style = el.getAttribute('style') || '';
      expect(style).not.toMatch(/#fff\b/);
      expect(style).not.toMatch(/#ddd\b/);
      expect(style).not.toMatch(/#e5e7eb/);
      expect(style).not.toMatch(/var\(--primary/);
    });
  });
});

// ── 10: openCreate shows form ─────────────────────────────────────────────

describe('ScoringVariables — openCreate shows form', () => {
  it('clicking header CTA shows form card with "Nueva Variable de Scoring"', async () => {
    const user = userEvent.setup();
    setupApi([]);
    render(<ScoringVariables />);

    await waitFor(() => {
      expect(screen.getByText('0 variables configuradas')).toBeInTheDocument();
    });

    // Find the header button (shows "+ Nueva Variable" when form is hidden)
    const cta = screen.getByRole('button', { name: /nueva variable/i });
    await user.click(cta);

    expect(screen.getByText('Nueva Variable de Scoring')).toBeInTheDocument();
  });
});

// ── 11: openEdit loads form ───────────────────────────────────────────────

describe('ScoringVariables — openEdit loads variable into form', () => {
  it('clicking Editar populates the form with the variable data', async () => {
    const user = userEvent.setup();
    const v = makeVariable({ descripcion: 'Mi descripcion' });
    setupApi([v]);
    render(<ScoringVariables />);

    await waitFor(() => screen.getByRole('button', { name: /editar/i }));

    await user.click(screen.getByRole('button', { name: /editar/i }));

    // Form card heading should say "Editar Variable de Scoring"
    expect(screen.getByText('Editar Variable de Scoring')).toBeInTheDocument();

    // descripcion field should be populated
    const descInput = screen.getByDisplayValue('Mi descripcion');
    expect(descInput).toBeInTheDocument();
  });
});

// ── 12: addRange adds a row ───────────────────────────────────────────────

describe('ScoringVariables — addRange', () => {
  it('"+ Agregar rango" click adds a range-row', async () => {
    const user = userEvent.setup();
    setupApi([]);
    render(<ScoringVariables />);

    await waitFor(() => expect(screen.getByText('0 variables configuradas')).toBeInTheDocument());

    // Open form
    await user.click(screen.getByRole('button', { name: /nueva variable/i }));

    // Default form has 2 range rows
    const before = document.querySelectorAll('.range-row').length;
    expect(before).toBe(2);

    // Click "Agregar rango"
    await user.click(screen.getByRole('button', { name: /agregar rango/i }));

    const after = document.querySelectorAll('.range-row').length;
    expect(after).toBe(3);
  });
});

// ── 13: removeRange disabled when 1 row ──────────────────────────────────

describe('ScoringVariables — removeRange: remove button absent with single range', () => {
  it('remove button (×) is absent when rangos.length === 1', async () => {
    const user = userEvent.setup();
    setupApi([]);
    render(<ScoringVariables />);

    await waitFor(() => expect(screen.getByText('0 variables configuradas')).toBeInTheDocument());

    // Open form (starts with 2 ranges)
    await user.click(screen.getByRole('button', { name: /nueva variable/i }));

    // Remove one row to get to 1
    const removeButtons = screen.getAllByRole('button', { name: /×/ });
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(removeButtons[0]);

    // Now should have 1 range-row, remove button absent
    expect(document.querySelectorAll('.range-row').length).toBe(1);
    expect(screen.queryByRole('button', { name: /×/ })).not.toBeInTheDocument();
  });
});

// ── 14: onSubmit create ───────────────────────────────────────────────────

describe('ScoringVariables — onSubmit: create', () => {
  it('form submit calls createScoringVariable with buildPayload(); success alert shown', async () => {
    const user = userEvent.setup();
    setupApi([]);
    createScoringVariable.mockResolvedValue({ id: 'new-var' });
    // After create, reload returns the new variable
    getScoringVariables
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeVariable({ id: 'new-var' })]);

    render(<ScoringVariables />);

    await waitFor(() => expect(screen.getByText('0 variables configuradas')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /nueva variable/i }));

    // Fill required peso field (default form has nombre and tipo pre-filled)
    const pesoInput = screen.getByPlaceholderText('0.35');
    await user.clear(pesoInput);
    await user.type(pesoInput, '0.35');

    // Fill at least one complete range row
    const limInfInputs = screen.getAllByPlaceholderText('0');
    await user.type(limInfInputs[0], '0');
    const limSupInputs = screen.getAllByPlaceholderText('5');
    await user.type(limSupInputs[0], '100');
    const puntajeInputs = screen.getAllByPlaceholderText('70');
    await user.type(puntajeInputs[0], '50');

    await user.click(screen.getByRole('button', { name: /crear variable/i }));

    await waitFor(() => {
      expect(createScoringVariable).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'ingreso_anual', peso: 0.35 })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/creada correctamente/i)).toBeInTheDocument();
    });
  });
});

// ── 15: onSubmit update ───────────────────────────────────────────────────

describe('ScoringVariables — onSubmit: update', () => {
  it('with editingId set, calls updateScoringVariable; success alert shown', async () => {
    const user = userEvent.setup();
    const v = makeVariable();
    setupApi([v]);
    updateScoringVariable.mockResolvedValue({ ...v, descripcion: 'Updated' });
    getScoringVariables
      .mockResolvedValueOnce([v])
      .mockResolvedValueOnce([v]);

    render(<ScoringVariables />);

    await waitFor(() => screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /editar/i }));

    // Submit the pre-populated form
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(updateScoringVariable).toHaveBeenCalledWith(
        'var-001',
        expect.objectContaining({ nombre: 'ingreso_anual' })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/actualizada correctamente/i)).toBeInTheDocument();
    });
  });
});

// ── 16: save error ────────────────────────────────────────────────────────

describe('ScoringVariables — save error', () => {
  it('API rejection sets saveError; error alert shown', async () => {
    const user = userEvent.setup();
    setupApi([]);
    createScoringVariable.mockRejectedValue(new Error('Network error'));

    render(<ScoringVariables />);

    await waitFor(() => expect(screen.getByText('0 variables configuradas')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /nueva variable/i }));

    const pesoInput = screen.getByPlaceholderText('0.35');
    await user.clear(pesoInput);
    await user.type(pesoInput, '0.5');

    await user.click(screen.getByRole('button', { name: /crear variable/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});

// ── 17: Cancelar closes form ──────────────────────────────────────────────

describe('ScoringVariables — Cancelar closes form', () => {
  it('clicking Cancelar hides the form', async () => {
    const user = userEvent.setup();
    setupApi([]);
    render(<ScoringVariables />);

    await waitFor(() => expect(screen.getByText('0 variables configuradas')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /nueva variable/i }));
    expect(screen.getByText('Nueva Variable de Scoring')).toBeInTheDocument();

    // Two "Cancelar" buttons exist when form is open (header toggle + form-actions);
    // click the form-actions one (last in DOM order)
    const cancelBtns = screen.getAllByRole('button', { name: /cancelar/i });
    await user.click(cancelBtns[cancelBtns.length - 1]);

    expect(screen.queryByText('Nueva Variable de Scoring')).not.toBeInTheDocument();
  });
});

// ── 18: No raw <button> in rendered output ────────────────────────────────

describe('ScoringVariables — no raw <button> without Button primitive', () => {
  it('all buttons in rendered output have a btn-* class (emitted by Button primitive)', async () => {
    const user = userEvent.setup();
    setupApi([makeVariable()]);
    render(<ScoringVariables />);

    await waitFor(() => screen.getByText('Ingreso anual'));

    // Open form to render all buttons
    await user.click(screen.getByRole('button', { name: /nueva variable/i }));

    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      // Every button must have at least one btn-* class
      expect(
        [...btn.classList].some(cls => cls.startsWith('btn-'))
      ).toBe(true);
    });
  });
});
