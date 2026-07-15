import { create } from 'zustand';
import { I18nManager } from 'react-native';

type Language = 'fr' | 'ar';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    home: 'Accueil',
    cart: 'Panier',
    settings: 'Paramètres',
    wishlist: 'Favoris',
    search_placeholder: 'Rechercher un livre, un auteur...',
    all: 'Tout',
    packs: 'Packs',
    books: 'Livres',
    recent: 'Vus récemment',
    clear: 'Effacer',
    support: 'Contacter le support',
    clear_data: 'Effacer le cache et les données',
    language: 'Langue',
    dark_mode: 'Thème Sombre',
  },
  ar: {
    home: 'الرئيسية',
    cart: 'السلة',
    settings: 'الإعدادات',
    wishlist: 'المفضلة',
    search_placeholder: 'ابحث عن كتاب، كاتب...',
    all: 'الكل',
    packs: 'باقات',
    books: 'كتب',
    recent: 'شوهد مؤخرا',
    clear: 'مسح',
    support: 'اتصل بالدعم',
    clear_data: 'مسح الذاكرة والبيانات',
    language: 'اللغة',
    dark_mode: 'الوضع الداكن',
  }
};

export const useI18nStore = create<I18nState>((set, get) => ({
  language: 'fr', // Par défaut
  setLanguage: (lang) => {
    // Si passage à l'arabe, on active le RTL (Right-to-Left)
    const isRTL = lang === 'ar';
    I18nManager.forceRTL(isRTL);
    set({ language: lang });
    // Note: un redémarrage de l'app est souvent nécessaire pour appliquer I18nManager.forceRTL nativement
  },
  t: (key: string) => {
    const lang = get().language;
    return (translations as any)[lang][key] || key;
  }
}));
