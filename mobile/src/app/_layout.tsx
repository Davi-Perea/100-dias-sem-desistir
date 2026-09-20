import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { setAnalyticsEnabled } from '@/analytics/analytics';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { setupNotificationHandler } from '@/reminders/reminders';
import { useReminderSync } from '@/reminders/useReminderSync';
import { useSettings } from '@/settings/settingsStore';
import { useAppFonts } from '@/ui/fonts';
import { MOTION_MS, fonts, useTheme } from '@/ui/theme';

// Provider de texto de desenvolvimento até o Gate 1 (licença de tradução).
setBibleProvider(devBibleProvider);
setupNotificationHandler();
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash já escondida (recarga de desenvolvimento): não é erro.
});

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
  const fontsReady = useAppFonts();
  useOnboardingGate();
  useReminderSync();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  // Segurar a primeira pintura até as faces estarem prontas evita o salto de
  // tipografia; `useAppFonts` também libera em caso de falha, então isto nunca
  // trava o aplicativo numa tela vazia.
  if (!fontsReady) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.label, fontSize: 17 },
          headerShadowVisible: false,
          headerBackTitle: 'Voltar',
          contentStyle: { backgroundColor: colors.background },
          animationDuration: MOTION_MS,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="dia/[day]" options={{ headerShown: false }} />
        <Stack.Screen name="intercessao/[day]" options={{ headerShown: false }} />
        <Stack.Screen name="ministerio" options={{ title: 'Meu ministério' }} />
        <Stack.Screen name="proposito" options={{ title: 'Sobre o propósito' }} />
        <Stack.Screen name="reader/[day]" options={{ headerShown: false }} />
        <Stack.Screen
          name="reflexao/[day]"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="marco/[day]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reflexoes" options={{ title: 'Minhas reflexões' }} />
        <Stack.Screen name="jejum" options={{ title: 'Meu jejum' }} />
        <Stack.Screen name="aparencia" options={{ title: 'Aparência e acessibilidade' }} />
        <Stack.Screen name="ajuda" options={{ title: 'Ajuda' }} />
        <Stack.Screen name="lembrete" options={{ title: 'Lembrete de leitura', presentation: 'modal' }} />
        <Stack.Screen name="conta" options={{ title: 'Conta', presentation: 'modal' }} />
        <Stack.Screen name="grupo/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ title: 'Administração' }} />
        <Stack.Screen name="dev" options={{ title: 'Painel de desenvolvimento', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
