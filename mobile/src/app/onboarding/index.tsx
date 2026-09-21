import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isCloudConfigured } from '@/cloud/config';
import { Dove } from '@/ui/brand';
import { AppText, Button, Screen } from '@/ui/components';
import { fixedPalette, MAX_CONTENT_WIDTH, spacing, useGutter } from '@/ui/theme';

/**
 * F1 · Boas-vindas. SUPERFÍCIE FIXA em amarelo: nada aqui muda com o tema.
 *
 * Correção técnica (TOKENS §2, LACUNAS C21): o TELAS escreve `textSecondary` e
 * o botão primário, que são temáticos. No escuro o parágrafo cairia para 1,19:1
 * sobre o amarelo e o primário viraria branco com rótulo escuro. A paleta é a
 * da superfície (`fixedPalette('yellow')`): parágrafo #3F3D38 (7,42:1), título
 * #111111 (12,92:1), primário tinta com rótulo branco.
 *
 * Sem muro de login: "Começar" vai direto para o passo 1.
 */
const YELLOW = fixedPalette('yellow');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const focused = useIsFocused();

  // PROVISÓRIO (pergunta 12 ao designer): "Já tenho perfil" não tem tela de
  // destino no desenho. O portão do _layout raiz já deixa /conta abrir antes do
  // onboarding (LACUNAS B19), então o único motivo para esconder é a nuvem: sem
  // ela, /conta cai em "Conta indisponível", e um link que só leva a um
  // "indisponível" é promessa falsa (a mesma regra do "Criar meu perfil" do A5,
  // decisão D-7). Em release a nuvem fica desligada até existir exclusão de
  // conta no app e na web (D-6), e o link some junto. Nunca é caminho obrigatório.
  const showSignIn = isCloudConfigured();

  return (
    <Screen tone="yellow">
      {/* Correção técnica (LACUNAS C61): a barra de status segue o tema; no
          escuro ela ficaria com ícones brancos sobre o amarelo fixo (~1,4:1).
          Só enquanto esta tela está em foco, para não vazar para o passo 1. */}
      {focused ? <StatusBar style="dark" /> : null}
      <View
        style={{
          flex: 1,
          paddingHorizontal: inset,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + inset * 2,
          alignSelf: 'center',
        }}
      >
        {/* Em fonte grande o título de 50px e o parágrafo não cabem na coluna;
            sem rolagem, era o TEXTO que sumia. */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* 112×72: a altura sai da proporção 224×144 do asset. O tom preto é
              explícito: sem ele, no tema escuro a pomba ficaria branca sobre o
              amarelo fixo. */}
          <Dove width={112} tone="black" role="signature" />
          {/* PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS P40, sem regra
              no desenho para o título ceder): em 2× e acima "desistir" não cabe
              na coluna e o React Native quebra a palavra por caractere. O texto
              continua inteiro e legível; encolher a fonte contrariaria a REGRAS 25. */}
          <AppText
            variant="displayXl"
            accessibilityRole="header"
            accessibilityLabel="100 dias sem desistir"
            style={{ color: YELLOW.onAccent }}
            testID="welcome-title"
          >
            {'100 dias\nsem desistir'}
          </AppText>
          <AppText
            variant="body"
            style={{ fontSize: 20, lineHeight: 32, color: YELLOW.textSecondary }}
            testID="welcome-body"
          >
            A igreja inteira lê a mesma coisa, no mesmo dia. Você não é obrigado a nada — pode só ler, pode só orar,
            pode voltar depois de faltar.
          </AppText>
        </ScrollView>

        <View style={{ gap: spacing.sm, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
          <Button
            title="Começar"
            tone="yellow"
            onPress={() => router.push('/onboarding/leitura')}
            testID="onboarding-start"
          />
          {showSignIn ? (
            <Button
              title="Já tenho perfil"
              variant="underline"
              tone="yellow"
              onPress={() => router.push('/conta')}
              testID="onboarding-sign-in"
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
