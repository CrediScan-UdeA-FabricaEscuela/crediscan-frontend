import { useState } from 'react';
import { createUser } from '../api/client';

const ROLES = ['ADMIN', 'ANALYST', 'RISK_MANAGER', 'CREDIT_SUPERVISOR'];

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Acceso total al sistema',
  ANALYST: 'Registra solicitantes y ejecuta evaluaciones',
  RISK_MANAGER: 'Gestiona variables, modelos y decisiones',
  CREDIT_SUPERVISOR: 'Supervisa decisiones escaladas',
};

export default function Users() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    rol: 'ANALYST',
  });

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await createUser(form);
      setSuccess(`Usuario "${res.username || form.username}" creado con rol ${res.role || form.rol}`);
      setForm({ username: '', email: '', password: '', rol: 'ANALYST' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Gestión de Usuarios</h2>
          <p>Crear nuevos usuarios del sistema</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">✓ {success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        <form onSubmit={onSubmit} className="form-card" style={{ maxWidth: 'unset' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Nuevo Usuario</h3>

          <div className="form-group">
            <label>Username *</label>
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              required
              minLength={3}
              maxLength={50}
              placeholder="nombre.apellido"
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              placeholder="usuario@empresa.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="form-group">
            <label>Rol *</label>
            <select name="rol" value={form.rol} onChange={onChange}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ fontSize: '.78rem', color: 'var(--navy-600)', marginTop: '.2rem' }}>
              {ROLE_DESCRIPTIONS[form.rol]}
            </span>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Creando...' : '+ Crear Usuario'}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="card-header">
            <h3>Descripción de Roles</h3>
          </div>
          <div className="card-body">
            {ROLES.map(r => (
              <div key={r} style={{ marginBottom: '.85rem', paddingBottom: '.85rem', borderBottom: '1px solid var(--navy-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.2rem' }}>
                  <span className={`sidebar-role role-${r}`}>{r}</span>
                </div>
                <p style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
