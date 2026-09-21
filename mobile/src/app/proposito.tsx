import { Stack } from 'expo-router';
import { View } from 'react-native';

import {
  PROPOSITO,
  flowSteps,
  publicSections,
  type PropositoBlock,
  type PropositoSection,
} from '@/journey/proposito';
import { BUNDLED_CONTENT } from '@/journey/datasetSource';
import { useJourney } from '@/journey/useJourney';
import { BackBar } from '@/ui/BackBar';
import { AppText, Cap, DevContentBanner, Rule, Screen, ScreenScroll } from '@/ui/components';
import { faces, spacing, useTheme } from '@/ui/theme';

/**
 * D5 · Sobre o propósito. A orientação da igreja, palavra por palavra.
 *
 * Nenhum texto da igreja é escrito pelo app: subtítulo, parágrafos, títulos de
 * seção, itens, passos e a citação vêm do dado como vieram. O app escreve só o
 * título da página, o cap "Os cinco passos do altar", a atribuição da citação e
 * a legenda do recorte — e a página decide a forma.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS C38 ainda sem pergunta
 * numerada ao designer — pedido ao orquestrador para numerá-la). O D5 lista
 * "parágrafos · citação · cap OS CINCO PASSOS DO ALTAR + passos", como se a
 * orientação fosse um texto corrido. Ela tem nove seções públicas com título, e
 * os passos ficam DENTRO de "FLUXO DA REUNIÃO". Reordenar mudaria o texto da
 * igreja (REGRAS 4, bloqueante); então a página segue a ordem do dado, com a
 * forma nova, e o cap dos cinco passos entra no lugar onde os passos estão.
 */

function Paragraph({ text }: { text: string }) {
  return <AppText variant="body">{text}</AppText>;
}

function Bullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      {/* Marcador decorativo, alinhado à primeira linha do corpo 17/27. */}
      <View aria-hidden style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text, marginTop: 11 }} />
      <AppText variant="body" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

/**
 * Passo do altar: círculo de 32 em `markSurface` com o numeral em `onMark` — tinta
 * com amarelo no claro, amarelo com tinta no escuro. Fixar o círculo em #111111
 * o faria sumir sobre a página escura (TOKENS §2, regra de inversão).
 *
 * CORREÇÃO TÉCNICA: o círculo é piso (minWidth/minHeight 32), não medida fixa —
 * o numeral cresce com a fonte do sistema e não pode vazar do círculo.
 */
function Step({ number, title, description }: { number: number; title: string; description: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }} testID={`proposito-step-${number}`}>
      <View
        style={{
          minWidth: 32,
          minHeight: 32,
          paddingHorizontal: spacing.xs,
          borderRadius: 999,
          backgroundColor: colors.markSurface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText
          variant="rowLabel"
          accessibilityLabel={`Passo ${number}`}
          style={{ fontFamily: faces.sg700, color: colors.onMark, textAlign: 'center' }}
        >
          {number}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2, paddingTop: spacing.xs }}>
        <AppText variant="action">{title}</AppText>
        {description ? <AppText variant="bodySm">{description}</AppText> : null}
      </View>
    </View>
  );
}

/** Só para um passo que não esteja em `flowSteps()`: título antes de " - ", resto depois. */
function splitStep(text: string): { title: string; description: string } {
  const at = text.indexOf(' - ');
  if (at < 0) return { title: text, description: '' };
  return { title: text.slice(0, at), description: text.slice(at + 3) };
}

/**
 * Citação bíblica do material da igreja (REGRAS 2, invariante C-02).
 *
 * É o único texto de tradução no aplicativo enquanto a licença não fechar, por
 * isso aparece como bloco identificado como citação, com a referência ao lado,
 * e não se mistura aos parágrafos. Desenho: barra de 4px em `accent` à
 * esquerda, Source Serif itálico 17/27 e a atribuição.
 *
 * A barra amarela sozinha não identifica a citação (1,46:1 no branco e decorativa),
 * por isso a atribuição mantém a palavra "citação" (LACUNAS P15) além do
 * "tradução a informar" do desenho: a igreja ainda não disse qual tradução usou.
 */
function Scripture({ quote, reference }: { quote: string; reference: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID="proposito-scripture"
      accessible
      accessibilityLabel={`Citação bíblica: ${quote} ${reference}, tradução a informar`}
      style={{ gap: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.accent, paddingLeft: spacing.lg }}
    >
      <AppText variant="quote">{quote}</AppText>
      <AppText variant="caption">{reference} · citação · tradução a informar</AppText>
    </View>
  );
}

function SectionBlocks({ blocks }: { blocks: PropositoBlock[] }) {
  const steps = flowSteps();
  const firstStep = blocks.findIndex((b) => b.kind === 'step');
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === 'bullet') return <Bullet key={index} text={block.text} />;
        if (block.kind === 'scripture') {
          return <Scripture key={index} quote={block.quote ?? block.text} reference={block.reference ?? ''} />;
        }
        if (block.kind === 'step') {
          // O fluxo já vem separado em título e descrição pelo conversor; o texto
          // corrido só é dividido se um passo não estiver lá.
          const known = steps.find((step) => block.text.startsWith(step.title));
          const { title, description } = known ?? splitStep(block.text);
          const ordinal = blocks.slice(0, index).filter((b) => b.kind === 'step').length + 1;
          const step = <Step key={index} number={known?.step ?? ordinal} title={title} description={description} />;
          if (index !== firstStep) return step;
          return (
            <View key={index} style={{ gap: spacing.md }}>
              <Cap style={{ marginTop: spacing.sm }}>Os cinco passos do altar</Cap>
              {step}
            </View>
          );
        }
        return <Paragraph key={index} text={block.text} />;
      })}
    </>
  );
}

function Section({ section, index }: { section: PropositoSection; index: number }) {
  return (
    <View testID={`proposito-section-${index}`} style={{ gap: spacing.md }}>
      {/* Título da seção como a igreja escreveu (em caixa alta no original). */}
      <Cap style={{ marginTop: spacing.sm }}>{section.heading}</Cap>
      <SectionBlocks blocks={section.blocks} />
    </View>
  );
}

export default function PropositoScreen() {
  const journey = useJourney();
  // O subtítulo é o da campanha REAL, como a própria orientação (PROPOSITO), mesmo
  // quando o painel DEV troca o dataset ativo por uma fixture.
  const subtitle = BUNDLED_CONTENT.campaign.subtitle ?? null;

  return (
    <Screen>
      {/* CORREÇÃO TÉCNICA: barra própria; o título nativo não cresce com a fonte. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenScroll gap={spacing.xl}>
        <View style={{ gap: spacing.md }}>
          <BackBar />
          {/*
            PROVISÓRIO (pergunta 5 ao designer): a faixa de aviso de conteúdo
            (C-07) é obrigatória enquanto a igreja não autorizar, e o D5 não
            reserva lugar para ela. Fica compacta, logo abaixo do cabeçalho.
          */}
          <DevContentBanner state={journey.contentState} compact />
        </View>

        <View style={{ gap: spacing.md }}>
          <AppText
            variant="display"
            accessibilityRole="header"
            // TELAS D5 dá 32/36 sem tracking: letterSpacing 0 (o −1,6 da variante
            // display foi pensado para 38px). Mesmo critério do grupo Você.
            style={{ fontSize: 32, lineHeight: 36, letterSpacing: 0 }}
          >
            Sobre o propósito
          </AppText>
          {/*
            PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS P32 ainda sem
            pergunta numerada — pedido ao orquestrador). O desenho escreve "Palavra · Consagração ·
            Adoração · Intercessão", que é o subtítulo da campanha no dado com o
            separador trocado. Trocar o caractere mexeria no texto da igreja:
            o subtítulo sai do dado como veio, e o leitor de tela ouve só as
            palavras, sem os separadores (REGRAS 32).
          */}
          {subtitle ? (
            <AppText
              variant="body"
              accessibilityLabel={subtitle.replace(/\s*[•·]\s*/g, ', ')}
              style={{ fontFamily: faces.ss400, fontSize: 21, lineHeight: 32 }}
              testID="proposito-subtitle"
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <Rule />

        <View style={{ gap: spacing.md }}>
          {/*
            O subtítulo do PRÓPRIO documento da orientação, como veio (era o
            título desta página antes do redesenho). Abre o texto da igreja: sem
            ele, a legenda do recorte ("fica de fora só…") seria falsa.
          */}
          <AppText variant="blockTitle" testID="proposito-doc-subtitle">
            {PROPOSITO.subtitle}
          </AppText>
          {PROPOSITO.intro.map((paragraph, index) => (
            <Paragraph key={index} text={paragraph} />
          ))}
        </View>

        {publicSections().map((section, index) => (
          <Section key={section.heading} section={section} index={index} />
        ))}

        {/*
          PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS C39 ainda sem
          pergunta numerada — pedido ao orquestrador). A legenda do recorte não está no D5, mas sem
          ela "palavra por palavra" afirmaria que a reprodução é integral. A
          página mostra as seções públicas; a dirigida aos líderes fica de fora.
        */}
        <AppText variant="caption">
          Orientação da igreja, palavra por palavra. Fica de fora só o passo a passo de preparação pedido a
          quem conduz o altar.
        </AppText>
      </ScreenScroll>
    </Screen>
  );
}
