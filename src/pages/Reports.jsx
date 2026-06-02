import { useState } from 'react';
import {
  getRiskDistribution,
  getRiskDistributionPdfUrl,
  getModelEffectiveness,
  getModelEffectivenessPdfUrl,
  getAnalystActivity,
  getAnalystActivityPdfUrl,
  getAnalystActivityCsvUrl,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';

const EMPLEO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'EMPLEADO', label: 'Empleado' },
  { value: 'INDEPENDIENTE', label: 'Independiente' },
  { value: 'PENSIONADO', label: 'Pensionado' },
  { value: 'DESEMPLEADO', label: 'Desempleado' },
];

// Las claves son los enums reales del backend (RiskLevel). Las etiquetas en español
// son solo para mostrar; el reporting devuelve el nivel como nombre del enum (HIGH, LOW, ...).
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

// Orden de presentación de los niveles de riesgo (valores = enums del backend).
const RISK_ORDER = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'REJECTED'];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function dateToIsoStart(d) { return `${d}T00:00:00Z`; }
function dateToIsoEnd(d) { return `${d}T23:59:59Z`; }

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(n) {
  if (n == null) return '—';
  return `${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

async function downloadAuthorized(url, filename) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  if (!res.ok) throw new Error(`Error ${res.status} al descargar`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// =============================================================================
// HU-15: Distribución de Riesgo
// =============================================================================
function RiskDistributionReport() {
  const [fechaDesde, setFechaDesde] = useState(daysAgo(30));
  const [fechaHasta, setFechaHasta] = useState(todayDate());
  const [tipoEmpleo, setTipoEmpleo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true); setError('');
    try {
      const r = await getRiskDistribution({
        fechaDesde: dateToIsoStart(fechaDesde),
        fechaHasta: dateToIsoEnd(fechaHasta),
        tipoEmpleo: tipoEmpleo || undefined,
      });
      setData(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function downloadPdf() {
    try {
      await downloadAuthorized(
        getRiskDistributionPdfUrl({
          fechaDesde: dateToIsoStart(fechaDesde),
          fechaHasta: dateToIsoEnd(fechaHasta),
          tipoEmpleo: tipoEmpleo || undefined,
        }),
        'distribucion-riesgo.pdf'
      );
    } catch (e) { setError(e.message); }
  }

  const maxBin = data?.histograma?.reduce((m, b) => Math.max(m, b.cantidad), 0) || 1;

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><h3>Filtros</h3></div>
        <div className="card-body">
          <div className="report-filters">
            <label><span>Desde</span>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} /></label>
            <label><span>Hasta</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} /></label>
            <label><span>Tipo de empleo</span>
              <select value={tipoEmpleo} onChange={e => setTipoEmpleo(e.target.value)}>
                {EMPLEO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></label>
          </div>
          <div className="report-actions">
            <Button variant="primary" size="sm" onClick={run} disabled={loading}>Generar reporte</Button>
            <Button variant="ghost" size="sm" onClick={downloadPdf} disabled={!data?.hasData}>⬇ PDF</Button>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <div className="loading-wrapper"><div className="spinner"></div> Generando...</div>}

      {data && !data.hasData && (
        <div className="alert info">{data.mensaje || 'Sin datos para los filtros aplicados.'}</div>
      )}

      {data?.hasData && (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header"><h3>Resumen general</h3></div>
            <div className="card-body">
              <div className="report-stats">
                <StatCard
                  value={data.overall.totalEvaluaciones}
                  label="Total evaluaciones"
                  accent="blue"
                />
                <StatCard
                  value={fmt(data.overall.scorePromedio)}
                  label="Score promedio"
                  accent="purple"
                />
                <StatCard
                  value={fmt(data.overall.desviacionEstandar)}
                  label="Desviación estándar"
                  accent="amber"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header"><h3>Distribución por nivel</h3></div>
            <div className="card-body">
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Nivel</th><th>Cantidad</th><th>Porcentaje</th><th>Score promedio</th></tr></thead>
                  <tbody>
                    {data.tabla.map(t => (
                      <tr key={t.nivel}>
                        <td><span className={`badge badge-${t.nivel}`}>{RISK_LABEL[t.nivel] || t.nivel}</span></td>
                        <td>{t.cantidad}</td>
                        <td>{pct(t.porcentaje)}</td>
                        <td>{fmt(t.scorePromedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Histograma de scores</h3></div>
            <div className="card-body">
              <div className="histogram">
                {data.histograma.map((b, idx) => (
                  <div
                    key={idx}
                    className="histogram-col"
                    title={`${b.binInicio}-${b.binFin}: ${b.cantidad}`}
                  >
                    <div
                      className={`histogram-bar${b.cantidad > 0 ? ' has-count' : ''}`}
                      style={{ height: `${(b.cantidad / maxBin) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="histogram-axis">
                {data.histograma.length > 0 && (
                  <>
                    <span>{data.histograma[0].binInicio}</span>
                    <span>{data.histograma[data.histograma.length - 1].binFin}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// HU-16: Efectividad del Modelo
// =============================================================================
function ModelEffectivenessReport() {
  const [desde, setDesde] = useState(daysAgo(30));
  const [hasta, setHasta] = useState(todayDate());
  const [analistaId, setAnalistaId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true); setError('');
    try {
      const r = await getModelEffectiveness({
        desde: dateToIsoStart(desde),
        hasta: dateToIsoEnd(hasta),
        analistaId: analistaId.trim() || undefined,
      });
      setData(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function downloadPdf() {
    try {
      await downloadAuthorized(
        getModelEffectivenessPdfUrl({
          desde: dateToIsoStart(desde),
          hasta: dateToIsoEnd(hasta),
          analistaId: analistaId.trim() || undefined,
        }),
        'efectividad-modelo.pdf'
      );
    } catch (e) { setError(e.message); }
  }

  // Pivot matriz: [riskLevel][decision] = count
  const matrixMap = {};
  const levels = new Set();
  const decisions = new Set();
  (data?.matriz || []).forEach(c => {
    matrixMap[c.riskLevel] = matrixMap[c.riskLevel] || {};
    matrixMap[c.riskLevel][c.decision] = c.count;
    levels.add(c.riskLevel);
    decisions.add(c.decision);
  });
  const levelsList = RISK_ORDER.filter(l => levels.has(l)).concat([...levels].filter(l => !RISK_ORDER.includes(l)));
  const decisionsList = [...decisions];

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><h3>Filtros</h3></div>
        <div className="card-body">
          <div className="report-filters">
            <label><span>Desde *</span><input type="date" value={desde} onChange={e => setDesde(e.target.value)} required /></label>
            <label><span>Hasta *</span><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} required /></label>
            <label><span>Analista (opcional)</span><input type="text" value={analistaId} onChange={e => setAnalistaId(e.target.value)} placeholder="username" /></label>
          </div>
          <div className="report-actions">
            <Button variant="primary" size="sm" onClick={run} disabled={loading}>Generar reporte</Button>
            <Button variant="ghost" size="sm" onClick={downloadPdf} disabled={!data?.hasData}>⬇ PDF</Button>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <div className="loading-wrapper"><div className="spinner"></div> Generando...</div>}

      {data && !data.hasData && (
        <div className="alert info">{data.mensaje || 'Sin datos.'}</div>
      )}

      {data?.hasData && data.indicadores && (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header"><h3>Indicadores</h3></div>
            <div className="card-body">
              <div className="report-stats">
                <StatCard
                  value={data.indicadores.totalCasos}
                  label="Total casos"
                  accent="blue"
                />
                <StatCard
                  value={pct(data.indicadores.concordanceRate)}
                  label="Concordancia global"
                  accent="green"
                />
                <StatCard
                  value={pct(data.indicadores.overrideApprovalRate)}
                  label="Override aprobación"
                  accent="amber"
                />
                <StatCard
                  value={pct(data.indicadores.overrideRejectionRate)}
                  label="Override rechazo"
                  accent="purple"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header"><h3>Matriz de confusión (Nivel × Decisión)</h3></div>
            <div className="card-body">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nivel \ Decisión</th>
                      {decisionsList.map(d => <th key={d}>{DECISION_LABEL[d] || d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {levelsList.map(l => (
                      <tr key={l}>
                        <td><span className={`badge badge-${l}`}>{RISK_LABEL[l] || l}</span></td>
                        {decisionsList.map(d => (
                          <td key={d} style={{ fontWeight: 600 }}>{matrixMap[l]?.[d] ?? 0}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {data.overrides?.length > 0 && (
            <div className="card">
              <div className="card-header"><h3>Casos de override</h3></div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Nivel</th><th>Decisión</th><th>Cantidad</th></tr></thead>
                    <tbody>
                      {data.overrides.map((o, i) => (
                        <tr key={i}>
                          <td>{RISK_LABEL[o.riskLevel] || o.riskLevel}</td>
                          <td>{DECISION_LABEL[o.decision] || o.decision}</td>
                          <td>{o.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// HU-17: Actividad de Analistas
// =============================================================================
function AnalystActivityReport() {
  const [desde, setDesde] = useState(daysAgo(30));
  const [hasta, setHasta] = useState(todayDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true); setError('');
    try {
      const r = await getAnalystActivity({
        desde: dateToIsoStart(desde),
        hasta: dateToIsoEnd(hasta),
      });
      setData(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function downloadFile(format) {
    try {
      const url = format === 'PDF'
        ? getAnalystActivityPdfUrl({ desde: dateToIsoStart(desde), hasta: dateToIsoEnd(hasta) })
        : getAnalystActivityCsvUrl({ desde: dateToIsoStart(desde), hasta: dateToIsoEnd(hasta) });
      await downloadAuthorized(url, `actividad-analistas.${format.toLowerCase()}`);
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><h3>Filtros</h3></div>
        <div className="card-body">
          <div className="report-filters">
            <label><span>Desde *</span><input type="date" value={desde} onChange={e => setDesde(e.target.value)} required /></label>
            <label><span>Hasta *</span><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} required /></label>
          </div>
          <div className="report-actions">
            <Button variant="primary" size="sm" onClick={run} disabled={loading}>Generar reporte</Button>
            <Button variant="ghost" size="sm" onClick={() => downloadFile('PDF')} disabled={!data?.hasData}>⬇ PDF</Button>
            <Button variant="ghost" size="sm" onClick={() => downloadFile('CSV')} disabled={!data?.hasData}>⬇ CSV</Button>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <div className="loading-wrapper"><div className="spinner"></div> Generando...</div>}

      {data && !data.hasData && (
        <div className="alert info">{data.mensaje || 'Sin datos.'}</div>
      )}

      {data?.hasData && (
        <>
          {data.estadisticasEquipo && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-header"><h3>Estadísticas del equipo</h3></div>
              <div className="card-body">
                <div className="report-stats">
                  <StatCard
                    value={data.estadisticasEquipo.totalEvaluaciones}
                    label="Total evaluaciones"
                    accent="blue"
                  />
                  <StatCard
                    value={data.estadisticasEquipo.numAnalistas}
                    label="# Analistas"
                    accent="purple"
                  />
                  <StatCard
                    value={fmt(data.estadisticasEquipo.mediaEquipoHorasHabiles)}
                    label="Tiempo medio (hrs)"
                    accent="amber"
                  />
                  <StatCard
                    value={pct(data.estadisticasEquipo.tasaAprobacionEquipo)}
                    label="Tasa aprobación equipo"
                    accent="green"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><h3>Por analista</h3></div>
            <div className="card-body">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Analista</th>
                      <th>Total</th>
                      <th>Aprob.</th>
                      <th>Rech.</th>
                      <th>Manual</th>
                      <th>Escalado</th>
                      <th>% Aprob.</th>
                      <th>Tiempo medio (hrs)</th>
                      <th>Outlier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analistas.map(a => (
                      <tr key={a.analistaId}>
                        <td style={{ fontWeight: 600 }}>{a.nombre || a.analistaId}</td>
                        <td>{a.totalEvaluaciones}</td>
                        <td>{a.distribucion.aprobadas}</td>
                        <td>{a.distribucion.rechazadas}</td>
                        <td>{a.distribucion.revisionManual}</td>
                        <td>{a.distribucion.escaladas}</td>
                        <td>{pct(a.distribucion.tasaAprobacion)}</td>
                        <td>{fmt(a.tiempoMedioHorasHabiles)}</td>
                        <td>{a.isOutlier ? '⚠️ Sí' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Página principal con tabs
// =============================================================================
export default function Reports() {
  const { auth } = useAuth();
  const role = auth?.role;
  const canEffectiveness = ['ADMIN', 'RISK_MANAGER', 'CREDIT_SUPERVISOR'].includes(role);
  const canActivity = ['ADMIN', 'CREDIT_SUPERVISOR'].includes(role);
  const canDistribution = ['ADMIN', 'RISK_MANAGER'].includes(role);

  const availableTabs = [
    canDistribution && { id: 'distribucion', label: 'Distribución de Riesgo', cmp: <RiskDistributionReport /> },
    canEffectiveness && { id: 'efectividad', label: 'Efectividad del Modelo', cmp: <ModelEffectivenessReport /> },
    canActivity && { id: 'actividad', label: 'Actividad de Analistas', cmp: <AnalystActivityReport /> },
  ].filter(Boolean);

  const [active, setActive] = useState(availableTabs[0]?.id);

  if (availableTabs.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group"><h2>Reportes</h2></div>
        </div>
        <div className="alert info">Tu rol no tiene acceso a ningún reporte.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Reportes</h2>
          <p>Análisis de desempeño del modelo y el equipo</p>
        </div>
      </div>

      <div className="tabs">
        {availableTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={active === t.id ? 'tab-btn active' : 'tab-btn'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {availableTabs.find(t => t.id === active)?.cmp}
    </div>
  );
}
