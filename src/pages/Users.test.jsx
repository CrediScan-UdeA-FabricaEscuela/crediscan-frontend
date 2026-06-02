import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Users from './Users';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  createUser: vi.fn(),
}));

import { createUser } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function setup() {
  return { user: userEvent.setup() };
}

beforeEach(() => {
  createUser.mockReset();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Users — form renders all fields', () => {
  it('renders username, email, password, and role select', () => {
    render(<Users />);

    expect(screen.getByPlaceholderText('nombre.apellido')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('usuario@empresa.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

describe('Users — role select contains all ROLES options', () => {
  it('renders ADMIN, ANALYST, RISK_MANAGER, CREDIT_SUPERVISOR options', () => {
    render(<Users />);

    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);

    expect(options).toContain('ADMIN');
    expect(options).toContain('ANALYST');
    expect(options).toContain('RISK_MANAGER');
    expect(options).toContain('CREDIT_SUPERVISOR');
  });
});

describe('Users — submit calls createUser with form values', () => {
  it('calls createUser with username, email, password, and rol', async () => {
    const { user } = setup();
    createUser.mockResolvedValue({ username: 'john.doe', role: 'ANALYST' });

    render(<Users />);

    await user.type(screen.getByPlaceholderText('nombre.apellido'), 'john.doe');
    await user.type(screen.getByPlaceholderText('usuario@empresa.com'), 'john@empresa.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'secret123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        username: 'john.doe',
        email: 'john@empresa.com',
        password: 'secret123',
        rol: 'ANALYST',
      });
    });
  });
});

describe('Users — loading state', () => {
  it('disables the submit button and shows "Creando..." while loading', async () => {
    const { user } = setup();
    let resolve;
    createUser.mockReturnValue(new Promise(r => { resolve = r; }));

    render(<Users />);

    await user.type(screen.getByPlaceholderText('nombre.apellido'), 'john.doe');
    await user.type(screen.getByPlaceholderText('usuario@empresa.com'), 'john@empresa.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'secret123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(screen.getByRole('button', { name: /creando/i })).toBeDisabled();
    resolve({ username: 'john.doe', role: 'ANALYST' });
  });
});

describe('Users — success feedback', () => {
  it('clears the form and shows success message without emoji', async () => {
    const { user } = setup();
    createUser.mockResolvedValue({ username: 'john.doe', role: 'ANALYST' });

    render(<Users />);

    await user.type(screen.getByPlaceholderText('nombre.apellido'), 'john.doe');
    await user.type(screen.getByPlaceholderText('usuario@empresa.com'), 'john@empresa.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'secret123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => {
      expect(screen.getByText(/john\.doe.*creado con rol ANALYST/i)).toBeInTheDocument();
    });

    // Form should be cleared
    expect(screen.getByPlaceholderText('nombre.apellido')).toHaveValue('');
    expect(screen.getByPlaceholderText('usuario@empresa.com')).toHaveValue('');
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toHaveValue('');

    // No checkmark emoji in success alert
    const alert = screen.getByText(/john\.doe.*creado con rol ANALYST/i).closest('.alert');
    expect(alert.textContent).not.toMatch(/^✓/);
  });
});

describe('Users — error feedback', () => {
  it('shows error message when createUser rejects', async () => {
    const { user } = setup();
    createUser.mockRejectedValue(new Error('Email ya registrado'));

    render(<Users />);

    await user.type(screen.getByPlaceholderText('nombre.apellido'), 'john.doe');
    await user.type(screen.getByPlaceholderText('usuario@empresa.com'), 'john@empresa.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'secret123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => {
      expect(screen.getByText('Email ya registrado')).toBeInTheDocument();
    });
  });
});

describe('Users — role select change updates hint text', () => {
  it('shows the correct ROLE_DESCRIPTION hint when role changes', async () => {
    const { user } = setup();

    render(<Users />);

    // Default role is ANALYST — hint text appears in the role-hint span (form) and role card
    const analystHints = screen.getAllByText('Registra solicitantes y ejecuta evaluaciones');
    expect(analystHints.length).toBeGreaterThanOrEqual(1);

    await user.selectOptions(screen.getByRole('combobox'), 'ADMIN');

    // After switching to ADMIN, the form hint should show ADMIN description
    // Use getAllByText since role card always shows all descriptions
    const adminHints = screen.getAllByText('Acceso total al sistema');
    expect(adminHints.length).toBeGreaterThanOrEqual(1);

    // The ANALYST hint in the role-hint span should be gone (replaced by ADMIN)
    // but still present in the role card — so exactly 1 instance of ANALYST text
    const analystAfter = screen.getAllByText('Registra solicitantes y ejecuta evaluaciones');
    expect(analystAfter.length).toBe(1); // only in role card, not in form hint
  });
});

describe('Users — role description card', () => {
  it('renders all 4 ROLES with sidebar-role badge classes', () => {
    render(<Users />);

    const roles = ['ADMIN', 'ANALYST', 'RISK_MANAGER', 'CREDIT_SUPERVISOR'];
    roles.forEach(r => {
      const badge = document.querySelector(`.sidebar-role.role-${r}`);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(r);
    });
  });
});
