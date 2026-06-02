import { useEffect, useState } from 'react';
import {
  getScoringModels,
  simulateScore,
  saveScenario,
  listScenarios,
  runScenario,
} from '../api/client';
import { CAMPOS_DISPONIBLES } from './scoring-models-constants';
import { PlayIcon, PlusIcon } from '../components/icons';

// ── Inline icon helpers (no modification to icons.jsx) ────────────────────

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SaveIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17,21 17,13 7,13 7,21" />
      <polyline points="7,3 7,8 15,8" />
    </svg>
  );
}

function CheckIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

function AlertIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function RefreshIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

// ── Circular Score Gauge ───────────────────────────────────────────────────
// Design decision: no reliable max score from the API, so the ring is
// STATUS-COLORED (full accent ring for Apto, danger ring for KO) with the
// score number prominent. This avoids a misleading proportional fill.
function ScoreGauge({ score, isKo }) {
  const ringColor = isKo
    ? 'var(--danger)'
    : 'var(--accent-primary)';
  const statusLabel = isKo ? 'Rechazado por KO' : 'Apto';
  const statusColor = isKo ? 'var(--danger)' : 'var(--success)';

  return (
    <div className="sim-gauge-wrapper">
      <div
        className="sim-gauge"
        style={{ background: `conic-gradient(${ringColor} 0deg 360deg, transparent 360deg)` }}
      >
        <div className="sim-gauge-center">
          <span className="sim-gauge-score">{fmt(score, 0)}</span>
          <span className="sim-gauge-sublabel">puntaje</span>
        </div>
      </div>
      <div className="sim-gauge-status" style={{ color: statusColor }}>
        {isKo
          ? <><AlertIcon size={14} /> {statusLabel}</>
          : <><CheckIcon size={14} /> {statusLabel}</>
        }
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Simulation() {
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [valores, setValores] = useState(() => CAMPOS_DISPONIBLES.map(c => ({ key: c.value, value: '' })));
  const [result, setResult] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDesc, setScenarioDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');

  useEffect(() => {
    getScoringModels()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.content || []);
        setModels(list);
        const active = list.find(m => m.estado === 'ACTIVE');
        if (active) setSelectedModelId(active.id);
      })
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedModelId) { setScenarios([]); return; }
    listScenarios(selectedModelId)
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, [selectedModelId]);

  function updateField(idx, prop, value) {
    setValores(prev => prev.map((v, i) => i === idx ? { ...v, [prop]: value } : v));
  }

  function addField() {
    setValores(prev => [...prev, { key: '', value: '' }]);
  }

  function removeField(idx) {
    setValores(prev => prev.filter((_, i) => i !== idx));
  }

  function buildValoresMap() {
    const m = {};
    for (const v of valores) {
      if (!v.key || v.value === '') continue;
      const n = Number(v.value);
      if (!Number.isFinite(n)) throw new Error(`Valor inválido para ${v.key}`);
      m[v.key] = n;
    }
    return m;
  }

  function onReset() {
    setResult(null);
    setError('');
    setValores(CAMPOS_DISPONIBLES.map(c => ({ key: c.value, value: '' })));
  }

  async function onSimulate() {
    setError(''); setResult(null);
    if (!selectedModelId) { setError('Seleccioná un modelo.'); return; }
    let valoresMap;
    try { valoresMap = buildValoresMap(); }
    catch (e) { setError(e.message); return; }
    if (Object.keys(valoresMap).length === 0) { setError('Ingresá al menos un valor.'); return; }

    setLoading(true);
    try {
      const r = await simulateScore({ modeloId: selectedModelId, valoresVariables: valoresMap });
      setResult(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function onSaveScenario() {
    setSaveError(''); setSaveOk('');
    if (!scenarioName.trim()) { setSaveError('Nombre requerido.'); return; }
    let valoresMap;
    try { valoresMap = buildValoresMap(); }
    catch (e) { setSaveError(e.message); return; }

    try {
      await saveScenario({
        modeloId: selectedModelId,
        nombre: scenarioName.trim(),
        descripcion: scenarioDesc.trim() || null,
        valoresVariables: valoresMap,
      });
      setSaveOk('Escenario guardado.');
      setScenarioName(''); setScenarioDesc('');
      const list = await listScenarios(selectedModelId);
      setScenarios(list);
    } catch (e) { setSaveError(e.message); }
  }

  async function onRunScenario(id) {
    setError(''); setResult(null); setLoading(true);
    try {
      const r = await runScenario(id);
      setResult(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // Active model badge helper
  const activeModel = models.find(m => m.estado === 'ACTIVE');

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Simulación de Scoring</h2>
          <p>Calculá un puntaje sin persistir y guardá escenarios reutilizables</p>
        </div>
      </div>

      <div className="sim-layout">
        {/* ── LEFT COLUMN ── */}
        <div className="sim-left">
          {/* Configuración */}
          <div className="card card-mb">
            <div className="card-header">
              <h3>Configuración</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Modelo</label>
                <div className="sim-model-row">
                  <select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} v{m.version} {m.estado === 'ACTIVE' ? '(activo)' : `(${m.estado})`}
                      </option>
                    ))}
                  </select>
                  {activeModel && selectedModelId === activeModel.id && (
                    <span className="badge badge-ACTIVE sim-active-badge">ACTIVE</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Valores de variables */}
          <div className="card card-mb">
            <div className="card-header">
              <h3>Valores de variables</h3>
            </div>
            <div className="card-body">
              <div className="sim-vars-list">
                {valores.map((v, i) => {
                  const known = CAMPOS_DISPONIBLES.find(c => c.value === v.key);
                  return (
                    <div key={i} className="sim-var-row">
                      <input
                        type="text"
                        list="campos-list"
                        value={v.key}
                        onChange={e => updateField(i, 'key', e.target.value)}
                        placeholder="nombre_variable"
                        title={known?.label || ''}
                      />
                      <input
                        type="number"
                        step="any"
                        value={v.value}
                        onChange={e => updateField(i, 'value', e.target.value)}
                        placeholder="valor numérico"
                      />
                      <button
                        type="button"
                        className="btn-sm btn-ghost"
                        onClick={() => removeField(i)}
                        aria-label="remove variable"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  );
                })}
                <datalist id="campos-list">
                  {CAMPOS_DISPONIBLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </datalist>
              </div>
              <div className="sim-var-actions">
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  onClick={addField}
                >
                  <PlusIcon size={13} />
                  Agregar variable
                </button>
                <button
                  type="button"
                  onClick={onSimulate}
                  disabled={loading || !selectedModelId}
                >
                  <PlayIcon size={14} />
                  {loading ? 'Calculando...' : 'Calcular simulación'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onReset}
                  disabled={loading}
                >
                  <RefreshIcon size={14} />
                  Restablecer
                </button>
              </div>
            </div>
          </div>

          {/* Guardar como escenario */}
          {selectedModelId && (
            <div className="card card-mb">
              <div className="card-header"><h3>Guardar como escenario</h3></div>
              <div className="card-body">
                <div className="sim-scenario-inputs">
                  <input
                    type="text"
                    placeholder="Nombre del escenario"
                    value={scenarioName}
                    onChange={e => setScenarioName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={scenarioDesc}
                    onChange={e => setScenarioDesc(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onSaveScenario}
                  style={{ marginTop: '.5rem' }}
                >
                  <SaveIcon size={14} />
                  Guardar escenario
                </button>
                {saveError && <div className="alert error" style={{ marginTop: '.5rem' }}>{saveError}</div>}
                {saveOk && <div className="alert success" style={{ marginTop: '.5rem' }}>{saveOk}</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="sim-right">
          {error && <div className="alert error">{error}</div>}

          {/* Result panel */}
          {result ? (
            <div className="card card-mb">
              <div className="card-header"><h3>Resultado</h3></div>
              <div className="card-body">
                <ScoreGauge score={result.puntajeFinal} isKo={result.rechazadoPorKo} />

                {result.mensajeKo && (
                  <div className="alert error sim-ko-msg" style={{ marginTop: '1rem' }}>
                    <AlertIcon size={14} />
                    {result.mensajeKo}
                  </div>
                )}

                {result.desglose?.length > 0 && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <h4 className="sim-section-title">Detalle de variables</h4>
                    <div className="table-wrapper sim-breakdown-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Variable</th>
                            <th>Valor</th>
                            <th>Rango</th>
                            <th>Puntaje</th>
                            <th>Peso</th>
                            <th>Contribución</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.desglose.map((d, i) => (
                            <tr key={i}>
                              <td>{d.nombreVariable}</td>
                              <td>{fmt(d.valorObservado)}</td>
                              <td>{d.etiquetaRango || '—'}</td>
                              <td>{fmt(d.puntajeParcial)}</td>
                              <td>{fmt(d.peso)}</td>
                              <td className="sim-contrib">{fmt(d.contribucion)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.reglasKoEvaluadas?.length > 0 && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <h4 className="sim-section-title">Reglas Knockout evaluadas</h4>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Campo</th>
                            <th>Operador</th>
                            <th>Umbral</th>
                            <th>Valor</th>
                            <th>Activada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.reglasKoEvaluadas.map((k, i) => (
                            <tr key={i}>
                              <td>{k.campo}</td>
                              <td>{k.operador}</td>
                              <td>{fmt(k.umbral)}</td>
                              <td>{fmt(k.valorObservado)}</td>
                              <td>
                                {k.activada
                                  ? <span className="sim-ko-activated"><AlertIcon size={13} /> Sí</span>
                                  : <span className="sim-ko-inactive">No</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card card-mb sim-result-placeholder">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <PlayIcon size={32} />
                  </div>
                  <p>Configurá variables y presioná <strong>Calcular simulación</strong> para ver el resultado.</p>
                </div>
              </div>
            </div>
          )}

          {/* Scenarios */}
          {scenarios.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>Escenarios guardados ({scenarios.length})</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Variables</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                          <td>{s.descripcion || '—'}</td>
                          <td className="cell-mono">{Object.keys(s.valoresVariables || {}).length} variable(s)</td>
                          <td>
                            <button
                              className="btn-sm btn-secondary"
                              onClick={() => onRunScenario(s.id)}
                              disabled={loading}
                            >
                              <PlayIcon size={12} />
                              Ejecutar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
