import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

// -----------------------------------------------------------------------
// Domain A — Button Primitive
// -----------------------------------------------------------------------

describe('Button — variant class mapping', () => {
  it('applies btn-primary class for variant="primary"', () => {
    render(<Button variant="primary">Label</Button>);
    const btn = screen.getByRole('button', { name: 'Label' });
    expect(btn).toHaveClass('btn-primary');
  });

  it('applies btn-success class for variant="success"', () => {
    render(<Button variant="success">Go</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-success');
  });

  it('applies btn-secondary class for variant="secondary"', () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  it('applies btn-outline class for variant="outline"', () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-outline');
  });

  it('defaults to primary variant when variant is omitted', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });
});

describe('Button — children forwarding', () => {
  it('renders its children as visible text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
});

describe('Button — click event', () => {
  it('forwards onClick and fires exactly once on click', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={spy}>Fire</Button>);
    await user.click(screen.getByRole('button'));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Button — disabled state', () => {
  it('does not fire onClick when disabled', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Button disabled onClick={spy}>Disabled</Button>);
    await user.click(screen.getByRole('button'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('has the disabled attribute when disabled=true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Button — type prop', () => {
  it('defaults to type="button"', () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('forwards explicit type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

// -----------------------------------------------------------------------
// Domain B — Button size prop (D2)
// Spec: size="sm" appends btn-sm alongside the variant class; absent by default
// -----------------------------------------------------------------------

describe('Button — size prop', () => {
  it('size="sm" + variant="primary" → element has both btn-primary and btn-sm', () => {
    render(<Button variant="primary" size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn).toHaveClass('btn-primary');
    expect(btn).toHaveClass('btn-sm');
  });

  it('size="sm" + variant="secondary" → element has both btn-secondary and btn-sm', () => {
    render(<Button variant="secondary" size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn).toHaveClass('btn-secondary');
    expect(btn).toHaveClass('btn-sm');
  });

  it('no size prop → has btn-primary and does NOT have btn-sm (regression guard)', () => {
    render(<Button variant="primary">Normal</Button>);
    const btn = screen.getByRole('button', { name: 'Normal' });
    expect(btn).toHaveClass('btn-primary');
    expect(btn).not.toHaveClass('btn-sm');
  });
});
