/**
 * Avatar primitive.
 *
 * Renders a circular element with the uppercased first initial of `name`.
 * Color class is determined by a stable rolling hash of the name (c0–c4).
 * `colorIndex` is exported as a named export so tests can assert determinism.
 *
 * @param {{ name?: string, size?: 'sm', className?: string }} props
 */

const PALETTE_SIZE = 5;

/**
 * Deterministic color index for a given name.
 * Algorithm: rolling hash h = (h * 31 + charCode) >>> 0, result % 5.
 * Empty/whitespace/undefined → 0 (stable fallback).
 *
 * @param {string|undefined} name
 * @returns {0|1|2|3|4}
 */
export function colorIndex(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') return 0;
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE_SIZE;
}

/**
 * Avatar component.
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
