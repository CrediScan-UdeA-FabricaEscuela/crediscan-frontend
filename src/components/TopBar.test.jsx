import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TopBar from './TopBar';
import { AuthProvider } from '../context/AuthContext';

// react-router-dom v7: mock useNavigate at the module level.
// The mock factory returns a stable spy so we can assert on it.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderTopBar(initialRoute = '/') {
  window.localStorage.setItem('token', 'tok');
  window.localStorage.setItem('role', 'ADMIN');
  window.localStorage.setItem('username', 'admin');
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <TopBar />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------
// Breadcrumb
// -----------------------------------------------------------------------
describe('TopBar — breadcrumb', () => {
  it('renders breadcrumb label for current route /', () => {
    renderTopBar('/');
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  it('renders breadcrumb for /evaluaciones', () => {
    renderTopBar('/evaluaciones');
    expect(screen.getByText(/evaluaciones/i)).toBeInTheDocument();
  });

  it('renders breadcrumb for /reportes', () => {
    renderTopBar('/reportes');
    expect(screen.getByText(/reportes/i)).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Core elements present
// -----------------------------------------------------------------------
describe('TopBar — core elements', () => {
  it('renders search input, Nueva Evaluación button, and avatar', () => {
    renderTopBar('/');
    expect(screen.getByPlaceholderText(/buscar solicitante/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva evaluación/i })).toBeInTheDocument();
    // Avatar: a div/span containing the user initial 'A'
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Navigation behavior
// -----------------------------------------------------------------------
describe('TopBar — navigation', () => {
  it('Nueva Evaluación button navigates to /evaluaciones/nueva', async () => {
    const user = userEvent.setup();
    renderTopBar('/');

    const btn = screen.getByRole('button', { name: /nueva evaluación/i });
    await user.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones/nueva');
  });
});

// -----------------------------------------------------------------------
// Search behavior
// -----------------------------------------------------------------------
describe('TopBar — search', () => {
  it('search input is not readOnly — accepts typed text', async () => {
    const user = userEvent.setup();
    renderTopBar('/');

    const input = screen.getByPlaceholderText(/buscar solicitante/i);
    await user.type(input, 'Maria');

    expect(input).toHaveValue('Maria');
  });

  it('submitting the form with a term navigates to /solicitantes?q=<term>', async () => {
    const user = userEvent.setup();
    renderTopBar('/');

    const input = screen.getByPlaceholderText(/buscar solicitante/i);
    await user.type(input, 'Juan');
    await user.keyboard('{Enter}');

    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes?q=Juan');
  });

  it('submitting the form with an empty term navigates to /solicitantes (no q param)', async () => {
    const user = userEvent.setup();
    renderTopBar('/');

    const input = screen.getByPlaceholderText(/buscar solicitante/i);
    // input is empty, press Enter
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });

  it('encodes special characters in the search term', async () => {
    const user = userEvent.setup();
    renderTopBar('/');

    const input = screen.getByPlaceholderText(/buscar solicitante/i);
    await user.type(input, 'García López');
    await user.keyboard('{Enter}');

    expect(mockNavigate).toHaveBeenCalledWith(
      `/solicitantes?q=${encodeURIComponent('García López')}`
    );
  });

  it('submitting with only whitespace navigates to /solicitantes (trimmed empty)', async () => {
    const user = userEvent.setup();
    renderTopBar('/');

    const input = screen.getByPlaceholderText(/buscar solicitante/i);
    await user.type(input, '   ');
    await user.keyboard('{Enter}');

    expect(mockNavigate).toHaveBeenCalledWith('/solicitantes');
  });
});
