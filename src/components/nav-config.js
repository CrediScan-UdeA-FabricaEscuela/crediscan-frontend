// Role constants
export const ADMIN = 'ADMIN';
export const RISK_MANAGER = 'RISK_MANAGER';
export const ANALYST = 'ANALYST';
export const ALL_ROLES = [ADMIN, RISK_MANAGER, ANALYST];

/**
 * Navigation configuration.
 * `icon` is a string key resolved to an SVG component inside Sidebar.jsx.
 */
export const NAV_CONFIG = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ALL_ROLES },
      { to: '/solicitantes', icon: 'users', label: 'Solicitantes', roles: ALL_ROLES },
    ],
  },
  {
    label: 'Evaluaciones',
    items: [
      { to: '/evaluaciones/nueva', icon: 'play', label: 'Nueva Evaluación', roles: [ADMIN, ANALYST] },
      { to: '/evaluaciones', icon: 'list', label: 'Evaluaciones', roles: ALL_ROLES, end: true },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { to: '/simulacion', icon: 'simulation', label: 'Simulación', roles: ALL_ROLES },
      { to: '/reportes', icon: 'chart', label: 'Reportes', roles: [ADMIN, RISK_MANAGER] },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/variables', icon: 'settings', label: 'Variables Scoring', roles: [ADMIN, RISK_MANAGER] },
      { to: '/modelos', icon: 'model', label: 'Modelos', roles: [ADMIN, RISK_MANAGER] },
    ],
  },
  {
    label: 'Monitoreo',
    items: [
      { to: '/auditoria', icon: 'audit', label: 'Auditoría', roles: [ADMIN, RISK_MANAGER] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', icon: 'admin', label: 'Usuarios', roles: [ADMIN] },
    ],
  },
];
