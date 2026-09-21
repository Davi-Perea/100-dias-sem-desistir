import { COMMUNITY_ENABLED } from '@/config/features';
import { FeedScreen } from '@/ui/comunidade/feed/FeedScreen';
import { JuntosSemComunidade } from '@/ui/comunidade/feed/JuntosSemComunidade';

/**
 * Aba Comunidade (a rota continua `juntos` para não quebrar quem já navega
 * para ela).
 *
 * Com `COMMUNITY_ENABLED` ligado, é o feed (C1). Desligado (a V1), a aba sai da
 * barra e a rota, ainda alcançável por link, mostra só o que não depende do
 * feed: o altar das 12h30 e a orientação da igreja.
 */
export default function CommunityTab() {
  return COMMUNITY_ENABLED ? <FeedScreen /> : <JuntosSemComunidade />;
}
