import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import type { ReportReason, ReportTarget } from '@/community/types';
import { charLength, LIMITS } from '@/community/validation';
import { AppText, Button, ChoiceRow, IconCircle, SaveErrorNotice, Sheet } from '@/ui/components';
import type { IconName } from '@/ui/icons';
import { TextField } from '@/ui/TextField';
import { MIN_TOUCH, spacing } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import { humanError } from '../feed/useCommunity';
import { reasonOptions, receiptCode, reviewPromise, URGENT_REASONS, type ReportSubject } from './motivos';

/**
 * C5: denunciar e bloquear, a mesma folha para publicação e comentário
 * (REGRAS 15: visível e fácil, exigência das duas lojas).
 *
 * - De outra pessoa: denunciar o conteúdo, denunciar a pessoa, bloquear.
 * - Do próprio autor: apagar (não se denuncia nem se bloqueia a si mesmo).
 *
 * Tudo parte do id do post ou do comentário: o app nunca tem o id da pessoa.
 * Depois de denunciar, a folha mostra o recibo (protocolo) e oferece bloquear.
 *
 * "Não quero ver este assunto" (3º item do desenho) NÃO está aqui: o servidor
 * não tem esse recurso, e esconder só no aparelho prometeria algo que volta ao
 * reinstalar. Pedido registrado.
 */
export type SheetTarget =
  | {
      kind: 'post';
      postId: string;
      authorName: string;
      isMine: boolean;
      hasPhoto: boolean;
    }
  | {
      kind: 'comment';
      commentId: string;
      authorName: string;
      isMine: boolean;
    };

type Step =
  | { step: 'menu' }
  | { step: 'reason'; subject: ReportSubject; reason: ReportReason | null; details: string }
  | { step: 'receipt'; code: string; hidden: boolean; subject: ReportSubject }
  | { step: 'confirm-block' }
  | { step: 'blocked' }
  | { step: 'confirm-delete' };

function apiTarget(target: SheetTarget): ReportTarget {
  return target.kind === 'post' ? { postId: target.postId } : { commentId: target.commentId };
}

export function ReportSheet({
  api,
  target,
  onClose,
  onDeleted,
  onBlocked,
  onHidden,
}: {
  api: CommunityApi;
  /** null = folha fechada. */
  target: SheetTarget | null;
  onClose: () => void;
  /** O próprio autor apagou. */
  onDeleted: (target: SheetTarget) => void;
  /** Bloqueou quem escreveu: a tela tira o conteúdo e recarrega. */
  onBlocked: (target: SheetTarget) => void;
  /** Denúncia urgente: o servidor já tirou do ar, a tela tira também. */
  onHidden: (target: SheetTarget) => void;
}) {
  const [state, setState] = useState<Step>({ step: 'menu' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Cada abertura começa do menu (ajuste durante o render, sem efeito em cascata).
  const key = target ? (target.kind === 'post' ? target.postId : target.commentId) : null;
  const [openedFor, setOpenedFor] = useState(key);
  if (openedFor !== key) {
    setOpenedFor(key);
    setState({ step: 'menu' });
    setError(null);
    setBusy(false);
    setBlocked(false);
  }

  if (!target) return <Sheet visible={false} onClose={onClose} />;

  const noun = target.kind === 'post' ? 'publicação' : 'comentário';
  const thisNoun = target.kind === 'post' ? 'esta publicação' : 'este comentário';
  const name = target.authorName;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  }

  function sendReport(subject: ReportSubject, reason: ReportReason, details: string) {
    if (!target) return;
    return run(async () => {
      const id = await api.report({ ...apiTarget(target), person: subject === 'person', reason, details });
      const hidden = subject !== 'person' && URGENT_REASONS.includes(reason);
      if (hidden) onHidden(target);
      setState({ step: 'receipt', code: receiptCode(id), hidden, subject });
      announceNotice('Denúncia recebida.');
    });
  }

  function block() {
    if (!target) return;
    return run(async () => {
      await api.blockAuthor(apiTarget(target));
      setBlocked(true);
      onBlocked(target);
      setState({ step: 'blocked' });
      announceNotice(`Você bloqueou ${name}.`);
    });
  }

  function remove() {
    if (!target) return;
    return run(async () => {
      if (target.kind === 'post') await api.deletePost(target.postId);
      else await api.deleteComment(target.commentId);
      onDeleted(target);
      announceNotice(target.kind === 'post' ? 'Publicação apagada.' : 'Comentário apagado.');
      onClose();
    });
  }

  let title: string | undefined;
  let body: ReactNode;

  switch (state.step) {
    case 'menu':
      title = undefined;
      body = target.isMine ? (
        <View style={{ gap: spacing.sm }}>
          <SheetRow
            icon="trash"
            title={`Apagar ${thisNoun}`}
            caption={`${target.kind === 'post' ? 'Ela sai' : 'Ele sai'} da comunidade para todo mundo.`}
            onPress={() => setState({ step: 'confirm-delete' })}
            testID="sheet-delete"
          />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <SheetRow
            icon="flag"
            title={`Denunciar ${thisNoun}`}
            caption={reviewPromise()}
            onPress={() => setState({ step: 'reason', subject: target.kind, reason: null, details: '' })}
            testID="sheet-report-content"
          />
          <SheetRow
            icon="person"
            title={`Denunciar ${name}`}
            caption="Quando o problema é a pessoa, e não só o que ela escreveu"
            onPress={() => setState({ step: 'reason', subject: 'person', reason: null, details: '' })}
            testID="sheet-report-person"
          />
          <SheetRow
            icon="block"
            title={`Bloquear ${name}`}
            caption="Você não vê mais nada dessa pessoa, e ela não vê você"
            onPress={() => setState({ step: 'confirm-block' })}
            testID="sheet-block"
          />
        </View>
      );
      break;

    case 'reason': {
      const options = reasonOptions(state.subject, target.kind === 'post' && target.hasPhoto);
      const tooLong = charLength(state.details.trim()) > LIMITS.reportDetails;
      title = state.subject === 'person' ? `Denunciar ${name}` : `Denunciar ${thisNoun}`;
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="bodySm">Escolha o motivo. Quem escreveu não fica sabendo que foi você.</AppText>
          <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
            {options.map((option) => (
              <ChoiceRow
                key={option.reason}
                compact
                label={option.label}
                description={option.description}
                selected={state.reason === option.reason}
                onPress={() => setState({ ...state, reason: option.reason })}
                testID={`reason-${option.reason}`}
              />
            ))}
          </View>
          {state.reason === 'risco_a_vida' ? (
            <AppText variant="bodySm" accessibilityRole="alert" testID="reason-emergency">
              Se alguém corre perigo agora, procure um serviço de emergência. A equipe da comunidade não substitui
              atendimento de emergência.
            </AppText>
          ) : null}
          <TextField
            minHeight={100}
            value={state.details}
            onChangeText={(details) => setState({ ...state, details })}
            placeholder="Quer contar mais? (opcional)"
            accessibilityLabel="Detalhes da denúncia, opcional"
            testID="reason-details"
          />
          {tooLong ? (
            <AppText variant="caption" testID="reason-too-long">
              {`Use até ${LIMITS.reportDetails} caracteres.`}
            </AppText>
          ) : null}
          <Button
            title="Enviar denúncia"
            disabled={!state.reason || tooLong}
            loading={busy}
            onPress={() => state.reason && sendReport(state.subject, state.reason, state.details)}
            testID="report-send"
          />
          <Button title="Voltar" variant="underline" onPress={() => setState({ step: 'menu' })} />
        </View>
      );
      break;
    }

    case 'receipt':
      title = 'Denúncia recebida';
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="body">
            {`${reviewPromise()} Quem escreveu não fica sabendo que foi você.`}
          </AppText>
          {state.hidden ? (
            <AppText variant="body" testID="receipt-hidden">
              {`${target.kind === 'post' ? 'A publicação já saiu' : 'O comentário já saiu'} do ar enquanto isso.`}
            </AppText>
          ) : null}
          <AppText
            variant="rowLabel"
            accessibilityLabel={`Protocolo ${state.code.split('').join(' ')}`}
            testID="receipt-code"
          >
            {`Protocolo ${state.code}`}
          </AppText>
          {!blocked ? (
            <Button
              title={`Bloquear ${name} também`}
              variant="outline"
              onPress={() => setState({ step: 'confirm-block' })}
              testID="receipt-block"
            />
          ) : null}
          <Button title="Fechar" onPress={onClose} testID="receipt-close" />
        </View>
      );
      break;

    case 'confirm-block':
      title = `Bloquear ${name}?`;
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="body">
            Você não vê mais nada do que essa pessoa publica ou comenta na comunidade, e ela não vê o que você
            publica. Ela não é avisada, e dá para desfazer depois em Conta e privacidade.
          </AppText>
          <Button title={`Bloquear ${name}`} loading={busy} onPress={block} testID="block-confirm" />
          <Button title="Voltar" variant="underline" onPress={() => setState({ step: 'menu' })} />
        </View>
      );
      break;

    case 'blocked':
      title = 'Pronto';
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="body">{`Você não vê mais o que ${name} publica.`}</AppText>
          <Button title="Fechar" onPress={onClose} testID="blocked-close" />
        </View>
      );
      break;

    case 'confirm-delete':
      title = `Apagar ${thisNoun}?`;
      body = (
        <View style={{ gap: spacing.md }}>
          <AppText variant="body">{`O ${noun === 'publicação' ? 'que você publicou' : 'seu comentário'} sai da comunidade para todo mundo. Não dá para desfazer.`}</AppText>
          <Button title={`Apagar ${noun}`} loading={busy} onPress={remove} testID="delete-confirm" />
          <Button title="Voltar" variant="underline" onPress={() => setState({ step: 'menu' })} />
        </View>
      );
      break;
  }

  return (
    <Sheet visible onClose={onClose} title={title} testID="report-sheet">
      {body}
      {error ? <SaveErrorNotice message={error} testID="sheet-error" /> : null}
      {state.step === 'menu' ? (
        <Button title="Fechar" variant="outline" onPress={onClose} testID="sheet-close" />
      ) : null}
    </Sheet>
  );
}

/** Linha da folha: piso 60, círculo de 48 em `surfaceMuted`, título e legenda. */
function SheetRow({
  icon,
  title,
  caption,
  onPress,
  testID,
}: {
  icon: IconName;
  title: string;
  caption: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${caption}`}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: Math.max(60, MIN_TOUCH),
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <IconCircle name={icon} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="action">{title}</AppText>
        <AppText variant="caption">{caption}</AppText>
      </View>
    </Pressable>
  );
}
