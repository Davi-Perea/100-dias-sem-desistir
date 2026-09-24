import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { DIAG_VOZ } from '@/config/features';
import {
  ehLocal,
  observarVozes,
  sexoDaVoz,
  sinteseDisponivel,
  vozesPtLocaisTodas,
  type VozLocal,
} from '@/reader/audio/vozPtBr';
import { AppText } from '@/ui/components';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

/**
 * IDENTIFICAÇÃO DE VOZES — TEMPORÁRIA, SÓ NO RASCUNHO.
 *
 * Em 24/09/2026 o player sumiu do aparelho do fundador: a regra de voz masculina
 * passou a ser filtro, e nenhuma voz do celular dele foi reconhecida como
 * masculina. Como a Web Speech API não informa o sexo da voz, não há como
 * descobrir isso à distância — alguém precisa OUVIR.
 *
 * Esta tela lista as vozes de português que rodam no aparelho e deixa ouvir cada
 * uma dizendo a mesma frase. Com o nome em mãos, a classificação em
 * `sexoDaVoz` é corrigida por identificação, e não por suposição.
 *
 * DUAS COISAS QUE ELA NÃO RELAXA:
 *  - só vozes LOCAIS. Voz de servidor não aparece nem para teste: a regra de
 *    privacidade não tem exceção de depuração;
 *  - não mexe no player. O que o produto usa continua sendo só voz masculina.
 *
 * O filtro de sexo é que fica de fora AQUI, de propósito: a lista existe
 * justamente para achar a voz que o filtro não está reconhecendo.
 *
 * Nasce desligada (EXPO_PUBLIC_DIAG_VOZ) e sai do código quando a voz for
 * identificada.
 */

/** Curta, conhecida, e a mesma para todas: o que muda entre os testes é só a voz. */
const FRASE = 'No princípio criou Deus os céus e a terra.';

export function TesteDeVozes() {
  const { colors } = useTheme();
  const [vozes, setVozes] = useState<VozLocal[]>([]);
  const [naoLocais, setNaoLocais] = useState<string[]>([]);
  const [falando, setFalando] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!DIAG_VOZ || !sinteseDisponivel()) return;
    // A MESMA observação do produto: espera o voiceschanged e reconsulta várias
    // vezes. Concluir "não há voz" cedo demais foi um defeito real antes.
    const parar = observarVozes((encontradas) => {
      setVozes(encontradas);
      const todas = globalThis.speechSynthesis.getVoices() ?? [];
      setTotal(todas.length);
      setNaoLocais(
        todas.filter((v) => /^pt/i.test(v.lang) && !ehLocal(v)).map((v) => `${v.name} [${v.lang}]`),
      );
    }, vozesPtLocaisTodas);
    return () => {
      parar();
      try {
        globalThis.speechSynthesis?.cancel();
      } catch {
        // Nada a cancelar.
      }
    };
  }, []);

  if (!DIAG_VOZ) return null;

  const testar = (v: VozLocal) => {
    try {
      globalThis.speechSynthesis.cancel();
    } catch {
      return;
    }
    const fala = new SpeechSynthesisUtterance(FRASE);
    fala.voice = v.voz;
    fala.lang = v.lang;
    // Velocidade normal do app, para a comparação ser a mesma do produto.
    fala.rate = 0.9;
    fala.onend = () => setFalando(null);
    fala.onerror = () => setFalando(null);
    setFalando(v.nome);
    globalThis.speechSynthesis.speak(fala);
  };

  const linha = (t: string) => (
    <AppText variant="caption" style={{ color: colors.text }}>
      {t}
    </AppText>
  );

  return (
    <View
      testID="teste-de-vozes"
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.warning,
        backgroundColor: colors.warningSurface,
        borderRadius: 12,
      }}
    >
      <AppText variant="cap" style={{ color: colors.warning }}>
        Identificação de vozes (temporário)
      </AppText>
      {linha(`${Platform.OS} · ${total} vozes no total · ${vozes.length} em português, no aparelho`)}

      {vozes.length === 0 ? (
        linha('Nenhuma voz de português roda neste aparelho. Sem isto, não há áudio possível.')
      ) : (
        vozes.map((v) => (
          <View
            key={v.nome}
            style={{
              gap: spacing.xs,
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {linha(v.nome)}
            {linha(`lang=${v.lang} · localService=true · hoje classificada: ${sexoDaVoz(v.nome.toLowerCase())}`)}
            <Pressable
              onPress={() => testar(v)}
              accessibilityRole="button"
              accessibilityLabel={`Ouvir a voz ${v.nome}`}
              testID={`testar-voz-${v.nome}`}
              style={({ pressed }) => [
                {
                  minHeight: MIN_TOUCH,
                  alignSelf: 'flex-start',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.button,
                  backgroundColor: falando === v.nome ? colors.warning : colors.text,
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <AppText variant="caption" style={{ color: colors.background }}>
                {falando === v.nome ? 'Falando…' : 'Testar'}
              </AppText>
            </Pressable>
          </View>
        ))
      )}

      {naoLocais.length > 0 ? (
        <View style={{ gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
          {linha('Vozes de português que NÃO rodam no aparelho (não usamos, nem para teste):')}
          {naoLocais.map((n) => linha(`   • ${n}`))}
        </View>
      ) : null}
    </View>
  );
}
