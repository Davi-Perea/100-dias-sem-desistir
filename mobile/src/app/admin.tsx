import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { isCloudConfigured } from '@/cloud/config';
import { CloudError } from '@/cloud/errors';
import { adminSetGroupRole, listActiveGroups, listGroupMembers } from '@/cloud/groups';
import type { Group, GroupMembership, Profile } from '@/cloud/types';
import { useCloudSession } from '@/cloud/useSession';
import { AppText, Button, Card, Divider, Screen, ScreenScroll, StateView } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

type Row = GroupMembership & { profile?: Profile };

/**
 * Superfície administrativa MÍNIMA (spec §11): apenas o necessário para provar
 * atribuição de papel com auditoria. Não é um painel administrativo.
 *
 * A verificação real é do servidor: `admin_set_group_role` recusa quem não é
 * administrador. A checagem daqui só evita mostrar uma tela inútil.
 */
/**
 * AUDITORIA DE LANÇAMENTO WEB, 2026-09-23: na web, `/admin` era uma URL
 * digitável. Sem sessão de administrador ela já mostrava só "Área restrita", e
 * o servidor recusa qualquer ação de quem não é admin — então não havia poder
 * exposto. Ainda assim, numa V1 pública, uma tela chamada "Administração"
 * alcançável por qualquer pessoa é convite para ninguém.
 *
 * Sem nuvem configurada — que é toda build de release da V1 — esta tela não tem
 * como fazer nada. Então ela simplesmente não existe ali. Mesmo padrão de
 * `/dev` e `/componentes`. Nenhuma regra de permissão foi afrouxada: a guarda
 * do servidor continua sendo a que vale.
 */
export default function AdminRoute() {
  if (!isCloudConfigured()) return <Redirect href="/" />;
  return <AdminScreen />;
}

function AdminScreen() {
  const { colors } = useTheme();
  const session = useCloudSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [selected, setSelected] = useState<Group | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (session.role !== 'admin') return;
    try {
      setGroups(await listActiveGroups());
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Não foi possível carregar os grupos.');
    }
  }, [session.role]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups]),
  );

  const openGroup = async (group: Group) => {
    setSelected(group);
    setRows(null);
    try {
      setRows(await listGroupMembers(group.id));
      setError(null);
    } catch (err) {
      setRows([]);
      setError(err instanceof CloudError ? err.message : 'Não foi possível carregar os membros.');
    }
  };

  const changeRole = (row: Row, role: 'member' | 'leader') => {
    const name = row.profile?.display_name ?? 'este participante';
    const verb = role === 'leader' ? 'tornar líder' : 'remover a liderança de';
    Alert.alert('Confirmar', `Deseja ${verb} ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: role === 'leader' ? 'default' : 'destructive',
        onPress: async () => {
          setBusy(row.user_id);
          try {
            await adminSetGroupRole(row.user_id, row.group_id, role);
            if (selected) await openGroup(selected);
            session.refresh();
          } catch (err) {
            setError(err instanceof CloudError ? err.message : 'Não foi possível alterar o papel.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (session.loading) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (session.role !== 'admin') {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Administração' }} />
        <StateView
          kind="empty"
          title="Área restrita"
          message="Esta área é de administradores. O servidor recusa qualquer ação administrativa de quem não é."
          action={<Button title="Voltar" variant="underline" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Administração' }} />
      <ScreenScroll>
        {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

        {!selected ? (
          <>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="cap">Grupos</AppText>
              <AppText variant="secondary">Escolha um grupo para gerenciar a liderança.</AppText>
            </View>
            {(groups ?? []).map((group) => (
              <Card key={group.id} onPress={() => openGroup(group)} accessibilityLabel={`Gerenciar ${group.name}`}>
                <AppText variant="blockTitle">{group.name}</AppText>
                {group.description ? <AppText variant="muted">{group.description}</AppText> : null}
              </Card>
            ))}
          </>
        ) : (
          <>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="cap">{selected.name}</AppText>
              <AppText variant="secondary">Toda alteração de papel é registrada na auditoria.</AppText>
            </View>

            {rows === null ? (
              <Card tone="muted">
                <AppText variant="muted">Carregando membros…</AppText>
              </Card>
            ) : (
              <Card>
                <View style={{ gap: spacing.md }}>
                  {rows.map((row, index) => (
                    <View key={row.user_id} style={{ gap: spacing.sm }}>
                      {index > 0 ? <Divider /> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="rowLabel">
                            {row.profile?.display_name ?? 'Participante'}
                          </AppText>
                          <AppText variant="muted">{row.role === 'leader' ? 'Líder' : 'Membro'}</AppText>
                        </View>
                        <Button
                          title={row.role === 'leader' ? 'Remover liderança' : 'Tornar líder'}
                          variant={row.role === 'leader' ? 'underline' : 'outline'}
                          loading={busy === row.user_id}
                          onPress={() => changeRole(row, row.role === 'leader' ? 'member' : 'leader')}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            <Button title="Voltar aos grupos" variant="underline" onPress={() => setSelected(null)} />
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}
