import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CloudError } from '@/cloud/errors';
import { joinGroup, listActiveGroups } from '@/cloud/groups';
import type { Group } from '@/cloud/types';
import { useCloudSession } from '@/cloud/useSession';
import { collectiveNotice, getChurchProgress } from '@/community/communityState';
import { getDay } from '@/journey/datasetSource';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney, type JourneySnapshot } from '@/journey/useJourney';
import { Dove } from '@/ui/brand';
import {
  AppText,
  Block,
  Button,
  Cap,
  DevContentBanner,
  ProgressBar,
  Rule,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { Icon } from '@/ui/icons';
import { SpherePill } from '@/ui/SpherePill';
import { BRAND_YELLOW, MIN_TOUCH, fonts, spacing, useTheme } from '@/ui/theme';

/**
 * Altar das 12h30 do dia oficial: quem conduz e por qual monte a igreja intercede.
 *
 * O nome do ministério vem da escala; nomes de pessoas só chegam aqui se
 * `altarOfDay` os liberou (autorização da igreja). Antes da campanha o bloco
 * aponta para o Dia 1 sem abrir leitura nenhuma: ministério e monte são dados
 * da escala, não conteúdo do dia.
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
    <View testID="altar-today">
      <Block>
        <View style={{ gap: spacing.md }}>
          <Cap>Altar das 12h30</Cap>
          {beforeStart ? <AppText variant="action">O altar começa em {date}</AppText> : null}
          {altar ? (
            <AppText variant={beforeStart ? 'item' : 'action'}>
              {`${leads}: ${altar.ministry}${altar.leaders_label ? ` · ${altar.leaders_label}` : ''}`}
            </AppText>
          ) : (
            <AppText variant="secondary">A escala deste dia ainda não foi informada.</AppText>
          )}
          {sphere ? <SpherePill sphere={sphere} /> : null}
          {beforeStart ? null : <AppText variant="caption">{`Dia ${dayNumber} · ${date}`}</AppText>}
        </View>
      </Block>
    </View>
  );
}

/** Linha para a orientação da igreja, no mesmo padrão da linha do grupo. */
function PropositoRow() {
  const { colors } = useTheme();
  return (
    <View>
      <Rule />
      <Pressable
        onPress={() => router.push('/proposito')}
        accessibilityRole="button"
        accessibilityLabel="Sobre o propósito"
        accessibilityHint="Abre a orientação da igreja sobre os 100 dias"
        testID="open-proposito"
        style={({ pressed }) => [
          {
            minHeight: Math.max(56, MIN_TOUCH),
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="item">Sobre o propósito</AppText>
          <AppText variant="caption">Orientação da igreja para os 100 dias</AppText>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable>
      <Rule />
    </View>
  );
}

/**
 * Juntos (tela 06).
 *
 * O handoff mostra números concretos da igreja, um recado fixado da liderança e
 * insights com reação "Amém". Nada disso tem fonte ainda: a Execution 02
 * construiu identidade, grupos e papéis, e deixou feed, insights e progresso
 * coletivo explicitamente fora de escopo.
 *
 * A estrutura da tela é a do handoff. O que muda é que cada bloco sem fonte diz
 * que o dado ainda não está disponível, em vez de exibir o número do protótipo.
 * Mostrar "1.812 pessoas já leram hoje" sem ter contado ninguém seria inventar.
 */
export default function TogetherScreen() {
  const { colors } = useTheme();
  const journey = useJourney();
  const session = useCloudSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const church = getChurchProgress();

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
      <Screen tone="warm">
        <StateView kind="loading" />
      </Screen>
    );
  }

  // O altar das 12h30 e a orientação da igreja valem para todo mundo, com ou
  // sem conta: são a parte coletiva que não depende de servidor.
  const header = (
    <>
      <View style={{ gap: 2 }}>
        <AppText variant="screenTitle">Juntos</AppText>
        <AppText variant="caption">
          {journey.campaign.title} · Dia {journey.officialDay}
        </AppText>
      </View>
      <DevContentBanner state={journey.contentState} compact />
      <AltarToday journey={journey} />
      <PropositoRow />
    </>
  );

  // ------------------------------------------------- sem conta / sem nuvem
  if (!session.configured || !session.signedIn) {
    return (
      <Screen tone="warm">
        <ScreenScroll>
          {header}
          <Block>
            <View style={{ gap: spacing.md }}>
              <AppText variant="blockTitle" style={{ fontSize: 24, lineHeight: 28 }}>
                A parte coletiva pede uma conta
              </AppText>
              <AppText variant="secondary">
                Sua leitura, seu progresso, seu jejum e suas reflexões continuam funcionando sem conta e ficam
                neste aparelho. A conta serve só para participar do grupo.
              </AppText>
              {session.configured ? (
                <Button title="Entrar com meu e-mail" onPress={() => router.push('/conta')} testID="join-cta" />
              ) : (
                <AppText variant="caption">
                  Esta versão do aplicativo ainda não está ligada ao servidor da igreja.
                </AppText>
              )}
            </View>
          </Block>
        </ScreenScroll>
      </Screen>
    );
  }

  // ------------------------------------------------- com conta, sem grupo
  if (!session.membership) {
    return (
      <Screen tone="warm">
        <ScreenScroll>
          {header}
          {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}
          <Cap>Escolha seu grupo</Cap>
          {groups === null ? (
            <StateView kind="loading" />
          ) : groups.length === 0 ? (
            <AppText variant="secondary">Nenhum grupo disponível no momento.</AppText>
          ) : (
            groups.map((group) => (
              <Block key={group.id}>
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
    <Screen tone="warm">
      <ScreenScroll gap={spacing.xl}>
        {header}

        {/* --------------------------------------------- número coletivo */}
        <View style={{ gap: spacing.sm }} testID="church-collective">
          {church.status === 'available' ? (
            <>
              <AppText style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 52, color: colors.text }}>
                {church.data.readersToday.toLocaleString('pt-BR')}
              </AppText>
              <AppText variant="secondary">pessoas já leram hoje</AppText>
              <ProgressBar
                value={church.data.ratio}
                label={`${Math.round(church.data.ratio * 100)}% da igreja já leu hoje`}
              />
              <AppText variant="caption">{Math.round(church.data.ratio * 100)}% da igreja</AppText>
            </>
          ) : (
            <>
              <AppText variant="blockTitle" style={{ fontSize: 24, lineHeight: 28 }}>
                Progresso da igreja
              </AppText>
              <AppText variant="secondary">{collectiveNotice(church)}</AppText>
            </>
          )}
        </View>

        {/* ------------------------------------------------ recado fixado */}
        <Block tone="ink" testID="pinned-message">
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Dove width={22} tone="white" role="signature" />
              <AppText variant="cap" style={{ color: BRAND_YELLOW }}>
                Recado da liderança
              </AppText>
            </View>
            <AppText style={{ fontFamily: fonts.read, fontSize: 17, lineHeight: 25.5, color: '#FFFFFF' }}>
              Ainda não há recado publicado. Quando a liderança do seu grupo publicar, ele aparece aqui.
            </AppText>
          </View>
        </Block>

        {/* -------------------------------------------------- linha do grupo */}
        <View>
          <Rule />
          <Pressable
            onPress={() => router.push({ pathname: '/grupo/[id]', params: { id: group.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Abrir o grupo ${group.name}`}
            testID="group-row"
            style={({ pressed }) => [
              {
                minHeight: Math.max(56, MIN_TOUCH),
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              },
              pressed && { opacity: 0.72 },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="item">{group.name}</AppText>
              <AppText variant="caption">
                {session.role === 'leader' || session.role === 'admin' ? 'Você lidera este grupo' : 'Seu grupo'}
              </AppText>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
          <Rule />
        </View>

        {/* ----------------------------------------------------- insights */}
        <View style={{ gap: spacing.md }} testID="insights-section">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Cap style={{ flex: 1 }}>Insights de hoje</Cap>
          </View>
          <AppText variant="secondary">
            Os insights da igreja ainda não estão disponíveis nesta versão. Sua reflexão continua privada de
            qualquer forma.
          </AppText>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
