/**
 * StatCard primitive.
 *
 * Renders a stat card with icon positioned top-right.
 * Uses the .stat-card-icon-top-right layout class from App.css.
 *
 * @param {{ value: string|number,
 *           label: string,
 *           icon?: React.ReactNode,
 *           accent?: 'blue'|'green'|'amber'|'purple',
 *           caption?: string,
 *           loading?: boolean }} props
 */
export default function StatCard({
  value,
  label,
  icon,
  accent = 'purple',
  caption,
  loading = false,
}) {
  return (
    <div className="stat-card-icon-top-right">
      {icon && (
        <div className={`stat-icon ${accent}`}>
          {icon}
        </div>
      )}
      <div className="stat-value">
        {loading
          ? <span data-testid="stat-loading">—</span>
          : value
        }
      </div>
      <div className="stat-label">{label}</div>
      {caption && (
        <div className="stat-caption" data-testid="stat-caption">
          {caption}
        </div>
      )}
    </div>
  );
}
