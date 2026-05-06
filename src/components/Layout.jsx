import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}>
      <span className="nav-icon">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { auth, handleLogout } = useAuth();
  const navigate = useNavigate();
  const role = auth?.role;

  const isAdmin = role === 'ADMIN';
  const isRiskManager = role === 'RISK_MANAGER';
  const isAnalyst = role === 'ANALYST';

  function onLogout() {
    handleLogout();
    navigate('/');
  }

  const initial = (auth?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">CS</div>
          <div>
            <div className="sidebar-brand-text">CrediScan</div>
            <span className="sidebar-brand-sub">Credit Scoring Engine</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Principal</div>
          <NavItem to="/dashboard" icon="◈" label="Dashboard" />
          <NavItem to="/solicitantes" icon="👤" label="Solicitantes" />

          {(isAdmin || isAnalyst) && (
            <>
              <div className="sidebar-section-label">Evaluaciones</div>
              <NavItem to="/evaluaciones/nueva" icon="▶" label="Nueva Evaluación" />
              <NavItem to="/evaluaciones" icon="📋" label="Evaluaciones" />
            </>
          )}

          {isRiskManager && (
            <>
              <div className="sidebar-section-label">Evaluaciones</div>
              <NavItem to="/evaluaciones" icon="📋" label="Evaluaciones" />
            </>
          )}

          {(isAdmin || isRiskManager) && (
            <>
              <div className="sidebar-section-label">Configuración</div>
              <NavItem to="/variables" icon="⚙" label="Variables Scoring" />
              <NavItem to="/modelos" icon="🏗" label="Modelos" />
            </>
          )}

          {(isAdmin || isRiskManager) && (
            <>
              <div className="sidebar-section-label">Monitoreo</div>
              <NavItem to="/auditoria" icon="🔍" label="Auditoría" />
            </>
          )}

          {isAdmin && (
            <>
              <div className="sidebar-section-label">Administración</div>
              <NavItem to="/usuarios" icon="👥" label="Usuarios" />
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-username">{auth?.username}</div>
              <span className={`sidebar-role role-${role}`}>{role}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>
            <span>⎋</span> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
