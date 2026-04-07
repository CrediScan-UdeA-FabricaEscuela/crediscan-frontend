import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { searchApplicants, updateApplicant } from '../api/client';

const EMPLOYMENT_TYPES = ['EMPLEADO', 'INDEPENDIENTE', 'PENSIONADO', 'DESEMPLEADO'];

export default function EditApplicant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    searchApplicants('', 0, 100)
      .then(data => {
        const applicant = (data.content || []).find(a => a.id === id);
        if (!applicant) throw new Error('Solicitante no encontrado');
        setForm({
          nombre: applicant.nombre || '',
          tipo_empleo: applicant.tipo_empleo || 'EMPLEADO',
          ingresos_mensuales: applicant.ingresos_mensuales || '',
          antiguedad_laboral: applicant.antiguedad_laboral || '',
          telefono: applicant.telefono || '',
          direccion: applicant.direccion || '',
          correo_electronico: applicant.correo_electronico || '',
        });
      })
      .catch(err => setError(err.message))
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
      if (form.ingresos_mensuales) payload.ingresos_mensuales = Number(form.ingresos_mensuales);
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

  if (loading) return <p>Cargando...</p>;
  if (!form) return <p className="alert error">{error || 'No encontrado'}</p>;

  return (
    <div>
      <h2>Editar Solicitante</h2>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit} className="form-card">
        <label>Nombre</label>
        <input name="nombre" value={form.nombre} onChange={onChange} />

        <label>Tipo de Empleo</label>
        <select name="tipo_empleo" value={form.tipo_empleo} onChange={onChange}>
          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label>Ingresos Mensuales</label>
        <input type="number" name="ingresos_mensuales" value={form.ingresos_mensuales} onChange={onChange} min="0" step="0.01" />

        <label>Antiguedad Laboral (meses)</label>
        <input type="number" name="antiguedad_laboral" value={form.antiguedad_laboral} onChange={onChange} min="0" />

        <label>Telefono</label>
        <input name="telefono" value={form.telefono} onChange={onChange} />

        <label>Direccion</label>
        <input name="direccion" value={form.direccion} onChange={onChange} />

        <label>Correo Electronico</label>
        <input type="email" name="correo_electronico" value={form.correo_electronico} onChange={onChange} />

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/solicitantes')}>Cancelar</button>
          <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
        </div>
      </form>
    </div>
  );
}
