import { create } from "zustand";
import { UserProfile, AuthResponse } from "@mapforge/shared";
import { apiRequest } from "../lib/api.js";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("mapforge_access_token"),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("mapforge_access_token", res.accessToken);
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      localStorage.setItem("mapforge_access_token", res.accessToken);
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("mapforge_access_token");
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("mapforge_access_token");
    if (!token) return;

    try {
      const user = await apiRequest<UserProfile>("/auth/me");
      set({ user, token });
    } catch {
      localStorage.removeItem("mapforge_access_token");
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null })
}));
