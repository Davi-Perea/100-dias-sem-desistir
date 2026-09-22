import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { toCommunityError } from '@/community/errors';
import { ministryLabel } from '@/community/profile';
import type { AvatarStatus } from '@/community/types';
import { charLength, LIMITS } from '@/community/validation';
import { listMinistries } from '@/journey/ministries';
import { TextField } from '@/ui/TextField';
import { AppText, Block, Button, Checkbox, ChoiceRow } from '@/ui/components';
import { LimitNote } from '@/ui/comunidade/LimitNote';
import { pickFromLibrary, preparePhoto } from '@/ui/comunidade/publicar/foto';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import { LineField } from './parts';
import { ProfileAvatar } from './ProfileAvatar';

/**
 * Campos do perfil da comunidade (C1, C4 e N3 do feedback de 2026-09-22),
 * usados pelos passos da entrada e pela tela de perfil. Só composição dos
 * componentes-base: nada de token novo, nada de `fontWeight`, piso de 48 em
 * todo alvo, `minHeight` + `paddingVertical`.
 */

/* ------------------------------------------------------------- caixa + texto */

/**
 * Caixa de marcação com o texto ao lado (o texto também marca). Para o leitor
 * de tela há um só controle: a caixa, com o texto como nome.
 */
export function CheckRow({
  checked,
  onToggle,
  label,
  caption,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  caption?: string;
  testID?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
      <Checkbox checked={checked} onToggle={onToggle} label={label} testID={testID} />
      <Pressable
        onPress={onToggle}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ flex: 1, minHeight: MIN_TOUCH, paddingVertical: spacing.sm, justifyContent: 'center', gap: 2 }}
      >
        <AppText variant="rowLabel">{label}</AppText>
        {caption ? <AppText variant="caption">{caption}</AppText> : null}
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ foto */

export const AVATAR_NOTE: Record<AvatarStatus, string | null> = {
  none: null,
  in_review: 'Em análise: só você vê a foto até uma pessoa da equipe da igreja olhar.',
  approved: 'Foto aprovada. Ela aparece ao lado do seu nome.',
  rejected: 'A foto anterior não foi aprovada. Escolha outra.',
};

/** O que vale para a foto de perfil (a mesma regra de toda foto da comunidade). */
export const AVATAR_RULES = [
  'Use uma foto sua, em que dê para ver o seu rosto.',
  'Sem crianças e sem outras pessoas na foto.',
  'Antes de aparecer para os outros, uma pessoa da equipe da igreja olha. A localização da foto é apagada no celular, antes de enviar.',
] as const;

/**
 * Foto de perfil: escolher na galeria, preparar no aparelho (1600 px, JPEG,
 * sem EXIF/XMP/IPTC; `preparePhoto` recusa se sobrar metadado) e enviar. Volta
 * sempre "em análise": só depois da moderação a foto aparece para os outros.
 */
export function AvatarField({
  api,
  name,
  status,
  photoUrl,
  onSaved,
}: {
  api: CommunityApi;
  name: string;
  status: AvatarStatus;
  /** URL assinada da foto atual (ou a local, logo depois de escolher). */
  photoUrl: string | null;
  onSaved: (localUri: string, status: AvatarStatus) => void;
}) {
  const { colors } = useTheme();
  const [stage, setStage] = useState<'idle' | 'rules' | 'working'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) announceNotice(error);
  }, [error]);

  const choose = async () => {
    setError(null);
    setStage('working');
    try {
      const picked = await pickFromLibrary();
      if (!picked) return;
      const prepared = await preparePhoto(picked);
      const next = await api.setAvatar({ bytes: prepared.bytes, uri: prepared.uri });
      onSaved(prepared.uri, next);
      announceNotice(AVATAR_NOTE[next] ?? 'Foto escolhida.');
    } catch (failure) {
      setError(toCommunityError(failure).message);
    } finally {
      setStage('idle');
    }
  };

  const note = AVATAR_NOTE[status];
  const hasPhoto = status === 'in_review' || status === 'approved';

  return (
    <View style={{ gap: spacing.lg }} testID="perfil-foto">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <ProfileAvatar name={name || 'Você'} uri={hasPhoto ? photoUrl : null} size={96} testID="perfil-foto-previa" />
        <View style={{ flex: 1, gap: spacing.xs }}>
          {note ? (
            <AppText variant="bodySm" testID="perfil-foto-estado">
              {note}
            </AppText>
          ) : (
            <AppText variant="bodySm">Sem foto ainda.</AppText>
          )}
        </View>
      </View>
      {stage === 'rules' ? (
        <Block tone="warm" testID="perfil-foto-regras">
          <View style={{ gap: spacing.md }}>
            <AppText variant="rowLabel" accessibilityRole="header">
              Antes de escolher a foto
            </AppText>
            {AVATAR_RULES.map((line) => (
              <View key={line} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <View
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text, marginTop: 9 }}
                />
                <AppText variant="bodySm" style={{ flex: 1, color: colors.textSecondary }}>
                  {line}
                </AppText>
              </View>
            ))}
            <Button title="Escolher do celular" onPress={choose} testID="perfil-foto-escolher" />
            <Button title="Agora não" variant="underline" onPress={() => setStage('idle')} />
          </View>
        </Block>
      ) : (
        <Button
          title={hasPhoto ? 'Trocar a foto' : 'Escolher uma foto'}
          variant="outline"
          onPress={() => setStage('rules')}
          loading={stage === 'working'}
          testID="perfil-foto-abrir"
        />
      )}
      {error ? (
        <AppText
          variant="bodySm"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger }}
          testID="perfil-foto-erro"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ nome */

export const NAME_TOO_LONG_COPY = `Use até ${LIMITS.displayName} letras e espaços. O primeiro nome já basta.`;

export function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  const length = charLength(value.trim());
  const tooLong = length > LIMITS.displayName;
  useEffect(() => {
    if (tooLong) announceNotice(NAME_TOO_LONG_COPY);
  }, [tooLong]);
  return (
    <View style={{ gap: spacing.sm }}>
      <LineField
        value={value}
        onChangeText={onChange}
        accessibilityLabel="Seu nome no Juntos"
        placeholder="Seu nome"
        autoCapitalize="words"
        maxLength={LIMITS.displayName * 2}
        testID="perfil-nome"
      />
      <AppText variant="caption" accessibilityLabel={`${length} de ${LIMITS.displayName} caracteres`}>
        {length} de {LIMITS.displayName}
      </AppText>
      {tooLong ? (
        <AppText variant="captionStrong" accessibilityLiveRegion="polite" style={{ color: colors.danger }} testID="perfil-nome-longo">
          {NAME_TOO_LONG_COPY}
        </AppText>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------ 16 anos (C1) */

export const AGE_LABEL = 'Tenho 16 anos ou mais';
export const AGE_CAPTION = 'Obrigatório para publicar, comentar e dizer Amém. Não pedimos documento nem data de nascimento.';

export function AgeCheck({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return <CheckRow checked={checked} onToggle={onToggle} label={AGE_LABEL} caption={AGE_CAPTION} testID="perfil-idade" />;
}

/* ------------------------------------------------------------- ministério */

/** "Nenhum" ou o nome de um ministério da escala. undefined = ainda não escolheu. */
export type MinistryChoice = { none: true } | { none: false; name: string } | undefined;

/**
 * Lista dos ministérios que o app conhece (os da escala do dataset, nada
 * digitado à mão) com "Nenhum" no topo.
 */
export function MinistryField({ value, onChange }: { value: MinistryChoice; onChange: (value: MinistryChoice) => void }) {
  const ministries = useMemo(() => listMinistries().map((m) => m.name), []);
  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" testID="perfil-ministerio">
      <ChoiceRow
        compact
        label="Nenhum"
        description="Aparece só o seu nome"
        selected={value?.none === true}
        onPress={() => onChange({ none: true })}
        testID="perfil-ministerio-nenhum"
      />
      {ministries.map((name) => (
        <ChoiceRow
          key={name}
          compact
          label={name}
          accessibilityLabel={ministryLabel(name) ?? name}
          selected={value?.none === false && value.name === name}
          onPress={() => onChange({ none: false, name })}
          testID={`perfil-ministerio-${name}`}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------- bio */

export function BioField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <TextField
        minHeight={96}
        value={value}
        onChangeText={onChange}
        placeholder="Uma frase sobre você (opcional)"
        accessibilityLabel="Bio, opcional"
        testID="perfil-bio"
      />
      <LimitNote length={charLength(value.trim())} max={LIMITS.bio} nearFrom={LIMITS.bio - 30} testID="perfil-bio-limite" />
    </View>
  );
}

/* ---------------------------------------------------------- e-mail (N3) */

export const NEWS_LABEL = 'Quero receber novidades do app';
export const EMAIL_CAPTION = 'Opcional. Ninguém na comunidade vê o seu e-mail.';
export const NEWS_CAPTION = 'Só se você marcar. Dá para desmarcar quando quiser.';

export function ContactFields({
  email,
  news,
  onEmail,
  onNews,
}: {
  email: string;
  news: boolean;
  onEmail: (value: string) => void;
  onNews: (value: boolean) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }} testID="perfil-contato">
      <LineField
        value={email}
        onChangeText={onEmail}
        accessibilityLabel="Seu e-mail, opcional"
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoComplete="email"
        testID="perfil-email"
      />
      <AppText variant="caption">{EMAIL_CAPTION}</AppText>
      <CheckRow checked={news} onToggle={() => onNews(!news)} label={NEWS_LABEL} caption={NEWS_CAPTION} testID="perfil-novidades" />
    </View>
  );
}

/** Título + texto de apoio de um bloco do perfil. */
export function FieldHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="blockTitle" accessibilityRole="header">
        {title}
      </AppText>
      {children ? <AppText variant="bodySm">{children}</AppText> : null}
    </View>
  );
}
