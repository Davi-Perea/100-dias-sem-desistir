import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDay } from '@/journey/datasetSource';
import { formatDayDate } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { deleteReflection, getReflection, saveReflection, useReflections } from '@/reflections/reflectionsStore';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { LockedDayScreen } from '@/ui/LockSheet';
import { TextField } from '@/ui/TextField';
import { AppText, Block, Button, DevContentBanner, Screen, StateView } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { spokenReference } from '@/ui/leitor/spoken';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useTheme } from '@/ui/theme';

/** Piso do campo (TELAS B5). */
const FIELD_MIN_HEIGHT = 220;
/** Entrelinha do campo (Source Serif 19/32) e o padding dele (16 + 16). */
const FIELD_LINE = 32;
const FIELD_PADDING = 32;

/**
 * B5 · Reflexão privada. Guardada só neste aparelho.
 *
 * Regra de produto (REGRAS 14), aplicada literalmente: a reflexão privada NUNCA
 * pré-preenche uma publicação. O bloco "Compartilhar um insight" que existia aqui
 * saiu — o desenho não o tem; no lugar entra a caixa azul que manda escrever de
 * novo, do zero, de propósito.
 */
export default function ReflectionScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = useGutter();
  const { fontScale } = useWindowDimensions();
  const journey = useJourney();
  const reflections = useReflections(journey.campaign.id);

  const day = Number.parseInt(params.day ?? '', 10);
  const stored = getReflection(reflections, day);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  /** A última gravação (ou exclusão) falhou no disco: a pessoa fica no editor, com o rascunho, e é avisada. */
  const [saveFailed, setSaveFailed] = useState(false);
  /** Altura da coluna abaixo da barra (rolagem + rodapé, já descontado o teclado) e do rodapé. */
  const [columnHeight, setColumnHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  // Deriva o rascunho a partir do valor guardado sem setState dentro de efeito.
  const key = `${journey.campaign.id}:${day}:${reflections ? 'ready' : 'loading'}`;
  if (reflections && draftKey !== key) {
    setDraftKey(key);
    setDraft(stored);
  }

  if (!Number.isInteger(day) || day < 1 || day > journey.campaign.total_days) {
    return (
      <Screen>
        <StateView
          kind="empty"
          icon="alert"
          title="Dia não encontrado"
          message="Este link não leva a nenhum dia da jornada."
          action={<Button title="Voltar" variant="outline" onPress={goBackOrHome} />}
        />
      </Screen>
    );
  }

  // O bloqueio é da ROTA (REGRAS 7, A4): link direto para a reflexão de um dia
  // que ainda não abriu chega no mesmo cadeado, sem editor e sem a referência.
  // PROVISÓRIO (LACUNAS P15): a variante de texto da reflexão não foi escrita;
  // usa a da leitura, como a fundação prevê.
  if (!journey.isDayUnlocked(day)) {
    return <LockedDayScreen dayNumber={day} dateLabel={formatDayDate(day, journey.campaign)} />;
  }

  if (!reflections) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const isToday = journey.phase === 'running' && day === journey.officialDay;
  const summary = readingSummary(getDay(day));
  const footerCap = summary ? `${summary.label} · salva neste aparelho` : 'salva neste aparelho';
  const footerCapSpoken = summary ? `${spokenReference(summary.label)}, salva neste aparelho` : 'Salva neste aparelho';

  /**
   * Teclado aberto é estado de layout (REGRAS 28). O rodapé fica preso embaixo
   * enquanto sobra, acima dele, uma janela de rolagem de pelo menos três linhas
   * do campo na escala de fonte atual. Quando não sobra (fonte grande + teclado),
   * o rodapé desce para o fim da rolagem: a pessoa continua vendo o que digita e
   * o campo nunca vai a zero — no app antigo, a partir de ~1,65×, ia.
   *
   * CORREÇÃO TÉCNICA (REGRAS 25/28): nem o desenho ("rodapé fixo") nem o app
   * antigo (rodapé sempre preso) desprendem o rodapé. Limiar escolhido: três
   * linhas do campo na escala atual (32 × 3 × fontScale + 32 de padding) acima
   * do rodapé preso. Motivo: abaixo disso, com teclado aberto e fonte grande, o
   * campo que a pessoa está digitando sumia atrás do rodapé. Custo: nesse caso
   * "Salvar para mim" fica no fim da rolagem, fora de vista enquanto digita.
   * PROVISÓRIO (pergunta 6 ao designer): o desenho exato da versão com teclado;
   * mostrar este comportamento na revisão da etapa.
   */
  const minViewport = FIELD_LINE * 3 * fontScale + FIELD_PADDING;
  const footerPinned = columnHeight === 0 || footerHeight === 0 || columnHeight - footerHeight >= minViewport;

  const remove = () => {
    Alert.alert('Excluir reflexão', 'Esta reflexão será apagada deste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setSaveFailed(false);
          try {
            await deleteReflection(journey.campaign.id, day);
            goBackOrHome();
          } catch {
            setSaveFailed(true);
          }
        },
      },
    ]);
  };

  const save = async () => {
    const body = draft.trim();
    // R1-6: esvaziar o campo e salvar apagaria a reflexão guardada sem a
    // confirmação que o "Excluir" pede. Passa pela mesma confirmação.
    if (body.length === 0 && stored.length > 0) {
      remove();
      return;
    }
    setBusy(true);
    setSaveFailed(false);
    try {
      await saveReflection(journey.campaign.id, day, body);
      goBackOrHome();
    } catch {
      // PER-02 (parte da tela): o disco recusou. A pessoa continua no editor com
      // o rascunho e fica sabendo que não salvou — nunca sai como se tivesse salvo.
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <View
      testID="reflection-footer"
      // Só a altura do rodapé PRESO conta: medir também o solto (mais baixo)
      // faria a decisão oscilar entre os dois estados.
      onLayout={footerPinned ? (event) => setFooterHeight(Math.round(event.nativeEvent.layout.height)) : undefined}
      style={
        footerPinned
          ? {
              paddingHorizontal: inset,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.md,
              gap: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            }
          : { gap: spacing.md, paddingTop: spacing.sm }
      }
    >
      <AppText variant="cap" accessibilityLabel={footerCapSpoken}>
        {footerCap}
      </AppText>
      {saveFailed ? (
        // Cor `danger` sobre `background`: a mesma do "Excluir" da barra. Anunciado
        // assim que aparece (região viva), porque o foco está no botão.
        <AppText
          variant="bodySm"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger }}
          testID="reflection-save-error"
        >
          Não foi possível salvar. Sua reflexão continua aqui; tente de novo.
        </AppText>
      ) : null}
      <Button title="Salvar para mim" onPress={save} loading={busy} testID="reflection-save" />
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // R1-4: 'padding' também no Android. Com o edge-to-edge (obrigatório no
        // RN 0.86) a janela não encolhe com o teclado, então sem comportamento a
        // coluna nunca encolhia, o rodapé nunca desprendia e "Salvar para mim"
        // ficava sob o teclado. Se algum aparelho ainda encolher a janela, o
        // KeyboardAvoidingView mede sobreposição zero e não soma nada — não há
        // espaço dobrado. PROVISÓRIO (decisão do engenheiro, 2026-09-21: ainda
        // não verificado em APK de desenvolvimento; risco aberto até lá).
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        {/* ------------------------------------------------------------ barra */}
        <View style={{ paddingHorizontal: inset - spacing.sm }}>
          <BackBar
            label="Cancelar"
            chevron={false}
            title={`Dia ${day}`}
            rightAction={{
              label: 'Excluir',
              variant: 'danger',
              onPress: remove,
              disabled: stored.length === 0,
              accessibilityLabel: 'Excluir reflexão',
              testID: 'reflection-delete',
            }}
          />
        </View>

        <View
          style={{ flex: 1 }}
          testID="reflection-column"
          onLayout={(event) => setColumnHeight(Math.round(event.nativeEvent.layout.height))}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: inset,
              paddingTop: spacing.lg,
              paddingBottom: footerPinned ? spacing.xxl : insets.bottom + spacing.lg,
              gap: spacing.lg,
              width: '100%',
              maxWidth: MAX_CONTENT_WIDTH + inset * 2,
              alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* PROVISÓRIO (pergunta 5 ao designer): aviso de conteúdo (C-07). O
                rodapé mostra a referência do dia, material da igreja. */}
            <DevContentBanner state={journey.contentState} compact />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="lock" size={16} color={colors.textMuted} />
              <AppText
                variant="cap"
                accessibilityRole="header"
                accessibilityLabel="Minha reflexão, só você vê"
                style={{ flex: 1 }}
              >
                Minha reflexão · só você vê
              </AppText>
            </View>

            {/* Cópia literal do desenho no dia oficial. A reflexão abre também
                para dias passados, e ali o "hoje" feriria o invariante §5.1: o dia
                passado usa "neste dia", o mesmo recorte do jejum no A3.
                PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS C31, a
                variante para dia passado ainda não foi desenhada). */}
            <AppText variant="blockTitleLg" accessibilityRole="header">
              {isToday ? 'O que ficou com você hoje?' : 'O que ficou com você neste dia?'}
            </AppText>

            <TextField
              minHeight={FIELD_MIN_HEIGHT}
              value={draft}
              onChangeText={setDraft}
              // PROVISÓRIO (pergunta 6 ao designer): foco automático com o campo
              // vazio, como hoje.
              autoFocus={stored.length === 0}
              placeholder="Escreva à vontade."
              accessibilityLabel="Texto da sua reflexão privada"
              selectionColor={colors.text}
              testID="reflection-input"
            />

            <Block tone="blueSoft" testID="reflection-private-note">
              <AppText variant="bodySm" style={{ color: colors.onBlueSoft }}>
                Isto fica neste aparelho. Se depois você quiser dizer algo para a igreja, escreve de novo — do zero,
                de propósito.
              </AppText>
            </Block>

            {footerPinned ? null : footer}
          </ScrollView>
          {footerPinned ? footer : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
