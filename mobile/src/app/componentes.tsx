import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Block,
  Button,
  Cap,
  Checkbox,
  ChoiceRow,
  DevContentBanner,
  Highlight,
  JourneyNode,
  OfflineBanner,
  Rule,
  Screen,
  ScreenScroll,
  SettingRow,
  Sheet,
  StepBar,
  type TextVariant,
} from '@/ui/components';
import { HundredDayRuler } from '@/ui/HundredDayRuler';
import { Icon } from '@/ui/icons';
import { SpherePill } from '@/ui/SpherePill';
import { GlassTabBar } from '@/ui/TabBar';
import { BRAND_YELLOW, fixedPalette, spacing, useTheme } from '@/ui/theme';

/**
 * Catálogo dos componentes-base do redesenho, para a revisão da etapa 1.
 *
 * Só existe em build de desenvolvimento: em release a rota redireciona para a
 * casa. Não é tela do produto e não tem desenho — é uma bancada de revisão.
 */
const TYPE: { variant: TextVariant; sample: string }[] = [
  { variant: 'dayNumeral', sample: 'Dia 17' },
  { variant: 'display', sample: 'Sua foto' },
  { variant: 'displayXl', sample: '100 dias' },
  { variant: 'screenTitle', sample: 'Comunidade' },
  { variant: 'blockTitleLg', sample: 'O que ficou com você hoje?' },
  { variant: 'blockTitle', sample: 'Coração sábio para governar' },
  { variant: 'readingRef', sample: 'Josué 6–17' },
  { variant: 'action', sample: 'Concluir leitura' },
  { variant: 'item', sample: 'Minhas reflexões' },
  { variant: 'rowLabel', sample: 'Lembrete de leitura' },
  { variant: 'caption', sample: '12 capítulos · ~36 min' },
  { variant: 'captionStrong', sample: 'Em aberto' },
  { variant: 'cap', sample: 'Hoje · a igreja está aqui' },
  { variant: 'read', sample: 'Leitura bíblica em Source Serif, 19 sobre 32.' },
  { variant: 'body', sample: 'Você não é obrigado. Mas tem gente lendo o mesmo capítulo hoje.' },
  { variant: 'bodySm', sample: 'Três dias ficaram para trás e continuam abertos.' },
  { variant: 'quote', sample: 'Citação da orientação da igreja, identificada como citação.' },
  { variant: 'chapterNumeral', sample: '9' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Cap>{title}</Cap>
      {children}
    </View>
  );
}

export default function ComponentCatalog() {
  const { colors, isDark } = useTheme();
  const [checked, setChecked] = useState(false);
  const [choice, setChoice] = useState<'app' | 'biblia'>('app');
  const [sheet, setSheet] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (!__DEV__) return <Redirect href="/" />;

  const ink = fixedPalette('ink');
  const done = new Set(Array.from({ length: 14 }, (_, i) => i + 1));
  const routes = [
    { key: 'jornada', name: 'jornada' },
    { key: 'comunidade', name: 'comunidade' },
    { key: 'voce', name: 'voce' },
  ];

  return (
    <Screen>
      <ScreenScroll gap={spacing.xxl}>
        <View style={{ gap: spacing.sm }}>
          <Button title="Voltar" variant="underline" onPress={() => router.back()} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
          <AppText variant="screenTitle" accessibilityRole="header">
            Componentes — etapa 1
          </AppText>
          <AppText variant="caption">
            Tema {isDark ? 'escuro' : 'claro'} (segue o sistema). Valores de design_handoff_100_dias/TOKENS.md.
          </AppText>
        </View>

        <Section title="Tipografia">
          {TYPE.map(({ variant, sample }) => (
            <View key={variant} style={{ gap: 2 }}>
              <AppText variant="caption">{variant}</AppText>
              <AppText variant={variant}>{sample}</AppText>
            </View>
          ))}
          <AppText variant="blockTitle">
            Coração <Highlight>sábio</Highlight> para governar
          </AppText>
        </Section>

        <Section title="Botões — tema">
          <Button title="Ler agora" onPress={() => {}} />
          <Button title="Escrever para a igreja" variant="blue" onPress={() => {}} />
          <Button title="Guardar só para mim" variant="outline" onPress={() => {}} />
          <Button title="Entendi, quero publicar" variant="yellow" onPress={() => {}} />
          <Button title="Vou ler na minha Bíblia" variant="underline" onPress={() => {}} />
          <Button title="Excluir" variant="danger" onPress={() => {}} />
          <Button title="Desabilitado (opacidade 0,45)" onPress={() => {}} disabled />
          <Button title="Carregando" onPress={() => {}} loading />
        </Section>

        <Section title="Superfícies fixas — não mudam com o tema">
          <Block tone="ink" style={{ gap: spacing.md }}>
            <AppText variant="blockTitle" style={{ color: ink.text }}>
              Tinta (C4, E2, E4)
            </AppText>
            <AppText variant="body" style={{ color: ink.textSecondary }}>
              Apocalipse 21:5 — secundário fixo, 10,84:1.
            </AppText>
            <Button title="Guardar minha jornada" variant="yellow" tone="ink" onPress={() => {}} />
            <Button title="Guardar só para mim" variant="underline" tone="ink" onPress={() => {}} />
            <SpherePill sphere="governo" tone="onInk" />
          </Block>
          <View style={{ backgroundColor: BRAND_YELLOW, borderRadius: 22, padding: spacing.lg, gap: spacing.md }}>
            <AppText variant="blockTitle" style={{ color: '#111111' }}>
              Amarelo (F1, E3)
            </AppText>
            <AppText variant="body" style={{ color: '#3F3D38' }}>
              Vinte e cinco dias de Palavra. Você não desistiu.
            </AppText>
            <Button title="Continuar a jornada" tone="yellow" onPress={() => {}} />
            <Button title="Guardar este marco" variant="underline" tone="yellow" onPress={() => {}} />
            <HundredDayRuler totalDays={100} officialDay={0} completed={done} variant="onYellow" width={280} />
          </View>
        </Section>

        <Section title="Blocos">
          <Block tone="warm">
            <AppText variant="rowLabel">Bloco quente (surfaceWarm)</AppText>
          </Block>
          <Block>
            <AppText variant="rowLabel">Bloco (surface)</AppText>
          </Block>
          <Block tone="blueSoft">
            <AppText variant="rowLabel" style={{ color: colors.onBlueSoft }}>
              Você tem 3 dias em aberto.
            </AppText>
          </Block>
        </Section>

        <Section title="Linhas de lista">
          <View>
            <SettingRow label="Minhas reflexões" value="9" onPress={() => {}} first />
            <SettingRow label="Meu jejum" value="11 dias" onPress={() => {}} />
            <SettingRow label="Lembrete de leitura" value="07:00" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Pílula do monte · caixa · opção · segmentos">
          <SpherePill sphere="governo" />
          <SpherePill sphere="artes_entretenimento" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Checkbox checked={checked} onToggle={() => setChecked((v) => !v)} label="Cumpri meu jejum hoje" />
            <AppText variant="rowLabel">Cumpri meu jejum hoje</AppText>
          </View>
          <ChoiceRow label="Ler aqui no app" selected={choice === 'app'} onPress={() => setChoice('app')} />
          <ChoiceRow label="Usar a minha Bíblia" selected={choice === 'biblia'} onPress={() => setChoice('biblia')} />
          <StepBar step={1} total={5} />
        </Section>

        <Section title="Nó da jornada — quatro formas">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
            {(['done', 'open', 'today', 'future'] as const).map((state) => (
              <View key={state} style={{ alignItems: 'center', gap: spacing.sm, minWidth: 48 }}>
                <View style={{ height: 24, justifyContent: 'center' }}>
                  <JourneyNode state={state} />
                </View>
                <AppText variant="caption">{{ done: 'lido', open: 'em aberto', today: 'hoje', future: 'futuro' }[state]}</AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Régua dos cem dias">
          <HundredDayRuler totalDays={100} officialDay={17} completed={[...done].filter((d) => d !== 16)} />
          <AppText variant="caption">Padrão: 14 lidos, o dia 16 em aberto, hoje é 17.</AppText>
          <HundredDayRuler totalDays={100} officialDay={0} completed={[]} variant="inactive" />
          <AppText variant="caption">Antes da campanha: nenhum traço amarelo.</AppText>
        </Section>

        <Section title="Faixas">
          <OfflineBanner />
          {/* Só o estado `fixture` desenha: `pending` saiu das telas em 2026-09-22
              (virou uma linha em Ajustes) e `authorized` nunca desenhou. */}
          <DevContentBanner state="fixture" />
          <DevContentBanner state="fixture" compact />
        </Section>

        <Section title="Ícones da barra">
          <View style={{ flexDirection: 'row', gap: spacing.xl }}>
            {(['journey', 'community', 'you'] as const).map((name) => (
              <Icon key={name} name={name} size={26} color={colors.text} cutout={colors.background} />
            ))}
          </View>
        </Section>

        <Section title="Folha modal">
          <Button title="Abrir a folha de cadeado" variant="outline" onPress={() => setSheet(true)} />
        </Section>

        <Section title="Barra de navegação flutuante">
          <View style={{ height: 130, borderRadius: 22, backgroundColor: colors.surfaceWarm, overflow: 'hidden' }}>
            <GlassTabBar
              state={{ index: activeTab, routes }}
              descriptors={{
                jornada: { options: { title: 'Jornada' } },
                comunidade: { options: { title: 'Comunidade' } },
                voce: { options: { title: 'Você' } },
              }}
              navigation={{
                emit: () => ({ defaultPrevented: false }),
                navigate: (name) => setActiveTab(routes.findIndex((route) => route.name === name)),
              }}
            />
          </View>
        </Section>

        <Rule />
      </ScreenScroll>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Abre em 18/10/2026.">
        <AppText variant="body">
          A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.
        </AppText>
        <Button title="Voltar para a Jornada" onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}
