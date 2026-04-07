import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerApplicant } from '../api/client';

const EMPLOYMENT_TYPES = ['EMPLEADO', 'INDEPENDIENTE', 'PENSIONADO', 'DESEMPLEADO'];

export default function RegisterApplicant() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    identificacion: '',
    fecha_nacimiento: '',
    tipo_empleo: 'EMPLEADO',
    ingresos_mensuales: '',
    antiguedad_laboral: '',
    direccion: '',
    correo_electronico: '',
  });

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerApplicant({
        ...form,
        ingresos_mensuales: Number(form.ingresos_mensuales),
        antiguedad_laboral: Number(form.antiguedad_laboral),
      });
      navigate('/solicitantes');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Registrar Solicitante</h2>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit} className="form-card">
        <label>Nombre *</label>
        <input name="nombre" value={form.nombre} onChange={onChange} required />

        <label>Identificacion *</label>
        <input name="identificacion" value={form.identificacion} onChange={onChange} required />

        <label>Fecha de Nacimiento *</label>
        <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={onChange} required />

        <label>Tipo de Empleo *</label>
        <select name="tipo_empleo" value={form.tipo_empleo} onChange={onChange}>
          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label>Ingresos Mensuales *</label>
        <input type="number" name="ingresos_mensuales" value={form.ingresos_mensuales} onChange={onChange} min="0" step="0.01" required />

        <label>Antiguedad Laboral (meses) *</label>
        <input type="number" name="antiguedad_laboral" value={form.antiguedad_laboral} onChange={onChange} min="0" required />

        <label>Direccion</label>
        <input name="direccion" value={form.direccion} onChange={onChange} />

        <label>Correo Electronico</label>
        <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={onChange} />

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/solicitantes')}>Cancelar</button>
          <button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</button>
        </div>
      </form>
    </div>
  );
}
