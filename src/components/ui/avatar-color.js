/**
 * Deterministic avatar color selection.
 *
 * Kept in its own module (not Avatar.jsx) so the component file only exports a
 * component — otherwise `react-refresh/only-export-components` fires. Same
 * convention as nav-config.js.
 */

export const PALETTE_SIZE = 5;

/**
 * Deterministic color index for a given name.
 * Algorithm: rolling hash h = (h * 31 + charCode) >>> 0, result % PALETTE_SIZE.
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
