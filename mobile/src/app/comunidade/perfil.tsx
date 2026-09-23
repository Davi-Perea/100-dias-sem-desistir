import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { authorLine, gapsSentence, isValidBio, isValidContactEmail, isValidOptionalName, profileGaps } from '@/community/profile';
import type { CommunityStatus } from '@/community/types';
import { cleanText } from '@/community/validation';
import { COMMUNITY_PHOTOS_ENABLED } from '@/config/features';
import { AppText, Block, Button, Rule, StateView } from '@/ui/components';
import { ministryChoice } from '@/ui/comunidade/perfil/EntradaFlow';
import {
  AgeCheck,
  AVATAR_CHANGE_TITLE,
  AVATAR_OPTIONAL_NOTE,
  AVATAR_STEP_TITLE,
  AvatarField,
  BioField,
  ContactFields,
  FieldHeader,
  MinistryField,
  NameField,
  type MinistryChoice,
} from '@/ui/comunidade/perfil/PerfilCampos';
import { ProfileAvatar } from '@/ui/comunidade/perfil/ProfileAvatar';
import { ActionError, AccountStateView, ProfileScreen } from '@/ui/comunidade/perfil/parts';
import { COMMUNITY_ENTRY_ROUTE } from '@/ui/comunidade/perfil/routes';
import { communityMessage, useCommunityAccount } from '@/ui/comunidade/perfil/useCommunityAccount';
import { flowParams, parseDay, safeNext } from '@/ui/comunidade/publicar/fluxo';
import { spacing } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

/**
 * Perfil da comunidade (feedback do fundador de 2026-09-22, C1, C4 e N3).
 *
 * Nome, "Tenho 16 anos ou mais", e os passos OPCIONAIS: "Coloque uma foto",
 * ministério (ou "Nenhum"), bio, e o e-mail com a caixa SEPARADA de novidades
 * (desmarcada). Para publicar bastam nome e 16+ (`profileGaps`); o topo diz o que
 * falta, e a foto nunca está nessa lista (pedido do fundador, 2026-09-22).
 *
 * Parâmetros: `next` (rota da Comunidade para seguir depois de salvar, vinda de
 * Publicar) e `day` (dia da leitura, repassado).
 */
export const PROFILE_SAVED = 'Perfil salvo.';

export default function CommunityProfileScreen() {
  const account = useCommunityAccount();
  if (account.kind !== 'ready') return <AccountStateView account={account} />;
  if (!account.status.isMember) {
    return (
      <ProfileScreen testID="perfil-nao-membro">
        <StateView
          kind="empty"
          icon="community"
          title="Abra o Juntos primeiro"
          message="Ao abrir o Juntos você já está dentro. Não precisa de e-mail nem de código."
          action={<Button title="Abrir o Juntos" onPress={() => router.replace(COMMUNITY_ENTRY_ROUTE)} />}
        />
      </ProfileScreen>
    );
  }
  return <ProfileForm api={account.api} status={account.status} />;
}

/** O formulário guarda o próprio estado: salvar não recarrega a tela (o aviso "Perfil salvo" continua à vista). */
function ProfileForm({ api, status }: { api: CommunityApi; status: CommunityStatus }) {
  const params = useLocalSearchParams<{ next?: string; day?: string }>();
  const next = safeNext(params.next);
  const day = parseDay(params.day);
  const initial = status.profile;

  const [avatarStatus, setAvatarStatus] = useState(initial.avatarStatus);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState(initial.displayName ?? '');
  const [age, setAge] = useState(initial.ageConfirmed);
  const [ministry, setMinistry] = useState<MinistryChoice>(() => ministryChoice(initial));
  const [bio, setBio] = useState(initial.bio ?? '');
  const [email, setEmail] = useState(initial.contactEmail ?? '');
  const [news, setNews] = useState(initial.newsOptIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // A foto atual abre só por URL assinada (a própria pessoa vê mesmo em análise).
  useEffect(() => {
    if (!initial.avatarPath) return;
    let alive = true;
    api.signPhotoUrls([initial.avatarPath]).then(
      (urls) => {
        const url = initial.avatarPath ? urls.get(initial.avatarPath) : undefined;
        if (alive && url) setPhotoUrl((current) => current ?? url);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [api, initial.avatarPath]);

  const hasPhoto = avatarStatus === 'in_review' || avatarStatus === 'approved';
  const draft = {
    ...initial,
    displayName: cleanText(name) ?? initial.displayName,
    ageConfirmed: initial.ageConfirmed || age,
    ministryAnswered: initial.ministryAnswered || ministry !== undefined,
    avatarPath: hasPhoto ? (initial.avatarPath ?? photoUrl) : null,
    avatarStatus,
  };
  const gaps = gapsSentence(profileGaps(draft));
  const valid =
    isValidOptionalName(name) && isValidBio(bio) && isValidContactEmail(email) && (!news || cleanText(email) !== null);

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const cleanedBio = cleanText(bio);
      await api.updateProfile({
        name: cleanText(name),
        confirms16: age,
        ...(ministry ? (ministry.none ? { noMinistry: true } : { ministry: ministry.name }) : {}),
        ...(cleanedBio ? { bio: cleanedBio } : initial.bio ? { clearBio: true } : {}),
      });
      const cleanedEmail = cleanText(email);
      if (cleanedEmail !== initial.contactEmail || news !== initial.newsOptIn) {
        await api.setContact({ email: cleanedEmail, wantsNews: news && cleanedEmail !== null });
      }
      // Vindo de Publicar: segue só com o perfil pronto (senão Publicar mandaria de volta para cá).
      if (next && !gaps) {
        router.replace({ pathname: next, params: flowParams(null, day) } as never);
        return;
      }
      const saved = gaps ? `${PROFILE_SAVED} ${gaps}` : PROFILE_SAVED;
      setNotice(saved);
      announceNotice(saved);
    } catch (failure) {
      setError(communityMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const shownName = cleanText(name);

  return (
    <ProfileScreen testID="perfil">
      <AppText variant="screenTitle" accessibilityRole="header">
        Seu perfil na comunidade
      </AppText>
      {shownName ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          accessible
          accessibilityLabel={`É assim que você aparece: ${authorLine(shownName, ministry && !ministry.none ? ministry.name : null)}`}
          testID="perfil-previa"
        >
          <ProfileAvatar name={shownName} uri={hasPhoto ? photoUrl : null} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption">É assim que você aparece</AppText>
            <AppText variant="rowLabel">{authorLine(shownName, ministry && !ministry.none ? ministry.name : null)}</AppText>
          </View>
        </View>
      ) : null}
      {gaps ? (
        <Block tone="warm" testID="perfil-falta">
          <AppText variant="bodySm">{gaps}</AppText>
        </Block>
      ) : null}

      {/* Foto de perfil segue a MESMA chave da foto no post: sem filtro
          automático de imagem no ar, nenhuma imagem entra (Apple 1.2). Com a
          chave desligada a seção inteira some — nada de campo que não funciona. */}
      {COMMUNITY_PHOTOS_ENABLED ? (
        <>
          <View style={{ gap: spacing.md }}>
            {/* Foto OPCIONAL (2026-09-22): um passo do perfil, nunca um portão para
                publicar. É a PRIMEIRA seção da tela, e o título muda quando já há
                foto — "Coloque uma foto" para quem não tem, "Trocar a foto" para quem
                veio justamente trocar. */}
            <FieldHeader title={hasPhoto ? AVATAR_CHANGE_TITLE : AVATAR_STEP_TITLE}>{AVATAR_OPTIONAL_NOTE}</FieldHeader>
            <AvatarField
              api={api}
              name={shownName ?? ''}
              status={avatarStatus}
              photoUrl={photoUrl}
              onSaved={(uri, saved) => {
                setPhotoUrl(uri);
                setAvatarStatus(saved);
              }}
            />
          </View>
          <Rule />
        </>
      ) : null}
      <View style={{ gap: spacing.md }}>
        <FieldHeader title="Nome">O primeiro nome já basta.</FieldHeader>
        <NameField value={name} onChange={setName} />
        <AgeCheck checked={age} onToggle={() => setAge((value) => !value)} />
      </View>
      <Rule />
      <View style={{ gap: spacing.md }}>
        <FieldHeader title="Ministério">Aparece junto do seu nome. Com “Nenhum”, aparece só o nome.</FieldHeader>
        <MinistryField value={ministry} onChange={setMinistry} />
      </View>
      <Rule />
      <View style={{ gap: spacing.md }}>
        <FieldHeader title="Bio" />
        <BioField value={bio} onChange={setBio} />
      </View>
      <Rule />
      <View style={{ gap: spacing.md }}>
        <FieldHeader title="E-mail" />
        <ContactFields email={email} news={news} onEmail={setEmail} onNews={setNews} />
        {news && !cleanText(email) ? (
          <AppText variant="caption" testID="perfil-novidades-sem-email">
            Para receber novidades, escreva o seu e-mail.
          </AppText>
        ) : null}
      </View>

      <ActionError message={error} testID="perfil-erro" />
      {notice ? (
        <AppText variant="rowLabel" accessibilityLiveRegion="polite" testID="perfil-salvo">
          {notice}
        </AppText>
      ) : null}
      <Button title={next ? 'Salvar e continuar' : 'Salvar'} onPress={save} loading={busy} disabled={!valid} testID="perfil-salvar" />
    </ProfileScreen>
  );
}
