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
  total,
}: {
  /** SÓ texto bíblico. Nada escrito pela pessoa entra aqui. */
  versiculos: readonly string[];
  /** Muda quando o capítulo muda: é o gatilho que cala a fala. */
  chaveDoCapitulo: string;
  total: number;
}) {
  const { colors } = useTheme();
  const leitura = useOuvirCapitulo(versiculos, chaveDoCapitulo);

  if (leitura.estado === 'indisponivel' || leitura.estado === 'carregando') return null;

  const tocando = leitura.estado === 'tocando';
  const pausado = leitura.estado === 'pausado';

  return (
    <View
      testID="ouvir-capitulo"
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {tocando ? (
          <Button title="Pausar" variant="outline" onPress={leitura.pausar} testID="ouvir-pausar" />
        ) : pausado ? (
          <Button title="Continuar" onPress={leitura.continuar} testID="ouvir-continuar" />
        ) : (
          <Button title="Ouvir capítulo" onPress={leitura.tocar} testID="ouvir-tocar" />
        )}
        {tocando || pausado ? (
          <Button title="Parar" variant="underline" onPress={leitura.parar} testID="ouvir-parar" />
        ) : null}
      </View>

      <AppText variant="caption" testID="ouvir-diagnostico">
        {`voz: ${leitura.vozEscolhida?.nome ?? '—'} (${leitura.vozEscolhida?.lang ?? '—'}, local)`}
        {tocando || pausado ? ` · versículo ${leitura.versiculoAtual + 1} de ${total}` : ''}
      </AppText>

      {/* Mais de uma voz local: dá para comparar sem reinstalar nada. */}
      {leitura.vozes.length > 1 ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption">Outras vozes deste aparelho, para comparar:</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
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
      ) : null}
    </View>
  );
}
