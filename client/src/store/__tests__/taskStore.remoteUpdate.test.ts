import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTaskStore } from '../taskStore';
import { mockTask } from '../../test/fixtures';

describe('taskStore remote updates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTaskStore.setState({
      tasks: [mockTask],
      meta: null,
      filters: {},
      isLoading: false,
      remoteUpdatedTaskIds: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    useTaskStore.getState().clearTasks();
  });

  it('marks and clears remote update highlights', () => {
    useTaskStore.getState().markRemoteUpdate('task1');
    expect(useTaskStore.getState().remoteUpdatedTaskIds).toEqual(['task1']);

    useTaskStore.getState().clearRemoteUpdate('task1');
    expect(useTaskStore.getState().remoteUpdatedTaskIds).toEqual([]);
  });

  it('auto-clears remote update highlights after a timeout', () => {
    useTaskStore.getState().markRemoteUpdate('task1');
    vi.advanceTimersByTime(20000);
    expect(useTaskStore.getState().remoteUpdatedTaskIds).toEqual([]);
  });
});
