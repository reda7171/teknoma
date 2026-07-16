import axios from 'axios';
import { Product } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Platform } from 'react-native';

// L'URL de base s'adapte automatiquement :
// - 10.0.2.2 pour l'émulateur Android
// - localhost pour Web/iOS
// - Ou l'URL définie dans le fichier .env
const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/mobile' : 'http://localhost:3000/api/mobile';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis le state Zustand (qui est persistant)
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

export const getBooks = async (params?: { search?: string; category?: string; sort?: string; page?: number }): Promise<Product[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.page) queryParams.append('page', params.page.toString());

    const response = await api.get(`/catalog?${queryParams.toString()}`);
    if (response.data.success) {
      return response.data.books;
    }
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des livres:', error);
    return [];
  }
};

export const getPacks = async (): Promise<Product[]> => {
  try {
    const response = await api.get('/catalog');
    if (response.data.success) {
      return response.data.packs;
    }
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des packs:', error);
    return [];
  }
};

export const submitOrder = async (orderData: any) => {
  try {
    const response = await api.post('/checkout', orderData);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la soumission de la commande:', error);
    throw error;
  }
};

// Récupère les commandes par téléphone ou ID
export const getOrders = async (params: { phone?: string; orderId?: string }) => {
  try {
    const query = params.phone
      ? `phone=${encodeURIComponent(params.phone)}`
      : `orderId=${encodeURIComponent(params.orderId!)}`;
    const response = await api.get(`/orders?${query}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    throw error;
  }
};

export const getOrderDetails = async (orderId: string) => {
  try {
    const response = await api.get(`/orders?orderId=${encodeURIComponent(orderId)}`);
    if (response.data.success && response.data.orders.length > 0) {
      return response.data.orders[0];
    }
    throw new Error('Commande introuvable');
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de commande:', error);
    throw error;
  }
};

// Récupère les avis d'un livre
export const getReviews = async (bookId: string) => {
  try {
    const response = await api.get(`/reviews/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des avis:', error);
    return { success: false, reviews: [], avgRating: 0, total: 0 };
  }
};

export const postReview = async (bookId: string, data: { fullName: string; rating: number; comment: string }) => {
  try {
    const response = await api.post(`/reviews/${bookId}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'avis:', error);
    throw new Error(error.response?.data?.error || 'Erreur lors de l\'envoi de l\'avis');
  }
};

// Valide un code promo
export const validateCoupon = async (code: string, cartTotal: number) => {
  const response = await api.post('/coupon', { code, cartTotal });
  return response.data;
};

// Récupère les livres similaires
export const getSimilarBooks = async (bookId: string) => {
  try {
    const response = await api.get(`/similar/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des livres similaires:', error);
    return { success: false, books: [] };
  }
};
