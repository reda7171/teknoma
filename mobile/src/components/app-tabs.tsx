import { Tabs } from 'expo-router';
import { useColorScheme, View, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { useCartStore } from '@/store/useCartStore';
import { useI18nStore } from '@/store/useI18nStore';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  const totalItems = useCartStore((state) => state.getTotalItems());
  const t = useI18nStore((state) => state.t);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#0274DF',
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
        }}
      />

      <Tabs.Screen
        name="wishlist"
        options={{
          title: t('wishlist'),
        }}
      />
      
      {/* Hide the book/[id] from the tab bar but keep it in the router */}
      <Tabs.Screen
        name="book/[id]"
        options={{
          href: null, // This hides the tab
        }}
      />
      
      {/* Masquer checkout et order-confirmation des onglets */}
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="order-confirmation" options={{ href: null }} />

      <Tabs.Screen
        name="cart"
        options={{
          title: t('cart'),
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444' }
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Commandes',
        }}
      />
      
      {/* Remove explore or keep it hidden if we don't need it */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
