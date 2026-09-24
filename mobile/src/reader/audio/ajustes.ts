/**
 * OS NÚMEROS DA LEITURA EM VOZ ALTA — todos num lugar só.
 *
 * Cada um saiu de medição, não de gosto. A comparação cega de Gênesis 1:1-10
 * (23/09/2026) está descrita em cada constante.
 *
 * Decisão do fundador no mesmo dia: SÓ voz do aparelho, gratuita. Nada de TTS
 * pago, nada de servidor de voz, nada de texto saindo do aparelho.
 */

/**
 * Velocidade da fala.
 *
 * Comparei 0,82 · 0,84 · 0,90 · 0,95 · 1,00 na mesma passagem. 1,00 é rápido
 * demais para leitura devocional — atropela a pontuação de Almeida. Abaixo de
 * 0,85 a voz começa a arrastar e soa artificial de outro jeito. 0,90 ficou no
 * ponto: dá fôlego às orações sem parecer lenta.
 */
export const VELOCIDADE = 0.9;

/**
 * AS VELOCIDADES QUE A PESSOA ESCOLHE.
 *
 * O rótulo não é a taxa do motor, e isso é deliberado. "1x" quer dizer "a
 * velocidade normal DESTE app", que é 0,90 — a que ficou boa na comparação. Se
 * "1x" virasse 1,0 do motor, quem nunca mexeu no controle passaria a ouvir mais
 * rápido do que ouvia, sem ter pedido nada.
 *
 * AS TAXAS NÃO SÃO PROPORCIONAIS AOS RÓTULOS, e isso é medição, não descuido.
 *
 * A primeira versão usava 0,70 · 0,90 · 1,10 · 1,30 — proporcional e elegante no
 * papel. O fundador testou e disse que a velocidade "não muda mesmo". Fui medir
 * a mesma frase no motor (24/09/2026):
 *
 *   taxa 0,55 → 4889 ms    taxa 0,90 → ~4168 ms   taxa 1,95 → 3265 ms
 *   taxa 2,50 → 2969 ms    taxa 3,00 → 2536 ms    taxa 4,00 → 2234 ms
 *
 * O motor COMPRIME a faixa: a primeira versão pedia de 0,7 a 1,3 — 86% a mais no
 * papel, 1,22× na prática. Quatro degraus dentro disso são imperceptíveis, e ele
 * estava certo.
 *
 * Então os pedidos se afastam, na proporção que a curva medida exige para cada
 * rótulo entregar mais ou menos o que promete. Motores comprimem de formas
 * diferentes, então os rótulos são aproximados POR NATUREZA: dizem "mais
 * devagar" e "mais rápido", não uma razão exata. Ordem crescente é a única
 * garantia que vale em todo aparelho.
 *
 * 1,75x e 2x entraram a pedido do fundador em 24/09/2026, depois de confirmar
 * que a escala funcionava.
 */
export type Velocidade = { rotulo: string; taxa: number };

export const VELOCIDADES: readonly Velocidade[] = [
  { rotulo: '0,75x', taxa: 0.55 },
  { rotulo: '1x', taxa: VELOCIDADE },
  { rotulo: '1,25x', taxa: 1.4 },
  { rotulo: '1,5x', taxa: 1.95 },
  { rotulo: '1,75x', taxa: 3.0 },
  { rotulo: '2x', taxa: 4.0 },
];

export const VELOCIDADE_PADRAO = '1x';

/** A taxa de um rótulo. Rótulo desconhecido (preferência antiga) volta ao padrão. */
export function taxaDe(rotulo: string): number {
  return VELOCIDADES.find((v) => v.rotulo === rotulo)?.taxa ?? VELOCIDADE;
}

/**
 * Altura da voz: a padrão.
 *
 * As vozes locais de português são concatenativas, não neurais. Mexer no pitch
 * nelas não muda o timbre — introduz artefato metálico. Testado e descartado.
 */
export const ALTURA = 1.0;

/**
 * Tamanho alvo de cada trecho falado, em caracteres.
 *
 * Esta é a constante que mais mudou a qualidade, e pelo motivo menos óbvio. O
 * primeiro teste falava UM VERSÍCULO por vez e soava picado; eu supus que fosse
 * o silêncio entre falas. Medi: a borda custa só ~98 ms. O problema é que cada
 * fala nova REINICIA A ENTONAÇÃO — começa como início de frase e termina
 * caindo. Um versículo que continua a ideia soava como afirmação encerrada.
 *
 * Agrupar até ~320 caracteres deixa o motor carregar a entonação através da
 * oração inteira. Acima disso o "Continuar" começa a voltar longe demais, e
 * alguns motores esbarram no próprio limite de tamanho.
 */
export const ALVO_DE_CARACTERES = 320;

/**
 * Silêncio entre trechos, em milissegundos.
 *
 * Só 350: o motor já põe ~98 ms na borda, e a pontuação normalizada já produz a
 * parada de frase. Mais que isso vira intervalo, não respiração.
 */
export const PAUSA_ENTRE_TRECHOS_MS = 350;
