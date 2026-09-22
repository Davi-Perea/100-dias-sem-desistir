import { router, type Href } from 'expo-router';

import { useJourney } from '@/journey/useJourney';
import { useMarks } from '@/marks/marksStore';
import { completedDayNumbers } from '@/progress/completionsStore';
import { useSettings } from '@/settings/settingsStore';
import { Screen, ScreenScroll, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { CompleteProfile, profileSteps, type ProfileStepId } from '@/ui/voce/CompleteProfile';
import { ProfileExtras } from '@/ui/voce/ProfileExtras';
import { ProfileHeader } from '@/ui/voce/ProfileHeader';
import { ProgressBlock } from '@/ui/voce/ProgressBlock';

// Rotas novas (F7): os tipos do expo-router só as conhecem depois de o servidor
// de desenvolvimento regerar .expo/types; até lá, o cast mantém o tsc limpo.
const SETTINGS = '/ajustes' as Href;
const EDIT_PROFILE = '/perfil-editar' as Href;
const EDIT_NAME = '/perfil-editar?secao=nome' as Href;

/**
 * F7 · Você como perfil (decisão do fundador, 2026-09-22; referência só de
 * ESTRUTURA de um app social de treino — cores, fontes e ícones são os nossos).
 *
 * - topo: contador de DIAS LIDOS (nunca zera, nunca "perdeu") e a engrenagem,
 *   que abre /ajustes com a lista que antes morava aqui;
 * - nome (ou "Você"), avatar com iniciais e "Editar perfil" (/perfil-editar);
 * - <ProfileExtras/>: vazio no main; o branch da Comunidade pluga ali foto,
 *   bio e "Minhas publicações";
 * - "Complete seu perfil N/6": carrossel que substituiu o "Comece por aqui";
 * - MEU PROGRESSO, a régua dos dias realmente lidos.
 *
 * Tudo é local (settings.profile, dias lidos, marcas). Nada daqui vai ao servidor.
 */
export default function YouScreen() {
  const journey = useJourney();
  const settings = useSettings();
  const marks = useMarks();

  if (!settings || !journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const readDays = completedDayNumbers(journey.completions);
  const total = journey.campaign.total_days;
  // Todos os dias estão abertos; "Ler um dia" leva ao de hoje, ou ao 1 fora da campanha.
  const readingDay = journey.phase === 'running' ? Math.min(Math.max(journey.officialDay, 1), total) : 1;

  const openStep: Record<ProfileStepId, () => void> = {
    name: () => router.push(EDIT_NAME),
    goals: () => router.push(EDIT_PROFILE),
    reminder: () => router.push('/lembrete'),
    firstReading: () => router.push({ pathname: '/dia/[day]', params: { day: String(readingDay) } }),
    firstNote: () => router.push('/biblia'),
    ministry: () => router.push('/ministerio'),
  };

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        <ProfileHeader
          name={settings.profile.name ?? 'Você'}
          ministry={settings.ministry ?? null}
          readCount={readDays.length}
          onOpenSettings={() => router.push(SETTINGS)}
          onEditProfile={() => router.push(EDIT_PROFILE)}
        />

        <ProfileExtras />

        <CompleteProfile
          steps={profileSteps({ settings, readCount: readDays.length, marks })}
          onOpen={(step) => openStep[step]()}
        />

        <ProgressBlock
          completedDays={readDays}
          totalDays={total}
          officialDay={journey.officialDay}
          phase={journey.phase}
        />
      </ScreenScroll>
    </Screen>
  );
}
