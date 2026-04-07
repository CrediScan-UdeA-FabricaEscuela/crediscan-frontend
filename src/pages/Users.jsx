import { useState } from 'react';
import { createUser } from '../api/client';

const ROLES = ['ADMIN', 'ANALYST', 'RISK_MANAGER', 'CREDIT_SUPERVISOR'];

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
      setSuccess(`Usuario "${res.username}" creado con rol ${res.role}`);
      setForm({ username: '', email: '', password: '', rol: 'ANALYST' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Crear Usuario</h2>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <form onSubmit={onSubmit} className="form-card">
        <label>Username *</label>
        <input name="username" value={form.username} onChange={onChange} required minLength={3} maxLength={50} />

        <label>Email *</label>
        <input type="email" name="email" value={form.email} onChange={onChange} required />

        <label>Contrasena *</label>
        <input type="password" name="password" value={form.password} onChange={onChange} required minLength={8} />

        <label>Rol *</label>
        <select name="rol" value={form.rol} onChange={onChange}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="form-actions">
          <button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Usuario'}</button>
        </div>
      </form>
    </div>
  );
}
