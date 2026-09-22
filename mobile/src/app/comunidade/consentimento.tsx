import { Redirect, useLocalSearchParams } from 'expo-router';

import { flowParams, parseDay, ROUTES, safeNext } from '@/ui/comunidade/publicar/fluxo';

/**
 * A TELA DE ACEITE SAIU (decisão do fundador, 2026-09-22).
 *
 * Antes, esta era a tela única de aceite: 16+, regras, consentimento destacado e o
 * nome, antes da primeira publicação, do primeiro comentário ou do primeiro Amém.
 * Agora nada disso é uma tela no meio do caminho: embaixo do botão de publicar (e
 * do enviar comentário) há a linha "Ao publicar, você confirma que tem 16 anos ou
 * mais e aceita as regras do Juntos.", com link para as regras, e o próprio toque
 * no botão registra o aceite (as mesmas RPCs, em `publicar/aceite.ts`) e faz a
 * ação em seguida.
 *
 * O arquivo continua existindo porque a rota existe: um link antigo (um deep link
 * guardado, uma tela que ainda empurra `/comunidade/consentimento`) não pode cair
 * no vazio. Quem chega aqui vai para as REGRAS, que é onde os dois textos do
 * aceite — as regras e o consentimento destacado — podem ser lidos. Nada é
 * registrado por navegar: o aceite só acontece no toque do botão.
 */
export default function AceiteRouteGone() {
  const params = useLocalSearchParams<{ next?: string; day?: string }>();
  return (
    <Redirect
      href={
        {
          pathname: ROUTES.regras,
          params: { ...flowParams(safeNext(params.next), parseDay(params.day)), ler: '1' },
        } as never
      }
    />
  );
}
