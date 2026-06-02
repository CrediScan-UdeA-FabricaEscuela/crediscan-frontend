import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchEvaluations, getEvaluationsExportUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { ListIcon, PlusIcon } from '../components/icons';

// Los valores son los enums reales del backend (RiskLevel / DecisionFilterValue).
// Las etiquetas en español son solo para mostrar al usuario.
const RISK_LEVELS = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'REJECTED'];
const DECISIONS = ['APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'ESCALATED'];

const RISK_LABEL = {
  VERY_LOW: 'Muy Bajo',
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  VERY_HIGH: 'Muy Alto',
  REJECTED: 'Rechazado',
};

const DECISION_LABEL = {
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  MANUAL_REVIEW: 'Revisión Manual',
  ESCALATED: 'Escalado',
};

// D1: Fixed RISK_BADGE — repoints to REAL existing CSS badge classes
const RISK_BADGE = {
  VERY_LOW: 'badge-VERY_LOW',
  LOW: 'badge-LOW',
  MEDIUM: 'badge-MEDIUM',
  HIGH: 'badge-HIGH',
  VERY_HIGH: 'badge-VERY_HIGH',
  REJECTED: 'badge-REJECTED',
};

// D1: DECISION_BADGE — maps decision enum to real CSS badge classes
const DECISION_BADGE = {
  APPROVED: 'badge-APPROVED',
  REJECTED: 'badge-REJECTED',
  MANUAL_REVIEW: 'badge-MANUAL_REVIEW',
  ESCALATED: 'badge-ESCALATED',
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
        className="cell-mono"
        placeholder="UUID de la evaluación..."
        value={evalId}
        onChange={e => setEvalId(e.target.value)}
      />
      <Button size="sm" type="submit" disabled={!evalId.trim()}>Ver Evaluación</Button>
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
          <Button onClick={() => navigate('/evaluaciones/nueva')}>
            <PlusIcon size={16} /> Nueva Evaluación
          </Button>
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
                <div className="filter-grid">
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

                <div className="filter-section">
                  <div>
                    <div className="filter-group-label">Nivel de riesgo</div>
                    <div className="filter-chips">
                      {RISK_LEVELS.map(n => (
                        <label key={n} className="filter-chip">
                          <input
                            type="checkbox"
                            checked={niveles.includes(n)}
                            onChange={() => toggleInArray(niveles, n, setNiveles)}
                          />
                          <span className={`badge ${RISK_BADGE[n]}`}>{RISK_LABEL[n]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="filter-group-label">Decisión</div>
                    <div className="filter-chips">
                      {DECISIONS.map(d => (
                        <label key={d} className="filter-chip">
                          <input
                            type="checkbox"
                            checked={decisiones.includes(d)}
                            onChange={() => toggleInArray(decisiones, d, setDecisiones)}
                          />
                          <span className={`badge ${DECISION_BADGE[d]}`}>{DECISION_LABEL[d]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="export-bar">
                  <Button size="sm" type="submit" disabled={loading}>Buscar</Button>
                  <Button size="sm" variant="secondary" type="button" onClick={onClearFilters}>Limpiar filtros</Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => downloadExport('CSV')} disabled={!hasSearched || rows.length === 0}>
                    Exportar CSV
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => downloadExport('PDF')} disabled={!hasSearched || rows.length === 0}>
                    Exportar PDF
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {error && <div className="alert error">{error}</div>}

          {loading ? (
            <div className="loading-wrapper"><div className="spinner"></div> Cargando...</div>
          ) : !hasSearched ? null : rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ListIcon size={40} />
              </div>
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
                      <td className="cell-mono">{String(r.evaluationId).slice(0, 8)}…</td>
                      <td className="cell-name">
                        <Avatar name={r.applicantName} size="sm" />
                        <span>{r.applicantName || '—'}</span>
                      </td>
                      <td>{r.evaluatedAt ? new Date(r.evaluatedAt).toLocaleString('es-CO') : '—'}</td>
                      <td>{r.score != null ? Number(r.score).toFixed(2) : '—'}</td>
                      <td><span className={`badge ${RISK_BADGE[r.riskLevel] || 'badge-DRAFT'}`}>{RISK_LABEL[r.riskLevel] || r.riskLevel || '—'}</span></td>
                      <td><span className={`badge ${DECISION_BADGE[r.decisionStatus] || 'badge-DRAFT'}`}>{DECISION_LABEL[r.decisionStatus] || r.decisionStatus || '—'}</span></td>
                      <td>{r.analista || '—'}</td>
                      <td>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/evaluaciones/${r.evaluationId}`)}>
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0 || loading}
                  onClick={() => load(page - 1)}
                >
                  ← Anterior
                </Button>
                <span>Página {page + 1} de {totalPages || 1}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => load(page + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
