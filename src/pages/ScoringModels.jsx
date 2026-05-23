import { useEffect, useState } from 'react';
import {
  getScoringModels,
  createScoringModel,
  activateModel,
  deleteScoringModel,
  getKnockoutRules,
  createKnockoutRule,
  deleteKnockoutRule,
  compareScoringModels,
} from '../api/client';

const KO_OPERATORS = ['GT', 'LT', 'GTE', 'LTE', 'EQ', 'NEQ'];

export const CAMPOS_DISPONIBLES = [
  { value: 'ingreso_anual',             label: 'Ingreso anual' },
  { value: 'gastos_mensuales',          label: 'Gastos mensuales' },
  { value: 'deudas_actuales',           label: 'Deudas actuales' },
  { value: 'valor_activos',             label: 'Valor de activos' },
  { value: 'patrimonio_declarado',      label: 'Patrimonio declarado' },
  { value: 'meses_historial_credito',   label: 'Meses de historial crediticio' },
  { value: 'moras_12_meses',            label: 'Moras últimos 12 meses' },
  { value: 'moras_24_meses',            label: 'Moras últimos 24 meses' },
  { value: 'score_buro',                label: 'Score buró externo' },
  { value: 'productos_credito_activos', label: 'Productos de crédito activos' },
  { value: 'ratio_deuda_ingreso',       label: 'Ratio deuda / ingreso' },
];

const OPERATOR_LABELS = {
  GT: '> Mayor que',
  LT: '< Menor que',
  GTE: '>= Mayor o igual',
  LTE: '<= Menor o igual',
  EQ: '= Igual a',
  NEQ: '≠ Distinto de',
};

function getCampoLabel(snakeValue) {
  const found = CAMPOS_DISPONIBLES.find(c => c.value === snakeValue);
  return found ? found.label : snakeValue;
}

function emptyKoForm() {
  return { campo: CAMPOS_DISPONIBLES[0].value, operador: 'GT', umbral: '', mensaje: '', prioridad: 1 };
}

function ModelRow({ model, onActivate, activating, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState('');
  const [showKoForm, setShowKoForm] = useState(false);
  const [koForm, setKoForm] = useState(emptyKoForm());
  const [savingKo, setSavingKo] = useState(false);
  const [koError, setKoError] = useState('');

  function toggle() {
    if (!expanded) loadRules();
    setExpanded(!expanded);
  }

  async function loadRules() {
    setLoadingRules(true);
    setRulesError('');
    try {
      const data = await getKnockoutRules(model.id);
      setRules(Array.isArray(data) ? data : (data?.content || []));
    } catch (err) {
      setRulesError(err.message);
    } finally {
      setLoadingRules(false);
    }
  }

  async function onDeleteRule(ruleId) {
    if (!confirm('¿Eliminar esta regla KO?')) return;
    try {
      await deleteKnockoutRule(model.id, ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
    } catch (err) {
      setKoError(err.message);
    }
  }

  async function onSaveKo(e) {
    e.preventDefault();
    setSavingKo(true);
    setKoError('');
    try {
      const payload = {
        campo: koForm.campo,
        operador: koForm.operador,
        umbral: Number(koForm.umbral),
        mensaje: koForm.mensaje,
        prioridad: Number(koForm.prioridad),
      };
      const newRule = await createKnockoutRule(model.id, payload);
      setRules([...rules, newRule]);
      setKoForm(emptyKoForm());
      setShowKoForm(false);
    } catch (err) {
      setKoError(err.message);
    } finally {
      setSavingKo(false);
    }
  }

  return (
    <>
      <tr className="expandable-row">
        <td style={{ fontWeight: 600 }}>{model.nombre}</td>
        <td style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--navy-600)' }}>v{model.version ?? 1}</td>
        <td><span className={`badge badge-${model.estado}`}>{model.estado}</span></td>
        <td>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            <button className="btn-sm btn-secondary" onClick={toggle}>
              {expanded ? '▲ Cerrar' : '▼ KO Rules'}
            </button>
            {model.estado !== 'ACTIVE' && (
              <button
                className="btn-sm btn-success"
                onClick={() => onActivate(model.id)}
                disabled={activating === model.id}
              >
                {activating === model.id ? 'Activando...' : '✓ Activar'}
              </button>
            )}
            {model.estado === 'DRAFT' && (
              <button
                className="btn-sm btn-danger"
                onClick={() => onDelete(model.id, model.nombre)}
              >
                🗑 Eliminar
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <div className="expand-panel">
              <div className="expand-panel-inner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
                  <strong style={{ fontSize: '.875rem' }}>Reglas Knockout — {model.nombre}</strong>
                  <button
                    className="btn-sm btn-ghost"
                    onClick={() => { setShowKoForm(!showKoForm); setKoError(''); }}
                  >
                    {showKoForm ? '✕ Cancelar' : '+ Agregar Regla'}
                  </button>
                </div>

                {koError && <div className="alert error">{koError}</div>}

                {showKoForm && (
                  <form onSubmit={onSaveKo} className="inline-form" style={{ marginBottom: '.75rem' }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Campo *</label>
                        <select
                          value={koForm.campo}
                          onChange={e => setKoForm({ ...koForm, campo: e.target.value })}
                        >
                          {CAMPOS_DISPONIBLES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Operador *</label>
                        <select
                          value={koForm.operador}
                          onChange={e => setKoForm({ ...koForm, operador: e.target.value })}
                        >
                          {KO_OPERATORS.map(op => (
                            <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Umbral *</label>
                        <input
                          type="number"
                          value={koForm.umbral}
                          onChange={e => setKoForm({ ...koForm, umbral: e.target.value })}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Prioridad</label>
                        <input
                          type="number"
                          value={koForm.prioridad}
                          onChange={e => setKoForm({ ...koForm, prioridad: e.target.value })}
                          min="1"
                          placeholder="1"
                        />
                      </div>
                      <div className="form-group form-full">
                        <label>Mensaje *</label>
                        <input
                          value={koForm.mensaje}
                          onChange={e => setKoForm({ ...koForm, mensaje: e.target.value })}
                          placeholder="Descripción del rechazo automático..."
                          required
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn-sm btn-secondary" onClick={() => setShowKoForm(false)}>Cancelar</button>
                      <button type="submit" className="btn-sm" disabled={savingKo}>
                        {savingKo ? 'Guardando...' : 'Guardar Regla'}
                      </button>
                    </div>
                  </form>
                )}

                {loadingRules ? (
                  <div className="loading-wrapper"><div className="spinner"></div></div>
                ) : rulesError ? (
                  <div className="alert error">{rulesError}</div>
                ) : rules.length === 0 ? (
                  <p style={{ fontSize: '.8rem', color: 'var(--navy-600)', textAlign: 'center', padding: '.75rem' }}>
                    Sin reglas KO configuradas para este modelo.
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Campo</th>
                        <th>Operador</th>
                        <th>Umbral</th>
                        <th>Prioridad</th>
                        <th>Mensaje</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{getCampoLabel(r.campo)}</td>
                          <td><span className="badge badge-DRAFT">{r.operador}</span></td>
                          <td>{r.umbral}</td>
                          <td>{r.prioridad}</td>
                          <td style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>{r.mensaje}</td>
                          <td>
                            <button
                              className="btn-xs btn-danger"
                              onClick={() => onDeleteRule(r.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ScoringModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [activating, setActivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareBase, setCompareBase] = useState('');
  const [compareTarget, setCompareTarget] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState('');

  useEffect(() => { loadModels(); }, []);

  async function onCompare() {
    setCompareError(''); setCompareResult(null);
    if (!compareBase || !compareTarget) { setCompareError('Seleccioná los dos modelos.'); return; }
    if (compareBase === compareTarget) { setCompareError('Seleccioná modelos distintos.'); return; }
    setComparing(true);
    try {
      const r = await compareScoringModels(compareBase, compareTarget);
      setCompareResult(r);
    } catch (e) { setCompareError(e.message); }
    finally { setComparing(false); }
  }

  async function loadModels() {
    setLoading(true);
    setError('');
    try {
      const data = await getScoringModels();
      setModels(Array.isArray(data) ? data : (data?.content || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onActivate(modelId) {
    setActivating(modelId);
    try {
      await activateModel(modelId);
      setSaveSuccess('Modelo activado correctamente.');
      loadModels();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setActivating(null);
    }
  }

  async function onDelete(modelId, nombre) {
    if (!confirm(`¿Eliminar el modelo "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(modelId);
    setSaveError('');
    setSaveSuccess('');
    try {
      await deleteScoringModel(modelId);
      setSaveSuccess(`Modelo "${nombre}" eliminado.`);
      loadModels();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await createScoringModel({ nombre: form.nombre, descripcion: form.descripcion });
      setSaveSuccess(`Modelo "${form.nombre}" creado.`);
      setForm({ nombre: '', descripcion: '' });
      setShowForm(false);
      loadModels();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Modelos de Scoring</h2>
          <p>{models.length} modelos configurados</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => { setShowCompare(!showCompare); setCompareError(''); setCompareResult(null); }}>
            {showCompare ? '✕ Cerrar comparación' : '⇄ Comparar modelos'}
          </button>
          <button onClick={() => { setShowForm(!showForm); setSaveError(''); }}>
            {showForm ? '✕ Cancelar' : '+ Crear Modelo'}
          </button>
        </div>
      </div>

      {showCompare && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header"><h3>Comparar modelos (HU-08)</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '.5rem', alignItems: 'end' }}>
              <label>
                <span>Modelo base</span>
                <select value={compareBase} onChange={e => setCompareBase(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.nombre} v{m.version}</option>)}
                </select>
              </label>
              <label>
                <span>Modelo a comparar</span>
                <select value={compareTarget} onChange={e => setCompareTarget(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.nombre} v{m.version}</option>)}
                </select>
              </label>
              <button onClick={onCompare} disabled={comparing}>{comparing ? 'Comparando...' : 'Comparar'}</button>
            </div>
            {compareError && <div className="alert error" style={{ marginTop: '.75rem' }}>{compareError}</div>}
            {compareResult && (
              <div style={{ marginTop: '1rem' }}>
                <pre style={{
                  background: '#0b1220',
                  color: '#d1d5db',
                  padding: '1rem',
                  borderRadius: '6px',
                  fontSize: '.78rem',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>{JSON.stringify(compareResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {saveSuccess && <div className="alert success">{saveSuccess}</div>}
      {saveError && <div className="alert error">{saveError}</div>}
      {error && <div className="alert error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', maxWidth: '560px' }}>
          <div className="card-header">
            <h3>Nuevo Modelo</h3>
          </div>
          <div className="card-body">
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                  placeholder="ej: Modelo Retail v2"
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del modelo..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear Modelo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-wrapper"><div className="spinner"></div> Cargando modelos...</div>
      ) : models.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏗</div>
          <p>No hay modelos de scoring configurados.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <ModelRow
                  key={m.id}
                  model={m}
                  onActivate={onActivate}
                  activating={activating}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
