import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { DIAG_VOZ } from '@/config/features';
import { ehLocal, sinteseDisponivel } from '@/reader/audio/vozPtBr';
import { AppText } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/**
 * DIAGNÓSTICO DE VOZ — TEMPORÁRIO, SÓ NO RASCUNHO.
 *
 * Existe por uma razão só: em 24/09/2026 o player não apareceu no aparelho do
 * fundador, e adivinhar o motivo à distância é perda de tempo. Isto mostra o que
 * o navegador dele responde, sem eu precisar estar lá.
 *
 * Nasce DESLIGADO. Só aparece com `EXPO_PUBLIC_DIAG_VOZ=true` no build, e o
 * empacotador remove tudo quando a chave não existe. SAI assim que a causa for
 * confirmada — não é tela de produto.
 *
 * Não mexe em nada: só lê e mostra.
 */

type Foto = {
  temApi: boolean;
  totalVozes: number;
  todasPt: { nome: string; lang: string; local: boolean }[];
  amostraDeOutras: string[];
  quandoMs: number;
};

function tirarFoto(desde: number): Foto {
  if (!sinteseDisponivel()) {
    return { temApi: false, totalVozes: 0, todasPt: [], amostraDeOutras: [], quandoMs: Date.now() - desde };
  }
  let todas: SpeechSynthesisVoice[] = [];
  try {
    todas = globalThis.speechSynthesis.getVoices() ?? [];
  } catch {
    todas = [];
  }
  const pt = todas.filter((v) => /^pt/i.test(v.lang));
  return {
    temApi: true,
    totalVozes: todas.length,
    todasPt: pt.map((v) => ({ nome: v.name, lang: v.lang, local: ehLocal(v) })),
    // Se não há voz pt, saber que EXISTEM vozes (e quais) separa "motor vazio"
    // de "motor sem português".
    amostraDeOutras: pt.length === 0 ? todas.slice(0, 4).map((v) => `${v.name} [${v.lang}]`) : [],
    quandoMs: Date.now() - desde,
  };
}

export function DiagnosticoVoz({
  estado,
  vozEscolhida,
  playerVisivel,
}: {
  estado: string;
  vozEscolhida: string | null;
  playerVisivel: boolean;
}) {
  const { colors } = useTheme();
  const [foto, setFoto] = useState<Foto | null>(null);

  useEffect(() => {
    if (!DIAG_VOZ) return;
    const desde = Date.now();
    const atualizar = () => setFoto(tirarFoto(desde));
    atualizar();
    // Acompanha as mesmas janelas em que o app procura vozes, para o fundador
    // ver se elas chegam atrasadas.
    const timers = [300, 1000, 2500, 5000, 9500].map((ms) => setTimeout(atualizar, ms));
    const alvo = sinteseDisponivel() ? globalThis.speechSynthesis : null;
    alvo?.addEventListener?.('voiceschanged', atualizar);
    return () => {
      timers.forEach(clearTimeout);
      alvo?.removeEventListener?.('voiceschanged', atualizar);
    };
  }, []);

  if (!DIAG_VOZ || !foto) return null;

  const ptLocais = foto.todasPt.filter((v) => v.local);
  const motivo = !foto.temApi
    ? 'este navegador não tem speechSynthesis'
    : foto.totalVozes === 0
      ? 'o navegador não devolveu voz NENHUMA (nem em outros idiomas)'
      : foto.todasPt.length === 0
        ? 'há vozes, mas nenhuma em português'
        : ptLocais.length === 0
          ? 'há vozes em português, mas TODAS são de servidor (localService=false) — e voz remota é proibida por decisão de privacidade'
          : estado === 'carregando'
            ? 'ainda procurando (não é conclusão)'
            : 'nenhum: o player deveria estar visível';

  const linha = (t: string) => (
    <AppText variant="caption" style={{ color: colors.text }}>
      {t}
    </AppText>
  );

  return (
    <View
      testID="diagnostico-voz"
      style={{
        gap: 2,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.warning,
        backgroundColor: colors.warningSurface,
        borderRadius: 12,
      }}
    >
      <AppText variant="cap" style={{ color: colors.warning }}>
        Diagnóstico de voz (temporário)
      </AppText>
      {linha(`plataforma: ${Platform.OS} · medido ${foto.quandoMs} ms após abrir`)}
      {linha(`speechSynthesis: ${foto.temApi ? 'SIM' : 'NÃO'}`)}
      {linha(`vozes carregadas: ${foto.totalVozes}`)}
      {linha(`vozes pt: ${foto.todasPt.length} · locais: ${ptLocais.length}`)}
      {foto.todasPt.map((v) => linha(`   • ${v.nome} | ${v.lang} | localService=${String(v.local)}`))}
      {foto.amostraDeOutras.map((v) => linha(`   (outro idioma) ${v}`))}
      {linha(`estado do motor: ${estado}`)}
      {linha(`voz escolhida: ${vozEscolhida ?? '—'}`)}
      {linha(`player visível: ${playerVisivel ? 'SIM' : 'NÃO'}`)}
      {linha(`motivo: ${motivo}`)}
    </View>
  );
}
