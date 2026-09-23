import { type ReactElement, useState } from 'react';
import { View } from 'react-native';

import {
  CUSTOM_GOAL_LABEL,
  CUSTOM_GOAL_MAX,
  CUSTOM_GOAL_PLACEHOLDER,
  normalizeCustomGoal,
} from '@/config/goals';

import { AppText } from '../components';
import { TextField } from '../TextField';
import { spacing } from '../theme';
import { GoalRow } from './GoalRow';

/**
 * "Outra meta" (feedback do fundador, 2026-09-22): a meta que a pessoa escreve
 * com as palavras dela, ao lado das metas prontas.
 *
 * A linha é a MESMA `GoalRow` das outras (caixa quadrada, múltipla escolha, piso
 * 62): marcar abre o campo logo abaixo; desmarcar apaga a meta escrita — deixar
 * um texto guardado numa linha desmarcada seria guardar dado de fé que a pessoa
 * acabou de tirar.
 *
 * O campo grava a cada letra (como o nome em /metas): sair da tela com o teclado
 * aberto não perde o que foi escrito. `CUSTOM_GOAL_MAX` corta no campo e de novo
 * na gravação.
 *
 * A MESMA linha serve as duas telas onde a meta vale (pedido do fundador: "na
 * entrada e em /metas"), e a regra não é escrita duas vezes: `row` troca só o
 * molde visual — `GoalRow` na entrada, `ToggleRow` no ritmo de Você.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) O desenho da
 * entrada não tem esta linha. Fica o molde que já existe — `GoalRow` mais o
 * `TextField` de uma linha do passo do nome —, sem inventar tipografia nova.
 */
export type CustomGoalRowMold = (props: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testID?: string;
}) => ReactElement;

export function CustomGoalRow({
  value,
  onChange,
  row: Row = GoalRow,
  testID = 'goal-custom',
  fieldTestID = 'goal-custom-input',
}: {
  /** O que está gravado (`profile.customGoal`), ou null. */
  value: string | null;
  /** Já normalizado: null quando a pessoa apagou tudo. */
  onChange: (next: string | null) => void;
  /** Molde da linha. Padrão: a `GoalRow` da entrada. */
  row?: CustomGoalRowMold;
  testID?: string;
  fieldTestID?: string;
}) {
  // Sem toque (`null`), a linha segue o que está gravado: as preferências chegam
  // do disco depois da primeira pintura, e com meta guardada a linha nasce
  // marcada assim que elas chegam. Um toque passa a mandar.
  const [tapped, setTapped] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  // O teclado só abre quando foi a pessoa que marcou a linha agora.
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const open = tapped ?? value !== null;
  const text = draft ?? value ?? '';

  const toggle = () => {
    if (open) {
      setTapped(false);
      setDraft(null);
      setFocusOnOpen(false);
      if (value !== null) onChange(null);
      return;
    }
    setTapped(true);
    setFocusOnOpen(true);
  };

  const change = (next: string) => {
    // Quem está escrevendo manda: apagar tudo grava `null` (meta vazia não é meta)
    // mas NÃO fecha o campo no meio da digitação.
    setTapped(true);
    setDraft(next);
    onChange(normalizeCustomGoal(next));
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Row label={CUSTOM_GOAL_LABEL} checked={open} onToggle={toggle} testID={testID} />
      {open ? (
        <View style={{ gap: spacing.xs }}>
          <TextField
            minHeight={56}
            multiline={false}
            value={text}
            onChangeText={change}
            onBlur={() => setDraft(normalizeCustomGoal(text) ?? '')}
            maxLength={CUSTOM_GOAL_MAX}
            autoFocus={focusOnOpen}
            autoCapitalize="sentences"
            returnKeyType="done"
            accessibilityLabel={CUSTOM_GOAL_LABEL}
            placeholder={CUSTOM_GOAL_PLACEHOLDER}
            testID={fieldTestID}
          />
          <AppText variant="caption">{`Até ${CUSTOM_GOAL_MAX} caracteres. Fica só neste aparelho.`}</AppText>
        </View>
      ) : null}
    </View>
  );
}
