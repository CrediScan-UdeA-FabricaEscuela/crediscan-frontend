import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLog from './AuditLog';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  getAuditLogs: vi.fn(),
  getAuditExportUrl: vi.fn(() => '/api/audit/export'),
}));

import { getAuditLogs, getAuditExportUrl } from '../api/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRows(count = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-00${i + 1}`,
    timestamp: '2024-03-15T10:30:00Z',
    usuarioId: `user-${i + 1}`,
    accion: `ACTION_${i + 1}`,
    recurso: `Resource${i + 1}`,
    recursoId: `abcdef12-${i + 1}-uuid-long-id`,
    ip: `192.168.0.${i + 1}`,
    resultado: i % 2 === 0 ? 'SUCCESS' : 'FAILURE',
  }));
}

function setupPaginated({ content = makeRows(), totalPages = 1, totalElements = 1 } = {}) {
  getAuditLogs.mockResolvedValue({ content, totalPages, totalElements });
}

function setupArray(rows = makeRows()) {
  getAuditLogs.mockResolvedValue(rows);
}

beforeEach(() => {
  getAuditLogs.mockReset();
  getAuditExportUrl.mockReturnValue('/api/audit/export');
});

// ── Test suites ────────────────────────────────────────────────────────────

describe('AuditLog — paginated response renders table rows', () => {
  it('renders timestamp, usuarioId, accion, recurso, ip, resultado columns', async () => {
    setupPaginated({
      content: [
        {
          id: 'row-001',
          timestamp: '2024-03-15T10:30:00Z',
          usuarioId: 'user-42',
          accion: 'LOGIN',
          recurso: 'AuthService',
          recursoId: 'abcdef12-uuid',
          ip: '10.0.0.1',
          resultado: 'SUCCESS',
        },
      ],
      totalPages: 1,
      totalElements: 1,
    });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    expect(screen.getByText('user-42')).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
    expect(screen.getByText('AuthService')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('truncates recursoId to first 8 chars + ellipsis', async () => {
    setupPaginated({
      content: [
        {
          id: 'row-001',
          timestamp: '2024-03-15T10:30:00Z',
          usuarioId: 'user-1',
          accion: 'CREATE',
          recurso: 'Applicant',
          recursoId: 'abcdef1234567890',
          ip: '10.0.0.1',
          resultado: 'SUCCESS',
        },
      ],
    });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    expect(screen.getByText('abcdef12...')).toBeInTheDocument();
  });
});

describe('AuditLog — array response (non-paginated)', () => {
  it('renders rows from array, totalPages defaults to 1', async () => {
    setupArray(makeRows(3));

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    const rows = screen.getAllByRole('row');
    // 1 header row + 3 data rows
    expect(rows.length).toBe(4);
  });

  it('does not show pagination when totalPages=1', async () => {
    setupArray(makeRows(2));

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument();
  });
});

describe('AuditLog — audit-result badge classes', () => {
  it('SUCCESS resultado renders .audit-result-OK', async () => {
    setupPaginated({
      content: [{ id: '1', timestamp: '', usuarioId: 'u', accion: 'A', recurso: 'R', recursoId: null, ip: '1.1.1.1', resultado: 'SUCCESS' }],
    });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    const badge = document.querySelector('.audit-result-OK');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('SUCCESS');
  });

  it('FAILURE resultado renders .audit-result-FAILURE', async () => {
    setupPaginated({
      content: [{ id: '2', timestamp: '', usuarioId: 'u', accion: 'B', recurso: 'R', recursoId: null, ip: '1.1.1.1', resultado: 'FAILURE' }],
    });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    const badge = document.querySelector('.audit-result-FAILURE');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('FAILURE');
  });
});

describe('AuditLog — loading state', () => {
  it('shows spinner while loading', () => {
    getAuditLogs.mockReturnValue(new Promise(() => {})); // never resolves

    render(<AuditLog />);

    expect(screen.getByText(/cargando registros/i)).toBeInTheDocument();
    expect(document.querySelector('.spinner')).not.toBeNull();
  });
});

describe('AuditLog — error state', () => {
  it('renders .alert.error when API rejects', async () => {
    getAuditLogs.mockRejectedValue(new Error('Network error'));

    render(<AuditLog />);

    await waitFor(() => {
      const alert = document.querySelector('.alert.error');
      expect(alert).not.toBeNull();
    });
  });
});

describe('AuditLog — pagination controls', () => {
  it('hides pagination when totalPages=1', async () => {
    setupPaginated({ content: makeRows(1), totalPages: 1 });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('shows pagination when totalPages > 1', async () => {
    setupPaginated({ content: makeRows(1), totalPages: 3 });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
  });

  it('Anterior is disabled on page 0', async () => {
    setupPaginated({ content: makeRows(1), totalPages: 2 });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
  });

  it('Siguiente is disabled on last page', async () => {
    setupPaginated({ content: makeRows(1), totalPages: 1, totalElements: 1 });
    // totalPages=1 means pagination hidden; test with totalPages=2 and simulate last page
    getAuditLogs.mockResolvedValueOnce({ content: makeRows(1), totalPages: 2, totalElements: 2 });
    getAuditLogs.mockResolvedValueOnce({ content: makeRows(1), totalPages: 2, totalElements: 2 });

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    const siguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(siguiente).not.toBeDisabled();

    await userEvent.setup().click(siguiente);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
    });
  });
});

describe('AuditLog — empty state', () => {
  it('shows "No hay registros de auditoría" when rows is empty', async () => {
    setupPaginated({ content: [], totalPages: 0, totalElements: 0 });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText(/no hay registros de auditoría/i)).toBeInTheDocument();
    });
  });

  it('renders .empty-state-icon (AuditIcon SVG) instead of emoji', async () => {
    setupPaginated({ content: [], totalPages: 0, totalElements: 0 });

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText(/no hay registros/i)).toBeInTheDocument();
    });

    const iconContainer = document.querySelector('.empty-state-icon');
    expect(iconContainer).not.toBeNull();
    // Should contain an SVG (AuditIcon), not an emoji text node
    const svg = iconContainer.querySelector('svg');
    expect(svg).not.toBeNull();
  });
});

describe('AuditLog — export link', () => {
  it('has download="auditoria.csv" attribute', async () => {
    setupPaginated();

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    const link = document.querySelector('a[download]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('download')).toBe('auditoria.csv');
  });

  it('export link href comes from getAuditExportUrl()', async () => {
    getAuditExportUrl.mockReturnValue('/api/audit/export?token=abc');
    setupPaginated();

    render(<AuditLog />);

    await waitFor(() => screen.getByRole('table'));

    const link = document.querySelector('a[download]');
    expect(link.getAttribute('href')).toBe('/api/audit/export?token=abc');
  });
});
