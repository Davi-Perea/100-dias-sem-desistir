import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler, ScrollView, Text, View } from 'react-native';

import { formatReference } from '@/bible/references';
import type { FlowStep } from '@/journey/proposito';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { JourneyDay } from '@/journey/types';

import { Button, Screen } from './components';
import { BRAND_YELLOW, MAX_CONTENT_WIDTH, fonts, spacing, useGutter } from './theme';

const WHITE = '#FFFFFF';
const WHITE_SOFT = 'rgba(255,255,255,0.78)';
const WHITE_DIM = 'rgba(255,255,255,0.3)';

/** Rótulo em caixa alta sobre tinta. Amarelo sobre preto é permitido (≈13:1). */
function CapOnInk({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.label,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 1.54,
        textTransform: 'uppercase',
        color: BRAND_YELLOW,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * Modo altar: a mesma intercessão do dia, um passo por página, em letras grandes
 * sobre fundo tinta, para conduzir a reunião das 12h30 com o telefone apoiado.
 *
 * Só é montado enquanto o modo está ativo: é isso que permite chamar
 * `useKeepAwake()` sem condicional e registrar o botão de voltar do Android só
 * aqui. Sem animação de transição entre passos — quem está conduzindo precisa
 * de mudança imediata, e assim "Reduzir movimento" não tem o que desligar.
 */
export function AltarMode({
  day,
  steps,
  onExit,
}: {
  day: JourneyDay;
  steps: FlowStep[];
  /** Volta ao modo normal da tela (não sai da tela). */
  onExit: () => void;
}) {
  useKeepAwake();
  const gutter = useGutter();
  const [index, setIndex] = useState(0);

  const total = steps.length;
  const step = steps[index];
  const isLast = index >= total - 1;

  // Android: voltar (botão ou gesto) sai do modo altar antes de sair da tela.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });
    return () => subscription.remove();
  }, [onExit]);

  // O foco do leitor de tela fica no botão; o passo novo é anunciado.
  useEffect(() => {
    if (step) AccessibilityInfo.announceForAccessibility(`Passo ${index + 1} de ${total}: ${step.title}`);
  }, [index, step, total]);

  if (!step) return null;

  return (
    <Screen tone="ink" edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + gutter * 2,
          alignSelf: 'center',
          paddingHorizontal: gutter,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
          gap: spacing.lg,
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: fonts.item, fontSize: 13, lineHeight: 18, color: BRAND_YELLOW }}>
            {`Passo ${index + 1} de ${total}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }} aria-hidden>
            {steps.map((s, i) => (
              <View
                key={s.step}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? BRAND_YELLOW : WHITE_DIM,
                }}
              />
            ))}
          </View>
        </View>

        {/* O conteúdo rola; os botões ficam sempre à vista, mesmo com texto grande. */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={`Passo ${index + 1} de ${total}: ${step.title}`}
            style={{ fontFamily: fonts.title, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: WHITE }}
          >
            {step.title}
          </Text>
          <Text style={{ fontFamily: fonts.read, fontSize: 19, lineHeight: 28, color: WHITE_SOFT }}>
            {step.description}
          </Text>

          {step.step === 3 && day.key_verse_reference ? (
            <View style={{ gap: spacing.sm }}>
              <CapOnInk>Versículo-base</CapOnInk>
              <Text style={{ fontFamily: fonts.read, fontSize: 24, lineHeight: 32, color: WHITE }}>
                {formatReference(day.key_verse_reference)}
              </Text>
            </View>
          ) : null}

          {step.step === 4 ? (
            <View style={{ gap: spacing.md }}>
              {day.sphere ? <CapOnInk>{SPHERE_LABEL[day.sphere]}</CapOnInk> : null}
              {day.title ? (
                <Text style={{ fontFamily: fonts.title, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, color: WHITE }}>
                  {day.title}
                </Text>
              ) : null}
              {day.prayer_points.length > 0 ? (
                <View accessibilityRole="list" style={{ gap: spacing.md }} testID="altar-prayer-points">
                  {day.prayer_points.map((point, i) => (
                    <View
                      key={`${i}-${point}`}
                      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}
                    >
                      <View
                        aria-hidden
                        style={{ width: 8, height: 8, borderRadius: 4, marginTop: 12, backgroundColor: BRAND_YELLOW }}
                      />
                      <Text style={{ flex: 1, fontFamily: fonts.read, fontSize: 22, lineHeight: 31, color: WHITE }}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={{ gap: spacing.sm }}>
          <Button
            title={isLast ? 'Concluir' : 'Próximo passo'}
            variant="yellow"
            onPress={() => (isLast ? onExit() : setIndex(index + 1))}
            accessibilityHint={
              isLast ? 'Volta para a intercessão do dia' : `Vai para o passo ${index + 2} de ${total}`
            }
            testID="altar-next"
          />
          {index > 0 ? (
            <Button
              title="Passo anterior"
              variant="underline"
              onInk
              onPress={() => setIndex(index - 1)}
              accessibilityHint={`Volta para o passo ${index} de ${total}`}
              testID="altar-previous"
            />
          ) : null}
          <Button
            title="Sair do modo altar"
            variant="underline"
            onInk
            onPress={onExit}
            accessibilityHint="Volta para a intercessão do dia"
            testID="exit-altar-mode"
          />
        </View>
      </View>
    </Screen>
  );
}
