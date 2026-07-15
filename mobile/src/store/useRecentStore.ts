import { create } from 'zustand';
import { Product } from './useCartStore';

interface RecentState {
  items: Product[];
  addRecent: (product: Product) => void;
  clearRecent: () => void;
}

// Conserve les 10 derniers articles consultés
export const useRecentStore = create<RecentState>((set) => ({
  items: [],
  addRecent: (product) => set((state) => {
    // Retire le produit s'il existe déjà pour le remettre en haut
    const filtered = state.items.filter((i) => i.id !== product.id);
    return { items: [product, ...filtered].slice(0, 10) };
  }),
  clearRecent: () => set({ items: [] }),
}));
