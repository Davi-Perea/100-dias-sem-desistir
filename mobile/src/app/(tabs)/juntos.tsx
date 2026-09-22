import { COMMUNITY_ENABLED } from '@/config/features';
import { FeedScreen } from '@/ui/comunidade/feed/FeedScreen';
import { JuntosSemComunidade } from '@/ui/comunidade/feed/JuntosSemComunidade';

/**
 * Aba Juntos (pedido do fundador, 2026-09-22: o nome é "Juntos", não
 * "Comunidade").
 *
 * Com `COMMUNITY_ENABLED` ligado, é o feed (C1): quem toca na aba cai direto
 * nele, já dentro (entrada automática, sem código, sem e-mail, sem perfil).
 * Desligado (a V1), a aba sai da
 * barra e a rota, ainda alcançável por link, mostra só o que não depende do
 * feed: o altar das 12h30 e a orientação da igreja.
 */
export default function JuntosTab() {
  return COMMUNITY_ENABLED ? <FeedScreen /> : <JuntosSemComunidade />;
}
