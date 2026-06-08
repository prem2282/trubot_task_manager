import { create } from 'zustand';

const DISPLAY_MS = 4000;

interface RealtimeNotificationState {
  message: string | null;
  showRealtimeNotification: (message: string) => void;
  clearRealtimeNotification: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useRealtimeNotificationStore = create<RealtimeNotificationState>((set) => ({
  message: null,
  showRealtimeNotification: (message) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message });
    hideTimer = setTimeout(() => {
      set({ message: null });
      hideTimer = null;
    }, DISPLAY_MS);
  },
  clearRealtimeNotification: () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    set({ message: null });
  },
}));
