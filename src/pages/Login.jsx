import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';

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
      navigate('/solicitantes');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={onSubmit} className="login-form">
        <h1>CrediScan</h1>
        <p className="subtitle">Credit Scoring Engine</p>

        {error && <div className="alert error">{error}</div>}

        <label>Usuario</label>
        <input value={username} onChange={e => setUsername(e.target.value)} required />

        <label>Contrasena</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
