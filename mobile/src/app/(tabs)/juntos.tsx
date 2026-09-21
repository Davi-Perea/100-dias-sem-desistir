import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CloudError } from '@/cloud/errors';
import { joinGroup, listActiveGroups } from '@/cloud/groups';
import type { Group } from '@/cloud/types';
import { useCloudSession } from '@/cloud/useSession';
import { getDay } from '@/journey/datasetSource';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney, type JourneySnapshot } from '@/journey/useJourney';
import {
  AppText,
  Block,
  Button,
  Cap,
  DevContentBanner,
  Rule,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { Icon } from '@/ui/icons';
import { SpherePill } from '@/ui/SpherePill';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

/**
 * Comunidade (aba). PROVISÓRIO até o grupo C (feed) existir: o feed, a
 * publicação, o Amém e os comentários (C1–C6) não têm servidor ainda. Até lá a
 * aba mostra o que o Juntos já mostrava e que não depende de servidor — o altar
 * das 12h30 e a orientação da igreja —, mais o estado de conta e de grupo, com
 * os componentes novos. Blocos sem fonte (recado fixado, insights, número da
 * igreja) saíram: mostrar lugar de dado que não existe não é estado honesto.
 */

/**
 * Altar das 12h30 do dia oficial: quem conduz e por qual monte a igreja
 * intercede. Nomes de pessoas só chegam aqui se `altarOfDay` os liberou
 * (autorização da igreja). Antes da campanha o bloco aponta para o Dia 1 sem
 * abrir leitura nenhuma: ministério e monte são dados da escala.
 */
function AltarToday({ journey }: { journey: JourneySnapshot }) {
  const beforeStart = journey.phase === 'before_start';
  const dayNumber = beforeStart ? 1 : journey.officialDay;
  const altar = altarOfDay(dayNumber);
  const sphere = getDay(dayNumber)?.sphere ?? null;
  const date = formatDayDate(dayNumber, journey.campaign);
  const leads =
    journey.phase === 'running'
      ? 'Hoje conduz'
      : journey.phase === 'finished'
        ? `Dia ${dayNumber} conduziu`
        : `Dia ${dayNumber} conduz`;

  return (
    <Block tone="warm" testID="altar-today">
      <View style={{ gap: spacing.md }}>
        <Cap>Altar das 12h30</Cap>
        {beforeStart ? <AppText variant="action">{`O altar começa em ${date}`}</AppText> : null}
        {altar ? (
          <AppText variant={beforeStart ? 'item' : 'action'}>
            {`${leads}: ${altar.ministry}${altar.leaders_label ? ` · ${altar.leaders_label}` : ''}`}
          </AppText>
        ) : (
          <AppText variant="bodySm">A escala deste dia ainda não foi informada.</AppText>
        )}
        {sphere ? <SpherePill sphere={sphere} /> : null}
        {beforeStart ? null : (
          <AppText variant="caption" accessibilityLabel={`Dia ${dayNumber}, ${date}`}>
            {`Dia ${dayNumber} · ${date}`}
          </AppText>
        )}
      </View>
    </Block>
  );
}

/** Linha de piso 56 com rótulo, legenda e chevron (padrão das linhas de D1). */
function LinkRow({
  label,
  caption,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  label: string;
  caption: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Rule />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed }) => [
          {
            minHeight: Math.max(56, MIN_TOUCH),
            paddingVertical: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="rowLabel">{label}</AppText>
          <AppText variant="caption">{caption}</AppText>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable>
      <Rule />
    </View>
  );
}

export default function CommunityScreen() {
  const { colors } = useTheme();
  const journey = useJourney();
  const session = useCloudSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!session.signedIn || session.membership) return;
    try {
      setGroups(await listActiveGroups());
      setError(null);
    } catch (err) {
      setGroups([]);
      setError(err instanceof CloudError ? err.message : 'Não foi possível carregar os grupos.');
    }
  }, [session.signedIn, session.membership]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups]),
  );

  if (session.loading) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  // O altar e a orientação da igreja valem para todo mundo, com ou sem conta.
  const header = (
    <>
      <View style={{ gap: 2 }}>
        <AppText variant="screenTitle" accessibilityRole="header">
          Comunidade
        </AppText>
        <AppText variant="caption" accessibilityLabel={`${journey.campaign.title}, Dia ${journey.officialDay}`}>
          {`${journey.campaign.title} · Dia ${journey.officialDay}`}
        </AppText>
      </View>
      {/* PROVISÓRIO (pergunta 5 ao designer): faixa de conteúdo não autorizado
          (invariante C-07), compacta, logo abaixo do cabeçalho. */}
      <DevContentBanner state={journey.contentState} compact />
      <AltarToday journey={journey} />
      <LinkRow
        label="Sobre o propósito"
        caption="Orientação da igreja para os 100 dias"
        onPress={() => router.push('/proposito')}
        accessibilityHint="Abre a orientação da igreja sobre os 100 dias"
        testID="open-proposito"
      />
    </>
  );

  // ------------------------------------------------------------- sem nuvem
  // PROVISÓRIO (decisão do engenheiro, 2026-09-21: guideline 2.1 da Apple): sem
  // nuvem (toda build de release, D-6) a tela mostra só o que funciona — o altar
  // e a orientação da igreja. Antes ela dizia "ainda não está ligada ao
  // servidor", e um recado de indisponível alcançável é motivo de rejeição.
  if (!session.configured) {
    return (
      <Screen>
        <ScreenScroll>{header}</ScreenScroll>
      </Screen>
    );
  }

  // ------------------------------------------------------------- sem conta
  if (!session.signedIn) {
    return (
      <Screen>
        <ScreenScroll>
          {header}
          <Block tone="warm">
            <View style={{ gap: spacing.md }}>
              <AppText variant="blockTitle" accessibilityRole="header">
                A parte coletiva pede uma conta
              </AppText>
              <AppText variant="bodySm">
                Sua leitura, seu progresso, seu jejum e suas reflexões continuam funcionando sem conta e ficam
                neste aparelho. A conta serve só para participar do grupo.
              </AppText>
              <Button title="Entrar com meu e-mail" onPress={() => router.push('/conta')} testID="join-cta" />
            </View>
          </Block>
        </ScreenScroll>
      </Screen>
    );
  }

  // ------------------------------------------------- com conta, sem grupo
  if (!session.membership) {
    return (
      <Screen>
        <ScreenScroll>
          {header}
          {error ? (
            <AppText variant="rowLabel" style={{ color: colors.danger }}>
              {error}
            </AppText>
          ) : null}
          <Cap>Escolha seu grupo</Cap>
          {groups === null ? (
            <StateView kind="loading" />
          ) : groups.length === 0 ? (
            <AppText variant="bodySm">Nenhum grupo disponível no momento.</AppText>
          ) : (
            groups.map((group) => (
              <Block key={group.id} tone="warm">
                <View style={{ gap: spacing.md }}>
                  <AppText variant="action">{group.name}</AppText>
                  {group.description ? <AppText variant="caption">{group.description}</AppText> : null}
                  <Button
                    title="Entrar neste grupo"
                    variant="outline"
                    loading={busy === group.id}
                    testID={`join-${group.id}`}
                    onPress={async () => {
                      setBusy(group.id);
                      try {
                        await joinGroup(group.id);
                        session.refresh();
                      } catch (err) {
                        setError(err instanceof CloudError ? err.message : 'Não foi possível entrar no grupo.');
                      } finally {
                        setBusy(null);
                      }
                    }}
                  />
                </View>
              </Block>
            ))
          )}
        </ScreenScroll>
      </Screen>
    );
  }

  // ------------------------------------------------------- com conta e grupo
  const group = session.membership.group;
  return (
    <Screen>
      <ScreenScroll>
        {header}
        <LinkRow
          label={group.name}
          caption={session.role === 'leader' || session.role === 'admin' ? 'Você lidera este grupo' : 'Seu grupo'}
          onPress={() => router.push({ pathname: '/grupo/[id]', params: { id: group.id } })}
          accessibilityLabel={`Abrir o grupo ${group.name}`}
          testID="group-row"
        />
      </ScreenScroll>
    </Screen>
  );
}
