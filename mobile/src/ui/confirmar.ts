import { Alert, Platform } from 'react-native';

/**
 * Pergunta de confirmação que funciona nos três lugares onde o app roda.
 *
 * AUDITORIA DE LANÇAMENTO WEB, 2026-09-23 (P0): `Alert.alert` do
 * react-native-web é um NO-OP — literalmente `static alert() {}`
 * (node_modules/react-native-web/dist/exports/Alert/index.js). Nada aparece e
 * nenhum `onPress` roda. Quem abrisse o app pelo navegador encontrava:
 *
 *  - "Apagar meus dados deste aparelho" como botão morto — o ÚNICO caminho de
 *    exclusão dos dados sensíveis, que a tela de Privacidade promete;
 *  - "Excluir reflexão" como botão morto;
 *  - e, pior, "Cancelar" na reflexão com texto não salvo deixava a pessoa
 *    PRESA na tela, porque a saída estava dentro do diálogo que nunca abria.
 *
 * Na web usa o `confirm` do próprio navegador, que é bloqueante e devolve
 * booleano. Não é bonito, mas é o que existe sem inventar um sistema de modais
 * — e um diálogo feio é infinitamente melhor que um botão que não faz nada.
 * No iOS e no Android nada muda: continua o `Alert.alert` de sempre.
 */
export type ConfirmacaoPedido = {
  titulo: string;
  mensagem?: string;
  /** Rótulo do botão que confirma ("Excluir", "Descartar", "Apagar tudo"). */
  confirmar: string;
  /** Rótulo do botão que desiste. Padrão: "Cancelar". */
  cancelar?: string;
  /** Ação perigosa: pinta em vermelho no iOS. */
  destrutivo?: boolean;
};

export function confirmar(pedido: ConfirmacaoPedido, aoConfirmar: () => void): void {
  if (Platform.OS === 'web') {
    // `confirm` pode não existir (SSR da exportação estática) ou ser bloqueado
    // pelo navegador. Se não der para perguntar, NÃO agimos: ninguém apaga uma
    // reflexão por engano porque o diálogo falhou.
    const perguntar = typeof globalThis !== 'undefined' ? (globalThis as { confirm?: (m: string) => boolean }).confirm : undefined;
    if (typeof perguntar !== 'function') return;
    const texto = pedido.mensagem ? `${pedido.titulo}\n\n${pedido.mensagem}` : pedido.titulo;
    if (perguntar(texto)) aoConfirmar();
    return;
  }
  Alert.alert(pedido.titulo, pedido.mensagem, [
    { text: pedido.cancelar ?? 'Cancelar', style: 'cancel' },
    { text: pedido.confirmar, style: pedido.destrutivo ? 'destructive' : 'default', onPress: aoConfirmar },
  ]);
}

/**
 * Aviso sem pergunta (um botão só). Mesmo problema, mesma solução: na web o
 * `alert` do navegador, no aparelho o `Alert.alert`.
 */
export function avisar(titulo: string, mensagem?: string): void {
  if (Platform.OS === 'web') {
    const dizer = typeof globalThis !== 'undefined' ? (globalThis as { alert?: (m: string) => void }).alert : undefined;
    if (typeof dizer !== 'function') return;
    dizer(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    return;
  }
  Alert.alert(titulo, mensagem);
}
