import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { setAnalyticsEnabled } from '@/analytics/analytics';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { setupNotificationHandler } from '@/reminders/reminders';
import { useSettings } from '@/settings/settingsStore';
import { useTheme } from '@/ui/theme';

// Provider de texto de desenvolvimento até o Gate 1 (licença de tradução).
setBibleProvider(devBibleProvider);
setupNotificationHandler();

function useOnboardingGate() {
  const settings = useSettings();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!settings) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!settings.onboardingCompleted && !inOnboarding) router.replace('/onboarding');
    else if (settings.onboardingCompleted && inOnboarding) router.replace('/');
  }, [settings, segments, router]);

  useEffect(() => {
    if (settings) setAnalyticsEnabled(settings.analyticsEnabled);
  }, [settings]);
}

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  useOnboardingGate();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          headerBackTitle: 'Voltar',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="dia/[day]" options={{ title: 'Dia' }} />
        <Stack.Screen name="reader/[day]" options={{ title: 'Leitura', headerShown: false }} />
        <Stack.Screen name="reflexao/[day]" options={{ title: 'Minha reflexão', presentation: 'modal' }} />
        <Stack.Screen name="lembrete" options={{ title: 'Lembrete de leitura', presentation: 'modal' }} />
        <Stack.Screen name="dev" options={{ title: 'Painel de desenvolvimento', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
