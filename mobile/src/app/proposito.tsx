import { Text, View } from 'react-native';

import {
  PROPOSITO,
  flowSteps,
  publicSections,
  type PropositoBlock,
  type PropositoSection,
} from '@/journey/proposito';
import { useJourney } from '@/journey/useJourney';
import { AppText, Cap, DevContentBanner, Rule, Screen, ScreenScroll } from '@/ui/components';
import { fonts, spacing, useTheme } from '@/ui/theme';

/**
 * "Sobre o propósito": a orientação da igreja para os 100 dias, reproduzida
 * sem alterações. Entram só as seções públicas (`publicSections`); as
 * instruções dirigidas a líderes ficam fora desta página.
 *
 * Nenhum texto aqui é escrito pelo app: títulos, parágrafos, itens e passos
 * vêm de `PROPOSITO`. A página só decide a forma.
 */

function Paragraph({ text }: { text: string }) {
  return <AppText variant="quote">{text}</AppText>;
}

function Bullet({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text, marginTop: 9 }}
      />
      <AppText variant="quote" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

/**
 * Passo do fluxo: círculo de `markSurface` com o numeral em `onMark` — tinta com
 * amarelo no tema claro, amarelo com tinta no escuro. Ver src/ui/theme.ts: fixar
 * o círculo em #111111 o faria sumir sobre a página escura.
 */
function Step({ number, title, description }: { number: number; title: string; description: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.markSurface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          accessibilityLabel={`Passo ${number}`}
          style={{ fontFamily: fonts.label, fontSize: 13, color: colors.onMark }}
        >
          {number}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="action">{title}</AppText>
        {description ? <AppText variant="quote">{description}</AppText> : null}
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

function SectionBlocks({ blocks }: { blocks: PropositoBlock[] }) {
  const steps = flowSteps();
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
          return <Step key={index} number={known?.step ?? ordinal} title={title} description={description} />;
        }
        return <Paragraph key={index} text={block.text} />;
      })}
    </>
  );
}

/**
 * Citação bíblica do material da igreja.
 *
 * É o único texto de tradução no aplicativo enquanto a licença não fechar, por
 * isso aparece identificado como citação e com a referência ao lado, em vez de
 * se misturar aos parágrafos. A tradução ainda não foi informada pela igreja.
 */
function Scripture({ quote, reference }: { quote: string; reference: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID="proposito-scripture"
      accessible
      accessibilityLabel={`Citação bíblica: ${quote} ${reference}`}
      style={{
        gap: spacing.xs,
        borderLeftWidth: 3,
        borderLeftColor: colors.border,
        paddingLeft: spacing.lg,
      }}
    >
      <AppText variant="readItalic">{quote}</AppText>
      <AppText variant="caption">{reference} · citação da orientação da igreja</AppText>
    </View>
  );
}

function Section({ section, index }: { section: PropositoSection; index: number }) {
  return (
    <View testID={`proposito-section-${index}`} style={{ gap: spacing.md }}>
      <Rule />
      <AppText variant="cap" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
        {section.heading}
      </AppText>
      <SectionBlocks blocks={section.blocks} />
    </View>
  );
}

export default function PropositoScreen() {
  const journey = useJourney();

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        <DevContentBanner state={journey.contentState} />

        <View style={{ gap: spacing.md }}>
          <Cap>Sobre o propósito</Cap>
          {/* Título da igreja, em caixa alta como no original; 24px para não pesar. */}
          <AppText
            variant="blockTitleLg"
            accessibilityRole="header"
            style={{ fontSize: 24, lineHeight: 28, letterSpacing: -0.4 }}
          >
            {PROPOSITO.subtitle}
          </AppText>
        </View>

        <View style={{ gap: spacing.md }}>
          {PROPOSITO.intro.map((paragraph, index) => (
            <Paragraph key={index} text={paragraph} />
          ))}
        </View>

        {publicSections().map((section, index) => (
          <Section key={section.heading} section={section} index={index} />
        ))}

        {/*
          A página mostra as seções públicas da orientação, não o documento
          inteiro: as instruções de organização dirigidas aos líderes ficam de
          fora. Dizer "reproduzido sem alterações" seria falso sobre o recorte,
          ainda que cada trecho exibido seja palavra por palavra.
        */}
        <AppText variant="caption">
          Orientação da igreja, palavra por palavra. Fica de fora só o passo a passo de preparação pedido a
          quem conduz o altar.
        </AppText>
      </ScreenScroll>
    </Screen>
  );
}
