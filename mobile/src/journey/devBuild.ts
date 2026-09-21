/**
 * Verdadeiro só em build de desenvolvimento. Lido a cada chamada (e não uma vez
 * na carga do módulo) para que os testes possam simular um build de release
 * trocando `__DEV__` sem recarregar o módulo.
 *
 * Tudo o que é ferramenta de desenvolvimento (painel /dev, dia simulado,
 * fixtures fictícias, modo 'development' do carregador) passa por aqui: em
 * release nada disso pode ter efeito (achados DIA-01, PER-01, DIR-01).
 */
export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}
