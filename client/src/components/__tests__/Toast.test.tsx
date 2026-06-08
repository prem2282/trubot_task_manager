import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../Toast';
import { useToastStore } from '../../store/toastStore';
import { resetStores } from '../../test/test-utils';

describe('Toast', () => {
  beforeEach(() => {
    resetStores();
  });

  it('renders nothing when there is no message', () => {
    const { container } = render(<Toast />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the toast message from the store', () => {
    useToastStore.getState().showToast('Member added to workspace');
    render(<Toast />);

    expect(screen.getByRole('status')).toHaveTextContent('Member added to workspace');
  });
});
