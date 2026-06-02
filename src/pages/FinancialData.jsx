import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addFinancialData } from '../api/client';
import Button from '../components/ui/Button';

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
      <Button className="back-link" onClick={() => navigate('/solicitantes')}>
        ← Volver a Solicitantes
      </Button>

      <div className="page-header">
        <div className="page-title-group">
          <h2>Datos Financieros</h2>
          <p>Solicitante ID: <code className="financial-id-code">{id}</code></p>
        </div>
      </div>

      {success && (
        <div className="alert success">
          ✓ Datos financieros guardados correctamente.
          <Button
            variant="secondary"
            size="sm"
            className="financial-alert-btn"
            onClick={() => navigate('/evaluaciones/nueva?applicantId=' + id)}
          >
            Ir a Nueva Evaluación
          </Button>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit} className="form-card financial-form">
        <div className="financial-section-title">
          Información de Ingresos y Patrimonio
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="annualIncome">Ingreso Anual (COP) *</label>
            <input id="annualIncome" type="number" name="annualIncome" value={form.annualIncome} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group">
            <label htmlFor="monthlyExpenses">Gastos Mensuales (COP) *</label>
            <input id="monthlyExpenses" type="number" name="monthlyExpenses" value={form.monthlyExpenses} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group">
            <label htmlFor="currentDebts">Deudas Actuales (COP) *</label>
            <input id="currentDebts" type="number" name="currentDebts" value={form.currentDebts} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group">
            <label htmlFor="assetsValue">Valor de Activos (COP) *</label>
            <input id="assetsValue" type="number" name="assetsValue" value={form.assetsValue} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
          <div className="form-group form-full">
            <label htmlFor="declaredPatrimony">Patrimonio Declarado (COP) *</label>
            <input id="declaredPatrimony" type="number" name="declaredPatrimony" value={form.declaredPatrimony} onChange={onChange} min="0" step="0.01" required placeholder="0" />
          </div>
        </div>

        <hr className="section-divider" />
        <div className="financial-section-title">
          Historial Crediticio
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="creditHistoryMonths">Meses de Historial *</label>
            <input id="creditHistoryMonths" type="number" name="creditHistoryMonths" value={form.creditHistoryMonths} onChange={onChange} min="0" required placeholder="0" />
          </div>
          <div className="form-group">
            <label htmlFor="defaultsLast12m">Mora últimos 12 meses *</label>
            <input id="defaultsLast12m" type="number" name="defaultsLast12m" value={form.defaultsLast12m} onChange={onChange} min="0" required placeholder="0" />
          </div>
          <div className="form-group">
            <label htmlFor="defaultsLast24m">Mora últimos 24 meses *</label>
            <input id="defaultsLast24m" type="number" name="defaultsLast24m" value={form.defaultsLast24m} onChange={onChange} min="0" required placeholder="0" />
          </div>
          <div className="form-group">
            <label htmlFor="externalBureauScore">Score Buró Externo</label>
            <input id="externalBureauScore" type="number" name="externalBureauScore" value={form.externalBureauScore} onChange={onChange} min="0" max="1000" placeholder="Opcional" />
          </div>
          <div className="form-group">
            <label htmlFor="activeCreditProducts">Productos Crédito Activos *</label>
            <input id="activeCreditProducts" type="number" name="activeCreditProducts" value={form.activeCreditProducts} onChange={onChange} min="0" required placeholder="0" />
          </div>
        </div>

        <div className="financial-checkbox-row">
          <input
            type="checkbox"
            name="hasOutstandingDefaults"
            id="hasOutstandingDefaults"
            checked={form.hasOutstandingDefaults}
            onChange={onChange}
          />
          <label htmlFor="hasOutstandingDefaults">Tiene mora vigente pendiente</label>
        </div>

        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={() => navigate('/solicitantes')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <><span className="spinner"></span> Guardando...</> : 'Guardar Datos Financieros'}
          </Button>
        </div>
      </form>
    </div>
  );
}
