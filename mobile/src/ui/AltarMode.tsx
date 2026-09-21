import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, ScrollView, View } from 'react-native';

import { formatReference } from '@/bible/references';
import type { ContentState } from '@/journey/datasetSource';
import type { FlowStep } from '@/journey/proposito';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { JourneyDay } from '@/journey/types';

import { AltarFooter } from './altar/AltarFooter';
import { AppText, DevContentBanner, Screen, StepBar } from './components';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, faces, fixedPalette, spacing, useGutter } from './theme';

/**
 * E2 é SUPERFÍCIE FIXA de tinta (TOKENS §2): nenhuma cor aqui segue o tema.
 * A paleta é a do tema escuro com o fundo travado em #111111.
 */
const INK = fixedPalette('ink');

/**
 * Espera antes de mover o foco para o título ao entrar no modo. O botão
 * "Modo altar" some com o foco nele; sem a espera, o leitor de tela ainda está
 * reposicionando o foco e ignora o pedido.
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: valor a confirmar em aparelho).
 */
export const ALTAR_ENTRY_FOCUS_DELAY_MS = 400;

/** O que o leitor de tela diz de um passo, na entrada e em cada troca. */
export function altarStepSpoken(index: number, total: number, title: string): string {
  return `Passo ${index + 1} de ${total}: ${title}`;
}

/**
 * E2 · Modo altar: a mesma intercessão do dia, um passo por página, em letras
 * grandes sobre tinta, para conduzir a reunião das 12h30 com o telefone apoiado.
 *
 * Só é montado enquanto o modo está ativo: é isso que permite chamar
 * `useKeepAwake()` sem condicional e registrar o voltar do Android só aqui. O
 * gesto de voltar do iOS é desligado pela tela que o monta (Stack.Screen).
 * Sem animação entre passos — quem conduz precisa de mudança imediata, e assim
 * "Reduzir movimento" não tem o que desligar.
 */
export function AltarMode({
  day,
  steps,
  contentState,
  onExit,
}: {
  day: JourneyDay;
  steps: FlowStep[];
  contentState: ContentState;
  /** Volta ao modo normal da tela (não sai da tela). */
  onExit: () => void;
}) {
  useKeepAwake();
  const gutter = useGutter();
  const [index, setIndex] = useState(0);
  const announced = useRef<number | null>(null);
  const titleRef = useRef<View>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = steps.length;
  const step = steps[index];

  // Android: voltar (botão ou gesto) sai do modo altar antes de sair da tela.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });
    return () => subscription.remove();
  }, [onExit]);

  // CORREÇÃO TÉCNICA (TELAS E2, LACUNAS B30, R3-2): cada passo é dito UMA vez, e
  // cada momento usa UM mecanismo só, nunca os dois:
  // - na ENTRADA, o botão "Modo altar" some com o foco nele; o foco já se perde
  //   de qualquer jeito, então ele vai para o título do passo 1, que carrega
  //   "Passo 1 de 5: título" no rótulo. Sem anúncio: somado ao foco, seria dito
  //   duas vezes;
  // - nas TROCAS, o foco está no rodapé (que não desmonta) e fica lá, para quem
  //   conduz tocar de novo; aí o passo novo é anunciado.
  // O ref impede repetir o mesmo passo se o efeito rodar de novo sem troca.
  const stepTitle = step?.title;
  useEffect(() => {
    if (stepTitle === undefined || announced.current === index) return;
    const isEntry = announced.current === null;
    announced.current = index;
    if (isEntry) {
      focusTimer.current = setTimeout(() => {
        focusTimer.current = null;
        if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
      }, ALTAR_ENTRY_FOCUS_DELAY_MS);
      return;
    }
    // Trocou de passo antes de o foco da entrada chegar: o anúncio basta.
    if (focusTimer.current) {
      clearTimeout(focusTimer.current);
      focusTimer.current = null;
    }
    AccessibilityInfo.announceForAccessibility(altarStepSpoken(index, total, stepTitle));
  }, [index, stepTitle, total]);

  useEffect(
    () => () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    [],
  );

  if (!step) return null;

  return (
    <Screen tone="ink" edges={['top', 'bottom', 'left', 'right']}>
      {/* CORREÇÃO TÉCNICA (LACUNAS C57): a barra de status acompanha a superfície
          fixa, não o tema — senão os ícones saem escuros sobre tinta no claro. */}
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + gutter * 2,
          alignSelf: 'center',
          paddingHorizontal: gutter,
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
          gap: spacing.lg,
        }}
      >
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH }}>
            {/* Amarelo sobre tinta é texto permitido: 12,92:1. */}
            <AppText
              variant="rowLabel"
              style={{ flex: 1, fontFamily: faces.sg700, color: INK.accent }}
              testID="altar-step-count"
            >
              {`Passo ${index + 1} de ${total}`}
            </AppText>
            <Pressable
              onPress={onExit}
              accessibilityRole="button"
              accessibilityLabel="Sair do modo altar"
              testID="exit-altar-mode"
              hitSlop={4}
              style={({ pressed }) => [
                {
                  minHeight: MIN_TOUCH,
                  minWidth: MIN_TOUCH,
                  paddingVertical: spacing.sm,
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <AppText variant="rowLabel" style={{ color: INK.text }}>
                Sair
              </AppText>
            </Pressable>
          </View>
          {/* Decorativo: o passo está escrito acima. Vazio em borderStrong do escuro
              (#3D3A36), a cor que a superfície fixa de tinta usa. */}
          <StepBar step={index + 1} total={total} height={6} filledColor={INK.accent} emptyColor={INK.borderStrong} />
        </View>

        {/* PROVISÓRIO (pergunta 5 ao designer): o aviso de conteúdo (C-07) não tem
            lugar no desenho. Compacto, logo abaixo do cabeçalho. O modo altar
            substitui a tela inteira, então sem isto o aviso sumia durante o modo. */}
        <DevContentBanner state={contentState} compact tone="ink" />

        {/* O conteúdo rola; o rodapé fica sempre à vista, mesmo com texto grande.
            key por passo (R3-3): cada passo começa no topo. Sem ela, quem rolou os
            motivos do passo 4 chegava ao 5 no meio do texto, com o título escondido. */}
        <ScrollView
          key={index}
          testID="altar-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.lg }}
        >
          {/* Alvo do foco da entrada: um elemento acessível só, com "Passo N de
              total: título" no rótulo (o texto visível do título está contido nele). */}
          <View
            ref={titleRef}
            accessible
            accessibilityRole="header"
            accessibilityLabel={altarStepSpoken(index, total, step.title)}
            testID="altar-step-heading"
          >
            <AppText
              style={{ fontFamily: faces.sg700, fontSize: 36, lineHeight: 42, color: INK.text }}
              testID="altar-step-title"
            >
              {step.title}
            </AppText>
          </View>
          {/* CORREÇÃO TÉCNICA: o app antigo usava branco a 78% de opacidade, e o
              TOKENS pede hex plano. textSecondary do escuro, #C7C4BD: 10,84:1. */}
          <AppText style={{ fontFamily: faces.ss400, fontSize: 19, lineHeight: 28, color: INK.textSecondary }}>
            {step.description}
          </AppText>

          {step.step === 3 && day.key_verse_reference ? (
            <View style={{ gap: spacing.sm }}>
              {/* PROVISÓRIO (LACUNAS P33): o desenho não diz se a cap
                  "VERSÍCULO-BASE" continua no modo altar. Mantida, como hoje. */}
              <AppText variant="cap" accessibilityRole="header" style={{ color: INK.accent }}>
                Versículo-base
              </AppText>
              <AppText style={{ fontFamily: faces.ss400, fontSize: 24, lineHeight: 34, color: INK.text }}>
                {formatReference(day.key_verse_reference)}
              </AppText>
            </View>
          ) : null}

          {/* PROVISÓRIO (LACUNAS P33): o passo 4 do modo altar não foi desenhado.
              Mantido o conteúdo de hoje — monte, ênfase e motivos de oração —, que
              é o centro do que quem conduz precisa ler em voz alta. */}
          {step.step === 4 ? (
            <View style={{ gap: spacing.md }}>
              {day.sphere ? (
                <AppText variant="cap" accessibilityRole="header" style={{ color: INK.accent }}>
                  {SPHERE_LABEL[day.sphere]}
                </AppText>
              ) : null}
              {day.title ? (
                <AppText style={{ fontFamily: faces.sg700, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, color: INK.text }}>
                  {day.title}
                </AppText>
              ) : null}
              {day.prayer_points.length > 0 ? (
                <View accessibilityRole="list" style={{ gap: spacing.md }} testID="altar-prayer-points">
                  {day.prayer_points.map((point, i) => (
                    <View key={`${i}-${point}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                      <View
                        aria-hidden
                        style={{ width: 8, height: 8, borderRadius: 4, marginTop: 12, backgroundColor: INK.accent }}
                      />
                      <AppText style={{ flex: 1, fontFamily: faces.ss400, fontSize: 22, lineHeight: 31, color: INK.text }}>
                        {point}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <AltarFooter
          index={index}
          total={total}
          onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
          onNext={() => (index >= total - 1 ? onExit() : setIndex(index + 1))}
        />
      </View>
    </Screen>
  );
}
