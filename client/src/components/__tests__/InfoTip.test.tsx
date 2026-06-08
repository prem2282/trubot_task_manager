import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldLabel, InfoTip } from '../InfoTip';

describe('InfoTip', () => {
  it('shows tooltip text after clicking the info button', async () => {
    const user = userEvent.setup();
    render(<InfoTip text="Helpful context for this field" />);

    expect(screen.queryByRole('tooltip')).toHaveClass('hidden');

    await user.click(screen.getByRole('button', { name: 'More information' }));

    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful context for this field');
    expect(screen.getByRole('button', { name: 'More information' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('hides tooltip when clicked again', async () => {
    const user = userEvent.setup();
    render(<InfoTip text="Toggle me" />);

    const button = screen.getByRole('button', { name: 'More information' });
    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('tooltip')).toHaveClass('hidden');
  });
});

describe('FieldLabel', () => {
  it('renders label text without a tip when tip is omitted', () => {
    render(<FieldLabel label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More information' })).not.toBeInTheDocument();
  });

  it('renders label with an info tip when tip is provided', () => {
    render(<FieldLabel label="Password" tip="Minimum 8 characters" />);
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More information' })).toBeInTheDocument();
  });
});
