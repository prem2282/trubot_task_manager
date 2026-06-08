import { create } from 'zustand';
import { api } from '../services/api';
import { Task, TaskStatus } from '../types';
import { normalizeTask } from '../utils/taskHelpers';

interface TaskState {
  tasks: Task[];
  meta: { page: number; limit: number; total: number; totalPages: number } | null;
  filters: {
    status?: TaskStatus;
    assignee?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  };
  isLoading: boolean;
  remoteUpdatedTaskIds: string[];
  fetchTasks: (options?: { append?: boolean }) => Promise<void>;
  loadMoreTasks: () => Promise<void>;
  setFilters: (filters: TaskState['filters']) => void;
  clearFilters: () => Promise<void>;
  upsertTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  markRemoteUpdate: (taskId: string) => void;
  clearRemoteUpdate: (taskId: string) => void;
  clearTasks: () => void;
}

const TASK_LIMIT = 20;
const REMOTE_HIGHLIGHT_MS = 20000;

const remoteHighlightTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  meta: null,
  filters: {},
  isLoading: false,
  remoteUpdatedTaskIds: [],

  fetchTasks: async (options) => {
    const append = options?.append ?? false;
    set({ isLoading: true });
    try {
      const { filters, meta } = get();
      const page = append && meta ? meta.page + 1 : 1;
      const { data } = await api.get('/tasks', {
        params: {
          ...filters,
          page,
          limit: TASK_LIMIT,
          sortBy: 'dueDate',
          sortOrder: 'asc',
        },
      });
      set((state) => ({
        tasks: append
          ? [...state.tasks, ...data.data.map(normalizeTask)]
          : data.data.map(normalizeTask),
        meta: data.meta,
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  loadMoreTasks: async () => {
    const { meta } = get();
    if (!meta || meta.page >= meta.totalPages) return;
    await get().fetchTasks({ append: true });
  },

  setFilters: (filters) => set({ filters }),

  clearFilters: async () => {
    set({ filters: {} });
    await get().fetchTasks();
  },

  upsertTask: (task) =>
    set((state) => {
      const idx = state.tasks.findIndex((t) => t._id === task._id);
      if (idx >= 0) {
        const tasks = [...state.tasks];
        tasks[idx] = task;
        return { tasks };
      }
      return { tasks: [task, ...state.tasks] };
    }),

  removeTask: (taskId) =>
    set((state) => {
      get().clearRemoteUpdate(taskId);
      return { tasks: state.tasks.filter((t) => t._id !== taskId) };
    }),

  markRemoteUpdate: (taskId) => {
    set((state) => ({
      remoteUpdatedTaskIds: state.remoteUpdatedTaskIds.includes(taskId)
        ? state.remoteUpdatedTaskIds
        : [...state.remoteUpdatedTaskIds, taskId],
    }));

    const existing = remoteHighlightTimers.get(taskId);
    if (existing) clearTimeout(existing);

    remoteHighlightTimers.set(
      taskId,
      setTimeout(() => {
        get().clearRemoteUpdate(taskId);
        remoteHighlightTimers.delete(taskId);
      }, REMOTE_HIGHLIGHT_MS)
    );
  },

  clearRemoteUpdate: (taskId) => {
    const existing = remoteHighlightTimers.get(taskId);
    if (existing) {
      clearTimeout(existing);
      remoteHighlightTimers.delete(taskId);
    }
    set((state) => ({
      remoteUpdatedTaskIds: state.remoteUpdatedTaskIds.filter((id) => id !== taskId),
    }));
  },

  clearTasks: () => {
    remoteHighlightTimers.forEach((timer) => clearTimeout(timer));
    remoteHighlightTimers.clear();
    set({ tasks: [], meta: null, remoteUpdatedTaskIds: [] });
  },
}));
