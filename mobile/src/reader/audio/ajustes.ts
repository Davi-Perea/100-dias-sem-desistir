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
