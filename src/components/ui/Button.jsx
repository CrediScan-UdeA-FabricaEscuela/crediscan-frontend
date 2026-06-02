/**
 * Button primitive.
 *
 * Emits the existing global button + .btn-* classes.
 * No new style system — just a thin variant→className map over App.css rules.
 *
 * @param {{ variant?: 'primary'|'success'|'secondary'|'outline'|'ghost'|'danger',
 *           children: React.ReactNode,
 *           onClick?: function,
 *           disabled?: boolean,
 *           type?: string,
 *           icon?: React.ReactNode }} props
 */

const VARIANT_CLASS = {
  primary: 'btn-primary',
  success: 'btn-success',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  type = 'button',
  icon,
  ...rest
}) {
  const variantClass = VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary;

  return (
    <button
      type={type}
      className={variantClass}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="btn-icon-slot">{icon}</span>}
      {children}
    </button>
  );
}
