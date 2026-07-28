import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors } from '@/constants/theme';
import { useCartStore } from '@/store/useCartStore';
import { useI18nStore } from '@/store/useI18nStore';
import { useAuthStore } from '@/store/useAuthStore';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { updatePushToken } from '@/services/api';
import { useEffect } from 'react';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const totalItems = useCartStore((state) => state.getTotalItems());
  const t = useI18nStore((state) => state.t);
  const { isLoggedIn, customer } = useAuthStore();

  useEffect(() => {
    if (isLoggedIn && customer) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          updatePushToken(customer.id, token).catch(e => console.log('Update token error', e));
        }
      });
    }
  }, [isLoggedIn, customer?.id]);

  const hidden = { href: null } as const;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#0274DF',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
        tabBarHideOnKeyboard: false,
      }}>

      {/* ── Accueil ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Échange ── */}
      <Tabs.Screen
        name="exchange"
        options={{
          title: t('exchange'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Panier ── */}
      <Tabs.Screen
        name="cart"
        options={{
          href: null,
          title: t('cart'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
          ),
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444' },
        }}
      />

      {/* ── Liste de lecture ── */}
      <Tabs.Screen
        name="reading-list"
        options={{
          title: t('reading_list') || 'Bibliothèque',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Messagerie ── */}
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chat') || 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Paramètres ── */}
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
      
      {/* ── Explore (Caché) ── */}
      <Tabs.Screen name="explore" options={hidden} />
    </Tabs>
  );
}
