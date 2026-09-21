import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';

import { Screen } from '../components';
import { spacing, useGutter } from '../theme';
import { ErrorState } from './States';

/**
 * F5 para qualquer exceção de render numa rota (R4-6). O `app/_layout.tsx` raiz
 * exporta isto como `ErrorBoundary`, e o Expo Router o aplica a todas as rotas
 * filhas que não tenham o seu: em vez de tela branca ou do app fechando, a
 * pessoa vê o molde do F5 com uma saída.
 *
 * Nunca mostra `error.message`, pilha ou nome técnico (F5: "nenhum código
 * técnico na tela"). O erro só vai para o console em desenvolvimento, onde o
 * React já o registra.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: o F5 só tem a cópia da leitura
 * de hoje, que seria falsa para uma falha em outra tela): título do F5 e frase
 * genérica que não afirma o que falhou, e mantém o "nada foi perdido" do F5 (LACUNAS C45),
 * verdadeiro porque jornada e reflexões são locais e não passam pela tela.
 */
export function ErrorBoundaryScreen({ retry }: ErrorBoundaryProps) {
  const inset = useGutter();

  // A falha pode acontecer antes de a splash ser escondida pelo layout: sem
  // isto, a pessoa ficaria presa na splash sem ver a saída.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const goHome = () => {
    router.replace('/');
    void retry();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: inset, paddingVertical: spacing.xl }}
        testID="route-error-boundary"
      >
        <ErrorState
          message="Esta tela não abriu. Sua jornada e as suas reflexões estão salvas — nada foi perdido."
          onRetry={() => void retry()}
          secondary={{ label: 'Ir para a Jornada', onPress: goHome, testID: 'error-boundary-home' }}
        />
      </ScrollView>
    </Screen>
  );
}
