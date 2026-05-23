import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchEvaluations, getEvaluationsExportUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO'];
const DECISIONS = ['APROBADO', 'NEGADO', 'PENDIENTE'];

const RISK_BADGE = {
  BAJO: 'badge-success',
  MEDIO: 'badge-DRAFT',
  ALTO: 'badge-error',
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISODate(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function dateToIsoStart(d) {
  return `${d}T00:00:00Z`;
}

function dateToIsoEnd(d) {
  return `${d}T23:59:59Z`;
}

function EvaluationLookup({ onNavigate }) {
  const [evalId, setEvalId] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); const t = evalId.trim(); if (t) onNavigate(t); }} className="search-bar">
      <input
        placeholder="UUID de la evaluación..."
        value={evalId}
        onChange={e => setEvalId(e.target.value)}
        style={{ fontFamily: 'monospace', fontSize: '.85rem' }}
      />
      <button type="submit" disabled={!evalId.trim()}>Ver Evaluación</button>
    </form>
  );
}

export default function Evaluations() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const role = auth?.role;
  const canSearch = ['ADMIN', 'RISK_MANAGER', 'CREDIT_SUPERVISOR'].includes(role);
  const canEvaluate = ['ADMIN', 'ANALYST'].includes(role);

  const [fechaDesde, setFechaDesde] = useState(daysAgoISODate(30));
  const [fechaHasta, setFechaHasta] = useState(todayISODate());
  const [niveles, setNiveles] = useState([]);
  const [decisiones, setDecisiones] = useState([]);
  const [puntajeMin, setPuntajeMin] = useState('');
  const [puntajeMax, setPuntajeMax] = useState('');
  const [analista, setAnalista] = useState('');

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  function toggleInArray(arr, value, setter) {
    setter(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
  }

  function buildCriteria() {
    return {
      fechaDesde: dateToIsoStart(fechaDesde),
      fechaHasta: dateToIsoEnd(fechaHasta),
      niveles,
      puntajeMin: puntajeMin === '' ? null : Number(puntajeMin),
      puntajeMax: puntajeMax === '' ? null : Number(puntajeMax),
      decisiones,
      analista: analista.trim() || null,
    };
  }

  async function load(p = 0) {
    if (!fechaDesde || !fechaHasta) {
      setError('Fecha desde y fecha hasta son requeridas.');
      return;
    }
    if (fechaDesde > fechaHasta) {
      setError('Rango de fechas inválido: desde > hasta.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchEvaluations({ ...buildCriteria(), page: p, size: 25 });
      setRows(data.content || []);
      setPage(data.pageNumber ?? p);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setHasSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canSearch) load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    load(0);
  }

  function onClearFilters() {
    setNiveles([]);
    setDecisiones([]);
    setPuntajeMin('');
    setPuntajeMax('');
    setAnalista('');
    setFechaDesde(daysAgoISODate(30));
    setFechaHasta(todayISODate());
  }

  function downloadExport(formato) {
    const url = getEvaluationsExportUrl(buildCriteria(), formato);
    // El backend valida JWT vía header; abrimos con auth en localStorage
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.blob(); })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = formato === 'CSV' ? 'evaluaciones.csv' : 'evaluaciones.pdf';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(err => setError(`No se pudo descargar: ${err.message}`));
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Evaluaciones</h2>
          <p>
            {canSearch
              ? `${totalElements} evaluación(es) en el rango seleccionado`
              : 'Consultá una evaluación específica por su ID'}
          </p>
        </div>
        {canEvaluate && (
          <button onClick={() => navigate('/evaluaciones/nueva')}>
            ▶ Nueva Evaluación
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h3>Consultar Evaluación por ID</h3>
        </div>
        <div className="card-body">
          <EvaluationLookup onNavigate={id => navigate(`/evaluaciones/${id}`)} />
        </div>
      </div>

      {!canSearch && (
        <div className="alert info">
          Tu rol no permite listar evaluaciones del portafolio. Solicitá el UUID al equipo de riesgo.
        </div>
      )}

      {canSearch && (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <h3>Búsqueda Avanzada</h3>
            </div>
            <div className="card-body">
              <form onSubmit={onSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
                  <label>
                    <span>Desde *</span>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} required />
                  </label>
                  <label>
                    <span>Hasta *</span>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} required />
                  </label>
                  <label>
                    <span>Puntaje mín</span>
                    <input type="number" step="0.01" value={puntajeMin} onChange={e => setPuntajeMin(e.target.value)} placeholder="0" />
                  </label>
                  <label>
                    <span>Puntaje máx</span>
                    <input type="number" step="0.01" value={puntajeMax} onChange={e => setPuntajeMax(e.target.value)} placeholder="1000" />
                  </label>
                  <label>
                    <span>Analista</span>
                    <input type="text" value={analista} onChange={e => setAnalista(e.target.value)} placeholder="username" />
                  </label>
                </div>

                <div style={{ marginTop: '.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.3rem' }}>Nivel de riesgo</div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {RISK_LEVELS.map(n => (
                        <label key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontWeight: 400 }}>
                          <input
                            type="checkbox"
                            checked={niveles.includes(n)}
                            onChange={() => toggleInArray(niveles, n, setNiveles)}
                          />
                          <span className={`badge ${RISK_BADGE[n]}`}>{n}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.3rem' }}>Decisión</div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {DECISIONS.map(d => (
                        <label key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontWeight: 400 }}>
                          <input
                            type="checkbox"
                            checked={decisiones.includes(d)}
                            onChange={() => toggleInArray(decisiones, d, setDecisiones)}
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button type="submit" disabled={loading}>Buscar</button>
                  <button type="button" className="btn-secondary" onClick={onClearFilters}>Limpiar filtros</button>
                  <button type="button" className="btn-ghost" onClick={() => downloadExport('CSV')} disabled={!hasSearched || rows.length === 0}>
                    ⬇ Exportar CSV
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => downloadExport('PDF')} disabled={!hasSearched || rows.length === 0}>
                    ⬇ Exportar PDF
                  </button>
                </div>
              </form>
            </div>
          </div>

          {error && <div className="alert error">{error}</div>}

          {loading ? (
            <div className="loading-wrapper"><div className="spinner"></div> Cargando...</div>
          ) : !hasSearched ? null : rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No se encontraron evaluaciones con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Solicitante</th>
                    <th>Fecha</th>
                    <th>Puntaje</th>
                    <th>Nivel</th>
                    <th>Decisión</th>
                    <th>Analista</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.evaluationId}>
                      <td style={{ fontFamily: 'monospace', fontSize: '.75rem' }}>{String(r.evaluationId).slice(0, 8)}…</td>
                      <td style={{ fontWeight: 600 }}>{r.applicantName || '—'}</td>
                      <td>{r.evaluatedAt ? new Date(r.evaluatedAt).toLocaleString('es-CO') : '—'}</td>
                      <td>{r.score != null ? Number(r.score).toFixed(2) : '—'}</td>
                      <td><span className={`badge ${RISK_BADGE[r.riskLevel] || 'badge-DRAFT'}`}>{r.riskLevel || '—'}</span></td>
                      <td>{r.decisionStatus || '—'}</td>
                      <td>{r.analista || '—'}</td>
                      <td>
                        <button className="btn-sm btn-secondary" onClick={() => navigate(`/evaluaciones/${r.evaluationId}`)}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination">
                <button
                  className="btn-sm btn-secondary"
                  disabled={page === 0 || loading}
                  onClick={() => load(page - 1)}
                >
                  ← Anterior
                </button>
                <span>Página {page + 1} de {totalPages || 1}</span>
                <button
                  className="btn-sm btn-secondary"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => load(page + 1)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
