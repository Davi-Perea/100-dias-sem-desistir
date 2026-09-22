import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { DEMO_INVITE_CODE, isDemoCommunityApi } from '@/community/demoApi';
import { CommunityError } from '@/community/errors';
import type { CommunityStatus } from '@/community/types';
import { charLength, formatInviteCode, isValidDisplayName, LIMITS, normalizeInviteCode } from '@/community/validation';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Avatar, Block, Button, StateView, StepBar } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import { ActionError, AccountStateView, LineField, ProfileScreen } from './parts';
import { COMMUNITY_ACCOUNT_ROUTE } from './routes';
import { communityMessage, useCommunityAccount } from './useCommunityAccount';

/**
 * Entrada na Comunidade: conta de e-mail (já existe em /conta) → "tenho 18 anos
 * ou mais" → código da igreja → perfil (nome).
 *
 * O servidor recebe tudo junto numa chamada só (`redeem_invite_code(código,
 * nome, confirma_18)`), então o código é conferido de verdade no último passo.
 * O formato é conferido antes, no aparelho, para não gastar uma das 5
 * tentativas por hora com o que nem tem forma de código. Se o servidor recusar,
 * a pessoa volta ao passo do código com o motivo em palavras.
 *
 * Nada de CPF, telefone ou data de nascimento: a idade é uma declaração, com
 * um toque explícito, sem nada marcado de antemão.
 *
 * Foto de perfil: o D2 pede "foto opcional", mas o servidor não guarda foto de
 * perfil (COMUNIDADE_V2_ARQUITETURA §9, item 5). A tela mostra como a pessoa vai
 * aparecer (as iniciais) e não oferece um botão que não salvaria nada.
 */

export const INVALID_CODE_COPY =
  'Esse código não funcionou. Ele pode estar errado, vencido ou cancelado. Confira com quem te passou ou peça um novo.';
export const CODE_FORMAT_COPY = 'Confira o código: são 10 letras e números, sem 0, O, 1 ou I.';
export const UNDER_18_COPY = 'Aqui você acompanha a Jornada. A comunidade é para quem tem 18 anos ou mais.';
export const NAME_TOO_LONG_COPY = `Use até ${LIMITS.displayName} letras e espaços. O primeiro nome já basta.`;

/** Nome longo demais: dito na tela, na live region (Android) e em voz no iOS. */
function NameTooLong() {
  const { colors } = useTheme();
  useEffect(() => {
    announceNotice(NAME_TOO_LONG_COPY);
  }, []);
  return (
    <AppText
      variant="captionStrong"
      accessibilityLiveRegion="polite"
      style={{ color: colors.danger }}
      testID="entrar-nome-longo"
    >
      {NAME_TOO_LONG_COPY}
    </AppText>
  );
}

type Step = 'idade' | 'menor' | 'codigo' | 'perfil' | 'pronto' | 'suspenso';

const STEP_NUMBER: Partial<Record<Step, number>> = { idade: 1, codigo: 2, perfil: 3 };
const PREVIOUS: Partial<Record<Step, Step>> = { menor: 'idade', codigo: 'idade', perfil: 'codigo' };

export function EntradaFlow() {
  const account = useCommunityAccount();
  if (account.kind !== 'ready') return <AccountStateView account={account} />;
  return <Steps api={account.api} status={account.status} />;
}

function initialStep(status: CommunityStatus): Step | 'membro' {
  if (status.memberStatus === 'suspended' || status.memberStatus === 'removed') return 'suspenso';
  if (status.isMember) return 'membro';
  return 'idade';
}

function Steps({ api, status }: { api: CommunityApi; status: CommunityStatus }) {
  const { colors } = useTheme();
  const first = initialStep(status);
  const [step, setStep] = useState<Step | 'membro'>(first);
  const demo = isDemoCommunityApi(api);
  const [code, setCode] = useState(() => (demo ? formatInviteCode(DEMO_INVITE_CODE) : ''));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previous = step === 'membro' ? undefined : PREVIOUS[step];

  // Voltar do Android volta um passo, não sai da entrada no meio.
  useEffect(() => {
    if (!previous || busy) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep(previous);
      return true;
    });
    return () => sub.remove();
  }, [previous, busy]);

  const back = previous ? () => setStep(previous) : goBackOrHome;
  const number = step === 'membro' ? undefined : STEP_NUMBER[step];

  const header = (
    <View style={{ gap: spacing.md }}>
      <BackBar
        onBack={busy ? () => {} : back}
        rightText={number ? `Passo ${number} de 3` : undefined}
      />
      {number ? <StepBar step={number} total={3} /> : null}
    </View>
  );

  const goToCode = () => {
    setCodeError(null);
    setStep('codigo');
  };

  const confirmCode = () => {
    if (!normalizeInviteCode(code)) {
      setCodeError(CODE_FORMAT_COPY);
      return;
    }
    setCodeError(null);
    setStep('perfil');
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.redeemInviteCode({ code, displayName: name, confirmsAdult: true });
      if (result === 'invalid_code') {
        setCodeError(INVALID_CODE_COPY);
        setStep('codigo');
        return;
      }
      setStep('pronto');
    } catch (err) {
      if (err instanceof CommunityError && err.code === 'blocked_from_community') {
        setStep('suspenso');
      } else if (err instanceof CommunityError && err.code === 'rate_limited') {
        setCodeError('Muitas tentativas de código seguidas. Espere um pouco e tente de novo.');
        setStep('codigo');
      } else {
        setError(communityMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === 'membro') {
    return (
      <ProfileScreen back={header} testID="entrar-membro">
        <StateView
          kind="empty"
          icon="community"
          title="Você já está na comunidade"
          message={status.displayName ? `Você aparece como ${status.displayName}.` : undefined}
          action={
            <View style={{ gap: spacing.md, alignSelf: 'stretch' }}>
              <Button title="Continuar" onPress={goBackOrHome} testID="entrar-continuar" />
              <Button
                title="Conta e privacidade"
                variant="underline"
                onPress={() => router.push(COMMUNITY_ACCOUNT_ROUTE)}
              />
            </View>
          }
        />
      </ProfileScreen>
    );
  }

  if (step === 'suspenso') {
    return (
      <ProfileScreen back={header} testID="entrar-suspenso">
        <StateView
          kind="empty"
          icon="lock"
          title="Participação suspensa"
          message="Sua participação na comunidade está suspensa, e por isso não é possível entrar com outro código. Sua jornada pessoal continua funcionando normalmente."
          action={<Button title="Voltar" variant="outline" onPress={goBackOrHome} />}
        />
      </ProfileScreen>
    );
  }

  if (step === 'menor') {
    return (
      <ProfileScreen back={header} testID="entrar-menor">
        <AppText variant="display" accessibilityRole="header">
          A comunidade é para maiores de 18
        </AppText>
        <AppText variant="body">{UNDER_18_COPY}</AppText>
        <Button title="Voltar para a Jornada" onPress={() => router.replace('/')} testID="entrar-menor-voltar" />
      </ProfileScreen>
    );
  }

  if (step === 'idade') {
    return (
      <ProfileScreen back={header} testID="entrar-idade">
        <AppText variant="display" accessibilityRole="header">
          Você tem 18 anos ou mais?
        </AppText>
        <AppText variant="body">
          A comunidade é só para quem tem 18 anos ou mais. Não pedimos a sua data de nascimento, nem documento: basta
          você confirmar.
        </AppText>
        <View style={{ gap: spacing.md }}>
          <Button title="Tenho 18 anos ou mais" onPress={goToCode} testID="entrar-adulto" />
          <Button
            title="Tenho menos de 18"
            variant="outline"
            onPress={() => setStep('menor')}
            testID="entrar-menor-de-18"
          />
        </View>
      </ProfileScreen>
    );
  }

  if (step === 'codigo') {
    const normalized = normalizeInviteCode(code);
    return (
      <ProfileScreen back={header} testID="entrar-codigo">
        <AppText variant="display" accessibilityRole="header">
          Código da sua igreja
        </AppText>
        <AppText variant="body">
          Quem te convidou tem um código de 10 letras e números, como ABCDE-23456. Pode digitar com ou sem o traço.
        </AppText>
        {demo ? (
          <AppText variant="caption" testID="entrar-codigo-demo">
            Demonstração: o código {formatInviteCode(DEMO_INVITE_CODE)} já vem preenchido.
          </AppText>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <LineField
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setCodeError(null);
            }}
            accessibilityLabel="Código de entrada da igreja"
            placeholder="ABCDE-23456"
            autoCapitalize="characters"
            maxLength={16}
            mono
            onSubmitEditing={confirmCode}
            testID="entrar-codigo-input"
          />
          {normalized ? (
            <AppText variant="caption" testID="entrar-codigo-formatado">
              Código: {formatInviteCode(normalized)}
            </AppText>
          ) : null}
        </View>
        <ActionError message={codeError} testID="entrar-codigo-erro" />
        <Button
          title="Continuar"
          onPress={confirmCode}
          disabled={code.trim().length === 0}
          testID="entrar-codigo-continuar"
        />
      </ProfileScreen>
    );
  }

  if (step === 'perfil') {
    const trimmed = name.trim();
    const valid = isValidDisplayName(name);
    return (
      <ProfileScreen back={header} testID="entrar-perfil">
        <AppText variant="display" accessibilityRole="header">
          Como a igreja vai te chamar
        </AppText>
        <AppText variant="body">
          É o nome que aparece no que você publicar e comentar. Não precisa ser o nome completo.
        </AppText>
        <View style={{ gap: spacing.sm }}>
          <LineField
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
            accessibilityLabel="Seu nome na comunidade"
            placeholder="Seu nome"
            autoCapitalize="words"
            maxLength={LIMITS.displayName * 2}
            testID="entrar-nome-input"
          />
          <AppText
            variant="caption"
            testID="entrar-nome-contagem"
            accessibilityLabel={`${charLength(trimmed)} de ${LIMITS.displayName} caracteres`}
          >
            {charLength(trimmed)} de {LIMITS.displayName}
          </AppText>
          {charLength(trimmed) > LIMITS.displayName ? (
            // Sem isto, o botão só fica apagado e a pessoa não sabe por quê.
            <NameTooLong />
          ) : null}
        </View>
        {trimmed ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            accessible
            accessibilityLabel={`É assim que você aparece: ${trimmed}`}
            testID="entrar-previa"
          >
            <Avatar name={trimmed} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption">É assim que você aparece</AppText>
              <AppText variant="rowLabel">{trimmed}</AppText>
            </View>
          </View>
        ) : null}
        <Block tone="blueSoft">
          <AppText variant="bodySm" style={{ color: colors.onBlueSoft }}>
            Seu nome só aparece no que você publicar ou comentar. Sua leitura, seu jejum e a sua reflexão privada não
            têm nome e ficam neste aparelho.
          </AppText>
        </Block>
        <ActionError message={error} testID="entrar-erro" />
        <Button
          title="Entrar na comunidade"
          onPress={join}
          loading={busy}
          disabled={!valid}
          testID="entrar-confirmar"
        />
      </ProfileScreen>
    );
  }

  // pronto
  return (
    <ProfileScreen testID="entrar-pronto">
      <AppText variant="display" accessibilityRole="header">
        Você entrou na comunidade
      </AppText>
      <AppText variant="body">
        Ler é livre. Antes da primeira publicação, do primeiro comentário ou do primeiro Amém, o app mostra as regras da
        comunidade e pede o seu consentimento.
      </AppText>
      <Button
        title="Continuar"
        onPress={goBackOrHome}
        testID="entrar-continuar"
      />
      <Button title="Conta e privacidade" variant="underline" onPress={() => router.push(COMMUNITY_ACCOUNT_ROUTE)} />
    </ProfileScreen>
  );
}
