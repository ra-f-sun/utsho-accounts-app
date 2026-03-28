import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionExpired: false,
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true, sessionExpired: false });
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, sessionExpired: false });
      },
      markSessionExpired: () => {
        set({ sessionExpired: true });
      },
      clearSessionExpired: () => {
        set({ sessionExpired: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // sessionExpired is intentionally not persisted — always starts false
      }),
    },
  ),
);
