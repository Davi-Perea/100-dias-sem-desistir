import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Image, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { CommunityError } from '@/community/errors';
import type { ReportReason } from '@/community/types';
import { REPORT_REASONS } from '@/community/types';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, Pill, Screen, ScreenScroll, Sheet, StateView } from '@/ui/components';
import { EmptyState, ErrorState } from '@/ui/entrada/States';
import { Icon } from '@/ui/icons';
import { TextField } from '@/ui/TextField';
import { radius, spacing, useGutter, useTheme } from '@/ui/theme';

import type { HistoryEntry, ModerationApi, OpenReport, QueueItem, SuspendTarget } from './moderacaoApi';
import { NOTE_MAX } from './moderacaoApi';
import { canModerate } from './acesso';
import { HOLD_LABEL, KIND_LABEL, REASON_GUIDANCE, REASON_LABEL, dueLabel, timeAgo } from './rotulos';

/**
 * Fila de moderação dentro do app (Comunidade V2). Só quem tem papel de
 * moderador no servidor chega aqui: o papel vem de `my_community_status`
 * (`is_moderator`), e a conta do moderador suspensa ou removida perde o acesso
 * (`canModerate`); sem ele a tela chama `onNotModerator` (a rota redireciona).
 * A checagem daqui só evita mostrar uma tela inútil: toda RPC de moderação
 * recusa quem não modera e grava a decisão em `community_moderation_actions`.
 *
 * Três abas: o que está em análise (fotos, que sempre passam por uma pessoa, e
 * textos que o filtro segurou), as denúncias abertas (urgentes primeiro: criança
 * exposta e rosto de terceiro) e o histórico. A fila tem fim, como o feed.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21): o desenho (TELAS.md) não tem
 * tela de moderação; ela usa os componentes e tokens existentes, sem cor nova.
 */

type Tab = 'analise' | 'denuncias' | 'historico';
type SheetMode = 'reject' | 'remove' | 'suspend';
type SheetState = {
  mode: SheetMode;
  item?: QueueItem;
  report?: OpenReport;
  /** Motivo pré-selecionado (o da denúncia, quando houver). */
  initialReason: ReportReason | null;
};

type Community = Pick<CommunityApi, 'getStatus' | 'signPhotoUrls'>;

export type ModerationQueueScreenProps = {
  community: Community;
  moderation: ModerationApi;
  /** Sem papel de moderador: a rota redireciona. */
  onNotModerator: () => void;
  /** Relógio injetável nos testes. */
  now?: () => number;
};

function messageOf(error: unknown): string {
  return error instanceof CommunityError ? error.message : 'Não foi possível concluir agora. Tente de novo em instantes.';
}

function announce(text: string) {
  AccessibilityInfo.announceForAccessibility?.(text);
}

function reportsFor(item: QueueItem, reports: OpenReport[]): OpenReport[] {
  return reports.filter((r) =>
    item.kind === 'post'
      ? r.targetKind === 'post' && r.postId === item.itemId
      : r.targetKind === 'comment' && r.commentId === item.itemId,
  );
}

function dueOf(value: { dueAt: string | null; createdAt: string }): number {
  const due = value.dueAt ? Date.parse(value.dueAt) : NaN;
  if (!Number.isNaN(due)) return due;
  const created = Date.parse(value.createdAt);
  return Number.isNaN(created) ? Number.MAX_SAFE_INTEGER : created;
}

type ReportEntry = { type: 'content'; item: QueueItem; reports: OpenReport[] } | { type: 'person'; report: OpenReport };

export function ModerationQueueScreen({ community, moderation, onNotModerator, now = Date.now }: ModerationQueueScreenProps) {
  const inset = useGutter();
  const [phase, setPhase] = useState<'checking' | 'denied' | 'loading' | 'error' | 'ready'>('checking');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('analise');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reports, setReports] = useState<OpenReport[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [history, setHistory] = useState<HistoryEntry[] | null | undefined>(undefined);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  // A rota passa uma função nova a cada render; a carga não pode depender dela.
  const deniedRef = useRef(onNotModerator);
  useEffect(() => {
    deniedRef.current = onNotModerator;
  }, [onNotModerator]);

  const loadQueue = useCallback(async () => {
    const [items, open] = await Promise.all([moderation.queue(), moderation.openReports()]);
    setQueue(items);
    setReports(open);
    // URL assinada de 1 h, em lote. Se falhar, a foto não abre e "Aprovar" fica
    // indisponível: ninguém aprova uma foto que não viu.
    try {
      setPhotoUrls(await community.signPhotoUrls(items.map((i) => i.photoPath)));
    } catch {
      setPhotoUrls(new Map());
    }
  }, [community, moderation]);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      setHistory(await moderation.history());
    } catch (error) {
      setHistoryError(messageOf(error));
    }
  }, [moderation]);

  // Sem setState antes do primeiro await: a fase inicial já é 'checking', e
  // o 'Tentar de novo' marca a fase antes de chamar.
  const start = useCallback(
    () =>
      community
        .getStatus()
        .then(async (status) => {
          if (!canModerate(status)) {
            setPhase('denied');
            deniedRef.current();
            return;
          }
          setPhase('loading');
          await loadQueue();
          setLoadError(null);
          setPhase('ready');
        })
        .catch((error: unknown) => {
          setLoadError(messageOf(error));
          setPhase('error');
        }),
    [community, loadQueue],
  );

  useEffect(() => {
    start();
  }, [start]);

  const retry = () => {
    setPhase('checking');
    start();
  };

  const openTab = (next: Tab) => {
    setTab(next);
    // O histórico só é consultado quando a aba abre pela primeira vez.
    if (next === 'historico' && history === undefined) loadHistory();
  };

  const refreshAfter = useCallback(
    async (key: string, action: () => Promise<void>, done: string) => {
      setBusy(key);
      setNotice(null);
      try {
        await action();
        setNotice({ text: done, error: false });
        announce(done);
      } catch (error) {
        const text = messageOf(error);
        setNotice({ text, error: true });
        announce(text);
      } finally {
        // Mesmo depois de erro a fila recarrega: outra pessoa pode ter decidido antes.
        try {
          await loadQueue();
          if (history !== undefined) await loadHistory();
        } catch (error) {
          setNotice({ text: messageOf(error), error: true });
        }
        setBusy(null);
      }
    },
    [history, loadHistory, loadQueue],
  );

  const inReview = useMemo(() => {
    const pending = queue.filter((i) => i.status === 'in_review' && i.openReports === 0);
    return {
      photos: pending.filter((i) => i.photoPath !== null),
      texts: pending.filter((i) => i.photoPath === null),
    };
  }, [queue]);

  const reportEntries = useMemo<ReportEntry[]>(() => {
    const content: ReportEntry[] = queue
      .filter((i) => i.openReports > 0)
      .map((item) => ({ type: 'content', item, reports: reportsFor(item, reports) }));
    const people: ReportEntry[] = reports
      .filter((r) => r.targetKind === 'person')
      .map((report) => ({ type: 'person', report }));
    const urgent = (e: ReportEntry) => (e.type === 'content' ? e.item.urgent : e.report.urgent);
    const due = (e: ReportEntry) => (e.type === 'content' ? dueOf(e.item) : dueOf(e.report));
    // Urgente primeiro (criança, rosto de terceiro), depois o prazo mais apertado.
    return [...content, ...people].sort((a, b) => Number(urgent(b)) - Number(urgent(a)) || due(a) - due(b));
  }, [queue, reports]);

  const approve = (item: QueueItem) =>
    refreshAfter(
      `approve:${item.itemId}`,
      () => moderation.decide({ kind: item.kind, id: item.itemId, decision: 'approve' }),
      item.kind === 'post' ? 'Publicação aprovada. A decisão foi registrada.' : 'Comentário aprovado. A decisão foi registrada.',
    );

  /** Manter no ar: em análise, aprova (o servidor arquiva as denúncias); publicado, arquiva cada denúncia. */
  const keep = (entry: { item: QueueItem; reports: OpenReport[] }) =>
    refreshAfter(
      `keep:${entry.item.itemId}`,
      async () => {
        if (entry.item.status === 'in_review') {
          await moderation.decide({ kind: entry.item.kind, id: entry.item.itemId, decision: 'approve' });
        } else {
          for (const report of entry.reports) await moderation.resolveReport(report.reportId, 'dismissed');
        }
      },
      'Mantido no ar. As denúncias foram arquivadas e registradas.',
    );

  const dismissPerson = (report: OpenReport) =>
    refreshAfter(
      `dismiss:${report.reportId}`,
      () => moderation.resolveReport(report.reportId, 'dismissed'),
      'Denúncia arquivada. A decisão foi registrada.',
    );

  const confirmSheet = (reason: ReportReason, note: string) => {
    const current = sheet;
    if (!current) return;
    setSheet(null);
    if (current.mode === 'suspend') {
      const name = current.item?.authorName ?? current.report?.reportedName ?? 'esta pessoa';
      const target: SuspendTarget | null = current.item
        ? { kind: current.item.kind, id: current.item.itemId }
        : current.report
          ? { kind: 'report', id: current.report.reportId }
          : null;
      if (!target) return;
      const key = `suspend:${current.item?.itemId ?? current.report?.reportId ?? ''}`;
      Alert.alert('Suspender', `Suspender ${name} da comunidade?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender',
          style: 'destructive',
          onPress: () =>
            refreshAfter(
              key,
              async () => {
                await moderation.suspendMember({ target, reason, note });
                if (current.report) await moderation.resolveReport(current.report.reportId, 'actioned');
              },
              `${name} foi suspensa da comunidade. A decisão foi registrada.`,
            ),
        },
      ]);
      return;
    }
    const item = current.item;
    if (!item) return;
    const decision = current.mode;
    refreshAfter(
      `${decision}:${item.itemId}`,
      () => moderation.decide({ kind: item.kind, id: item.itemId, decision, reason, note }),
      decision === 'reject'
        ? 'Recusado. A pessoa vê o motivo em Minhas publicações.'
        : 'Removido. A pessoa vê o motivo em Minhas publicações.',
    );
  };

  const header = (
    <View style={{ paddingHorizontal: inset }}>
      <BackBar label="Voltar" onBack={goBackOrHome} testID="moderation-back-bar" />
    </View>
  );

  if (phase === 'checking' || phase === 'denied' || phase === 'loading') {
    return (
      <Screen>
        {header}
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen>
        {header}
        <ScreenScroll>
          <ErrorState
            title="Não deu para abrir a fila"
            message={loadError ?? undefined}
            onRetry={retry}
            secondary={{ label: 'Voltar', onPress: goBackOrHome }}
            testID="moderation-error"
          />
        </ScreenScroll>
      </Screen>
    );
  }

  const photoCount = inReview.photos.length + inReview.texts.length;

  return (
    <Screen>
      {header}
      <ScreenScroll gap={spacing.lg}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            Moderação
          </AppText>
          <AppText variant="bodySm">
            Só quem modera vê esta área. Toda decisão fica registrada, e a pessoa nunca sabe quem decidiu.
          </AppText>
        </View>

        <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill
            label={`Em análise (${photoCount})`}
            active={tab === 'analise'}
            onPress={() => openTab('analise')}
            testID="tab-analise"
          />
          <Pill
            label={`Denúncias (${reportEntries.length})`}
            active={tab === 'denuncias'}
            onPress={() => openTab('denuncias')}
            testID="tab-denuncias"
          />
          <Pill label="Histórico" active={tab === 'historico'} onPress={() => openTab('historico')} testID="tab-historico" />
        </View>

        {notice ? <Notice text={notice.text} error={notice.error} /> : null}

        {tab === 'analise' ? (
          photoCount === 0 ? (
            <EmptyState
              icon="check"
              title="Nada aguardando"
              message="Quando alguém enviar uma foto, ou o filtro segurar um texto, ele aparece aqui."
              testID="moderation-review-empty"
            />
          ) : (
            <>
              {inReview.photos.length > 0 ? (
                <AppText variant="cap" accessibilityRole="header">
                  Fotos aguardando aprovação
                </AppText>
              ) : null}
              {inReview.photos.map((item) => (
                <ItemCard
                  key={item.itemId}
                  item={item}
                  photoUrl={item.photoPath ? photoUrls.get(item.photoPath) : undefined}
                  now={now()}
                  busy={busy}
                  actions={[
                    {
                      key: 'approve',
                      title: 'Aprovar',
                      variant: 'outline',
                      // Ninguém aprova uma foto que não abriu na tela.
                      disabled: !item.photoPath || !photoUrls.get(item.photoPath),
                      onPress: () => approve(item),
                    },
                    {
                      key: 'reject',
                      title: 'Recusar',
                      variant: 'underline',
                      onPress: () => setSheet({ mode: 'reject', item, initialReason: null }),
                    },
                    {
                      key: 'suspend',
                      title: 'Suspender autor',
                      variant: 'danger',
                      disabled: !item.authorKnown,
                      onPress: () => setSheet({ mode: 'suspend', item, initialReason: null }),
                    },
                  ]}
                />
              ))}
              {inReview.texts.length > 0 ? (
                <AppText variant="cap" accessibilityRole="header">
                  Textos segurados pelo filtro
                </AppText>
              ) : null}
              {inReview.texts.map((item) => (
                <ItemCard
                  key={item.itemId}
                  item={item}
                  now={now()}
                  busy={busy}
                  actions={[
                    { key: 'approve', title: 'Aprovar', variant: 'outline', onPress: () => approve(item) },
                    {
                      key: 'reject',
                      title: 'Recusar',
                      variant: 'underline',
                      onPress: () => setSheet({ mode: 'reject', item, initialReason: null }),
                    },
                    {
                      key: 'suspend',
                      title: 'Suspender autor',
                      variant: 'danger',
                      disabled: !item.authorKnown,
                      onPress: () => setSheet({ mode: 'suspend', item, initialReason: null }),
                    },
                  ]}
                />
              ))}
              <EndOfQueue />
            </>
          )
        ) : null}

        {tab === 'denuncias' ? (
          reportEntries.length === 0 ? (
            <EmptyState
              icon="flag"
              title="Nenhuma denúncia aberta"
              message="Quando alguém denunciar uma publicação, um comentário ou uma pessoa, a denúncia aparece aqui."
              testID="moderation-reports-empty"
            />
          ) : (
            <>
              {reportEntries.map((entry) =>
                entry.type === 'content' ? (
                  <ItemCard
                    key={`c:${entry.item.itemId}`}
                    item={entry.item}
                    reports={entry.reports}
                    photoUrl={entry.item.photoPath ? photoUrls.get(entry.item.photoPath) : undefined}
                    now={now()}
                    busy={busy}
                    actions={[
                      {
                        key: 'keep',
                        title: 'Manter no ar',
                        variant: 'outline',
                        disabled: !!entry.item.photoPath && !photoUrls.get(entry.item.photoPath),
                        onPress: () => keep(entry),
                      },
                      {
                        key: 'remove',
                        title: 'Remover',
                        variant: 'danger',
                        onPress: () =>
                          setSheet({ mode: 'remove', item: entry.item, initialReason: entry.reports[0]?.reason ?? null }),
                      },
                      {
                        key: 'suspend',
                        title: 'Suspender autor',
                        variant: 'danger',
                        disabled: !entry.item.authorKnown,
                        onPress: () =>
                          setSheet({ mode: 'suspend', item: entry.item, initialReason: entry.reports[0]?.reason ?? null }),
                      },
                    ]}
                  />
                ) : (
                  <PersonReportCard
                    key={`p:${entry.report.reportId}`}
                    report={entry.report}
                    now={now()}
                    busy={busy}
                    onDismiss={() => dismissPerson(entry.report)}
                    onSuspend={() =>
                      setSheet({ mode: 'suspend', report: entry.report, initialReason: entry.report.reason })
                    }
                  />
                ),
              )}
              <EndOfQueue />
            </>
          )
        ) : null}

        {tab === 'historico' ? (
          historyError ? (
            <ErrorState
              title="Não deu para carregar o histórico"
              message={historyError}
              onRetry={loadHistory}
              retryVariant="outline"
              testID="moderation-history-error"
            />
          ) : history === undefined ? (
            <StateView kind="loading" />
          ) : history === null ? (
            <EmptyState
              icon="clock"
              title="O histórico ainda não chegou"
              message="Toda decisão já fica registrada no servidor, mas ele ainda não tem a consulta que mostra o histórico aqui."
              testID="moderation-history-unavailable"
            />
          ) : history.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Nenhuma decisão ainda"
              message="As decisões da equipe e do filtro aparecem aqui, com o motivo."
              testID="moderation-history-empty"
            />
          ) : (
            <>
              {history.map((entry) => (
                <HistoryCard key={entry.actionId} entry={entry} now={now()} />
              ))}
              <EndOfQueue text="Fim do histórico." />
            </>
          )
        ) : null}
      </ScreenScroll>

      {sheet ? (
        <DecisionSheet
          // Uma folha nova por alvo: o motivo e a nota começam do zero.
          key={`${sheet.mode}:${sheet.item?.itemId ?? sheet.report?.reportId ?? ''}`}
          state={sheet}
          onClose={() => setSheet(null)}
          onConfirm={confirmSheet}
        />
      ) : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- pedaços */

function Notice({ text, error }: { text: string; error: boolean }) {
  const { colors } = useTheme();
  return (
    <AppText
      variant="bodySm"
      accessibilityLiveRegion="polite"
      accessibilityRole={error ? 'alert' : undefined}
      style={{ color: error ? colors.danger : colors.textSecondary }}
      testID={error ? 'moderation-error-notice' : 'moderation-done-notice'}
    >
      {text}
    </AppText>
  );
}

function EndOfQueue({ text = 'Fim da fila.' }: { text?: string }) {
  return (
    <AppText variant="caption" style={{ textAlign: 'center' }} testID="moderation-end">
      {text}
    </AppText>
  );
}

/** Urgente: ícone + palavra, nunca só cor (REGRAS 30). `danger` mede ≥ 4,5:1 nos dois temas. */
function UrgentTag() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Urgente"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
      testID="urgent-tag"
    >
      <Icon name="alert" size={18} color={colors.danger} />
      <AppText variant="captionStrong" style={{ color: colors.danger }}>
        URGENTE
      </AppText>
    </View>
  );
}

function Meta({ parts }: { parts: string[] }) {
  const text = parts.filter(Boolean).join(', ');
  return <AppText variant="caption">{text}</AppText>;
}

type CardAction = {
  key: string;
  title: string;
  variant: 'outline' | 'underline' | 'danger';
  disabled?: boolean;
  onPress: () => void;
};

function Actions({ id, actions, busy }: { id: string; actions: CardAction[]; busy: string | null }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
      {actions.map((action) => (
        <Button
          key={action.key}
          title={action.title}
          variant={action.variant}
          disabled={action.disabled || (busy !== null && busy !== `${action.key}:${id}`)}
          loading={busy === `${action.key}:${id}`}
          onPress={action.onPress}
          testID={`${action.key}-${id}`}
        />
      ))}
    </View>
  );
}

function ItemCard({
  item,
  reports,
  photoUrl,
  now,
  busy,
  actions,
}: {
  item: QueueItem;
  reports?: OpenReport[];
  photoUrl?: string;
  now: number;
  busy: string | null;
  actions: CardAction[];
}) {
  const { colors } = useTheme();
  const due = dueLabel(item.dueAt, now);
  const what = item.kind === 'post' ? 'Publicação' : 'Comentário';
  const where =
    item.status === 'published' ? 'no ar' : item.status === 'in_review' ? 'fora do ar, em análise' : 'fora do ar';
  return (
    <Block testID={`item-${item.itemId}`}>
      <View style={{ gap: spacing.md }}>
        {item.urgent ? <UrgentTag /> : null}
        <View style={{ gap: 2 }}>
          <AppText variant="rowLabel">{`${what} de ${item.authorName || 'participante'}`}</AppText>
          <Meta parts={[timeAgo(item.createdAt, now), where, item.authorStatus === 'suspended' ? 'autor suspenso' : '']} />
          {due ? (
            <AppText variant="caption" style={due.late ? { color: colors.danger } : undefined}>
              {due.late ? `Atrasada: ${due.text}` : due.text.charAt(0).toUpperCase() + due.text.slice(1)}
            </AppText>
          ) : null}
        </View>

        {item.photoPath ? (
          photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              accessibilityLabel={`Foto enviada por ${item.authorName || 'participante'}`}
              resizeMode="contain"
              style={{
                width: '100%',
                aspectRatio: 1,
                borderRadius: radius.button,
                backgroundColor: colors.surfaceMuted,
              }}
              testID={`photo-${item.itemId}`}
            />
          ) : (
            <AppText variant="bodySm" style={{ color: colors.danger }} testID={`photo-missing-${item.itemId}`}>
              A foto não abriu. Não dá para aprovar sem ver; tente de novo mais tarde.
            </AppText>
          )
        ) : null}

        {item.body ? <AppText variant="body">{item.body}</AppText> : null}

        {item.holdReason ? <AppText variant="bodySm">{`Segurado por: ${HOLD_LABEL[item.holdReason]}`}</AppText> : null}

        {reports && reports.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {reports.map((report) => (
              <View key={report.reportId} style={{ gap: 2 }}>
                <AppText variant="rowLabel">
                  {`Denúncia: ${report.reason ? REASON_LABEL[report.reason] : 'motivo não informado'}`}
                </AppText>
                {report.details ? <AppText variant="bodySm">{`“${report.details}”`}</AppText> : null}
                <AppText variant="caption">{timeAgo(report.createdAt, now)}</AppText>
              </View>
            ))}
          </View>
        ) : null}

        <Actions id={item.itemId} actions={actions} busy={busy} />
      </View>
    </Block>
  );
}

function PersonReportCard({
  report,
  now,
  busy,
  onDismiss,
  onSuspend,
}: {
  report: OpenReport;
  now: number;
  busy: string | null;
  onDismiss: () => void;
  onSuspend: () => void;
}) {
  const { colors } = useTheme();
  const due = dueLabel(report.dueAt, now);
  return (
    <Block testID={`person-${report.reportId}`}>
      <View style={{ gap: spacing.md }}>
        {report.urgent ? <UrgentTag /> : null}
        <View style={{ gap: 2 }}>
          <AppText variant="rowLabel">{`Denúncia da pessoa ${report.reportedName || 'participante'}`}</AppText>
          <Meta parts={[timeAgo(report.createdAt, now)]} />
          {due ? (
            <AppText variant="caption" style={due.late ? { color: colors.danger } : undefined}>
              {due.late ? `Atrasada: ${due.text}` : due.text.charAt(0).toUpperCase() + due.text.slice(1)}
            </AppText>
          ) : null}
        </View>
        <AppText variant="rowLabel">{`Motivo: ${report.reason ? REASON_LABEL[report.reason] : 'não informado'}`}</AppText>
        {report.details ? <AppText variant="bodySm">{`“${report.details}”`}</AppText> : null}
        <Actions
          id={report.reportId}
          busy={busy}
          actions={[
            { key: 'dismiss', title: 'Arquivar', variant: 'outline', onPress: onDismiss },
            {
              key: 'suspend',
              title: 'Suspender pessoa',
              variant: 'danger',
              disabled: !report.reportedKnown,
              onPress: onSuspend,
            },
          ]}
        />
      </View>
    </Block>
  );
}

function HistoryCard({ entry, now }: { entry: HistoryEntry; now: number }) {
  const who = entry.decidedBy === 'automatico' ? 'filtro automático' : 'pessoa da equipe';
  return (
    <Block testID={`history-${entry.actionId}`}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="rowLabel">{entry.kind ? KIND_LABEL[entry.kind] : 'Decisão'}</AppText>
        <Meta parts={[timeAgo(entry.createdAt, now), `por ${who}`, entry.targetName ? `sobre ${entry.targetName}` : '']} />
        {entry.reason ? <AppText variant="bodySm">{`Motivo: ${REASON_LABEL[entry.reason]}`}</AppText> : null}
        {entry.excerpt ? <AppText variant="bodySm">{`“${entry.excerpt}”`}</AppText> : null}
        {entry.noteForAuthor ? <AppText variant="bodySm">{`Nota para a pessoa: ${entry.noteForAuthor}`}</AppText> : null}
      </View>
    </Block>
  );
}

/**
 * Folha de decisão: recusar, remover ou suspender. Motivo obrigatório (lista
 * fechada do servidor) e nota opcional para a pessoa, de até 500 caracteres.
 */
function DecisionSheet({
  state,
  onClose,
  onConfirm,
}: {
  state: SheetState;
  onClose: () => void;
  onConfirm: (reason: ReportReason, note: string) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(state.initialReason);
  const [note, setNote] = useState('');

  const what = state.item?.kind === 'comment' ? 'comentário' : 'publicação';
  const name = state.item?.authorName || state.report?.reportedName || 'esta pessoa';
  const title =
    state.mode === 'suspend'
      ? `Suspender ${name}`
      : state.mode === 'reject'
        ? `Recusar ${what}`
        : `Remover ${what}`;
  const explanation =
    state.mode === 'suspend'
      ? 'A pessoa deixa de publicar, comentar e dar Amém, e o que ela publicou sai do feed enquanto a suspensão durar. Ela vê o motivo e a sua nota.'
      : 'A pessoa vê o motivo e a sua nota em Minhas publicações, e sabe que quem decidiu foi uma pessoa da equipe. Ela nunca sabe quem. Se houver foto, ela é apagada.';
  const tooLong = note.length > NOTE_MAX;
  const guidance = reason ? REASON_GUIDANCE[reason] : undefined;

  return (
    <Sheet visible onClose={onClose} title={title} testID="decision-sheet">
      <AppText variant="bodySm">{explanation}</AppText>
      <AppText variant="cap" accessibilityRole="header">
        Motivo
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {REPORT_REASONS.map((r) => (
          <Pill key={r} label={REASON_LABEL[r]} active={reason === r} onPress={() => setReason(r)} testID={`reason-${r}`} />
        ))}
      </View>
      {guidance ? (
        <AppText variant="bodySm" accessibilityRole="alert" testID="reason-guidance">
          {guidance}
        </AppText>
      ) : null}
      <TextField
        minHeight={120}
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Nota para a pessoa, opcional"
        placeholder="Nota para a pessoa (opcional)"
        maxLength={NOTE_MAX + 50}
        testID="decision-note"
      />
      {tooLong ? (
        <AppText variant="bodySm" accessibilityRole="alert">{`A nota pode ter até ${NOTE_MAX} caracteres.`}</AppText>
      ) : null}
      <Button
        title={state.mode === 'suspend' ? 'Suspender' : state.mode === 'reject' ? 'Recusar' : 'Remover'}
        disabled={!reason || tooLong}
        onPress={() => reason && onConfirm(reason, note)}
        testID="decision-confirm"
      />
      <Button title="Cancelar" variant="underline" onPress={onClose} testID="decision-cancel" />
    </Sheet>
  );
}
