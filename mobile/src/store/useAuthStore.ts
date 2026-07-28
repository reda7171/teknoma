import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { playLevelUpSound } from '@/utils/sounds';

export interface Customer {
  id: string;
  email: string | null;
  fullName: string;
  phone?: string | null;
  credits?: number;
  image?: string | null;
  averageRating?: number;
  reviewsCount?: number;
  gamification?: {
    level: number;
    title: string;
    booksRead: number;
    nextLevelThreshold: number;
    progress: number;
  };
}

interface AuthState {
  token: string | null;
  customer: Customer | null;
  isLoggedIn: boolean;
  setAuth: (token: string, customer: Customer) => void;
  updateCustomer: (customer: Partial<Customer>) => void;
  logout: () => void;
}

// Storage JS pur — compatible Expo Go (pas de module natif requis)
const memMap = new Map<string, string>();
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return memMap.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memMap.set(key, value);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // silencieux — mémoire suffit pour la session
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memMap.delete(key);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      customer: null,
      isLoggedIn: false,
      setAuth: (token, customer) => set({ token, customer, isLoggedIn: true }),
      updateCustomer: (updates) => set((state) => {
        if (
          state.customer?.gamification &&
          updates.gamification &&
          updates.gamification.level > state.customer.gamification.level
        ) {
          playLevelUpSound();
        }
        return { customer: state.customer ? { ...state.customer, ...updates } : null };
      }),
      logout: () => set({ token: null, customer: null, isLoggedIn: false }),
    }),
    {
      name: 'riwaya-auth',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
