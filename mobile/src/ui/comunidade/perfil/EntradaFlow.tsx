import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { CommunityError } from '@/community/errors';
import { authorLine, gapsSentence, profileGaps } from '@/community/profile';
import type { AvatarStatus, CommunityProfile, CommunityStatus } from '@/community/types';
import { charLength, cleanText, LIMITS } from '@/community/validation';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { AppText, Block, Button, StateView, StepBar } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { ActionError, AccountStateView, ProfileScreen } from './parts';
import { AgeCheck, AvatarField, BioField, MinistryField, NameField, type MinistryChoice } from './PerfilCampos';
import { ProfileAvatar } from './ProfileAvatar';
import { COMMUNITY_ACCOUNT_ROUTE, COMMUNITY_PROFILE_ROUTE } from './routes';
import { communityMessage, useCommunityAccount } from './useCommunityAccount';

/**
 * Entrada na Comunidade (feedback do fundador de 2026-09-22):
 *
 *   entrar sem e-mail (C2: conta ligada ao aparelho, em AccountStateView)
 *   → entra na comunidade sem código (C3, decisão do fundador de 2026-09-22:
 *     quem cria o perfil no app entra; feito ao abrir esta tela, que só se abre
 *     por um toque em "Entrar"/"Criar meu perfil")
 *   → foto de perfil → nome + "Tenho 16 anos ou mais" → ministério → bio
 *
 * Cada passo do perfil tem "Pular" (C4). Para PUBLICAR, o app e o servidor
 * exigem nome, foto, ministério (pode ser "Nenhum") e a confirmação de 16+
 * (C1); o fim da entrada diz o que ainda falta, sem bloquear quem só quer ler.
 * Não há mais o aviso grande de 18+ (C1).
 *
 * Nada de CPF, telefone ou data de nascimento: a idade é uma declaração, com um
 * toque explícito, sem nada marcado de antemão.
 */

export { NAME_TOO_LONG_COPY } from './PerfilCampos';

type Step = 'entrando' | 'foto' | 'nome' | 'ministerio' | 'bio' | 'pronto' | 'suspenso';

const STEP_NUMBER: Partial<Record<Step, number>> = { foto: 1, nome: 2, ministerio: 3, bio: 4 };
const TOTAL_STEPS = 4;
/** Voltar dentro do perfil. Do primeiro passo do perfil, sai da entrada (já entrou). */
const PREVIOUS: Partial<Record<Step, Step>> = { nome: 'foto', ministerio: 'nome', bio: 'ministerio' };

export function EntradaFlow() {
  const account = useCommunityAccount();
  if (account.kind !== 'ready') return <AccountStateView account={account} />;
  return <Steps api={account.api} status={account.status} />;
}

function initialStep(status: CommunityStatus): Step | 'membro' {
  if (status.memberStatus === 'suspended' || status.memberStatus === 'removed') return 'suspenso';
  if (status.isMember) return 'membro';
  return 'entrando';
}

export function ministryChoice(profile: CommunityProfile): MinistryChoice {
  if (!profile.ministryAnswered) return undefined;
  return profile.ministry ? { none: false, name: profile.ministry } : { none: true };
}

function Steps({ api, status }: { api: CommunityApi; status: CommunityStatus }) {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step | 'membro'>(() => initialStep(status));
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinAttempt, setJoinAttempt] = useState(0);
  // O perfil que a pessoa vai montando (espelho local do que já foi salvo).
  const [profile, setProfile] = useState<CommunityProfile>(status.profile);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState(status.profile.displayName ?? '');
  const [age, setAge] = useState(status.profile.ageConfirmed);
  const [ministry, setMinistry] = useState<MinistryChoice>(() => ministryChoice(status.profile));
  const [bio, setBio] = useState(status.profile.bio ?? '');
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
      <BackBar onBack={busy ? () => {} : back} rightText={number ? `Passo ${number} de ${TOTAL_STEPS}` : undefined} />
      {number ? <StepBar step={number} total={TOTAL_STEPS} /> : null}
    </View>
  );

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  /** Salva um passo e segue. Erro: fica no passo, com o motivo em palavras. */
  const save = async (action: () => Promise<void>, next: Step) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setStep(next);
    } catch (failure) {
      setError(communityMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  // C3: sem código. Quem chegou aqui sem ser membro entra na hora; a foto (o
  // primeiro passo) já precisa ser de membro para subir.
  const joining = step === 'entrando';
  useEffect(() => {
    if (!joining) return;
    let alive = true;
    api
      .joinCommunity()
      .then(() => {
        if (alive) setStep('foto');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof CommunityError && err.code === 'blocked_from_community') setStep('suspenso');
        else setJoinError(communityMessage(err));
      });
    return () => {
      alive = false;
    };
  }, [api, joining, joinAttempt]);

  const skip = (next: Step) => (
    <Button title="Pular" variant="underline" onPress={() => go(next)} disabled={busy} testID={`entrar-pular-${step}`} />
  );

  if (step === 'membro') {
    return (
      <ProfileScreen back={header} testID="entrar-membro">
        <StateView
          kind="empty"
          icon="community"
          title="Você já está na comunidade"
          message={status.displayName ? `Você aparece como ${authorLine(status.displayName, status.profile.ministry)}.` : undefined}
          action={
            <View style={{ gap: spacing.md, alignSelf: 'stretch' }}>
              <Button title="Continuar" onPress={goBackOrHome} testID="entrar-continuar" />
              <Button
                title="Editar o perfil"
                variant="outline"
                onPress={() => router.push(COMMUNITY_PROFILE_ROUTE)}
                testID="entrar-editar-perfil"
              />
              <Button title="Conta e privacidade" variant="underline" onPress={() => router.push(COMMUNITY_ACCOUNT_ROUTE)} />
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
          message="Sua participação na comunidade está suspensa, e por isso não é possível entrar de novo. Sua jornada pessoal continua funcionando normalmente."
          action={<Button title="Voltar" variant="outline" onPress={goBackOrHome} />}
        />
      </ProfileScreen>
    );
  }

  if (step === 'entrando') {
    return (
      <ProfileScreen back={header} testID="entrar-entrando">
        {joinError ? (
          <StateView
            kind="error"
            title="Não foi possível entrar agora"
            message={joinError}
            action={
              <Button
                title="Tentar de novo"
                onPress={() => {
                  setJoinError(null);
                  setJoinAttempt((n) => n + 1);
                }}
                testID="entrar-tentar-de-novo"
              />
            }
          />
        ) : (
          <StateView kind="loading" />
        )}
      </ProfileScreen>
    );
  }

  if (step === 'foto') {
    const hasPhoto = profile.avatarStatus === 'in_review' || profile.avatarStatus === 'approved';
    return (
      <ProfileScreen back={header} testID="entrar-foto">
        <AppText variant="display" accessibilityRole="header">
          Sua foto de perfil
        </AppText>
        <AppText variant="body">
          Ela aparece ao lado do seu nome no que você publicar. Para publicar, a foto é necessária.
        </AppText>
        <AvatarField
          api={api}
          name={cleanText(name) ?? ''}
          status={profile.avatarStatus}
          photoUrl={photoUrl}
          onSaved={(uri: string, next: AvatarStatus) => {
            setPhotoUrl(uri);
            // Espelho local: o caminho de verdade só o servidor sabe; aqui basta "tem foto".
            setProfile((current) => ({ ...current, avatarStatus: next, avatarPath: current.avatarPath ?? uri }));
          }}
        />
        <Button title="Continuar" onPress={() => go('nome')} disabled={!hasPhoto} testID="entrar-foto-continuar" />
        {skip('nome')}
      </ProfileScreen>
    );
  }

  if (step === 'nome') {
    const trimmed = name.trim();
    const tooLong = charLength(trimmed) > LIMITS.displayName;
    return (
      <ProfileScreen back={header} testID="entrar-perfil">
        <AppText variant="display" accessibilityRole="header">
          Como a igreja vai te chamar
        </AppText>
        <AppText variant="body">
          É o nome que aparece no que você publicar e comentar. Não precisa ser o nome completo.
        </AppText>
        <NameField
          value={name}
          onChange={(value) => {
            setName(value);
            setError(null);
          }}
        />
        <AgeCheck checked={age} onToggle={() => setAge((value) => !value)} />
        <ActionError message={error} testID="entrar-erro" />
        <Button
          title="Continuar"
          onPress={() =>
            save(async () => {
              await api.updateProfile({ name: trimmed || null, confirms16: age });
              setProfile((current) => ({
                ...current,
                displayName: trimmed || current.displayName,
                ageConfirmed: current.ageConfirmed || age,
              }));
            }, 'ministerio')
          }
          loading={busy}
          disabled={tooLong || (!trimmed && !age)}
          testID="entrar-confirmar"
        />
        {skip('ministerio')}
      </ProfileScreen>
    );
  }

  if (step === 'ministerio') {
    return (
      <ProfileScreen back={header} testID="entrar-ministerio">
        <AppText variant="display" accessibilityRole="header">
          Seu ministério
        </AppText>
        <AppText variant="body">
          Aparece junto do seu nome, como “Davi · Ministério Comunicação”. Se não serve em nenhum, escolha “Nenhum”.
        </AppText>
        {skip('bio')}
        <MinistryField value={ministry} onChange={setMinistry} />
        <ActionError message={error} testID="entrar-erro" />
        <Button
          title="Continuar"
          onPress={() =>
            save(async () => {
              if (!ministry) return;
              await api.updateProfile(ministry.none ? { noMinistry: true } : { ministry: ministry.name });
              setProfile((current) => ({
                ...current,
                ministryAnswered: true,
                ministry: ministry.none ? null : ministry.name,
              }));
            }, 'bio')
          }
          loading={busy}
          disabled={!ministry}
          testID="entrar-ministerio-continuar"
        />
      </ProfileScreen>
    );
  }

  if (step === 'bio') {
    const cleaned = cleanText(bio);
    return (
      <ProfileScreen back={header} testID="entrar-bio">
        <AppText variant="display" accessibilityRole="header">
          Uma frase sobre você
        </AppText>
        <AppText variant="body">Opcional. Aparece no seu perfil da comunidade.</AppText>
        <BioField value={bio} onChange={setBio} />
        <ActionError message={error} testID="entrar-erro" />
        <Button
          title="Concluir"
          onPress={() =>
            save(async () => {
              if (!cleaned) return;
              await api.updateProfile({ bio: cleaned });
              setProfile((current) => ({ ...current, bio: cleaned }));
            }, 'pronto')
          }
          loading={busy}
          disabled={!cleaned || charLength(cleaned) > LIMITS.bio}
          testID="entrar-bio-concluir"
        />
        {skip('pronto')}
      </ProfileScreen>
    );
  }

  // pronto
  const shownName = cleanText(profile.displayName);
  const gaps = gapsSentence(profileGaps(profile));
  return (
    <ProfileScreen testID="entrar-pronto">
      <AppText variant="display" accessibilityRole="header">
        Você entrou na comunidade
      </AppText>
      {shownName ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          accessible
          accessibilityLabel={`É assim que você aparece: ${authorLine(shownName, profile.ministry)}`}
          testID="entrar-previa"
        >
          <ProfileAvatar name={shownName} uri={photoUrl} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption">É assim que você aparece</AppText>
            <AppText variant="rowLabel">{authorLine(shownName, profile.ministry)}</AppText>
          </View>
        </View>
      ) : null}
      {gaps ? (
        <Block tone="warm" testID="entrar-falta">
          <View style={{ gap: spacing.md }}>
            <AppText variant="bodySm">{`${gaps} Para ler, não precisa de nada disso.`}</AppText>
            <Button
              title="Completar o perfil"
              variant="outline"
              onPress={() => router.replace(COMMUNITY_PROFILE_ROUTE)}
              testID="entrar-completar"
            />
          </View>
        </Block>
      ) : null}
      <AppText variant="body">
        Antes da primeira publicação ou do primeiro comentário, o app mostra as regras da comunidade e pede o seu
        consentimento.
      </AppText>
      <Block tone="blueSoft">
        <AppText variant="bodySm" style={{ color: colors.onBlueSoft }}>
          Sua leitura, seu jejum e as suas anotações não têm nome e ficam neste aparelho.
        </AppText>
      </Block>
      <Button title="Ir para a comunidade" onPress={goBackOrHome} testID="entrar-continuar" />
      <Button title="Conta e privacidade" variant="underline" onPress={() => router.push(COMMUNITY_ACCOUNT_ROUTE)} />
    </ProfileScreen>
  );
}
