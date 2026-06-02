import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, PlusIcon } from './icons';

// Breadcrumb label map — pathname segment → human label.
// Covers every route defined in App.jsx.
const ROUTE_LABELS = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/solicitantes': 'Solicitantes',
  '/evaluaciones': 'Evaluaciones',
  '/evaluaciones/nueva': 'Nueva Evaluación',
  '/simulacion': 'Simulación',
  '/reportes': 'Reportes',
  '/variables': 'Variables Scoring',
  '/modelos': 'Modelos',
  '/auditoria': 'Auditoría',
  '/usuarios': 'Usuarios',
};

function resolveBreadcrumb(pathname) {
  // Try exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Try prefix match for nested routes like /evaluaciones/nueva
  const keys = Object.keys(ROUTE_LABELS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname.startsWith(key) && key !== '/') return ROUTE_LABELS[key];
  }
  return 'Dashboard';
}

export default function TopBar() {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const label = resolveBreadcrumb(location.pathname);
  const initial = (auth?.username || 'U').charAt(0).toUpperCase();

  function handleNewEvaluation() {
    navigate('/evaluaciones/nueva');
  }

  return (
    <header className="topbar">
      {/* Breadcrumb */}
      <div className="topbar-breadcrumb">
        <span className="breadcrumb-root">Inicio</span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">{label}</span>
      </div>

      {/* Center: search */}
      <div className="topbar-search">
        <span className="topbar-search-icon">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          placeholder="Buscar solicitante..."
          className="topbar-search-input"
          readOnly
        />
      </div>

      {/* Right: actions + avatar */}
      <div className="topbar-actions">
        <button
          className="btn btn-primary topbar-new-btn"
          onClick={handleNewEvaluation}
          aria-label="Nueva Evaluación"
        >
          <PlusIcon size={16} />
          <span>Nueva Evaluación</span>
        </button>
        <div className="topbar-avatar" aria-label="user avatar">
          {initial}
        </div>
      </div>
    </header>
  );
}
