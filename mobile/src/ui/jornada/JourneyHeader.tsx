import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Dove } from '../brand';
import { AppText } from '../components';
import { Icon } from '../icons';
import { MIN_TOUCH, faces, radius, spacing, useTheme } from '../theme';
import { FlameIcon } from '../voce/ProfileIcons';

/**
 * Rótulo falado do contador de dias lidos. É a MESMA frase do contador do Você
 * (`ProfileHeader`): o pedido do fundador (2026-09-22) é o mesmo número e o
 * mesmo rótulo nos dois lugares, e um teste compara os dois.
 */
export function readCounterLabel(readCount: number): string {
  return `${readCount} ${readCount === 1 ? 'dia lido' : 'dias lidos'} no total`;
}

/**
 * Contador de DIAS LIDOS no topo da Jornada (feedback do fundador, 2026-09-22:
 * "a chama do Você aparece também no topo da Jornada"). Conta os dias lidos e
 * NUNCA zera: não é sequência, não existe "perdeu" nem "recomeçar", e por isso
 * não há nada para cobrar de quem faltou.
 *
 * Não é botão: quem quiser o progresso inteiro tem o círculo de conta ao lado.
 * Por não ser alvo de toque, o piso de 40 (com paddingVertical) basta — o piso
 * de 48 vale para o que se toca.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) A pílula é a mesma
 * do Você — `accentSoft` com tinta `text` (≥ 12:1 nos dois temas) e a chama na
 * tinta, nunca no amarelo puro, que sumiria sobre o branco.
 */
export function ReadCounter({ readCount }: { readCount: number }) {
  const { colors } = useTheme();
  const daysWord = readCount === 1 ? 'dia lido' : 'dias lidos';
  return (
    <View
      accessible
      accessibilityLabel={readCounterLabel(readCount)}
      testID="journey-read-counter"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        flexShrink: 1,
        gap: spacing.xs,
        minHeight: 40,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: colors.accentSoft,
      }}
    >
      <FlameIcon size={20} color={colors.text} />
      <AppText variant="rowLabel" testID="journey-read-counter-count">
        {readCount}
      </AppText>
      <AppText variant="caption" style={{ color: colors.text, flexShrink: 1 }}>
        {daysWord}
      </AppText>
    </View>
  );
}

/**
 * Cabeçalho da casa (A1, A2, A5, E5), piso 48: pomba 30×19 (proporção 224×144),
 * "100 dias sem desistir" Schibsted 700 15/20 tracking −0,2 e o círculo de conta
 * de 48×48, raio 24, em `surfaceMuted` com borda de 1,5px em `border`, que abre
 * o Você (D1).
 *
 * O círculo é o alvo inteiro (48), então não há área de toque menor que o piso.
 * A borda de 1,5px em `border` é decorativa (1,27:1): quem diz que é botão é o
 * papel acessível e o ícone de pessoa em `textMuted` (cerca de 6,0:1 sobre
 * `surfaceMuted` no claro), não o contorno.
 *
 * Com `readCount`, o contador de dias lidos entra em uma linha PRÓPRIA abaixo —
 * em fonte grande (3,571×) ele não caberia ao lado do nome sem espremer os dois.
 * Antes da campanha (A5) ele não é passado: não há dia lido a contar.
 */
export function JourneyHeader({ readCount }: { readCount?: number | null }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md }} testID="journey-header">
      <View style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* A pomba acompanha o nome escrito ao lado: é decorativa para o leitor de tela. */}
        <Dove width={30} />
        <AppText
          variant="rowLabel"
          accessibilityRole="header"
          style={{ flex: 1, fontFamily: faces.sg700, letterSpacing: -0.2 }}
        >
          100 dias sem desistir
        </AppText>
        <Pressable
          onPress={() => router.push('/voce')}
          accessibilityRole="button"
          accessibilityLabel="Você"
          accessibilityHint="Abre seu progresso e suas preferências"
          testID="account-button"
          style={({ pressed }) => [
            {
              width: MIN_TOUCH,
              height: MIN_TOUCH,
              borderRadius: MIN_TOUCH / 2,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1.5,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { opacity: 0.72 },
          ]}
        >
          <Icon name="you" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {readCount == null ? null : <ReadCounter readCount={readCount} />}
    </View>
  );
}
