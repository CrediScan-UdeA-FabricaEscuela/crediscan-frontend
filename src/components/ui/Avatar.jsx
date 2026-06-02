import { colorIndex } from './avatar-color';

/**
 * Avatar primitive.
 *
 * Renders a circular element with the uppercased first initial of `name`.
 * Color class is determined by a stable rolling hash of the name (c0–c4),
 * computed by `colorIndex` in ./avatar-color.
 *
 * @param {{ name?: string, size?: 'sm', className?: string }} props
 */
export default function Avatar({ name, size, className, ...rest }) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const initial = trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  const idx = colorIndex(name);

  const classes = [
    'avatar',
    `avatar--c${idx}`,
    size === 'sm' ? 'avatar-sm' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {initial}
    </span>
  );
}
