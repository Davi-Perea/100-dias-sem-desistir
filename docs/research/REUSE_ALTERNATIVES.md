# Reuse first — o que já existe antes de construirmos

Data: 2026-09-07. Frente transversal do Sprint 0. Objetivo: responder honestamente às perguntas
"Precisamos realmente disso?", "Existe solução pronta melhor?" e "Podemos integrar em vez de reconstruir?"
ANTES de recomendar a construção de um app novo.

Classificação usada: FATO (fonte + data) · EVIDÊNCIA (fonte secundária ou indireta) · INFERÊNCIA · HIPÓTESE · RECOMENDAÇÃO.

---

## 1. PROBLEMA

A Lagoinha **já distribui apps oficiais** construídos em plataformas white-label de igrejas (inChurch e inPeace), e pelo menos
o app principal (inChurch) já oferece **Bíblia offline, planos de leitura da igreja e anotações**. Além disso, o YouVersion
oferece **gratuitamente** a publicação de planos de leitura por igrejas (YouVersion Connect / Content Partners) e um
**YouVersion Platform** com SDK de Bíblia para apps de terceiros.

Construir um app novo de leitura bíblica, portanto, **não pode ser justificado apenas por "não existe"**. Existe.
Precisa ser justificado por uma razão de produto explícita (UX dedicada, dados próprios, independência da plataforma,
jornada/comunidade própria) — e essa razão é do Product Brain, não da engenharia.

## 2. EVIDÊNCIA

### 2.1 Apps atuais da Lagoinha (lojas)

| App | Package / loja | Plataforma | Classificação |
|---|---|---|---|
| Igreja Batista da Lagoinha | `br.com.inchurch.lagoinha` (Google Play) | inChurch | FATO — https://play.google.com/store/apps/details?id=br.com.inchurch.lagoinha (acessado 2026-09-07) |
| Igreja Batista da Lagoinha — Antigo | `com.lagoinha.app` (Google Play) | app anterior, listado como "Antigo" | FATO — https://play.google.com/store/apps/details?id=com.lagoinha.app (acessado 2026-09-07) |
| Lagoinha Global | `com.inpeaceapp.lagoinhaglobal.sp` | inPeace | FATO — https://play.google.com/store/apps/details?id=com.inpeaceapp.lagoinhaglobal.sp (acessado 2026-09-07) |
| Lagoinha USA / Lisboa / Porto / Aveiro / Ribeirão | `com.inpeace.*`, `com.inpeaceapp.*`, `br.org.lagoinharibeirao.*` | inPeace e outros | FATO — resultados de busca Google Play (acessado 2026-09-07) |
| Igreja Batista Lagoinha Faro | App Store id1633253387 | não verificado | FATO — https://apps.apple.com/us/app/igreja-batista-lagoinha-faro/id1633253387 (acessado 2026-09-07) |

INFERÊNCIA: "Lagoinha" não é uma organização única do ponto de vista de apps — há dezenas de igrejas locais com apps
próprios em plataformas diferentes. "~3.000 pessoas ligadas à Lagoinha" precisa ser precisado (qual unidade/ministério).

### 2.2 O que o app inChurch da Lagoinha já faz

- EVIDÊNCIA (texto de listagem/snippet de busca, não verificado dentro do app): o app "permite carregar a Bíblia, estudar por
  meio dos planos de leitura da igreja, fazer anotações e acompanhar a igreja por vídeos, áudios e publicações"; também
  células (gestão, materiais, relatórios de reunião), transmissões ao vivo, culto online, eventos, notícias, pedidos de oração,
  doações. Fonte: resultados de busca Google Play/App Store (acessado 2026-09-07). A página do Google Play não pôde ser
  carregada por fetch direto (a listagem exige JS).
- FATO (site da plataforma inChurch, página "Funcionalidades", acessado 2026-09-07 — https://inchurch.com.br/funcionalidades/):
  - Bíblia: "Os usuários poderão ler a bíblia diretamente pelo aplicativo, mesmo sem internet, escolher as versões preferidas
    e navegar facilmente pelos livros, capítulos e versículos."
  - Anotações: "Os usuários poderão fazer as anotações dos cultos, treinamentos, discipulados, diretamente pelo aplicativo,
    e o conteúdo fica salvo tanto no app quanto na nuvem!"
  - Grupos, push ilimitado, doações, eventos com inscrição/pagamento, transmissões ao vivo, integrações com site existente.
- EVIDÊNCIA (blog/listagens inChurch, acessado 2026-09-07): "área exclusiva para exibição de planos de leitura", "opção de
  criar planos de leitura personalizados"; o "inChurch PRO" dá acesso a "conteúdos exclusivos, planos de leitura e espaço
  para anotações pessoais". A inChurch afirma atender "mais de 43.000 igrejas em 23 países" (autodeclarado).
- NÃO VERIFICADO: quais traduções bíblicas o inChurch embarca e sob qual licença (responsabilidade da inChurch, não nossa);
  qualidade real da experiência de leitura; se a Lagoinha usa/atualiza os planos nesse app; engajamento.

### 2.3 inPeace

- FATO (https://inpeaceapp.com/, acessado 2026-09-07): módulos "Ao Vivo, Células, Doações, Eventos, Mural, Membros, Notícias,
  Oração", além de "Plano de leitura" e "Jornada do Membro"; app personalizado (white-label) + painel admin + web; "sem custo
  de setup"; integração com Asaas (pagamentos). Preços não publicados na home.

### 2.4 YouVersion — publicação de planos por igrejas (Connect / Content Partners)

- FATO (https://www.youversion.com/content-partners, acessado 2026-09-07): "Partnering with YouVersion and using YouVersion
  Connect is completely free"; "You don't need to be a large ministry to participate"; conteúdo deve ser "Scripture-based and
  focused on spiritual growth"; parceiros publicam "Bible Plans (written, audio-, or video-based)", vídeos e coleções; há
  "real-time dashboards" de engajamento.
- FATO (https://www.youversion.com/connect, acessado 2026-09-07): igrejas criam uma "Page" no Bible App, publicam Plans e
  Events, acompanham "follower growth, engagement trends, and content performance", convidam equipe.
- FATO (suporte a parceiros, https://partner-support.youversion.com/l/en/article/dg6m2bs6jz-how-to-add-a-plans e
  https://partner-support.youversion.com/l/en/article/9ldbls6m05-bible-plan-faq-s, acessado 2026-09-07): plano completo exigido
  na submissão; ≥1 referência por dia (recomendado ≤8); 300–750 palavras de devocional por dia; 3 a 365 dias; revisão interna
  ~14 dias (recomendam 4 semanas de antecedência); alterações estruturais após submissão não são possíveis; YouVersion fornece
  "completions, subscriptions, Plan ratings, annual and monthly engagement, and completion rates". Acesso ao Partner Portal
  apenas para parceiros aprovados. O portal de suporte tem versão em Português (Brasil).
- NÃO VERIFICADO: termos de licença do conteúdo submetido (exclusividade? licença perpétua ao YouVersion?), possibilidade de
  planos privados/não listados só para uma igreja, acesso à identidade dos inscritos (provavelmente só agregados).

### 2.5 YouVersion Platform (SDK/API para apps de terceiros)

- FATO (https://platform.youversion.com, acessado 2026-09-07): oferece "Bible SDK" (embed do leitor do YouVersion), "User
  Insights", "Sign in with YouVersion", "Fast-track Bible Licensing" ("Access Bible versions instantly from any of YouVersion's
  approved Partners"), suporte a "TypeScript, React, React Native, Swift, and Kotlin", Developer Dashboard. Termos de uso
  "Last modified on August 17, 2026".
- FATO (Termos de Uso, mesma página, acessado 2026-09-07): licença "limited, revocable, non-transferable, non-exclusive";
  o desenvolvedor deve "enable and maintain any usage reporting mechanisms built into YV IP"; é proibido "use or exploit the
  YV IP to create or provide services that replicate or compete with YouVersion, the YouVersion Bible App, or YVP"; uso das
  marcas (YouVersion, "The Bible App") só quando os "YVP Terms" da ferramenta permitirem; os "YVP Terms" por ferramenta podem
  impor "geographic restrictions, branding requirements, security requirements, technological requirements".
- Análise detalhada (versões em pt-BR, offline, caching) está em `BIBLE_CONTENT_OPTIONS.md` (frente C).
- INFERÊNCIA: a cláusula "replicate or compete" é um risco contratual real para um app cujo núcleo é leitura bíblica com
  planos — exatamente o que o Bible App faz. Precisa de leitura jurídica antes de depender do SDK como fonte principal de texto.

## 3. IMPACTO

- Se o app novo apenas reproduzir "Bíblia + plano + notas", ele **duplica** o que o membro já tem no app inChurch e no
  YouVersion, com custo de mais um download e fragmentação de dados/engajamento.
- Um app dedicado só se paga se entregar algo que as plataformas não entregam bem: experiência de leitura de alta qualidade,
  jornada guiada (100 dias / 1 ano) com progresso confiável e offline, dados próprios para a igreja (com LGPD), e a
  opcionalidade de comunidade/jornadas futuras sem depender de roadmap de terceiros.
- Riscos de não decidir isso agora: construir por meses e descobrir que a igreja prefere manter tudo no inChurch; ou depender
  do YouVersion Platform e ser barrado pela cláusula de não-competição.

## 4. ALTERNATIVAS

| # | Alternativa | Custo de construção | Controle de UX/dados | Riscos |
|---|---|---|---|---|
| A | **Não construir**: publicar "Bíblia em 100 dias / 1 ano" como planos no YouVersion (Connect/Partners) e divulgar no app inChurch | ~zero engenharia; produção de conteúdo devocional | mínimo (sem dados individuais; sem UX própria) | dependência total; sem comunidade própria; conteúdo passa por revisão do YouVersion |
| B | **Usar o módulo de Bíblia/planos do inChurch** já contratado | ~zero | baixo (roadmap da inChurch) | qualidade de leitura não verificada; sem diferenciação |
| C | **App próprio (este projeto)** | alto | total | duplicação; adoção; licenciamento de texto; manutenção contínua |
| D | **Híbrido**: app próprio focado em jornada + leitura, com texto licenciado via plataforma (YouVersion Platform ou API.Bible) e o app inChurch/YouVersion como canais de divulgação (deep link) | alto (menor em conteúdo) | alto | cláusulas de plataforma; dependência parcial |

## 5. RECOMENDAÇÃO

1. **O Product Brain precisa responder "por que não YouVersion + inChurch?" por escrito antes do Sprint 1.** Sem essa resposta,
   a engenharia estaria construindo a alternativa mais cara sem evidência de necessidade (viola o princípio reuse-first).
2. Se a resposta for "jornada própria + dados próprios + UX de leitura superior + opcionalidade de comunidade", então **C/D se
   justificam** e o resto deste Sprint 0 (stack, backend, conteúdo, lojas) se aplica integralmente.
3. Mesmo construindo, **integrar em vez de competir**: (a) manter o app inChurch como canal (deep link para o plano),
   (b) considerar publicar o mesmo plano no YouVersion como versão "leve" para quem não instalar o app — desde que os termos
   de conteúdo permitam reutilização do devocional próprio (NÃO VERIFICADO), (c) avaliar o YouVersion Platform para texto
   licenciado somente após análise jurídica da cláusula "replicate or compete".
4. Definir com a igreja quem é "a Lagoinha" desse produto (unidade, ministério, entidade jurídica) — isso condiciona contas de
   desenvolvedor, marca, domínio e LGPD (ver `../technical/HARD_TO_REVERSE_DECISIONS.md`).
