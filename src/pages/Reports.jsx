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

const EMPLEO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'EMPLEADO', label: 'Empleado' },
  { value: 'INDEPENDIENTE', label: 'Independiente' },
  { value: 'PENSIONADO', label: 'Pensionado' },
  { value: 'DESEMPLEADO', label: 'Desempleado' },
];

const RISK_COLORS = {
  BAJO: '#22c55e',
  MEDIO: '#eab308',
  ALTO: '#ef4444',
};

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
            <label><span>Desde</span>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} /></label>
            <label><span>Hasta</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} /></label>
            <label><span>Tipo de empleo</span>
              <select value={tipoEmpleo} onChange={e => setTipoEmpleo(e.target.value)}>
                {EMPLEO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></label>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={run} disabled={loading}>Generar reporte</button>
            <button className="btn-ghost" onClick={downloadPdf} disabled={!data?.hasData}>⬇ PDF</button>
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
            <div className="card-body" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Total evaluaciones</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.overall.totalEvaluaciones}</div></div>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Score promedio</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmt(data.overall.scorePromedio)}</div></div>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Desviación estándar</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmt(data.overall.desviacionEstandar)}</div></div>
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
                        <td><span className="badge" style={{ background: RISK_COLORS[t.nivel] || '#999', color: '#fff' }}>{t.nivel}</span></td>
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
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.3rem', height: '160px', borderBottom: '1px solid #ddd', paddingBottom: '.3rem' }}>
                {data.histograma.map((b, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }} title={`${b.binInicio}-${b.binFin}: ${b.cantidad}`}>
                    <div style={{
                      width: '100%',
                      height: `${(b.cantidad / maxBin) * 100}%`,
                      background: 'var(--primary, #3b82f6)',
                      minHeight: b.cantidad > 0 ? '2px' : '0',
                      borderRadius: '2px 2px 0 0'
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--navy-600)', marginTop: '.3rem' }}>
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
  const levelsList = ['BAJO', 'MEDIO', 'ALTO'].filter(l => levels.has(l)).concat([...levels].filter(l => !['BAJO', 'MEDIO', 'ALTO'].includes(l)));
  const decisionsList = [...decisions];

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><h3>Filtros</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
            <label><span>Desde *</span><input type="date" value={desde} onChange={e => setDesde(e.target.value)} required /></label>
            <label><span>Hasta *</span><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} required /></label>
            <label><span>Analista (opcional)</span><input type="text" value={analistaId} onChange={e => setAnalistaId(e.target.value)} placeholder="username" /></label>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={run} disabled={loading}>Generar reporte</button>
            <button className="btn-ghost" onClick={downloadPdf} disabled={!data?.hasData}>⬇ PDF</button>
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
            <div className="card-body" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Total casos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.indicadores.totalCasos}</div></div>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Concordancia global</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{pct(data.indicadores.concordanceRate)}</div></div>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Override aprobación</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#eab308' }}>{pct(data.indicadores.overrideApprovalRate)}</div></div>
              <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Override rechazo</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{pct(data.indicadores.overrideRejectionRate)}</div></div>
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
                      {decisionsList.map(d => <th key={d}>{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {levelsList.map(l => (
                      <tr key={l}>
                        <td><span className="badge" style={{ background: RISK_COLORS[l] || '#999', color: '#fff' }}>{l}</span></td>
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
                          <td>{o.riskLevel}</td>
                          <td>{o.decision}</td>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
            <label><span>Desde *</span><input type="date" value={desde} onChange={e => setDesde(e.target.value)} required /></label>
            <label><span>Hasta *</span><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} required /></label>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={run} disabled={loading}>Generar reporte</button>
            <button className="btn-ghost" onClick={() => downloadFile('PDF')} disabled={!data?.hasData}>⬇ PDF</button>
            <button className="btn-ghost" onClick={() => downloadFile('CSV')} disabled={!data?.hasData}>⬇ CSV</button>
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
              <div className="card-body" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Total evaluaciones</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.estadisticasEquipo.totalEvaluaciones}</div></div>
                <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}># Analistas</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.estadisticasEquipo.numAnalistas}</div></div>
                <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Tiempo medio (hrs)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmt(data.estadisticasEquipo.mediaEquipoHorasHabiles)}</div></div>
                <div><div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Tasa aprobación equipo</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{pct(data.estadisticasEquipo.tasaAprobacionEquipo)}</div></div>
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
    canDistribution && { id: 'distribucion', label: 'Distribución de Riesgo (HU-15)', cmp: <RiskDistributionReport /> },
    canEffectiveness && { id: 'efectividad', label: 'Efectividad del Modelo (HU-16)', cmp: <ModelEffectivenessReport /> },
    canActivity && { id: 'actividad', label: 'Actividad de Analistas (HU-17)', cmp: <AnalystActivityReport /> },
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

      <div style={{ display: 'flex', gap: '.5rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {availableTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={active === t.id ? '' : 'btn-ghost'}
            style={{
              borderRadius: '6px 6px 0 0',
              borderBottom: active === t.id ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {availableTabs.find(t => t.id === active)?.cmp}
    </div>
  );
}
