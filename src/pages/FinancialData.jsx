import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addFinancialData } from '../api/client';

export default function FinancialData() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    annualIncome: '',
    monthlyExpenses: '',
    currentDebts: '',
    assetsValue: '',
    declaredPatrimony: '',
    hasOutstandingDefaults: false,
    creditHistoryMonths: '',
    defaultsLast12m: '',
    defaultsLast24m: '',
    externalBureauScore: '',
    activeCreditProducts: '',
  });

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        annualIncome: Number(form.annualIncome),
        monthlyExpenses: Number(form.monthlyExpenses),
        currentDebts: Number(form.currentDebts),
        assetsValue: Number(form.assetsValue),
        declaredPatrimony: Number(form.declaredPatrimony),
        hasOutstandingDefaults: form.hasOutstandingDefaults,
        creditHistoryMonths: Number(form.creditHistoryMonths),
        defaultsLast12m: Number(form.defaultsLast12m),
        defaultsLast24m: Number(form.defaultsLast24m),
        externalBureauScore: form.externalBureauScore !== '' ? Number(form.externalBureauScore) : null,
        activeCreditProducts: Number(form.activeCreditProducts),
      };
      await addFinancialData(id, payload);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/solicitantes')}>
        ← Volver a Solicitantes
      </button>

      <div className="page-header">
        <div className="page-title-group">
          <h2>Datos Financieros</h2>
          <p>Solicitante ID: <code style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{id}</code></p>
        </div>
      </div>

      {success && (
        <div className="alert success">
          ✓ Datos financieros guardados correctamente.
          <button
            className="btn-sm btn-secondary"
            style={{ marginLeft: '1rem' }}
            onClick={() => navigate('/evaluaciones/nueva?applicantId=' + id)}
          >
            Ir a Nueva Evaluación
          </button>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit} className="form-card" style={{ maxWidth: '680px' }}>
        <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.75rem', color: 'var(--navy-700)' }}>
          Información de Ingresos y Patrimonio
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Ingreso Anual (COP) *</label>
            <input type="number" name="annualIncome" value={form.annualIncome} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Gastos Mensuales (COP) *</label>
            <input type="number" name="monthlyExpenses" value={form.monthlyExpenses} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Deudas Actuales (COP) *</label>
            <input type="number" name="currentDebts" value={form.currentDebts} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Valor de Activos (COP) *</label>
            <input type="number" name="assetsValue" value={form.assetsValue} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group form-full">
            <label>Patrimonio Declarado (COP) *</label>
            <input type="number" name="declaredPatrimony" value={form.declaredPatrimony} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
        </div>

        <hr className="section-divider" />
        <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.75rem', color: 'var(--navy-700)' }}>
          Historial Crediticio
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Meses de Historial *</label>
            <input type="number" name="creditHistoryMonths" value={form.creditHistoryMonths} onChange={onChange} min="0" required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Mora últimos 12 meses *</label>
            <input type="number" name="defaultsLast12m" value={form.defaultsLast12m} onChange={onChange} min="0" required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Mora últimos 24 meses *</label>
            <input type="number" name="defaultsLast24m" value={form.defaultsLast24m} onChange={onChange} min="0" required placeholder="0" />
          </div>
          <div className="form-group">
            <label>Score Buró Externo</label>
            <input type="number" name="externalBureauScore" value={form.externalBureauScore} onChange={onChange} min="0" max="1000" placeholder="Opcional" />
          </div>
          <div className="form-group">
            <label>Productos Crédito Activos *</label>
            <input type="number" name="activeCreditProducts" value={form.activeCreditProducts} onChange={onChange} min="0" required placeholder="0" />
          </div>
        </div>

        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
          <input
            type="checkbox"
            name="hasOutstandingDefaults"
            id="hasOutstandingDefaults"
            checked={form.hasOutstandingDefaults}
            onChange={onChange}
            style={{ width: 'auto' }}
          />
          <label htmlFor="hasOutstandingDefaults" style={{ margin: 0 }}>Tiene mora vigente pendiente</label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/solicitantes')}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{ borderTopColor: '#fff' }}></span> Guardando...</> : 'Guardar Datos Financieros'}
          </button>
        </div>
      </form>
    </div>
  );
}
