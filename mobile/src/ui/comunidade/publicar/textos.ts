/**
 * Textos da Comunidade que a pessoa ACEITA ou LÊ antes de publicar: regras e
 * consentimento destacado (os dois na tela de regras, desde que a tela de aceite
 * saiu), a linha de aceite embaixo do botão de publicar e a frase única sobre quem
 * vê (C3 e B4).
 *
 * Fonte: `docs/legal/COMUNIDADE_REGRAS_E_CONSENTIMENTO_rascunho.md` (2026-09-21),
 * RASCUNHO PARA REVISÃO DE ADVOGADO. O texto foi copiado como está, com três
 * cuidados, todos mecânicos:
 *   1. Os campos que só a igreja pode dar (`[NOME DA IGREJA]`, `[N]`...) vêm de
 *      `CAMPOS`. Enquanto forem null, aparecem entre colchetes, como no rascunho:
 *      nada é inventado.
 *   2. As notas internas do rascunho (`[DECISÃO PENDENTE: …]`, `[ADVOGADO: …]`,
 *      `[CONFERIR: …]`, `[ENGENHARIA: …]`) são instruções para a igreja e o
 *      advogado, não texto para a pessoa, e ficaram de fora.
 *   3. `**assim**` marca o negrito do rascunho. A tela desenha o negrito; o hash
 *      é do texto com as marcas (ver `termsDocumentText`).
 *
 * Portão: o servidor só aceita o aceite da versão vigente com o sha256 do texto
 * exato que a tela mostrou. Enquanto a versão do servidor for `PENDENTE`, ninguém
 * aceita e ninguém publica, e as telas dizem isso. Quando o advogado aprovar, o
 * texto final entra AQUI, `version` recebe a versão aprovada e o sha256 de
 * `termsDocumentText(...)` é configurado no servidor.
 */

/** Valor que o servidor devolve enquanto o texto não foi aprovado. */
export const PENDING_VERSION = 'PENDENTE';

/** Campos que só a igreja (ou o fundador e o advogado) podem preencher. null = ainda não veio. */
export const CAMPOS: Record<CampoId, string | null> = {
  nomeIgreja: null,
  pessoasNaComunidade: null,
  razaoSocial: null,
  cnpj: null,
  emailPublicado: null,
  encarregado: null,
  links: null,
  paginaRetirarConteudo: null,
  paginaExclusao: null,
  prazoDenuncia: null,
  prazoPedirRevisao: null,
  prazoRespostaRevisao: null,
  dataFimPublicacao: null,
  dataApagamento: null,
  versaoRegras: null,
  dataRegras: null,
  versaoConsentimento: null,
  dataConsentimento: null,
  linkPolitica: null,
};

export type CampoId =
  | 'nomeIgreja'
  | 'pessoasNaComunidade'
  | 'razaoSocial'
  | 'cnpj'
  | 'emailPublicado'
  | 'encarregado'
  | 'links'
  | 'paginaRetirarConteudo'
  | 'paginaExclusao'
  | 'prazoDenuncia'
  | 'prazoPedirRevisao'
  | 'prazoRespostaRevisao'
  | 'dataFimPublicacao'
  | 'dataApagamento'
  | 'versaoRegras'
  | 'dataRegras'
  | 'versaoConsentimento'
  | 'dataConsentimento'
  | 'linkPolitica';

/** Como o campo aparece no rascunho quando ainda não foi preenchido. */
const PLACEHOLDER: Record<CampoId, string> = {
  nomeIgreja: '[NOME DA IGREJA]',
  pessoasNaComunidade: '[N]',
  razaoSocial: '[RAZÃO SOCIAL DA ENTIDADE]',
  cnpj: '[CNPJ]',
  emailPublicado: '[E-MAIL PUBLICADO]',
  encarregado: '[NOME OU CANAL DO ENCARREGADO]',
  links: '[LINKS]',
  paginaRetirarConteudo: '[ENDEREÇO DA PÁGINA "RETIRAR CONTEÚDO"]',
  paginaExclusao: '[ENDEREÇO DA PÁGINA DE EXCLUSÃO]',
  prazoDenuncia: '[PRAZO QUE A ESCALA CUMPRE]',
  prazoPedirRevisao: '[PRAZO PARA PEDIR]',
  prazoRespostaRevisao: '[PRAZO DE RESPOSTA]',
  dataFimPublicacao: '[DATA]',
  dataApagamento: '[DATA ANUNCIADA]',
  versaoRegras: '[VERSÃO]',
  dataRegras: '[DATA]',
  versaoConsentimento: '[VERSÃO]',
  dataConsentimento: '[DATA]',
  linkPolitica: '[LINK]',
};

export function campo(id: CampoId, campos: Record<CampoId, string | null> = CAMPOS): string {
  const value = campos[id];
  return value && value.trim().length > 0 ? value.trim() : PLACEHOLDER[id];
}

/** Um campo ainda vazio: a tela não pode tratar o texto como final. */
export function hasOpenFields(text: string): boolean {
  return Object.values(PLACEHOLDER).some((placeholder) => text.includes(placeholder));
}

/* ------------------------------------------------------ frase única (§3) */

/**
 * A frase única sobre quem vê, EXATAMENTE como o fundador pediu (feedback de
 * 2026-09-22, C5; o advogado revisa depois). Idêntica em publicar, no
 * consentimento, nas regras e depois de concluir (LGPD art. 9º, §1º). Saíram o
 * "hoje cerca de N pessoas", o "algumas você não conhece" e a menção a 18+.
 * Qualquer tela que diga quem vê usa ESTA função, nunca uma cópia.
 */
export const AUDIENCE_SENTENCE =
  'Sua publicação aparece com seu nome para as pessoas que entraram na comunidade da Lagoinha Brasília Capital.';

export function audienceSentence(): string {
  return AUDIENCE_SENTENCE;
}

/* ------------------------------------------------------------- documentos */

export type TermsSection = {
  /** Subtítulo da seção (o rascunho usa negrito). */
  title?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type TermsDocument = {
  purpose: 'community_rules' | 'community_publish';
  /**
   * Versão que ESTE texto representa. null = rascunho sem versão aprovada: o
   * aceite não é possível, seja qual for a versão do servidor.
   */
  version: string | null;
  title: string;
  sections: TermsSection[];
};

/**
 * Regras do Juntos (rascunho §1), ENCURTADAS a pedido do fundador (2026-09-22).
 *
 * Ficou só o que ele pediu: (a) o que é o Juntos, (b) o que não pode, (c) o que
 * pode e (d) o que é tirado do ar — mais as FUNÇÕES (denunciar, bloquear, apagar
 * o meu), que continuam existindo e precisam estar escritas para a pessoa achar.
 *
 * SAÍRAM, por decisão dele: a linha de versão e data no título, as seções "Fotos
 * de outras pessoas" e "Fotos de crianças e adolescentes" (o que importa delas
 * virou uma linha de "O que não pode"), "Como funciona o cuidado com o que é
 * publicado", "Se tirarem o que você publicou" e "Quem cuida desta comunidade".
 *
 * A linha do CVV (188) FICOU: ela não estava na lista de cortes e tirar uma rede
 * de segurança por conta própria seria decisão de produto, não de engenharia.
 *
 * O texto continua sendo rascunho para o advogado, e o portão continua fechado do
 * mesmo jeito: `version` sai de `campos.versaoRegras`, que é null, então
 * `termsAvailability` devolve 'pending' e ninguém aceita nem publica no app real.
 * Só o título perdeu os campos `[VERSÃO]`/`[DATA]`; o portão nunca dependeu deles.
 */
export function rulesDocument(campos: Record<CampoId, string | null> = CAMPOS): TermsDocument {
  return {
    purpose: 'community_rules',
    version: campos.versaoRegras,
    title: 'Regras do Juntos',
    sections: [
      {
        title: 'Um lugar para a igreja ler junto.',
        paragraphs: [
          'Aqui a gente conta o que Deus falou durante a leitura, o que achou dela, pede oração e agradece. ' +
            `${AUDIENCE_SENTENCE} Escreva como escreveria para um irmão na porta do templo.`,
        ],
      },
      {
        title: 'O que pode',
        bullets: [
          'O que você aprendeu na leitura do dia, e o que achou dela.',
          'Pedidos de oração e agradecimentos.',
          'Palavras de ânimo para quem está lendo junto.',
          'Foto da sua Bíblia, das suas anotações, do seu caderno.',
        ],
      },
      {
        title: 'O que não pode',
        bullets: [
          'Ofender, humilhar, debochar, ameaçar ou perseguir qualquer pessoa.',
          'Violência e nudez.',
          'Expor outra pessoa: foto, nome, endereço, telefone ou situação dela sem que ela queira.',
        ],
      },
      {
        title: 'O que é tirado do ar',
        bullets: [
          'Tudo o que está em "O que não pode".',
          'Discriminação por raça, cor, origem, sexo, deficiência, idade ou qualquer outra condição.',
          'Propaganda, venda, pedido de dinheiro, doação, rifa, corrente ou campanha política.',
          'Notícia falsa, golpe ou link suspeito.',
          'Texto, foto ou música de outra pessoa ou empresa sem permissão (inclusive textos de traduções da ' +
            'Bíblia protegidas por direitos autorais).',
          'Qualquer coisa que seja crime.',
        ],
      },
      {
        title: 'O que você pode fazer',
        bullets: [
          'Toque em "···" na publicação ou no comentário e escolha **Denunciar**. Diga o motivo.',
          'Você também pode **bloquear** uma pessoa. Você não vê mais o que ela publica, e ela não vê o que você ' +
            'publica.',
          'Você pode **apagar** qualquer publicação ou comentário seu, quando quiser, e pode deixar de participar ' +
            'em "Conta e privacidade". Aí tudo o que você publicou sai do ar.',
        ],
      },
      {
        title: 'Em momentos difíceis',
        paragraphs: [
          'Se você ou alguém está pensando em se machucar, procure ajuda agora: ligue **188** (CVV, gratuito, 24 ' +
            'horas). A equipe da comunidade não substitui atendimento de emergência.',
        ],
      },
    ],
  };
}

/**
 * Consentimento destacado, tela C4 (rascunho §2, "Texto proposto").
 *
 * SUPERADO desde 2026-09-23 pelo `aceiteDocument()` da tela única, e NENHUMA
 * tela o mostra mais. Fica só como registro do rascunho que o advogado recebeu.
 * Não voltar a usá-lo numa tela: o item do Amém abaixo diz que "ninguém vê quem
 * deu Amém", e isso deixou de ser verdade (os rostinhos do Amém mostram o nome,
 * private.amen_faces_for). Quem precisa de texto de aceite usa `aceiteDocument`.
 */
export function consentDocument(campos: Record<CampoId, string | null> = CAMPOS): TermsDocument {
  const c = (id: CampoId) => campo(id, campos);
  return {
    purpose: 'community_publish',
    version: campos.versaoConsentimento,
    title: 'Antes da sua primeira publicação',
    sections: [
      {
        paragraphs: [
          'O que você escrever aqui fala da sua fé. A lei brasileira trata isso como dado sensível e pede que a ' +
            'gente pergunte com todas as letras, numa tela só para isso.',
        ],
      },
      { title: 'Quem vê', paragraphs: [audienceSentence()] },
      {
        title: 'O que você autoriza',
        bullets: [
          'Mostrar o que você publicar (texto e foto), com o seu nome, para essas pessoas.',
          'Mostrar os seus comentários do mesmo jeito. O seu Amém fica guardado, mas ninguém vê quem deu Amém nem ' +
            'quantos foram.',
          'Uma pessoa da equipe da igreja olhar as suas fotos antes de aparecerem, e um programa conferir seus ' +
            'textos. A equipe também olha o que for denunciado.',
          `Guardar tudo isso num servidor no Brasil, sob a responsabilidade de ${c('razaoSocial')}.`,
        ],
      },
      {
        title: 'O que não vai junto',
        paragraphs: [
          'Sua leitura, seu jejum e a sua reflexão privada continuam só no seu aparelho. Nada disso vira publicação.',
        ],
      },
      {
        title: 'Até quando',
        paragraphs: [
          `Sua publicação fica visível até você apagar, ou até ${c('dataApagamento')}, o que vier primeiro.`,
        ],
      },
      {
        title: 'Você pode mudar de ideia',
        bullets: [
          'Apague qualquer publicação quando quiser.',
          'Em "Conta e privacidade", toque em "Deixar de participar da comunidade". Tudo o que você publicou sai do ar.',
          'Você pode apagar a sua conta inteira quando quiser.',
          'Uma coisa a gente não controla: alguém pode ter tirado uma captura de tela antes de você apagar.',
        ],
      },
      {
        title: 'Mais detalhes',
        paragraphs: [
          `Regras da comunidade · Política de Privacidade ${c('linkPolitica')} · Contato: ${c('emailPublicado')}`,
        ],
      },
    ],
  };
}

/**
 * O CONSENTIMENTO DESTACADO que o aceite registra (LGPD art. 11, I): o mesmo
 * propósito e as mesmas frases do rascunho §2 (`consentDocument`), só que curto, e
 * com uma correção de fato: o Amém agora APARECE com o nome (os rostinhos do F3),
 * então isso tem de estar escrito.
 *
 * Desde 2026-09-22 ele não tem tela própria (a de aceite saiu): o toque em
 * Publicar registra o aceite deste texto, e a pessoa o lê na tela de regras, a um
 * toque do link da linha de aceite. O hash continua sendo deste texto exato.
 *
 * O advogado revisa este texto junto com o rascunho (pedido registrado). Até lá
 * a versão é null e, no app de verdade, ninguém aceita (`termsAvailability`).
 */
export function aceiteDocument(campos: Record<CampoId, string | null> = CAMPOS): TermsDocument {
  const c = (id: CampoId) => campo(id, campos);
  return {
    purpose: 'community_publish',
    version: campos.versaoConsentimento,
    title: 'Antes de participar',
    sections: [
      {
        paragraphs: [
          'O que você escrever aqui fala da sua fé. A lei brasileira trata isso como dado sensível e pede que a ' +
            'gente pergunte com todas as letras.',
        ],
      },
      { title: 'Quem vê', paragraphs: [audienceSentence()] },
      {
        title: 'O que você autoriza',
        bullets: [
          'Mostrar o que você publicar (texto e foto), os seus comentários e o seu Amém, com o seu nome, para essas pessoas.',
          // REVISÃO FINAL 2026-09-22: este é o texto de CONSENTIMENTO (LGPD), então ele
          // tem de cobrir o tratamento que de fato acontece. Dizer que a equipe só olha
          // "o que for denunciado" descreveria MENOS do que o servidor faz hoje: sem
          // filtro automático configurado, uma pessoa da equipe olha TODA foto antes de
          // ela aparecer (F5, caminho seguro). A frase abaixo vale nos dois casos.
          'Um programa conferir o que você publica e, quando for preciso, uma pessoa da equipe da igreja olhar — ' +
            'inclusive o que for denunciado.',
          `Guardar isso num servidor no Brasil, sob a responsabilidade de ${c('razaoSocial')}.`,
        ],
      },
      {
        title: 'O que não vai junto',
        paragraphs: ['Sua leitura, seu jejum e as suas anotações continuam só no seu aparelho.'],
      },
      {
        title: 'Você pode mudar de ideia',
        paragraphs: [
          'Apague o que publicou quando quiser, ou deixe de participar em "Conta e privacidade".',
        ],
      },
    ],
  };
}

/* ------------------------------------------------ a linha do aceite (2026-09-22) */

/**
 * DECISÃO DO FUNDADOR (2026-09-22): a TELA de aceite antes de participar SAIU. No
 * lugar, esta linha fica embaixo do botão de publicar (e do enviar comentário), e
 * o toque no botão é que registra o aceite — antes de criar qualquer conteúdo
 * (Google Play, conteúdo gerado por usuários; Apple 1.2).
 *
 * Texto dele, palavra por palavra. "regras do Juntos" é o link: abre a tela de
 * regras, que agora mostra as regras E o consentimento destacado — os dois textos
 * cujo hash o aceite registra (ver `aceiteDocument`, LGPD art. 11, I).
 */
export const ACEITE_LINE = 'Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do Juntos.';

/** O trecho da linha que é link. Precisa estar DENTRO de `ACEITE_LINE`. */
export const ACEITE_LINE_LINK = 'regras do Juntos';

/** Nome falado da linha inteira: a frase mais o que o toque faz. */
export const ACEITE_LINE_SPOKEN = `${ACEITE_LINE} Abre as regras do Juntos.`;

/**
 * Sem nome no Juntos e sem nome na entrada do app, o servidor não deixa
 * participar (CM007): dito na hora, com o caminho.
 */
export const ACEITE_NEEDS_NAME = 'Para publicar, escreva o seu nome. É como a igreja vai te ver.';

/**
 * As regras, em quatro linhas. Frases do rascunho §1 (`rulesDocument`); o aceite
 * vale para as regras COMPLETAS, que abrem pelo link da linha de aceite, e é o
 * hash delas que vai ao servidor.
 */
export const RULES_SUMMARY = [
  'Aqui você conta o que Deus falou na leitura, pede oração e agradece.',
  'Pode: sua reflexão, um versículo, foto da sua Bíblia ou das suas anotações.',
  'Não pode: ofensa, violência, nudez ou expor outra pessoa.',
  'O que quebra as regras é tirado do ar. Dá para denunciar, bloquear e apagar o seu.',
] as const;

/**
 * O texto exato de um documento, na ordem em que a tela o mostra. É dele que sai
 * o sha256 enviado no aceite; o servidor guarda o hash da versão aprovada.
 */
export function termsDocumentText(doc: TermsDocument): string {
  const lines: string[] = [doc.title];
  for (const section of doc.sections) {
    if (section.title) lines.push(section.title);
    for (const paragraph of section.paragraphs ?? []) lines.push(paragraph);
    for (const bullet of section.bullets ?? []) lines.push(`- ${bullet}`);
  }
  return lines.join('\n');
}

/**
 * Pode aceitar? Só quando o servidor tem uma versão aprovada, o texto do app é
 * dessa mesma versão e não sobrou campo vazio.
 */
export type TermsAvailability =
  /** O texto ainda não foi aprovado (servidor em PENDENTE ou texto do app sem versão). */
  | 'pending'
  /** O servidor está em outra versão: este app tem um texto antigo (ou mais novo). */
  | 'mismatch'
  | 'ready';

export function termsAvailability(doc: TermsDocument, serverVersion: string | null | undefined): TermsAvailability {
  if (!serverVersion || serverVersion === PENDING_VERSION || !doc.version) return 'pending';
  if (hasOpenFields(termsDocumentText(doc))) return 'pending';
  return serverVersion === doc.version ? 'ready' : 'mismatch';
}

/* ------------------------------------------------------- avisos das telas */

/** Enquanto o texto não foi aprovado: dito com honestidade, sem prometer data. */
export const PENDING_NOTICE =
  'A publicação no Juntos ainda não foi liberada pela igreja. Este texto é um rascunho em revisão e ainda não ' +
  'pode ser aceito.';

export const MISMATCH_NOTICE = 'O texto foi atualizado. Atualize o app para ler a versão nova e continuar.';

/*
 * A FOTO NÃO TEM MAIS AVISO ANTES (decisão do fundador, 2026-09-22): tocar em
 * Galeria abre a galeria, tocar em Câmera abre a câmera, e a única pergunta que
 * aparece é a permissão do sistema. O `PHOTO_WARNING` que ficava aqui saiu.
 *
 * O que o app FAZ com a foto não mudou e não depende de aviso: `preparePhoto`
 * reencoda (1600 px, JPEG 0,8) e `assertPhotoSafeToUpload` confere os bytes, então
 * a localização é apagada no aparelho antes de enviar. O que a pessoa pode e não
 * pode publicar continua escrito nas regras do Juntos, que a linha do aceite
 * linka embaixo do botão de publicar.
 */
