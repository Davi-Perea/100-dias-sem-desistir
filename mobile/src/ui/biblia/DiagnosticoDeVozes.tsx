import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { DIAG_VOZ } from '@/config/features';
import {
  ehLocal,
  ESPERA_MAXIMA_MS,
  observarVozes,
  sexoDaVoz,
  sinteseDisponivel,
  vozesPtLocaisTodas,
} from '@/reader/audio/vozPtBr';
import { AppText } from '@/ui/components';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

/**
 * DIAGNÓSTICO DE VOZES — TEMPORÁRIO, SÓ NO RASCUNHO.
 *
 * Terceira e última tentativa de responder UMA pergunta: quais vozes existem no
 * aparelho do fundador, e qual delas é masculina.
 *
 * O QUE MUDOU DAS ANTERIORES, e por que elas não bastaram:
 *
 *  1. ficava em /biblia. O fundador usa /reader/<dia> — é por ali que a jornada
 *     passa todo dia. Agora fica onde ele está;
 *  2. listava só as vozes LOCAIS de português. Se o aparelho não tiver nenhuma,
 *     a tela dizia "nenhuma" e a investigação morria ali, sem distinguir três
 *     casos muito diferentes: não há voz alguma, há voz de português mas de
 *     servidor, ou há voz local que o classificador não reconhece. Agora mostra
 *     TODAS as de português, locais ou não, com o `localService` de cada uma;
 *  3. quando não houver nenhuma de português, lista TODAS as vozes do aparelho
 *     com o idioma. Saber que só existe en-US é uma resposta, e fecha o caso.
 *
 * DUAS COISAS QUE ELE NÃO RELAXA:
 *  - só voz LOCAL ganha botão "Testar". Voz de servidor aparece na lista, para
 *    ser vista, e não fala: a regra de privacidade não tem exceção de depuração;
 *  - não mexe no player. O que o produto usa continua sendo só voz masculina.
 *
 * O filtro de SEXO é que fica de fora aqui, de propósito: a lista existe
 * justamente para achar a voz que o filtro não está reconhecendo.
 *
 * Nasce desligado (EXPO_PUBLIC_DIAG_VOZ) e SAI do código quando a voz for
 * identificada. Não vai para a produção nem desligado.
 */

/** Curta, conhecida, e a mesma para todas: o que muda entre os testes é só a voz. */
const FRASE = 'No princípio criou Deus os céus e a terra.';

const PT = /^pt(-|_|$)/i;

type Linha = {
  nome: string;
  voiceURI: string;
  lang: string;
  local: boolean;
  sexo: string;
  voz: SpeechSynthesisVoice;
};

export function DiagnosticoDeVozes() {
  const { colors } = useTheme();
  // Não é estado: a resposta não muda durante a vida da tela, e guardá-la em
  // useState obrigaria a escrevê-la de dentro de um efeito.
  const apiOk = sinteseDisponivel();
  const [total, setTotal] = useState(0);
  const [portuguesas, setPortuguesas] = useState<Linha[]>([]);
  /** Só preenchida quando NÃO há voz de português: aí o que há importa. */
  const [outras, setOutras] = useState<string[]>([]);
  /** Sem a API não há o que procurar: já nasce encerrado. */
  const [procurando, setProcurando] = useState(apiOk);
  const [falando, setFalando] = useState<string | null>(null);

  useEffect(() => {
    if (!DIAG_VOZ || !apiOk) return;

    /*
     * A MESMA observação do produto: espera o `voiceschanged` e reconsulta em
     * intervalos que crescem. Concluir "não há voz" cedo demais foi um defeito
     * real (24/09/2026) — o diagnóstico não pode repeti-lo, ou mediria errado.
     */
    const parar = observarVozes(() => {
      let todas: SpeechSynthesisVoice[] = [];
      try {
        todas = globalThis.speechSynthesis.getVoices() ?? [];
      } catch {
        todas = [];
      }
      setTotal(todas.length);

      const pt = todas.filter((v) => PT.test(v.lang));
      setPortuguesas(
        pt.map((voz) => ({
          nome: voz.name,
          voiceURI: voz.voiceURI ?? '(sem voiceURI)',
          lang: voz.lang,
          local: ehLocal(voz),
          // A classificação é feita sobre nome E voiceURI: o marcador
          // "#male_1-local" do Android às vezes só aparece no voiceURI.
          sexo: sexoDaVoz(`${voz.name} ${voz.voiceURI ?? ''}`.toLowerCase()),
          voz,
        })),
      );
      setOutras(pt.length === 0 ? todas.map((v) => `${v.name} [${v.lang}]`) : []);
    }, vozesPtLocaisTodas);

    const prazo = setTimeout(() => setProcurando(false), ESPERA_MAXIMA_MS);

    return () => {
      parar();
      clearTimeout(prazo);
      try {
        globalThis.speechSynthesis?.cancel();
      } catch {
        // Nada a cancelar.
      }
    };
  }, [apiOk]);

  if (!DIAG_VOZ) return null;

  const testar = (linha: Linha) => {
    // Voz de servidor não fala nem em diagnóstico. Guarda dupla: o botão já não
    // é desenhado, e ainda assim a função recusa.
    if (!linha.local) return;
    try {
      globalThis.speechSynthesis.cancel();
    } catch {
      return;
    }
    const fala = new SpeechSynthesisUtterance(FRASE);
    fala.voice = linha.voz;
    fala.lang = linha.lang;
    // Velocidade normal do app, para a comparação ser a mesma do produto.
    fala.rate = 0.9;
    fala.onend = () => setFalando(null);
    fala.onerror = () => setFalando(null);
    setFalando(linha.nome);
    globalThis.speechSynthesis.speak(fala);
  };

  const linha = (t: string, forte = false) => (
    <AppText variant="caption" style={{ color: forte ? colors.text : colors.textMuted }}>
      {t}
    </AppText>
  );

  return (
    <View
      testID="diagnostico-de-vozes"
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
        Diagnóstico de vozes (temporário)
      </AppText>

      {linha(`speechSynthesis disponível: ${apiOk ? 'SIM' : 'NÃO'}`, true)}
      {linha(`plataforma: ${Platform.OS}`)}
      {linha(`vozes carregadas: ${total}`, true)}
      {linha(`vozes em português: ${portuguesas.length}`, true)}
      {linha(procurando ? 'ainda procurando (a lista pode crescer)…' : 'procura encerrada')}

      {portuguesas.map((v) => (
        <View
          key={`${v.nome}|${v.voiceURI}`}
          style={{
            gap: 2,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {linha(`nome: ${v.nome}`, true)}
          {linha(`voiceURI: ${v.voiceURI}`)}
          {linha(`lang: ${v.lang}`)}
          {linha(`localService: ${v.local ? 'true' : 'false'}`)}
          {linha(`classificação de hoje: ${v.sexo}`, true)}

          {v.local ? (
            <Pressable
              onPress={() => testar(v)}
              accessibilityRole="button"
              accessibilityLabel={`Ouvir a voz ${v.nome}`}
              testID={`diag-testar-${v.nome}`}
              style={({ pressed }) => [
                {
                  minHeight: MIN_TOUCH,
                  alignSelf: 'flex-start',
                  justifyContent: 'center',
                  marginTop: spacing.xs,
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
          ) : (
            linha('sem botão: voz de servidor não é usada nem para testar')
          )}
        </View>
      ))}

      {outras.length > 0 ? (
        <View style={{ gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
          {linha('Nenhuma voz de português. O que existe neste aparelho:', true)}
          {outras.map((n) => linha(`   • ${n}`))}
        </View>
      ) : null}
    </View>
  );
}
