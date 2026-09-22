import { router } from 'expo-router';

import { SUPPORT_EMAIL } from '@/config/contato';
import { fastingKeptCount, type FastingLog } from '@/fasting/fastingStore';
import { reflectionCount, type Reflections } from '@/reflections/reflectionsStore';
import type { Settings } from '@/settings/settingsStore';

import { SettingRow } from '../components';
import { RowGroup } from './SubScreen';

const READING_MODE_LABEL: Record<string, string> = {
  in_app: 'No app',
  own_bible: 'Minha Bíblia',
  both: 'Vou alternar',
};

export function reminderLabel(settings: Settings): string {
  const reminder = settings.reminder;
  return reminder.slot === 'none'
    ? 'Desligado'
    : `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;
}

/**
 * F7 · A lista que era a aba Você e agora mora atrás da engrenagem (/ajustes).
 * As mesmas linhas, na mesma ordem, com os mesmos números reais e locais
 * (reflexões, jejum, metas). Nada daqui vai ao servidor.
 */
export function SettingsList({
  settings,
  reflections,
  fasting,
}: {
  settings: Settings;
  reflections: Reflections | null;
  fasting: FastingLog | null;
}) {
  const kept = fastingKeptCount(fasting);
  const goalCount = settings.profile.goals.length;

  return (
    <>
      <RowGroup title="Minha jornada">
        <SettingRow
          label="Minhas reflexões"
          value={String(reflectionCount(reflections))}
          onPress={() => router.push('/reflexoes')}
          first
          testID="row-reflections"
        />
        {/* B2: marca-texto e anotações ficam só no aparelho. */}
        <SettingRow label="Minhas anotações" onPress={() => router.push('/anotacoes')} testID="row-notes" />
        <SettingRow
          label="Minhas metas"
          value={goalCount === 0 ? 'Escolher' : `${goalCount} ${goalCount === 1 ? 'meta' : 'metas'}`}
          onPress={() => router.push('/metas')}
          testID="row-goals"
        />
        <SettingRow
          label="Meu ministério"
          value={settings.ministry ?? 'Escolher'}
          onPress={() => router.push('/ministerio')}
          testID="row-ministry"
        />
        {/* REGRAS §5 item 4: o jejum foi desenhado para sair sem refazer a tela. */}
        <SettingRow
          label="Meu jejum"
          value={settings.fastingEnabled ? `${kept} ${kept === 1 ? 'dia' : 'dias'}` : 'Desligado'}
          onPress={() => router.push('/jejum')}
          testID="row-fasting"
        />
      </RowGroup>

      <RowGroup title="Preferências">
        <SettingRow
          label="Lembretes"
          value={reminderLabel(settings)}
          onPress={() => router.push('/lembrete')}
          first
          testID="row-reminder"
        />
        {/* Tamanho da letra e modo de leitura moram na mesma tela. */}
        <SettingRow
          label="Leitura"
          value={settings.readingMode ? READING_MODE_LABEL[settings.readingMode] : undefined}
          // Abre com "Como eu leio" em primeiro (o valor da linha) e o tamanho logo abaixo.
          onPress={() => router.push({ pathname: '/aparencia', params: { secao: 'leitura' } })}
          testID="row-reading"
        />
      </RowGroup>

      <RowGroup title="Sobre">
        <SettingRow label="Sobre os 100 dias" onPress={() => router.push('/proposito')} first testID="row-proposito" />
        <SettingRow label="Privacidade" onPress={() => router.push('/privacidade')} testID="row-privacy" />
        <SettingRow
          // Espaço em branco conta como ausente (regra em config/contato.ts):
          // um e-mail só com espaços prometeria contato e abriria uma tela sem ele.
          label={SUPPORT_EMAIL?.trim() ? 'Ajuda e contato' : 'Ajuda'}
          onPress={() => router.push('/ajuda')}
          testID="row-help"
        />
      </RowGroup>
    </>
  );
}
