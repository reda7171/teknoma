import { create } from 'zustand';
import { I18nManager } from 'react-native';

type Language = 'fr' | 'ar' | 'en';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

import fr from '../i18n/fr.json';
import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

const translations = { fr, ar, en };

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
