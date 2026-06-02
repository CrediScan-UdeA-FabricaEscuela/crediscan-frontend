import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
  login: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';

const mockHandleLogin = vi.fn();

beforeEach(() => {
  mockNavigate.mockClear();
  mockHandleLogin.mockClear();
  login.mockClear();
  useAuth.mockReturnValue({ handleLogin: mockHandleLogin });
});

// ── Group 1: Form Structure ────────────────────────────────────────────────

describe('Login — initial render shows complete form', () => {
  it('renders a text input for Usuario', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/nombre de usuario/i)).toBeInTheDocument();
  });

  it('renders a password input for Contraseña', () => {
    render(<Login />);
    const pwInput = screen.getByPlaceholderText(/contraseña/i);
    expect(pwInput).toBeInTheDocument();
    expect(pwInput).toHaveAttribute('type', 'password');
  });

  it('renders a submit button labelled Ingresar', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });
});

// ── Group 2: Button Primitive ──────────────────────────────────────────────

describe('Login — submit button uses Button primitive', () => {
  it('submit control is a <button> element', () => {
    render(<Login />);
    const btn = screen.getByRole('button', { name: /ingresar/i });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('submit button has type="submit"', () => {
    render(<Login />);
    const btn = screen.getByRole('button', { name: /ingresar/i });
    expect(btn).toHaveAttribute('type', 'submit');
  });

  it('submit button expresses full-width via inline style', () => {
    render(<Login />);
    const btn = screen.getByRole('button', { name: /ingresar/i });
    expect(btn.style.width).toBe('100%');
  });
});

// ── Group 3: Successful Login Navigation ─────────────────────────────────

describe('Login — valid credentials navigate to dashboard', () => {
  it('calls login, handleLogin, and navigate on successful submit', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ token: 'tok123', role: 'ADMIN', username: 'admin' });

    render(<Login />);

    await user.type(screen.getByPlaceholderText(/nombre de usuario/i), 'admin');
    await user.type(screen.getByPlaceholderText(/contraseña/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('admin', 'admin123');
    });
    await waitFor(() => {
      expect(mockHandleLogin).toHaveBeenCalledWith('tok123', 'ADMIN', 'admin');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});

// ── Group 4: Login Failure ─────────────────────────────────────────────────

describe('Login — invalid credentials show error and stay on page', () => {
  it('renders error message and does not navigate on login rejection', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new Error('Credenciales inválidas'));

    render(<Login />);

    await user.type(screen.getByPlaceholderText(/nombre de usuario/i), 'wrong');
    await user.type(screen.getByPlaceholderText(/contraseña/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── Group 5: Loading State ─────────────────────────────────────────────────

describe('Login — loading state disables submit button', () => {
  it('disables the submit button while the request is pending', async () => {
    const user = userEvent.setup();
    login.mockReturnValue(new Promise(() => {})); // never resolves

    render(<Login />);

    await user.type(screen.getByPlaceholderText(/nombre de usuario/i), 'admin');
    await user.type(screen.getByPlaceholderText(/contraseña/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
    });
  });

  it('shows a spinner element during pending request', async () => {
    const user = userEvent.setup();
    login.mockReturnValue(new Promise(() => {}));

    render(<Login />);

    await user.type(screen.getByPlaceholderText(/nombre de usuario/i), 'admin');
    await user.type(screen.getByPlaceholderText(/contraseña/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => {
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });
  });
});
