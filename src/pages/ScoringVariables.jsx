import { useEffect, useState } from 'react';
import { getScoringVariables, createScoringVariable, updateScoringVariable } from '../api/client';

const BLANK_RANGE = { limiteInferior: '', limiteSuperior: '', puntaje: '', etiqueta: '' };

const CAMPOS_DISPONIBLES = [
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

function emptyForm() {
  return {
    nombre: CAMPOS_DISPONIBLES[0].value,
    descripcion: '',
    tipo: 'NUMERIC',
    peso: '',
    rangos: [{ ...BLANK_RANGE }, { ...BLANK_RANGE }],
    categorias: [],
  };
}

function variableToForm(v) {
  return {
    nombre: v.nombre,
    descripcion: v.descripcion || '',
    tipo: v.tipo,
    peso: v.peso != null ? String(v.peso) : '',
    rangos: v.rangos?.length
      ? v.rangos.map(r => ({
          limiteInferior: String(r.limiteInferior),
          limiteSuperior: String(r.limiteSuperior),
          puntaje: String(r.puntaje),
          etiqueta: r.etiqueta || '',
        }))
      : [{ ...BLANK_RANGE }, { ...BLANK_RANGE }],
    categorias: [],
  };
}

export default function ScoringVariables() {
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => { loadVariables(); }, []);

  async function loadVariables() {
    setLoading(true);
    setError('');
    try {
      const data = await getScoringVariables();
      setVariables(Array.isArray(data) ? data : (data?.variables || data?.content || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSaveError('');
    setSaveSuccess('');
    setShowForm(true);
  }

  function openEdit(v) {
    setEditingId(v.id);
    setForm(variableToForm(v));
    setSaveError('');
    setSaveSuccess('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function onFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function onRangeChange(i, field, value) {
    const rangos = form.rangos.map((r, idx) => idx === i ? { ...r, [field]: value } : r);
    setForm({ ...form, rangos });
  }

  function addRange() {
    setForm({ ...form, rangos: [...form.rangos, { ...BLANK_RANGE }] });
  }

  function removeRange(i) {
    setForm({ ...form, rangos: form.rangos.filter((_, idx) => idx !== i) });
  }

  function buildPayload() {
    return {
      nombre: form.nombre,
      descripcion: form.descripcion,
      tipo: form.tipo,
      peso: Number(form.peso),
      rangos: form.tipo === 'NUMERIC'
        ? form.rangos
            .filter(r => r.limiteInferior !== '' && r.limiteSuperior !== '' && r.puntaje !== '')
            .map(r => ({
              limiteInferior: Number(r.limiteInferior),
              limiteSuperior: Number(r.limiteSuperior),
              puntaje: Number(r.puntaje),
              etiqueta: r.etiqueta,
            }))
        : [],
      categorias: [],
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateScoringVariable(editingId, payload);
        setSaveSuccess(`Variable "${payload.nombre}" actualizada correctamente.`);
      } else {
        await createScoringVariable(payload);
        setSaveSuccess(`Variable "${payload.nombre}" creada correctamente.`);
      }
      closeForm();
      loadVariables();
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
          <h2>Variables de Scoring</h2>
          <p>{variables.length} variables configuradas</p>
        </div>
        <button onClick={showForm ? closeForm : openCreate}>
          {showForm ? '✕ Cancelar' : '+ Nueva Variable'}
        </button>
      </div>

      {saveSuccess && <div className="alert success">{saveSuccess}</div>}
      {error && <div className="alert error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <h3>{editingId ? 'Editar Variable de Scoring' : 'Nueva Variable de Scoring'}</h3>
          </div>
          <div className="card-body">
            {saveError && <div className="alert error">{saveError}</div>}
            <form onSubmit={onSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Campo fuente *</label>
                  <select name="nombre" value={form.nombre} onChange={onFormChange}>
                    {CAMPOS_DISPONIBLES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={onFormChange}>
                    <option value="NUMERIC">NUMERIC</option>
                    <option value="CATEGORICAL">CATEGORICAL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Peso (0.01 – 1.00) *</label>
                  <input
                    type="number"
                    name="peso"
                    value={form.peso}
                    onChange={onFormChange}
                    min="0.01"
                    max="1"
                    step="0.01"
                    required
                    placeholder="0.35"
                  />
                </div>
                <div className="form-group form-full">
                  <label>Descripción</label>
                  <input name="descripcion" value={form.descripcion} onChange={onFormChange} placeholder="Descripción de la variable..." />
                </div>
              </div>

              {form.tipo === 'NUMERIC' && (
                <div style={{ marginTop: '.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                    <label style={{ margin: 0 }}>Rangos de Puntuación</label>
                    <button type="button" className="btn-sm btn-ghost" onClick={addRange}>+ Agregar rango</button>
                  </div>
                  {form.rangos.map((r, i) => (
                    <div key={i} className="range-row" style={{ marginBottom: '.4rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        {i === 0 && <label style={{ fontSize: '.7rem' }}>Límite Inferior</label>}
                        <input
                          type="number"
                          value={r.limiteInferior}
                          onChange={e => onRangeChange(i, 'limiteInferior', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        {i === 0 && <label style={{ fontSize: '.7rem' }}>Límite Superior</label>}
                        <input
                          type="number"
                          value={r.limiteSuperior}
                          onChange={e => onRangeChange(i, 'limiteSuperior', e.target.value)}
                          placeholder="5"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        {i === 0 && <label style={{ fontSize: '.7rem' }}>Puntaje (0-100)</label>}
                        <input
                          type="number"
                          value={r.puntaje}
                          onChange={e => onRangeChange(i, 'puntaje', e.target.value)}
                          min="0"
                          max="100"
                          placeholder="70"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        {i === 0 && <label style={{ fontSize: '.7rem' }}>Etiqueta</label>}
                        <input
                          value={r.etiqueta}
                          onChange={e => onRangeChange(i, 'etiqueta', e.target.value)}
                          placeholder="Muy bueno"
                        />
                      </div>
                      <div style={{ paddingTop: i === 0 ? '1.4rem' : 0 }}>
                        {form.rangos.length > 1 && (
                          <button type="button" className="btn-sm btn-danger" onClick={() => removeRange(i)}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
                <button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-wrapper"><div className="spinner"></div> Cargando variables...</div>
      ) : variables.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚙</div>
          <p>No hay variables de scoring configuradas.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Campo</th>
                <th>Tipo</th>
                <th>Peso</th>
                <th>Descripción</th>
                <th>Rangos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {variables.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600, fontSize: '.82rem' }}>
                    {CAMPOS_DISPONIBLES.find(c => c.value === v.nombre)?.label ?? v.nombre}
                  </td>
                  <td><span className="badge badge-DRAFT">{v.tipo}</span></td>
                  <td>{v.peso != null ? (v.peso * 100).toFixed(0) + '%' : '—'}</td>
                  <td style={{ color: 'var(--navy-600)', fontSize: '.8rem' }}>{v.descripcion || '—'}</td>
                  <td>{v.rangos?.length ?? 0} rangos</td>
                  <td>
                    <button className="btn-sm btn-secondary" onClick={() => openEdit(v)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
