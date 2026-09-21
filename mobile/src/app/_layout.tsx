import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';

import { setAnalyticsEnabled } from '@/analytics/analytics';
import { bibliaLivreProvider } from '@/reader/bibliaLivreProvider';
import { setBibleProvider } from '@/reader/provider';
import { setupNotificationHandler } from '@/reminders/reminders';
import { useReminderSync } from '@/reminders/useReminderSync';
import { useSettings } from '@/settings/settingsStore';
import { ErrorBoundaryScreen } from '@/ui/entrada/ErrorBoundaryScreen';
import { useAppFonts } from '@/ui/fonts';
import { MOTION_MS, fonts, useReducedMotion, useTheme } from '@/ui/theme';

// Bíblia Livre empacotada (CC BY 4.0 BR; decisão do fundador, 2026-09-21). O devBibleProvider fica só nos testes.
setBibleProvider(bibliaLivreProvider);
setupNotificationHandler();
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash já escondida (recarga de desenvolvimento): não é erro.
});

/**
 * F5 para exceção de render em qualquer rota (R4-6): o Expo Router usa o
 * `ErrorBoundary` exportado pelo layout para todas as rotas filhas.
 */
export const ErrorBoundary = ErrorBoundaryScreen;

/** Rede de segurança: a splash nunca fica presa se o disco não responder. */
const SPLASH_MAX_MS = 3000;

/**
 * Portão de onboarding. Devolve `true` quando a rota atual já é a certa, para
 * a splash só sair depois disso (R4-11): antes, na primeira abertura, o
 * esqueleto da Jornada piscava no branco antes de o portão trocar para o F1.
 */
function useOnboardingGate(): boolean {
  const settings = useSettings();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!settings) return;
    const inOnboarding = segments[0] === 'onboarding';
    // "Já tenho perfil" (F1) abre /conta antes de o onboarding terminar; sem
    // esta exceção o portão devolvia /conta para /onboarding (LACUNAS B19).
    const allowedBeforeOnboarding = inOnboarding || segments[0] === 'conta';
    if (!settings.onboardingCompleted && !allowedBeforeOnboarding) router.replace('/onboarding');
    else if (settings.onboardingCompleted && inOnboarding) router.replace('/');
  }, [settings, segments, router]);

  useEffect(() => {
    // D-4: o app não tem SDK de análise e o interruptor saiu da interface. Em
    // release o buffer local nunca liga, nem com um valor antigo salvo no disco;
    // em desenvolvimento ele continua inspecionável no painel DEV.
    if (settings) setAnalyticsEnabled(__DEV__ && settings.analyticsEnabled);
  }, [settings]);

  if (!settings) return false;
  const inOnboarding = segments[0] === 'onboarding';
  const allowedBeforeOnboarding = inOnboarding || segments[0] === 'conta';
  if (!settings.onboardingCompleted) return allowedBeforeOnboarding;
  return !inOnboarding;
}

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const fontsReady = useAppFonts();
  const routeSettled = useOnboardingGate();
  const reducedMotion = useReducedMotion();
  /**
   * O tema da navegação segue o do app. Sem isto, os contêineres do React
   * Navigation pintam o branco padrão, e no tema escuro ele aparece em volta e
   * atrás da barra de abas flutuante (e através do vidro no iOS).
   */
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        primary: colors.text,
      },
    };
  }, [colors, isDark]);
  const [splashTimedOut, setSplashTimedOut] = useState(false);
  useReminderSync();

  useEffect(() => {
    const timer = setTimeout(() => setSplashTimedOut(true), SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsReady && (routeSettled || splashTimedOut)) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, routeSettled, splashTimedOut]);

  // Segurar a primeira pintura até as faces estarem prontas evita o salto de
  // tipografia; `useAppFonts` também libera em caso de falha, então isto nunca
  // trava o aplicativo numa tela vazia.
  if (!fontsReady) return null;

  return (
    <ThemeProvider value={navTheme}>
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
          // TOKENS §5: com "Reduzir movimento" a transição desliga inteira.
          ...(reducedMotion ? { animation: 'none' as const } : null),
        }}>
        {/*
          Toda tela redesenhada desenha a própria barra (BackBar): o título nativo
          não cresce com a fonte do sistema. Declarar aqui evita o cabeçalho
          nativo piscar no primeiro quadro. Só admin e dev (ferramentas internas,
          ainda não redesenhadas) mantêm o cabeçalho nativo.
        */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="dia/[day]" options={{ headerShown: false }} />
        <Stack.Screen name="intercessao/[day]" options={{ headerShown: false }} />
        <Stack.Screen name="ministerio" options={{ headerShown: false }} />
        <Stack.Screen name="proposito" options={{ headerShown: false }} />
        <Stack.Screen name="reader/[day]" options={{ headerShown: false }} />
        <Stack.Screen name="biblia/[livro]/index" options={{ headerShown: false }} />
        <Stack.Screen name="biblia/[livro]/[capitulo]" options={{ headerShown: false }} />
        <Stack.Screen
          name="reflexao/[day]"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="marco/[day]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reflexoes" options={{ headerShown: false }} />
        <Stack.Screen name="jejum" options={{ headerShown: false }} />
        <Stack.Screen name="aparencia" options={{ headerShown: false }} />
        <Stack.Screen name="ajuda" options={{ headerShown: false }} />
        {/* Tela nova do Você (casca SubScreen, barra própria), sem cabeçalho nativo. */}
        <Stack.Screen name="privacidade" options={{ headerShown: false }} />
        <Stack.Screen name="lembrete" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="conta" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="grupo/[id]" options={{ headerShown: false }} />
        {/*
          Comunidade (branch comunidade-v2). Declarar as rotas não as liga: cada
          tela se protege com COMMUNITY_ENABLED e, com a flag desligada, nada no
          app leva até elas (a V1 fica igual).
        */}
        <Stack.Screen name="comunidade/depois/[day]" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/publicar" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/regras" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/consentimento" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/entrar/index" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/minhas-publicacoes" options={{ headerShown: false }} />
        <Stack.Screen name="comunidade/conta-e-privacidade" options={{ headerShown: false }} />
        <Stack.Screen name="moderacao/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ title: 'Administração' }} />
        <Stack.Screen name="dev" options={{ title: 'Painel de desenvolvimento', presentation: 'modal' }} />
        <Stack.Screen name="componentes" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
