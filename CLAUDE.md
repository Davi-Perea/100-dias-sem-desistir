# Bible Study App — CLAUDE.md

Projeto NOVO e independente. Não pertence a nenhum outro projeto (C4U/For You, Story Win ou qualquer outro).
Não importar memória, decisões, código, arquitetura ou documentação de outros projetos.

## Estado atual

- Fase: **V1 em construção** sob o MASTER PRODUCT SPEC v1.1 (aprovado para build em 2026-09-07).
  Antes: Sprint 0 (pesquisa/ADRs) e Sprint 0.5 (spike, `docs/technical/SPIKE_001_MOBILE_FOUNDATION.md`).
- `mobile/` é o app V1: Fases 1–4 construídas e testadas com **fixtures DEV**; Fases 5–8 existem como schema SQL não aplicado.
  Estado detalhado e o que falta: `docs/technical/V1_BUILD_STATUS.md`.
- Repositório git inicializado em `main`, sem commits. **Nunca fazer commit sem autorização explícita.**
- Decisões estruturais vivem em ADRs (`docs/technical/ADR-*.md`). Status possível: PROPOSTA → APROVADA → SUPERSEDIDA.

## Papéis

- **ChatGPT = Product Brain**: mercado, estratégia, usuário, produto, UX de alto nível, priorização, MVP, MASTER PRODUCT SPEC, prompts de execução, revisão.
- **Claude (este agente) = Principal Mobile Engineer + Technical Architect**: pesquisa técnica, arquitetura, segurança, stack, dados, integrações, implementação, testes, builds, preparação App Store / Google Play.
- **Davi = fundador.** Ideias dele entram como HIPÓTESE / PREFERÊNCIA / PROPOSTA / DECISÃO — não como verdade técnica automática.

Se um problema técnico afetar produto/estratégia, **não mudar silenciosamente**. Entregar:
`PROBLEMA → EVIDÊNCIA → IMPACTO → ALTERNATIVAS → RECOMENDAÇÃO`.

## Contexto do produto (resumo)

- App **mobile real** (iOS/App Store + Android/Google Play) de leitura e estudo bíblico, pt-BR.
- Primeiro ambiente real: ~3.000 pessoas ligadas à Lagoinha (primeiro ambiente, não necessariamente marca final).
- Jornadas prováveis: Bíblia em 100 dias, Bíblia em 1 ano. Não é app "só de 100 dias".
- **Fora de escopo agora**: SaaS multi-igrejas, pagamentos, ofertas, doações, fundraising, monetização.
- **Hipóteses NÃO aprovadas** (não implementar sem aprovação do Product Brain): feed, grupos, amigos, comunidade,
  comentários, reações, streak, badges, gamificação, diagnóstico, personalização, diário, reflexões, IA, ministérios, ranking.
  A arquitetura só deve preservar opcionalidade barata para elas.

## Regras de engenharia

1. **Mobile real.** Nada de website empacotado, WebView como produto, PWA embrulhada ou UI desktop adaptada.
   Considerar sempre: navegação mobile, safe areas, teclado, gestos, lifecycle, acessibilidade, performance,
   offline/reconexão, push, permissões, deep links, estados loading/error/empty, privacidade, exclusão de conta, publicação real.
2. **Reuse first.** Antes de construir infraestrutura própria, investigar SDKs, libs, APIs, open source, serviços gerenciados.
   Reutilizar > reconstruir quando for legal, seguro, sustentável e tecnicamente adequado.
3. **Anti-sycophancy técnico.** Antes de recomendar construção relevante, responder: precisamos? existe pronto? integrar em vez
   de reconstruir? é mobile-adequado? adiciona dívida? escala para ~3.000? é overengineering? risco de rejeição nas lojas?
   risco de privacidade/segurança? é caro mudar depois? Se for ruim, dizer. Não complicar para parecer sofisticado.
4. **Conteúdo bíblico.** "Gratuito na internet" NÃO significa "livre para copiar". Não copiar tradução, plano, devocional ou áudio
   sem direito apropriado. Fontes proibidas e permitidas estão em `docs/research/BIBLE_CONTENT_OPTIONS.md`.
5. **LGPD.** Convicção religiosa é dado pessoal sensível (LGPD art. 5º, II). Notas, reflexões e progresso de leitura são tratados
   como dado sensível: minimização, consentimento específico e destacado, RLS/regras estritas, exclusão completa. Ver `docs/technical/SECURITY_V0.md`.
6. **Evidência.** Classificar afirmações como FATO (fonte + data) / EVIDÊNCIA / INFERÊNCIA / HIPÓTESE / RECOMENDAÇÃO.
   Fatos temporais (versões, preços, políticas) precisam de fonte e data; políticas de lojas mudam — reverificar antes de submeter.
7. **Sem antecipação de features.** Não construir features futuras "para adiantar". Preservar opcionalidade barata apenas.

## Ambiente de desenvolvimento (verificado em 2026-09-07)

- Windows 10 Pro. Node v24.18.0, npm 11.16.0, git 2.55. Sem Xcode/Mac, sem Flutter/Dart, sem Java, sem Python.
- Consequência: builds iOS precisam de serviço em nuvem (ver ADR-001) ou de um Mac dedicado.

## Mapa de documentos

- `docs/technical/ARCHITECTURE_V0.md` — arquitetura V0 (camadas, dados, offline, push, deep links, observabilidade).
- `docs/technical/ADR-001-mobile-stack.md` — decisão de stack mobile.
- `docs/technical/ADR-002-backend.md` — decisão de backend/dados.
- `docs/technical/SECURITY_V0.md` — segurança, privacidade, LGPD, exclusão de conta.
- `docs/technical/MOBILE_STORE_REQUIREMENTS.md` — requisitos App Store / Google Play / legislação brasileira.
- `docs/technical/HARD_TO_REVERSE_DECISIONS.md` — decisões caras de reverter: decidir agora / pode esperar / não decidir ainda.
- `docs/research/BIBLE_CONTENT_OPTIONS.md` — conteúdo bíblico consolidado: licenças, provedores, textos abertos, fontes a evitar, estratégia em 3 camadas.
- `docs/research/MOBILE_STACK_RESEARCH.md`, `docs/research/BACKEND_RESEARCH.md`, `docs/research/BIBLE_CONTENT_RESEARCH_RAW.md`,
  `docs/research/OPEN_PT_BIBLE_TEXTS.md`, `docs/research/STORES_LEGAL_RESEARCH.md` — pesquisa bruta por frente (≈480 fontes com URL e data de acesso).
- `docs/research/REUSE_ALTERNATIVES.md` — o que já existe (apps atuais da Lagoinha em inChurch/inPeace, YouVersion Connect/Partners) e por que isso importa.
- `docs/research/OPEN_QUESTIONS_FOR_PRODUCT_BRAIN.md` — perguntas que o Product Brain precisa responder (★ = bloqueiam o Sprint 1).

## Regras invioláveis do conteúdo (MASTER PRODUCT SPEC v1.1 §17–18, §31)

- A fonte editorial canônica desejada é o plano **"100 Dias na Palavra e Oração"** (YouVersion Plan ID **42360**, Alcance Curitiba).
- **Proibido:** scraping do YouVersion, cópia manual em massa, API não autorizada, inferir ou fabricar dias faltantes,
  paráfrase automática para contornar direitos, substituir por outro plano (SBB, Luciano Subirá, "parecido"),
  ou inventar um cronograma próprio para produção.
- Enquanto não houver autorização (**Launch Gate 2**), o app roda com fixtures marcadas `DEV_ONLY` / `NOT_PRODUCTION_CONTENT`.
  Nenhuma fixture pode ser apresentada como conteúdo real: existe banner obrigatório na UI e bloqueio no validador.
- Licença da tradução bíblica (**Gate 1**) e autorização do plano (**Gate 2**) são problemas jurídicos **independentes**.
- A pendência de autorização é uma Launch Gate, não um convite para mudar o produto. Se ela não vier, a decisão volta ao Product Brain.

## Decisões vigentes (todas em status PROPOSTA — nada aprovado ainda)

- ADR-001: React Native + Expo (SDK 57 / RN 0.86), EAS Build/Submit na nuvem (Windows sem Mac), development builds, expo-sqlite (FTS5), EAS Update só para correções. Segunda: Flutter.
- ADR-002: Supabase Pro em `sa-east-1` (São Paulo); Auth = e-mail OTP + Sign in with Apple + Google, sessão anônima sob demanda; sync offline próprio (outbox + LWW + pull incremental); lembrete diário local; push remoto via Expo Push; Sentry + PostHog na UE. Segunda: Firebase.
- Conteúdo: V1 com textos abertos empacotados (Bíblia Livre CC BY como padrão provisório; Biblica Open Nova Bíblia Viva 2007 CC BY-SA 4.0 como "leitura fácil"); traduções protegidas (NVI, NAA, ARA, NTLH…) só via plataforma online após parecer jurídico ou por contrato direto. Nunca ingerir fontes da lista de bloqueio.
- Lojas/legal: uso sem login; exclusão de conta no app e por web; contas de desenvolvedor como Organização em nome da entidade dona; conta só ≥ 18 (ou ≥ 16/17) na V1; distribuição só Brasil; analytics off por padrão; sem mecânicas de uso compulsivo.
- Enquanto os ADRs estiverem em PROPOSTA, nenhuma stack está decidida e nenhum projeto deve ser inicializado.
