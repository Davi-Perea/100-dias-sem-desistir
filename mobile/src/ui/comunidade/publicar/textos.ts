/**
 * Textos da Comunidade que a pessoa ACEITA ou LÊ antes de publicar: regras (a
 * tela de regras), consentimento destacado (C4) e a frase única sobre quem vê
 * (C3, C4 e B4).
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

/** Regras da comunidade (rascunho §1). */
export function rulesDocument(campos: Record<CampoId, string | null> = CAMPOS): TermsDocument {
  const c = (id: CampoId) => campo(id, campos);
  return {
    purpose: 'community_rules',
    version: campos.versaoRegras,
    title: `Regras da comunidade — versão ${c('versaoRegras')}, de ${c('dataRegras')}`,
    sections: [
      {
        title: 'Um lugar para a igreja ler junto.',
        paragraphs: [
          'Aqui a gente conta o que Deus falou durante a leitura, ora uns pelos outros e se anima a não desistir. ' +
            `${AUDIENCE_SENTENCE} Escreva como escreveria para um irmão na porta do templo.`,
        ],
      },
      {
        title: 'O que cabe aqui',
        bullets: [
          'O que você aprendeu na leitura do dia.',
          'Pedidos de oração e agradecimentos.',
          'Palavras de ânimo para quem está lendo junto.',
          'Fotos suas, da sua Bíblia, do seu caderno, de um lugar. Com cuidado com quem aparece nelas (veja abaixo).',
        ],
      },
      {
        title: 'Fotos de outras pessoas',
        bullets: [
          'Só publique o rosto de outra pessoa se ela concordou. Quem aparece numa foto da igreja tem a fé revelada ' +
            'para todos que veem, e ela pode não querer isso.',
          'Na dúvida, não publique, ou escolha uma foto sem rostos.',
        ],
      },
      {
        title: 'Fotos de crianças e adolescentes',
        bullets: [
          '**Não publique foto em que dê para reconhecer uma criança ou um adolescente**, nem se for seu filho ou ' +
            'sua filha.',
          'Também não escreva nome, escola, endereço ou rotina de uma criança.',
        ],
      },
      {
        title: 'O que é tirado do ar',
        bullets: [
          'Ofensa, humilhação, deboche, ameaça ou perseguição a qualquer pessoa, inclusive de outra igreja ou outra fé.',
          'Discriminação por raça, cor, origem, sexo, deficiência, idade ou qualquer outra condição.',
          'Conteúdo sexual, nudez ou violência.',
          'Qualquer coisa que exponha, ameace ou prejudique uma criança ou um adolescente.',
          'Foto com rosto de alguém que não autorizou, quando essa pessoa pedir.',
          'Dados pessoais de outras pessoas (telefone, endereço, documentos, situação de saúde) sem autorização delas.',
          'Propaganda, venda, pedido de dinheiro, doação, rifa ou corrente.',
          'Campanha política ou partidária.',
          'Notícia falsa, golpe ou link suspeito.',
          'Texto, foto ou música de outra pessoa ou empresa sem permissão (inclusive textos de traduções da Bíblia ' +
            'protegidas por direitos autorais).',
          'Qualquer coisa que seja crime.',
        ],
      },
      {
        title: 'Como funciona o cuidado com o que é publicado',
        bullets: [
          '**Fotos:** antes de aparecer, uma pessoa da equipe da igreja olha. Enquanto isso, a sua publicação fica ' +
            '"em análise" e só você a vê.',
          '**Textos e comentários:** um programa confere palavras ofensivas antes de aparecer. Se ele segurar o seu ' +
            'texto, uma pessoa da equipe olha em seguida.',
          'A equipe é formada por voluntários da igreja, treinados e com compromisso de sigilo.',
        ],
      },
      {
        title: 'Se você vir algo errado',
        bullets: [
          'Toque em "···" na publicação ou no comentário e escolha **Denunciar**. Diga o motivo.',
          'Se for sobre **uma criança** ou se **você aparece numa foto sem ter autorizado**, escolha esse motivo: a ' +
            'publicação sai do ar na hora e depois alguém analisa.',
          'Você também pode **bloquear** uma pessoa. Você não vê mais o que ela publica, e ela não vê o que você ' +
            'publica.',
          `Quem não tem o app pode pedir a retirada pela página ${c('paginaRetirarConteudo')} ou pelo e-mail ` +
            `${c('emailPublicado')}.`,
          `A equipe responde às denúncias em até ${c('prazoDenuncia')}.`,
          'Denunciar para prejudicar alguém de propósito também é contra as regras.',
        ],
      },
      {
        title: 'Se tirarem o que você publicou',
        bullets: [
          'Você recebe um aviso no app dizendo o motivo, se foi uma pessoa ou o programa que decidiu, e como pedir ' +
            'revisão.',
          `Se achar que foi um engano, toque em **Pedir revisão** em até ${c('prazoPedirRevisao')}. Outra pessoa da ` +
            `equipe, diferente de quem decidiu, olha de novo e responde em até ${c('prazoRespostaRevisao')}.`,
          'Quem quebra as regras várias vezes, ou de forma grave, pode ter a participação na comunidade suspensa. ' +
            'Você é avisado e também pode pedir revisão.',
        ],
      },
      {
        title: 'O que é seu continua seu',
        bullets: [
          'Você pode apagar qualquer publicação ou comentário seu, quando quiser.',
          'Você pode desistir de participar da comunidade em "Conta e privacidade". Aí tudo o que você publicou sai ' +
            'do ar.',
          `Você pode apagar a sua conta inteira pelo app ou pela página ${c('paginaExclusao')}.`,
          'Sua leitura, seu jejum e a sua reflexão privada ficam no seu aparelho e nunca viram publicação.',
          `A comunidade fica aberta para publicar até ${c('dataFimPublicacao')}, depois fica só para leitura e é ` +
            `apagada em ${c('dataApagamento')}.`,
        ],
      },
      {
        title: 'Em momentos difíceis',
        paragraphs: [
          'Se você ou alguém está pensando em se machucar, procure ajuda agora: ligue **188** (CVV, gratuito, 24 ' +
            'horas). A equipe da comunidade não substitui atendimento de emergência.',
        ],
      },
      {
        title: 'Quem cuida desta comunidade',
        paragraphs: [
          `${c('razaoSocial')}, CNPJ ${c('cnpj')}. Contato: ${c('emailPublicado')}. Encarregado de dados: ` +
            `${c('encarregado')}. Estas regras seguem os Termos de Uso e a Política de Privacidade: ${c('links')}.`,
        ],
      },
    ],
  };
}

/** Consentimento destacado, tela C4 (rascunho §2, "Texto proposto"). */
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
  'A publicação na comunidade ainda não foi liberada pela igreja. Este texto é um rascunho em revisão e ainda não ' +
  'pode ser aceito.';

export const MISMATCH_NOTICE = 'O texto foi atualizado. Atualize o app para ler a versão nova e continuar.';

/**
 * Aviso no momento de escolher a foto (C3). Frases das regras (rascunho §1,
 * "Fotos de outras pessoas", "Fotos de crianças e adolescentes" e "Como funciona
 * o cuidado"), sem texto novo.
 */
export const PHOTO_WARNING = {
  title: 'Antes de escolher a foto',
  bullets: [
    'Só publique o rosto de outra pessoa se ela concordou.',
    '**Não publique foto em que dê para reconhecer uma criança ou um adolescente**, nem se for seu filho ou sua filha.',
    'Na dúvida, não publique, ou escolha uma foto sem rostos.',
    // F5 (2026-09-22): foto aparece na hora quando o filtro automático não desconfia; sem filtro configurado,
    // toda foto espera uma pessoa. A frase vale para os dois casos.
    'Toda foto passa por uma conferência antes de aparecer para todos. Se precisar do olhar de uma pessoa da equipe ' +
      'da igreja, a sua publicação fica "em análise" e só você a vê até lá.',
  ],
} as const;
