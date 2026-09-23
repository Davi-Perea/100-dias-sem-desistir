import { Platform } from 'react-native';

/**
 * Existe lembrete nesta plataforma?
 *
 * Não, no navegador. Os lembretes do app são notificações LOCAIS, agendadas pelo
 * próprio celular (`expo-notifications`). Na web isso não existe: a alternativa
 * seria push remoto, com service worker e servidor de envio, que é outro produto
 * e não vai entrar agora.
 *
 * Até 23/09/2026 a entrada do app perguntava o horário do lembrete também no
 * navegador. A pergunta não tinha resposta errada nem certa — nada seria
 * agendado de qualquer jeito. Um passo assim gasta a confiança da pessoa logo no
 * começo: ela escolhe, e nada acontece. Por isso ele sai (achado no teste com
 * usuário real, Android).
 *
 * Esta constante é a ÚNICA chave. Ligar lembrete na web um dia é implementar o
 * push e trocar esta linha — não caçar tela por tela. E a versão de loja
 * (iOS/Android nativos) continua com o lembrete inteiro, intocada.
 */
export const REMINDERS_AVAILABLE = Platform.OS !== 'web';
