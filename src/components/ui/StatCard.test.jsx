import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

// Simple icon stub for tests
function TestIcon() {
  return <svg data-testid="test-icon" />;
}

// -----------------------------------------------------------------------
// Domain B — StatCard Primitive
// -----------------------------------------------------------------------

describe('StatCard — core content rendering', () => {
  it('renders value, label, and icon slot', () => {
    render(<StatCard value="42" label="Applicants" icon={<TestIcon />} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Applicants')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});

describe('StatCard — optional caption', () => {
  it('renders caption text when the prop is supplied', () => {
    render(<StatCard value="10" label="X" caption="este mes" />);
    expect(screen.getByText('este mes')).toBeInTheDocument();
  });

  it('does not render any caption element when prop is absent', () => {
    render(<StatCard value="10" label="X" />);
    expect(screen.queryByTestId('stat-caption')).not.toBeInTheDocument();
  });
});

describe('StatCard — loading placeholder', () => {
  it('shows stat-loading placeholder and hides the real value when loading=true', () => {
    render(<StatCard loading value="42" label="Applicants" />);
    expect(screen.getByTestId('stat-loading')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('renders the real value and no loading placeholder when loading is falsy', () => {
    render(<StatCard value="42" label="Applicants" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByTestId('stat-loading')).not.toBeInTheDocument();
  });
});

describe('StatCard — accent prop', () => {
  it('defaults to purple accent class on the icon container', () => {
    render(<StatCard value="1" label="L" icon={<TestIcon />} />);
    // The icon wrapper should carry the accent class
    const icon = screen.getByTestId('test-icon').parentElement;
    expect(icon).toHaveClass('purple');
  });

  it('applies the given accent class when overridden', () => {
    render(<StatCard value="1" label="L" icon={<TestIcon />} accent="blue" />);
    const icon = screen.getByTestId('test-icon').parentElement;
    expect(icon).toHaveClass('blue');
  });
});
