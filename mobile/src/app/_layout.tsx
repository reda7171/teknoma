import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import "../../global.css";
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Onboarding } from '@/components/Onboarding';
import { queryClient, asyncStoragePersister } from '@/services/queryClient';
import { useAppStore } from '@/store/useAppStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const onboardingDone = useAppStore((s) => s.onboardingDone);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {!onboardingDone ? (
          <Onboarding />
        ) : (
          <>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </>
        )}
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
