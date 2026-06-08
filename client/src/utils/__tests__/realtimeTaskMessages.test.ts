import { describe, it, expect } from 'vitest';
import { realtimeTaskMessage } from '../realtimeTaskMessages';

describe('realtimeTaskMessage', () => {
  it('formats created, updated, and deleted messages with the task title', () => {
    expect(realtimeTaskMessage('created', 'Ship release')).toBe('New task: Ship release');
    expect(realtimeTaskMessage('updated', 'Ship release')).toBe('Task updated: Ship release');
    expect(realtimeTaskMessage('deleted', 'Ship release')).toBe('Task deleted: Ship release');
  });
});
