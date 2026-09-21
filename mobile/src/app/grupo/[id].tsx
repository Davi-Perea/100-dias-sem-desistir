import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CloudError } from '@/cloud/errors';
import { listGroupMembers, removeGroupMember } from '@/cloud/groups';
import type { GroupMembership, Profile } from '@/cloud/types';
import { useCloudSession } from '@/cloud/useSession';
import { collectiveNotice, getGroupProgress } from '@/community/communityState';
import { useJourney } from '@/journey/useJourney';
import { BarButton, TopBar } from '@/ui/Lockup';
import {
  AppText,
  Avatar,
  Button,
  Cap,
  Pill,
  ProgressBar,
  Rule,
  Screen,
  ScreenScroll,
  Sheet,
  StateView,
} from '@/ui/components';
import { Icon } from '@/ui/icons';
import { BRAND_YELLOW, MIN_TOUCH, fonts, spacing, useTheme } from '@/ui/theme';

type Row = GroupMembership & { profile?: Profile };
type Tab = 'direcao' | 'insights' | 'membros';

const TAB_LABEL: Record<Tab, string> = {
  direcao: 'Direção',
  insights: 'Insights',
  membros: 'Membros',
};

/**
 * Grupo (tela 07) com a folha de ferramentas de líder.
 *
 * A lista de membros é real e vem da RLS: líder do grupo e admin recebem todas
 * as linhas; membro comum recebe SÓ A PRÓPRIA (não zero). Por isso a contagem e a
 * lista só aparecem para quem modera ESTE grupo (SEC-12); para os demais o
 * tamanho da lista não diz nada sobre o grupo. Esconder o botão não seria
 * segurança — a interface só evita mostrar algo inútil, quem recusa é o banco.
 *
 * As ferramentas de publicação (aviso, direção do dia, lembrete ao grupo,
 * moderação) ainda não existem: foram deixadas fora de escopo. Elas aparecem na
 * folha como o handoff desenhou, porém desativadas e com o motivo à vista.
 */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const session = useCloudSession();
  const journey = useJourney();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<Tab>('direcao');
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session.signedIn || !id) return;
    try {
      setRows(await listGroupMembers(id));
      setError(null);
    } catch (err) {
      setRows([]);
      setError(err instanceof CloudError ? err.message : 'Não foi possível carregar os membros.');
    }
  }, [id, session.signedIn]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (session.loading) {
    return (
      <Screen tone="warm">
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (!session.signedIn) {
    return (
      <Screen tone="warm">
        <TopBar />
        <StateView
          kind="empty"
          title="Conta necessária"
          message="Entre na sua conta para ver esta página."
          action={<Button title="Voltar" variant="outline" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  // SEC-12: a moderação vale para o grupo DA ROTA. session.role é global (admin,
  // ou o papel da membership principal); liderar o grupo A não dá ferramenta no B.
  const membershipHere = session.membership?.group.id === id ? session.membership : null;
  const canModerate = session.role === 'admin' || membershipHere?.role === 'leader';
  const leadsHere = membershipHere?.role === 'leader';
  const myUserId = session.session?.user?.id ?? null;
  const group = membershipHere?.group;
  const progress = getGroupProgress(id ?? '');
  // Contagem só para quem recebe a lista inteira; para membro comum a RLS entrega uma linha.
  const memberCount = canModerate ? rows?.length ?? null : null;

  return (
    <Screen tone="warm">
      <ScreenScroll gap={spacing.lg}>
        <TopBar
          right={
            canModerate ? (
              <BarButton icon="more" label="Ferramentas de líder" onPress={() => setSheet(true)} testID="leader-tools" />
            ) : undefined
          }
        />

        {canModerate ? (
          <Button
            title="Ferramentas de líder"
            variant="outline"
            onPress={() => setSheet(true)}
            testID="leader-tools-button"
          />
        ) : null}

        {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="screenTitle">{group?.name ?? 'Meu grupo'}</AppText>
          <AppText variant="caption">
            {[
              memberCount !== null ? `${memberCount} ${memberCount === 1 ? 'membro' : 'membros'}` : null,
              leadsHere ? 'você lidera este grupo' : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Grupo da jornada'}
          </AppText>
        </View>

        {/* Progresso do grupo: mesma faixa do handoff, sem número inventado. */}
        <View style={{ gap: spacing.sm }}>
          {progress.status === 'available' ? (
            <>
              <ProgressBar
                value={progress.data.ratio}
                height={8}
                label={`${progress.data.readersToday} de ${progress.data.total} leram hoje`}
              />
              <AppText variant="caption">
                {progress.data.readersToday} de {progress.data.total} hoje
              </AppText>
            </>
          ) : (
            <AppText variant="caption">{collectiveNotice(progress)}</AppText>
          )}
        </View>

        {/* --------------------------------------------------------- abas */}
        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          {(Object.keys(TAB_LABEL) as Tab[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              testID={`group-tab-${key}`}
              style={({ pressed }) => [{ minHeight: MIN_TOUCH, justifyContent: 'center' }, pressed && { opacity: 0.72 }]}
            >
              <AppText
                style={{
                  fontFamily: tab === key ? fonts.label : fonts.item,
                  fontSize: 15.5,
                  color: tab === key ? colors.text : colors.textMuted,
                }}
              >
                {TAB_LABEL[key]}
              </AppText>
              <View
                style={{
                  height: 3,
                  marginTop: 6,
                  borderRadius: 2,
                  backgroundColor: tab === key ? BRAND_YELLOW : 'transparent',
                }}
              />
            </Pressable>
          ))}
        </View>

        {tab === 'direcao' ? (
          <View style={{ gap: spacing.md }}>
            <Cap>Direção de hoje · Dia {journey.officialDay}</Cap>
            <AppText variant="quote">
              A direção do dia ainda não está disponível nesta versão. Quando a liderança publicar, ela aparece
              aqui.
            </AppText>
          </View>
        ) : null}

        {tab === 'insights' ? (
          <View style={{ gap: spacing.md }}>
            <Cap>Insights do grupo</Cap>
            <AppText variant="secondary">
              Os insights ainda não estão disponíveis nesta versão. Sua reflexão continua privada de qualquer
              forma.
            </AppText>
          </View>
        ) : null}

        {tab === 'membros' ? (
          <View style={{ gap: spacing.sm }}>
            {!canModerate ? (
              <AppText variant="secondary">
                Você só vê a lista de membros dos grupos que lidera. Esta restrição é aplicada pelo servidor.
              </AppText>
            ) : rows === null ? (
              <StateView kind="loading" />
            ) : rows.length === 0 ? (
              // PROVISÓRIO (decisão do engenheiro, 2026-09-21: SEC-12 — quem modera e recebe zero linhas está num grupo vazio ou viu um erro, já mostrado acima)
              error ? null : <AppText variant="secondary">Nenhum membro ativo neste grupo agora.</AppText>
            ) : (
              rows.map((row, index) => (
                <View key={row.user_id}>
                  {index > 0 ? <Rule /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      minHeight: MIN_TOUCH,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <Avatar name={row.profile?.display_name ?? 'Participante'} size={36} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="item">{row.profile?.display_name ?? 'Participante'}</AppText>
                      <AppText variant="caption">{row.role === 'leader' ? 'Líder' : 'Membro'}</AppText>
                    </View>
                    {canModerate && row.role !== 'leader' && row.user_id !== myUserId ? (
                      <Button
                        title="Remover"
                        variant="underline"
                        loading={busy === row.user_id}
                        testID={`remove-${row.user_id}`}
                        onPress={async () => {
                          setBusy(row.user_id);
                          try {
                            await removeGroupMember(row.user_id, row.group_id);
                            await load();
                          } catch (err) {
                            setError(err instanceof CloudError ? err.message : 'Não foi possível remover.');
                          } finally {
                            setBusy(null);
                          }
                        }}
                      />
                    ) : null}
                  </View>
                </View>
              ))
            )}
            <AppText variant="caption">
              Promover alguém a líder é ação administrativa: passa por uma função protegida no servidor e fica
              registrada em auditoria. Nem líder nem membro conseguem alterar papéis.
            </AppText>
          </View>
        ) : null}
      </ScreenScroll>

      {/* --------------------------------------------------- folha de líder */}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Ferramentas de líder" testID="leader-sheet">
        <AppText variant="secondary">
          Só você e os outros líderes de {group?.name ?? 'seu grupo'} veem isto.
        </AppText>
        <AppText variant="caption">
          Estas ferramentas ainda não foram construídas. Elas aparecem aqui para você saber o que vem, e ficam
          desativadas até existirem de verdade.
        </AppText>

        <View>
          {[
            { label: 'Publicar aviso', value: null, pill: null },
            { label: 'Publicar direção do dia', value: `Dia ${journey.officialDay + 1}`, pill: null },
            { label: 'Enviar lembrete ao grupo', value: 'no máximo 2 por semana', pill: null },
            { label: 'Moderar insights', value: null, pill: 'em breve' },
          ].map((tool, index) => (
            <View key={tool.label}>
              {index > 0 ? <Rule /> : null}
              <View
                style={{
                  minHeight: 58,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  opacity: 0.5,
                }}
                accessible
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                accessibilityLabel={`${tool.label}. Indisponível nesta versão.`}
              >
                <AppText variant="item" style={{ flex: 1 }}>
                  {tool.label}
                </AppText>
                {tool.value ? <AppText variant="caption">{tool.value}</AppText> : null}
                {tool.pill ? <Pill label={tool.pill} /> : null}
                <Icon name="chevron-right" size={18} color={colors.textMuted} />
              </View>
            </View>
          ))}
        </View>

        <Button title="Fechar" variant="outline" onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}
