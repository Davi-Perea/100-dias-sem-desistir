import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useCloudSession } from '@/cloud/useSession';
import { fastingKeptCount, useFasting } from '@/fasting/fastingStore';
import { altarOfDay } from '@/journey/ministries';
import { useJourney } from '@/journey/useJourney';
import { reflectionCount, useReflections } from '@/reflections/reflectionsStore';
import { syncAltarReminders } from '@/reminders/reminders';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { FlyingDove } from '@/ui/FlyingDove';
import {
  AppText,
  Avatar,
  Block,
  Button,
  Cap,
  Checkbox,
  Highlight,
  Rule,
  Screen,
  ScreenScroll,
  SettingRow,
  StateView,
} from '@/ui/components';
import { fonts, spacing, useTheme } from '@/ui/theme';

const READING_MODE_LABEL: Record<string, string> = {
  in_app: 'Aqui no app',
  own_bible: 'Minha Bíblia',
  both: 'Vou alternar',
};

const SLOT_LABEL: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  custom: 'Horário escolhido',
  none: 'Sem lembrete',
};

function Group({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {accent ? (
        <Cap>
          <Highlight>{title}</Highlight>
        </Cap>
      ) : (
        <Cap>{title}</Cap>
      )}
      <View>{children}</View>
    </View>
  );
}

/** Você (tela 08): progresso pessoal e as preferências, agrupadas por caps. */
export default function YouScreen() {
  const { colors } = useTheme();
  const journey = useJourney();
  const settings = useSettings();
  const session = useCloudSession();
  const reflections = useReflections(journey.campaign.id);
  const fasting = useFasting(journey.campaign.id);
  const [altarNotice, setAltarNotice] = useState<string | null>(null);

  if (!settings || !journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const email = session.session?.user?.email ?? null;
  const name = email ? email.split('@')[0] : null;
  const total = journey.campaign.total_days;
  const isLeader = session.role === 'leader' || session.role === 'admin';
  const reminder = settings.reminder;
  const reminderLabel =
    reminder.slot === 'none'
      ? SLOT_LABEL.none
      : `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;

  // Fora do período da campanha não existe "hoje" no altar: o dia oficial é
  // clampado para exibição, e mostrar o Dia 1 (ou o Dia 100) como hoje enganaria.
  const altarToday = journey.phase === 'running' ? (altarOfDay(journey.officialDay)?.ministry ?? null) : null;

  const toggleAltarReminder = async () => {
    if (settings.altarReminder) {
      setAltarNotice(null);
      await updateSettings((s) => ({ ...s, altarReminder: false }));
      return;
    }
    await updateSettings((s) => ({ ...s, altarReminder: true }));
    // Aqui existe o gesto: a pessoa acabou de marcar a caixa. É o único lugar
    // que pode abrir o diálogo de permissão do sistema.
    const result = await syncAltarReminders(true, journey.campaign, new Date(), { requestPermission: true });
    if (result.ok) {
      setAltarNotice(null);
      return;
    }
    // Web (sem notificações locais) e permissão negada chegam pelo mesmo caminho:
    // o motivo aparece como aviso, e a preferência volta a "desligado" porque
    // nada foi agendado. Deixar a caixa marcada seria prometer um aviso que não vem.
    setAltarNotice(result.reason);
    await updateSettings((s) => ({ ...s, altarReminder: false }));
  };

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        {/* ------------------------------------------------------- identidade */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          {name ? (
            <Avatar name={name} size={52} />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.surfaceMuted,
              }}
            />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: fonts.title, fontSize: 24, letterSpacing: -0.5, color: colors.text }}>
              {name ?? 'Sua jornada'}
            </AppText>
            <AppText variant="caption">
              {session.membership?.group.name
                ? `${session.membership.group.name}${isLeader ? ' · líder' : ''}`
                : 'Sem conta conectada'}
            </AppText>
          </View>
        </View>

        {/* ---------------------------------------------------- meu progresso */}
        <Block>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <AppText style={{ flex: 1, fontFamily: fonts.title, fontSize: 18, color: colors.text }}>
                Meu progresso
              </AppText>
              <AppText variant="caption">
                {journey.completedCount} de {total} dias
              </AppText>
            </View>
            <FlyingDove completed={journey.completedCount} totalDays={total} />
          </View>
        </Block>

        <Group title="Minha jornada">
          <SettingRow
            label="Minhas reflexões"
            value={String(reflectionCount(reflections))}
            onPress={() => router.push('/reflexoes')}
            first
            testID="row-reflections"
          />
          <SettingRow
            label="Meu jejum"
            value={
              settings.fastingEnabled
                ? `${fastingKeptCount(fasting)} ${fastingKeptCount(fasting) === 1 ? 'dia' : 'dias'}`
                : 'Desligado'
            }
            onPress={() => router.push('/jejum')}
            testID="row-fasting"
          />
        </Group>

        <Group title="Comunidade">
          <SettingRow
            label="Meu ministério"
            value={settings.ministry ?? 'Escolher'}
            onPress={() => router.push('/ministerio')}
            first
            testID="row-ministry"
          />
          <SettingRow
            label="Altar de hoje"
            value={altarToday ?? '—'}
            onPress={() => router.push('/(tabs)/juntos')}
            testID="row-altar-today"
          />
        </Group>

        <Group title="Preferências">
          <SettingRow
            label="Lembretes"
            value={reminderLabel}
            onPress={() => router.push('/lembrete')}
            first
            testID="row-reminder"
          />
          {/* Mesmo desenho da linha de jejum do Início: texto à esquerda, caixa à direita. */}
          <View>
            <Rule />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="item">Aviso do altar das 12h30</AppText>
                <AppText variant="caption">Um aviso local por dia com quem conduz o altar. Só neste aparelho.</AppText>
              </View>
              <Checkbox
                checked={settings.altarReminder}
                onToggle={toggleAltarReminder}
                label="Aviso do altar das 12h30"
                testID="altar-reminder-toggle"
              />
            </View>
            {altarNotice ? (
              <AppText
                variant="caption"
                accessibilityLiveRegion="polite"
                style={{ paddingBottom: spacing.sm }}
                testID="altar-reminder-notice"
              >
                {altarNotice}
              </AppText>
            ) : null}
          </View>
          <SettingRow
            label="Leitura"
            value={settings.readingMode ? READING_MODE_LABEL[settings.readingMode] : 'Não definido'}
            onPress={() => router.push('/aparencia')}
            testID="row-reading-mode"
          />
          <SettingRow
            label="Aparência e acessibilidade"
            onPress={() => router.push('/aparencia')}
            testID="row-appearance"
          />
        </Group>

        {isLeader ? (
          <Group title="Liderança" accent>
            <SettingRow
              label="Ferramentas de líder"
              value={session.membership?.group.name ?? undefined}
              onPress={() =>
                session.membership?.group.id
                  ? router.push({ pathname: '/grupo/[id]', params: { id: session.membership.group.id } })
                  : router.push('/(tabs)/juntos')
              }
              first
              testID="row-leader-tools"
            />
            {session.role === 'admin' ? (
              <SettingRow label="Administração" onPress={() => router.push('/admin')} testID="row-admin" />
            ) : null}
          </Group>
        ) : null}

        <Group title="Conta">
          <SettingRow
            label="Conta e privacidade"
            value={email ?? 'Sem conta'}
            onPress={() => router.push('/conta')}
            first
            testID="row-account"
          />
          <SettingRow label="Ajuda" onPress={() => router.push('/ajuda')} testID="row-help" />
        </Group>

        {__DEV__ ? (
          <Button title="Painel de desenvolvimento" variant="underline" onPress={() => router.push('/dev')} />
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
