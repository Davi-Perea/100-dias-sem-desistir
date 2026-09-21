import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { BackBar, goBackOrHome } from './BackBar';
import { AppText, Button, Screen, ScreenScroll, Sheet } from './components';
import { spacing, useGutter, useTheme } from './theme';

/**
 * A4 · Dia que ainda não abriu.
 *
 * Uma única composição para as quatro rotas do dia (dia, leitor, intercessão,
 * reflexão), porque o bloqueio é da ROTA e não do botão (REGRAS 7): link direto,
 * histórico e deep link chegam no mesmo cadeado, sem revelar nada daquele dia —
 * nem a referência da leitura, nem o monte, nem a ênfase. Por isso as props são
 * só o número e a data: quem chama não tem como passar conteúdo para cá.
 */

export type LockKind = 'leitura' | 'intercessao';

/** A frase que sustenta a regra 9 (nada de culpa): vale para as duas variantes. */
const NOTHING_LOST = 'Nada foi perdido — é só ainda não ter chegado.';

/** Cópia do TELAS.md A4. */
const LOCK_COPY: Record<LockKind, string> = {
  leitura: `A leitura de cada dia abre no dia oficial da igreja. ${NOTHING_LOST}`,
  // PROVISÓRIO (decisão do engenheiro, 2026-09-21: o TELAS A4 é ambíguo — pode
  // trocar só a primeira frase): a variante da intercessão mantém a segunda
  // frase do E1 antigo, a que diz que nada foi perdido (R3-12).
  intercessao: `A intercessão de cada dia abre no dia oficial da igreja. ${NOTHING_LOST}`,
};
// PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS P15, a variante da
// reflexão não foi escrita): a rota da reflexão também tranca e, até a resposta,
// usa `kind="leitura"`.

export function lockCopy(kind: LockKind): string {
  return LOCK_COPY[kind];
}

/**
 * Cadeado do A4 desenhado como no TOKENS §5: corpo de 22×14 raio 4 cheio em
 * `text` e arco de 16×14 com raio 8 8 0 0, traço 2,5, sem borda de baixo. O arco
 * encosta no corpo (sobreposição de 4) para as duas peças lerem como uma.
 */
export function LockGlyph({ color }: { color: string }) {
  // Centro do traço: o arco de 16 de largura externa vira 13,5 entre centros.
  return (
    <Svg width={22} height={24} viewBox="0 0 22 24" aria-hidden>
      <Path
        d="M4.25 14 V8 A6.75 6.75 0 0 1 17.75 8 V14"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={0} y={10} width={22} height={14} rx={4} fill={color} />
    </Svg>
  );
}

/** Círculo de 56 em `surfaceMuted` com o cadeado. Decorativo: o título diz o estado. */
export function LockCircle() {
  const { colors } = useTheme();
  return (
    <View
      aria-hidden
      testID="lock-circle"
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LockGlyph color={colors.text} />
    </View>
  );
}

type LockProps = {
  dayNumber: number;
  /** Data já formatada ("18/10/2026"), derivada do dia oficial da campanha. */
  dateLabel: string;
  kind?: LockKind;
};

/** O miolo comum à folha e à tela: círculo, título, frase. */
function LockBody({ dayNumber, dateLabel, kind = 'leitura' }: LockProps) {
  return (
    <>
      <LockCircle />
      <AppText
        variant="blockTitle"
        accessibilityRole="header"
        // TELAS A4: Schibsted 700 24/28 (sem tracking). Não há variante 24/28 no
        // TOKENS §3; a tela específica vence a tabela.
        style={{ fontSize: 24, lineHeight: 28, letterSpacing: 0 }}
        accessibilityLabel={`Dia ${dayNumber} abre em ${dateLabel}.`}
        testID="lock-title"
      >
        {`Abre em ${dateLabel}.`}
      </AppText>
      <AppText variant="body">{LOCK_COPY[kind]}</AppText>
    </>
  );
}

/**
 * A4 como folha modal, sobre a Jornada. "Voltar para a Jornada" só fecha a folha:
 * a Jornada já está atrás. O scrim também fecha (rotulado "Fechar" pelo Sheet).
 */
export function LockSheet({
  visible,
  onClose,
  dayNumber,
  dateLabel,
  kind = 'leitura',
}: LockProps & { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} testID="locked-day-sheet">
      <View style={{ gap: spacing.lg }}>
        <LockBody dayNumber={dayNumber} dateLabel={dateLabel} kind={kind} />
        <Button title="Voltar para a Jornada" onPress={onClose} testID="locked-day-back" />
      </View>
    </Sheet>
  );
}

/**
 * A4 como TELA inteira, para a rota do dia aberta a frio (deep link, lembrete,
 * histórico) quando não existe Jornada atrás para a folha cobrir.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS P15 e P56, o desenho
 * só mostra a folha "sobre a jornada dessaturada" e não diz o que fica atrás
 * dela num deep link a frio): a mesma composição vira tela, com o "‹ Voltar" no
 * topo que o cadeado das rotas já tinha. Os dois voltam na pilha quando há
 * pilha e vão para a casa quando não há (`goBackOrHome`): `replace` com pilha
 * duplicava as abas, e `back()` sem pilha ficava morto (LACUNAS B24).
 */
export function LockedDayScreen({
  dayNumber,
  dateLabel,
  kind = 'leitura',
  onHome,
}: LockProps & { onHome?: () => void }) {
  const inset = useGutter();
  const goHome = onHome ?? goBackOrHome;
  return (
    <Screen>
      <View style={{ paddingHorizontal: inset }}>
        <BackBar label="Voltar" onBack={goHome} testID="locked-day-back-bar" />
      </View>
      <ScreenScroll contentStyle={{ justifyContent: 'center' }} gap={spacing.lg}>
        <View testID="locked-day-screen" style={{ gap: spacing.lg }}>
          <LockBody dayNumber={dayNumber} dateLabel={dateLabel} kind={kind} />
          <Button title="Voltar para a Jornada" onPress={goHome} testID="locked-day-home" />
        </View>
      </ScreenScroll>
    </Screen>
  );
}
