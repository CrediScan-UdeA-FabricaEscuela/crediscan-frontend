import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApplicant, updateApplicant } from '../api/client';
import Button from '../components/ui/Button';

const EMPLOYMENT_TYPES = ['EMPLEADO', 'INDEPENDIENTE', 'PENSIONADO', 'DESEMPLEADO'];

export default function EditApplicant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    getApplicant(id)
      .then(applicant => {
        setForm({
          nombre: applicant.nombre || '',
          tipo_empleo: applicant.tipo_empleo || 'EMPLEADO',
          ingresos_mensuales: applicant.ingresos_mensuales || '',
          antiguedad_laboral: applicant.antiguedad_laboral ?? '',
          telefono: applicant.telefono || applicant.phone || '',
          direccion: applicant.direccion || '',
          correo_electronico: applicant.correo_electronico || '',
        });
      })
      .catch(() => {
        // Fallback: find in paginated list
        import('../api/client').then(({ searchApplicants }) =>
          searchApplicants('', 0, 100).then(data => {
            const applicant = (data.content || []).find(a => a.id === id);
            if (!applicant) throw new Error('Solicitante no encontrado');
            setForm({
              nombre: applicant.nombre || '',
              tipo_empleo: applicant.tipo_empleo || 'EMPLEADO',
              ingresos_mensuales: applicant.ingresos_mensuales || '',
              antiguedad_laboral: applicant.antiguedad_laboral ?? '',
              telefono: applicant.telefono || applicant.phone || '',
              direccion: applicant.direccion || '',
              correo_electronico: applicant.correo_electronico || '',
            });
          })
        ).catch(err => setError(err.message));
      })
      .finally(() => setLoading(false));
  }, [id]);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {};
      if (form.nombre) payload.nombre = form.nombre;
      if (form.tipo_empleo) payload.tipo_empleo = form.tipo_empleo;
      if (form.ingresos_mensuales !== '') payload.ingresos_mensuales = Number(form.ingresos_mensuales);
      if (form.antiguedad_laboral !== '') payload.antiguedad_laboral = Number(form.antiguedad_laboral);
      if (form.telefono) payload.telefono = form.telefono;
      if (form.direccion) payload.direccion = form.direccion;
      if (form.correo_electronico) payload.correo_electronico = form.correo_electronico;
      await updateApplicant(id, payload);
      navigate('/solicitantes');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-wrapper"><div className="spinner"></div> Cargando solicitante...</div>;
  if (!form) return <div className="alert error">{error || 'No encontrado'}</div>;

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/solicitantes')}>
        ← Volver a Solicitantes
      </button>

      <div className="page-header">
        <div className="page-title-group">
          <h2>Editar Solicitante</h2>
          <p>Los campos de identificación y fecha de nacimiento no son editables</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit} className="form-card">
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Nombre completo</label>
            <input name="nombre" value={form.nombre} onChange={onChange} />
          </div>

          <div className="form-group">
            <label>Tipo de Empleo</label>
            <select name="tipo_empleo" value={form.tipo_empleo} onChange={onChange}>
              {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={onChange} placeholder="+57 300..." />
          </div>

          <div className="form-group">
            <label>Ingresos Mensuales (COP)</label>
            <input type="number" name="ingresos_mensuales" value={form.ingresos_mensuales} onChange={onChange} min="0" step="0.01" />
          </div>

          <div className="form-group">
            <label>Antigüedad Laboral (meses)</label>
            <input type="number" name="antiguedad_laboral" value={form.antiguedad_laboral} onChange={onChange} min="0" />
          </div>

          <div className="form-group form-full">
            <label>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={onChange} />
          </div>

          <div className="form-group form-full">
            <label>Correo Electrónico</label>
            <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={onChange} />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/solicitantes')}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <><span className="spinner"></span> Guardando...</> : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
