/**
 * "há 2 h" do cartão (C1) e do comentário (C6), com a versão falada por extenso
 * ("há 2 horas"): o leitor de tela não deve ler "h" como letra.
 *
 * Datas no fuso de Brasília, como a campanha. Data inválida ou no futuro
 * (relógio do aparelho atrasado) vira "agora", nunca "há -3 min".
 */
export type RelativeTime = { short: string; spoken: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string, now: number = Date.now()): RelativeTime {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return { short: '', spoken: '' };
  const diff = now - at;
  if (diff < MINUTE) return { short: 'agora', spoken: 'agora' };
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return { short: `há ${m} min`, spoken: m === 1 ? 'há 1 minuto' : `há ${m} minutos` };
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return { short: `há ${h} h`, spoken: h === 1 ? 'há 1 hora' : `há ${h} horas` };
  }
  const d = Math.floor(diff / DAY);
  if (d === 1) return { short: 'ontem', spoken: 'ontem' };
  if (d < 7) return { short: `há ${d} dias`, spoken: `há ${d} dias` };
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })
    .format(new Date(at))
    .replace('.', '');
  return { short: date, spoken: date };
}

/** "Dia 17 · há 2 h" e a versão falada sem o "·" (REGRAS 32). */
export function postMeta(dayNumber: number | null, iso: string, now?: number): RelativeTime {
  const when = relativeTime(iso, now);
  const parts = [dayNumber ? `Dia ${dayNumber}` : null, when.short || null].filter(Boolean);
  const spoken = [dayNumber ? `Dia ${dayNumber}` : null, when.spoken || null].filter(Boolean);
  return { short: parts.join(' · '), spoken: spoken.join(', ') };
}
