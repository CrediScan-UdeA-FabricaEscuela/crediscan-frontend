import { useEffect, useState } from 'react';
import {
  getScoringModels,
  simulateScore,
  saveScenario,
  listScenarios,
  runScenario,
} from '../api/client';
import { CAMPOS_DISPONIBLES } from './ScoringModels';

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

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

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Simulación de Scoring</h2>
          <p>Calculá un puntaje sin persistir y guardá escenarios reutilizables (HU-14)</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><h3>Configuración</h3></div>
        <div className="card-body">
          <label>
            <span>Modelo</span>
            <select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} v{m.version} {m.estado === 'ACTIVE' ? '(activo)' : `(${m.estado})`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h3>Valores de variables</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {valores.map((v, i) => {
              const known = CAMPOS_DISPONIBLES.find(c => c.value === v.key);
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '.4rem', alignItems: 'center' }}>
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
                  <button type="button" className="btn-sm btn-ghost" onClick={() => removeField(i)}>✕</button>
                </div>
              );
            })}
            <datalist id="campos-list">
              {CAMPOS_DISPONIBLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </datalist>
          </div>
          <div style={{ marginTop: '.75rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-sm btn-secondary" onClick={addField}>+ Agregar variable</button>
            <button type="button" onClick={onSimulate} disabled={loading || !selectedModelId}>
              {loading ? 'Calculando...' : '▶ Simular'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><h3>Resultado</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Puntaje final</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{fmt(result.puntajeFinal)}</div>
              </div>
              <div>
                <div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>Estado</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: result.rechazadoPorKo ? '#ef4444' : '#22c55e' }}>
                  {result.rechazadoPorKo ? '❌ Rechazado por KO' : '✅ Apto'}
                </div>
                {result.mensajeKo && <div style={{ fontSize: '.85rem', color: '#ef4444' }}>{result.mensajeKo}</div>}
              </div>
            </div>

            {result.desglose?.length > 0 && (
              <div className="table-wrapper" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead><tr><th>Variable</th><th>Valor</th><th>Rango</th><th>Puntaje</th><th>Peso</th><th>Contribución</th></tr></thead>
                  <tbody>
                    {result.desglose.map((d, i) => (
                      <tr key={i}>
                        <td>{d.nombreVariable}</td>
                        <td>{fmt(d.valorObservado)}</td>
                        <td>{d.etiquetaRango || '—'}</td>
                        <td>{fmt(d.puntajeParcial)}</td>
                        <td>{fmt(d.peso)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(d.contribucion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.reglasKoEvaluadas?.length > 0 && (
              <>
                <h4 style={{ marginTop: '1rem' }}>Reglas Knockout evaluadas</h4>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Campo</th><th>Operador</th><th>Umbral</th><th>Valor</th><th>Activada</th></tr></thead>
                    <tbody>
                      {result.reglasKoEvaluadas.map((k, i) => (
                        <tr key={i}>
                          <td>{k.campo}</td>
                          <td>{k.operador}</td>
                          <td>{fmt(k.umbral)}</td>
                          <td>{fmt(k.valorObservado)}</td>
                          <td>{k.activada ? <span style={{ color: '#ef4444' }}>⚠️ Sí</span> : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedModelId && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><h3>Guardar como escenario</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '.5rem', marginBottom: '.5rem' }}>
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
            <button type="button" className="btn-secondary" onClick={onSaveScenario}>💾 Guardar escenario</button>
            {saveError && <div className="alert error" style={{ marginTop: '.5rem' }}>{saveError}</div>}
            {saveOk && <div className="alert success" style={{ marginTop: '.5rem' }}>{saveOk}</div>}
          </div>
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Escenarios guardados ({scenarios.length})</h3></div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Nombre</th><th>Descripción</th><th>Variables</th><th>Acción</th></tr></thead>
                <tbody>
                  {scenarios.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                      <td>{s.descripcion || '—'}</td>
                      <td style={{ fontSize: '.8rem' }}>{Object.keys(s.valoresVariables || {}).length} variable(s)</td>
                      <td>
                        <button className="btn-sm btn-secondary" onClick={() => onRunScenario(s.id)} disabled={loading}>
                          ▶ Ejecutar
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
  );
}
