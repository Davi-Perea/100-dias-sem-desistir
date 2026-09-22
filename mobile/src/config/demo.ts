import { isDevBuild } from '@/journey/devBuild';

/**
 * Modo demonstração (pedido do fundador, 2026-09-21): ver o app "como se a
 * campanha já tivesse começado", sem o painel de desenvolvimento à vista.
 *
 * Só existe em build de desenvolvimento. Em release `isDevBuild()` é falso e
 * nada aqui liga, com qualquer valor nas variáveis. Ligar num development build:
 *
 *   mobile/.env.local  (ignorado pelo git)
 *     EXPO_PUBLIC_DEMO_MODE=true
 *     EXPO_PUBLIC_DEMO_DAY=3        # opcional; padrão 3
 *
 * "Um desconhecido instala no dia 23" (pedido do fundador, 2026-09-23): o
 * .env.local da prévia é DEMO_DAY=1, DEMO_SEED=false, COMMUNITY_ENABLED=true e
 * DEMO_FRESH_RUN=dia-23-desconhecido — Dia 1, sem progresso nenhum, sem
 * publicação própria, começando das boas-vindas. No Dia 1 não há dia anterior,
 * então nada fica "em aberto". A tela não diz que é demonstração; o CÓDIGO diz
 * (tudo aqui e em community/demoApi.ts só existe em __DEV__).
 *
 * O que ele faz:
 * - o dia da campanha vira EXPO_PUBLIC_DEMO_DAY, pelo mesmo caminho do dia
 *   simulado do painel DEV (useJourney), mas SEM gravar nas preferências: ao
 *   desligar o modo, o app volta à data real;
 * - na primeira abertura, sem progresso nenhum, marca os dias 1..(dia − 2) como
 *   concluídos, para a Jornada parecer em uso (o dia anterior fica em aberto);
 * - esconde a entrada "Painel de desenvolvimento" do Você.
 *
 * NÃO muda a faixa "aguardando autorização": ela é regra do conteúdo.
 *
 * O Metro só embute `process.env.EXPO_PUBLIC_*` escrito por extenso, com ponto;
 * por isso as leituras abaixo não usam acesso dinâmico.
 */

export const DEMO_DAY_DEFAULT = 3;
/** O dataset tem 100 dias; o limite superior real vem da campanha no useJourney. */
const DEMO_DAY_MAX = 100;

export function isDemoMode(): boolean {
  if (!isDevBuild()) return false;
  return process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
}

/** Dia simulado do modo demonstração, ou null quando o modo está desligado. */
export function demoDay(): number | null {
  if (!isDemoMode()) return null;
  const raw = process.env.EXPO_PUBLIC_DEMO_DAY;
  const n = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= DEMO_DAY_MAX ? n : DEMO_DAY_DEFAULT;
}

/**
 * "Pessoa nova" (EXPO_PUBLIC_DEMO_SEED=false): sem progresso de exemplo e sem
 * publicação própria de exemplo na Comunidade — o app como alguém que acabou
 * de instalar no Dia N o veria.
 */
export function demoSeedEnabled(): boolean {
  return isDemoMode() && process.env.EXPO_PUBLIC_DEMO_SEED !== 'false';
}

/**
 * Começo do zero a cada rodada (EXPO_PUBLIC_DEMO_FRESH_RUN=<id>): na primeira
 * abertura com um id novo, o app apaga os dados locais deste aparelho, para a
 * próxima pessoa testar desde as boas-vindas. Só em demonstração.
 */
export function demoFreshRunId(): string | null {
  if (!isDemoMode()) return null;
  const id = process.env.EXPO_PUBLIC_DEMO_FRESH_RUN;
  return id && id.trim() !== '' ? id.trim() : null;
}

/** Dias que a demonstração marca como concluídos: 1..(dia − 2). Vazio nos dias 1 e 2. */
export function demoSeedDays(day: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= day - 2; d++) out.push(d);
  return out;
}
