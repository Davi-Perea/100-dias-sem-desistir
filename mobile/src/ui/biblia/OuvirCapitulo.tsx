import { View } from 'react-native';

import { useOuvirCapitulo } from '@/reader/audio/useOuvirCapitulo';
import { AppText, Button } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/**
 * ▶ Ouvir capítulo — prova de conceito (23/09/2026), só Gênesis 1, só rascunho.
 *
 * Três botões e uma linha de diagnóstico. Nada de player: barra de progresso,
 * velocidade, tela bloqueada e próximo capítulo ficam fora até a qualidade da
 * voz ser aprovada.
 *
 * Quando NÃO há voz local em português, este componente não desenha nada — em
 * vez de um botão desligado que ninguém entende. A regra e o porquê estão em
 * `reader/audio/vozPtBr.ts`.
 *
 * A linha "voz: … · versículo N" existe para esta rodada de teste: é assim que o
 * fundador diz qual voz o aparelho dele escolheu. Sai junto com a POC.
 */
export function OuvirCapitulo({
  versiculos,
  chaveDoCapitulo,
}: {
  /** SÓ texto bíblico. Nada escrito pela pessoa entra aqui. */
  versiculos: readonly string[];
  chaveDoCapitulo: string;
  total?: number;
}) {
  const { colors } = useTheme();
  const leitura = useOuvirCapitulo(versiculos, chaveDoCapitulo);

  // Só faz sentido com mais de uma voz para comparar.
  if (leitura.vozes.length < 2) return null;

  return (
    <View testID="ouvir-capitulo" style={{ gap: spacing.xs }}>
      <AppText variant="caption" style={{ color: colors.textMuted }} testID="ouvir-diagnostico">
        {`experimento · voz: ${leitura.vozEscolhida?.nome ?? '—'} (local)`}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        {leitura.vozes.map((v) => (
          <Button
            key={v.nome}
            title={v.nome === leitura.vozEscolhida?.nome ? `• ${v.nome}` : v.nome}
            variant="underline"
            onPress={() => leitura.escolherVoz(v.nome)}
            testID={`ouvir-voz-${v.nome}`}
          />
        ))}
      </View>
    </View>
  );
}
