import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
}

interface AuthState {
  token: string | null;
  customer: Customer | null;
  isLoggedIn: boolean;
  setAuth: (token: string, customer: Customer) => void;
  logout: () => void;
}

// Stockage en mémoire (contourne le bug "Native module is null" d'AsyncStorage dans Expo Go)
const memoryStorage = {
  getItem: async (name: string) => null,
  setItem: async (name: string, value: string) => {},
  removeItem: async (name: string) => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      customer: null,
      isLoggedIn: false,
      setAuth: (token, customer) => set({ token, customer, isLoggedIn: true }),
      logout: () => set({ token: null, customer: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => memoryStorage),
    }
  )
);
