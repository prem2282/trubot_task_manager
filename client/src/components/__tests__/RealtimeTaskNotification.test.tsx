import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RealtimeTaskNotification from '../RealtimeTaskNotification';
import { useRealtimeNotificationStore } from '../../store/realtimeNotificationStore';
import { resetStores } from '../../test/test-utils';

describe('RealtimeTaskNotification', () => {
  beforeEach(() => {
    resetStores();
  });

  it('renders nothing when there is no message', () => {
    const { container } = render(<RealtimeTaskNotification />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a bottom-right realtime message from the store', () => {
    useRealtimeNotificationStore.getState().showRealtimeNotification('Task updated: Ship release');
    render(<RealtimeTaskNotification />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Task updated: Ship release');
    expect(status.className).toContain('bottom-4');
    expect(status.className).toContain('right-4');
  });
});
