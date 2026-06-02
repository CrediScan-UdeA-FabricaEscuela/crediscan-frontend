import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAV_CONFIG } from './nav-config';
import {
  DashboardIcon,
  UsersIcon,
  PlayIcon,
  ListIcon,
  ChartIcon,
  SettingsIcon,
  AuditIcon,
  AdminIcon,
  SimulationIcon,
  ModelIcon,
  LogoutIcon,
} from './icons';

const ICON_MAP = {
  dashboard: DashboardIcon,
  users: UsersIcon,
  play: PlayIcon,
  list: ListIcon,
  chart: ChartIcon,
  settings: SettingsIcon,
  audit: AuditIcon,
  admin: AdminIcon,
  simulation: SimulationIcon,
  model: ModelIcon,
};

function NavIcon({ name }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon />;
}

/**
 * Sidebar component.
 *
 * @param {object} props
 * @param {Function} [props.onLogout] - Optional logout override (used in tests to intercept
 *   the logout handler without wiring navigate).
 */
export default function Sidebar({ onLogout } = {}) {
  const { auth, handleLogout } = useAuth();
  const role = auth?.role;
  const initial = (auth?.username || 'U').charAt(0).toUpperCase();

  function handleLogoutClick() {
    if (onLogout) {
      onLogout();
    } else {
      handleLogout();
    }
  }

  return (
    <aside className="sidebar">
      {/* Brand block */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">CS</div>
        <div>
          <div className="sidebar-brand-text">CrediScan</div>
          <span className="sidebar-brand-sub">Credit Scoring Engine</span>
        </div>
      </div>

      {/* Data-driven nav groups */}
      <nav className="sidebar-nav">
        {NAV_CONFIG.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-section-label">{group.label}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item'
                  }
                >
                  <span className="nav-icon">
                    <NavIcon name={item.icon} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer: user block + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{auth?.username}</div>
            <span className={`sidebar-role role-${role}`}>{role}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogoutClick}>
          <LogoutIcon size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
