import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { auth, handleLogout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    handleLogout();
    navigate('/');
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <span className="nav-brand">CrediScan</span>
        <div className="nav-links">
          <NavLink to="/solicitantes">Solicitantes</NavLink>
          {auth?.role === 'ADMIN' && <NavLink to="/usuarios">Usuarios</NavLink>}
        </div>
        <div className="nav-right">
          <span className="nav-user">{auth?.username} ({auth?.role})</span>
          <button className="btn-sm btn-secondary" onClick={onLogout}>Salir</button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
