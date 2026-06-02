import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerApplicant } from '../api/client';
import Button from '../components/ui/Button';

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
      <button className="back-link" type="button" onClick={() => navigate('/solicitantes')}>
        ← Volver a Solicitantes
      </button>

      <div className="page-header">
        <div className="page-title-group">
          <h2>Registrar Solicitante</h2>
          <p>Complete todos los campos obligatorios</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit} className="form-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input name="nombre" value={form.nombre} onChange={onChange} required placeholder="Ej: Juan García" />
          </div>

          <div className="form-group">
            <label>Identificación *</label>
            <input name="identificacion" value={form.identificacion} onChange={onChange} required placeholder="Ej: 1234567890" />
          </div>

          <div className="form-group">
            <label>Fecha de Nacimiento *</label>
            <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={onChange} required />
          </div>

          <div className="form-group">
            <label>Tipo de Empleo *</label>
            <select name="tipo_empleo" value={form.tipo_empleo} onChange={onChange}>
              {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Ingresos Mensuales (COP) *</label>
            <input
              type="number"
              name="ingresos_mensuales"
              value={form.ingresos_mensuales}
              onChange={onChange}
              min="0"
              step="0.01"
              required
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>Antigüedad Laboral (meses) *</label>
            <input
              type="number"
              name="antiguedad_laboral"
              value={form.antiguedad_laboral}
              onChange={onChange}
              min="0"
              required
              placeholder="0"
            />
          </div>

          <div className="form-group form-full">
            <label>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={onChange} placeholder="Calle, ciudad" />
          </div>

          <div className="form-group form-full">
            <label>Correo Electrónico</label>
            <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={onChange} placeholder="ejemplo@correo.com" />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/solicitantes')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <><span className="spinner register-spinner"></span> Guardando...</> : 'Registrar Solicitante'}
          </Button>
        </div>
      </form>
    </div>
  );
}
