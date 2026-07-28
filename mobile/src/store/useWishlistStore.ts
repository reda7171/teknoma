import { create } from 'zustand';
import { Product } from './useCartStore';

interface WishlistState {
  items: Product[];
  toggle: (product: Product) => void;
  isInWishlist: (id: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  (set, get) => ({
    items: [],
    toggle: (product) => {
      set((state) => {
        const exists = state.items.some((p) => p.id === product.id);
        return {
          items: exists
            ? state.items.filter((p) => p.id !== product.id)
            : [...state.items, product],
        };
      });
    },
    isInWishlist: (id) => get().items.some((p) => p.id === id),
    clear: () => set({ items: [] }),
  })
);
