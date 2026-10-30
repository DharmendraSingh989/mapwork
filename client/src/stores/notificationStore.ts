import { create } from "zustand";
import { ToastMessage } from "../types/index.js";

interface NotificationState {
  toasts: ToastMessage[];
  showToast: (type: ToastMessage["type"], title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],

  showToast: (type, title, message, duration = 4000) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const newToast: ToastMessage = { id, type, title, message, duration };

    set({ toasts: [...get().toasts, newToast] });

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  }
}));
