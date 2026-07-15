import { create } from 'zustand';

interface AppState {
  onboardingDone: boolean;
  setOnboardingDone: () => void;
}

// État global de l'app (persiste en mémoire le temps de la session)
export const useAppStore = create<AppState>((set) => ({
  onboardingDone: false,
  setOnboardingDone: () => set({ onboardingDone: true }),
}));
