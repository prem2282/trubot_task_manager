import { create } from 'zustand';

interface ToastState {
  message: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  showToast: (message) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message });
    hideTimer = setTimeout(() => {
      set({ message: null });
      hideTimer = null;
    }, 3000);
  },
  clearToast: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null });
  },
}));
