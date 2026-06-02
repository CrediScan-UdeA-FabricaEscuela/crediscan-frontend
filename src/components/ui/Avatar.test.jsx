import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar, { colorIndex } from './Avatar';

// -----------------------------------------------------------------------
// Domain: Avatar primitive
// Spec: initial from name, deterministic color class, fallback for empty/undefined
// Design D1: hash h=(h*31+c.charCodeAt(0))>>>0; n=h%5; classes avatar--c0..c4
// -----------------------------------------------------------------------

describe('Avatar — initial rendering', () => {
  it('renders the uppercased first letter of a single-word name', () => {
    render(<Avatar name="andres" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders the first letter of a multi-word name (first word only)', () => {
    render(<Avatar name="Maria Lopez" />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders "?" fallback for empty string without throwing', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders "?" fallback for undefined name without throwing', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('Avatar — colorIndex (pure function export)', () => {
  it('returns same value on two separate calls for the same name (determinism)', () => {
    expect(colorIndex('Carlos')).toBe(colorIndex('Carlos'));
  });

  it('returns 0 for empty string (fallback, no crash)', () => {
    expect(colorIndex('')).toBe(0);
  });

  it('returns 0 for undefined (fallback, no crash)', () => {
    expect(colorIndex(undefined)).toBe(0);
  });

  it('returns a value in the range 0–4 for any name', () => {
    const names = ['Ana', 'Pedro', 'Luis', 'Maria', 'Carlos'];
    for (const name of names) {
      const idx = colorIndex(name);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(4);
    }
  });
});

describe('Avatar — color class on rendered element', () => {
  it('applies exactly one avatar--c[0-4] class matching the colorIndex for the name', () => {
    const name = 'Carlos';
    const idx = colorIndex(name);
    render(<Avatar name={name} />);
    const el = screen.getByText('C');
    expect(el).toHaveClass(`avatar--c${idx}`);
  });

  it('applies the avatar base class', () => {
    render(<Avatar name="test" />);
    const el = screen.getByText('T');
    expect(el).toHaveClass('avatar');
  });
});

describe('Avatar — size prop', () => {
  it('applies avatar-sm class when size="sm"', () => {
    render(<Avatar name="Ana" size="sm" />);
    const el = screen.getByText('A');
    expect(el).toHaveClass('avatar-sm');
  });

  it('does NOT apply avatar-sm when size is omitted', () => {
    render(<Avatar name="Ana" />);
    const el = screen.getByText('A');
    expect(el).not.toHaveClass('avatar-sm');
  });
});
