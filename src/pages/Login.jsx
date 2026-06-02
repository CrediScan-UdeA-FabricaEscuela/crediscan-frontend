import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      handleLogin(data.token, data.role, username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">CS</div>
          <h1>CrediScan</h1>
        </div>
        <p className="subtitle">Motor de Scoring Crediticio</p>

        <div className="login-demo">
          <strong>Credenciales de demo</strong>
          Admin: <code>admin</code> / <code>admin123</code><br />
          Analista: <code>analista1</code> / <code>pass1234</code><br />
          Risk Mgr: <code>riskmanager1</code> / <code>pass1234</code>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nombre de usuario"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="contraseña"
              required
            />
          </div>

          <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', marginTop: '.75rem' }}>
            {loading ? (
              <><span className="spinner" style={{ borderTopColor: '#fff' }}></span> Ingresando...</>
            ) : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
