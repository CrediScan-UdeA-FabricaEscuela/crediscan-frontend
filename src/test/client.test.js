import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchEvaluations,
  getEvaluationsExportUrl,
  getRiskDistribution,
  getModelEffectiveness,
  getAnalystActivity,
  compareScoringModels,
} from '../api/client';

describe('api/client URL construction', () => {
  beforeEach(() => {
    fetch.mockReset();
    fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });

  it('searchEvaluations builds correct URL with required dates and pagination', async () => {
    await searchEvaluations({
      fechaDesde: '2026-01-01T00:00:00Z',
      fechaHasta: '2026-01-31T23:59:59Z',
      page: 1,
      size: 10,
    });
    const [url] = fetch.mock.calls[0];
    expect(url).toContain('/api/v1/evaluaciones?');
    expect(url).toContain('fecha_desde=2026-01-01T00%3A00%3A00Z');
    expect(url).toContain('fecha_hasta=2026-01-31T23%3A59%3A59Z');
    expect(url).toContain('page=1');
    expect(url).toContain('size=10');
  });

  it('searchEvaluations appends each nivel as separate param', async () => {
    await searchEvaluations({
      fechaDesde: '2026-01-01T00:00:00Z',
      fechaHasta: '2026-01-31T23:59:59Z',
      niveles: ['BAJO', 'MEDIO'],
    });
    const [url] = fetch.mock.calls[0];
    expect(url).toContain('nivel=BAJO');
    expect(url).toContain('nivel=MEDIO');
  });

  it('searchEvaluations skips empty optional filters', async () => {
    await searchEvaluations({
      fechaDesde: '2026-01-01T00:00:00Z',
      fechaHasta: '2026-01-31T23:59:59Z',
      puntajeMin: '',
      puntajeMax: '',
      analista: '',
    });
    const [url] = fetch.mock.calls[0];
    expect(url).not.toContain('puntaje_min');
    expect(url).not.toContain('puntaje_max');
    expect(url).not.toContain('analista');
  });

  it('getEvaluationsExportUrl includes formato', () => {
    const url = getEvaluationsExportUrl(
      { fechaDesde: '2026-01-01T00:00:00Z', fechaHasta: '2026-01-31T23:59:59Z' },
      'CSV'
    );
    expect(url).toContain('/api/v1/evaluaciones/export?');
    expect(url).toContain('formato=CSV');
  });

  it('getRiskDistribution uses fecha_desde/fecha_hasta param names', async () => {
    await getRiskDistribution({ fechaDesde: 'A', fechaHasta: 'B', tipoEmpleo: 'EMPLEADO' });
    const [url] = fetch.mock.calls[0];
    expect(url).toContain('fecha_desde=A');
    expect(url).toContain('fecha_hasta=B');
    expect(url).toContain('tipo_empleo=EMPLEADO');
  });

  it('getModelEffectiveness uses desde/hasta (not fecha_desde)', async () => {
    await getModelEffectiveness({ desde: 'X', hasta: 'Y', analistaId: 'jdoe' });
    const [url] = fetch.mock.calls[0];
    expect(url).toContain('desde=X');
    expect(url).toContain('hasta=Y');
    expect(url).toContain('analistaId=jdoe');
    expect(url).not.toContain('fecha_desde');
  });

  it('getAnalystActivity uses desde/hasta', async () => {
    await getAnalystActivity({ desde: 'X', hasta: 'Y' });
    const [url] = fetch.mock.calls[0];
    expect(url).toContain('/api/v1/reportes/actividad-analistas?');
    expect(url).toContain('desde=X');
    expect(url).toContain('hasta=Y');
  });

  it('compareScoringModels passes base and comparado', async () => {
    await compareScoringModels('uuid-1', 'uuid-2');
    const [url] = fetch.mock.calls[0];
    expect(url).toContain('base=uuid-1');
    expect(url).toContain('comparado=uuid-2');
  });
});

describe('api/client auth & error handling', () => {
  beforeEach(() => {
    fetch.mockReset();
    window.localStorage.clear();
  });

  it('sends Authorization header when token in localStorage', async () => {
    window.localStorage.setItem('token', 'abc123');
    fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    await searchEvaluations({ fechaDesde: 'A', fechaHasta: 'B' });
    const [, init] = fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc123');
  });

  it('throws with message from body.detail on non-OK response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'rango inválido' }),
    });
    await expect(searchEvaluations({ fechaDesde: 'A', fechaHasta: 'B' }))
      .rejects.toThrow('rango inválido');
  });
});
