# Requisitos App Store, Google Play e legislação brasileira

- **Status:** PROPOSTA (Sprint 0, 2026-09-07). Fontes oficiais com URLs e datas em `../research/STORES_LEGAL_RESEARCH.md` (≈90 fontes).
- **Revisão:** as diretrizes da Apple citadas, as exigências técnicas de 2026 (Xcode 26, API 36, 16 KB, Developer Verification) e a vigência do ECA Digital foram reverificadas nas fontes oficiais em 2026-09-07.
- **Regra:** políticas de loja mudam com frequência. **Reverificar esta lista antes de cada submissão.** Itens marcados "(jurídico)" exigem advogado.

Classificação: **OBRIGATÓRIO PARA V1** · **SÓ SE FEATURE X EXISTIR** · **NÃO RELEVANTE AGORA** · **RECOMENDADO**.

---

## 1. Resumo executivo

1. As duas lojas definem a arquitetura da conta: **uso completo sem login** (Apple 5.1.1(v)), **exclusão de conta no app** (Apple desde 30/06/2022; Google desde 2023, também por **link web** declarado no Data safety), política de privacidade com URL pública e no app, Support URL com contato real, conta demo para revisão, rótulos de privacidade cobrindo os SDKs.
2. **Login:** e-mail OTP próprio não exige Sign in with Apple; **Google Sign-In obriga Sign in with Apple** (4.8). Com Sign in with Apple, a exclusão de conta exige revogar tokens via REST (`/auth/revoke`, TN3194 de 03/10/2025).
3. **Técnico já vigente:** iOS — Xcode 26 / SDK iOS 26 desde 28/04/2026; privacy manifests e SDKs listados (Hermes, GoogleSignIn, Firebase…) com manifest/assinatura; novo questionário etário (perguntas de "social media" obrigatórias desde set/2026). Android — target API 36 desde 31/08/2026 (extensão até 01/11/2026); edge-to-edge sem opt-out; predictive back; 16 KB (obrigatório desde 01/11/2025 para target 15+; bloqueio total de updates em 01/02/2027); AAB + Play App Signing; **Android Developer Verification com enforcement no Brasil em 30/09/2026** (Play Console registra ~99% automaticamente).
4. **Push:** não pode ser condição de uso; avisos da igreja só com opt-in explícito e opt-out (4.5.4); Android 13+ `POST_NOTIFICATIONS` e canais; lembrete diário com **alarme inexato** (Play só admite alarme exato para despertador/calendário).
5. **Contas de desenvolvedor como Organização** (D-U-N-S; Apple US$ 99/ano; Play US$ 25 — Play exibe nome legal, endereço, e-mail e telefone). Apple 5.1.1(ix): app que exige "sensitive user information" deve ser submetido por pessoa jurídica. Publicar na conta da titular da marca (4.2.6, 4.1(c)).
6. **LGPD:** convicção/filiação religiosa é dado sensível (art. 5º II; art. 11 §1º cobre tratamento que *revela* o dado) → consentimento específico e destacado, encarregado (ou canal, se pequeno porte), incidentes em 3 dias úteis (Res. 15/2024), transferência internacional formalizada (Res. 19/2024; UE adequada pela Res. 32/2026; EUA não). **Firebase Authentication processa exclusivamente nos EUA**; Supabase tem São Paulo.
7. **ECA Digital (Lei 15.211/2025)** em vigor desde 17/03/2026, regulamentado pelo Decreto 12.880/2026, fiscalizado pela ANPD (agência desde a Lei 15.352/2026; ações de fiscalização previstas a partir de jan/2027). Aplica-se a serviços "de acesso provável" por adolescentes. Verificação de idade robusta só para conteúdo impróprio (não é o caso); atingem a V1: defaults protetivos (art. 7º), classificação nos termos, página para pais (art. 16), canal de denúncia (art. 28), avaliação de impacto, vedação a mecânicas de uso compulsivo (Decreto art. 9º) e a regra de vínculo de contas de menores de até 16 anos a um responsável (art. 24 — alcance para apps não sociais: jurídico).
8. **Recomendação de escopo para reduzir risco:** distribuir **somente no Brasil** na V1 (evita leis estaduais dos EUA e GDPR); **conta apenas para ≥ 18** (ou ≥ 16/17 se o jurídico aceitar) com modo local completo para os demais; analytics **desligado por padrão**; sem gamificação por tempo de uso.

---

## 2. Apple — App Store

### 2.1 Diretrizes de revisão (texto vigente em 2026-09-07)

| Requisito | Seção | Classificação | Implicação |
|---|---|---|---|
| Conteúdo religioso permitido; vedado conteúdo difamatório/mesquinho sobre religião | 1.1.1 | NÃO RELEVANTE AGORA (risco baixo) | Cuidado editorial em devocionais |
| UGC: filtro, denúncia com resposta, bloqueio, contato publicado | 1.2 | SÓ SE FEATURE SOCIAL EXISTIR | Notas privadas não são UGC |
| Submissão completa; **conta demo** se há login | 2.1(a) | OBRIGATÓRIO PARA V1 | Usuário de revisão permanente com dados de exemplo |
| Metadados precisos; sem features ocultas | 2.3 | OBRIGATÓRIO PARA V1 | Notes for Review detalhadas |
| Questionário etário honesto (4+/9+/13+/16+/18+; perguntas de "social media" desde set/2026) | 2.3.6 | OBRIGATÓRIO PARA V1 | Responder "não" a social/UGC com notas privadas (confirmar definição no App Store Connect) |
| Não sugerir público infantil fora da categoria Kids | 2.3.8, 5.1.4(b) | OBRIGATÓRIO PARA V1 | Sem "kids/infantil" em nome, ícone, descrição |
| Não baixar/executar código que altere funcionalidades; DPLA 3.3.1(B) permite código interpretado que não mude o propósito nem burle segurança (revisão de 08/10/2025) | 2.5.2 | OBRIGATÓRIO PARA V1 (se usar OTA) | EAS Update só para correções/conteúdo; features novas via loja |
| Background modes só para fins próprios | 2.5.4 | SÓ SE ÁUDIO EM BACKGROUND EXISTIR | Lembretes locais não exigem background mode |
| Pagamentos/IAP | 3.x | NÃO RELEVANTE AGORA | Sem compras/doações |
| Funcionalidade mínima ("apps que são só um livro… Apple Books") e sem site reempacotado | 4.2, 4.2.2 | OBRIGATÓRIO PARA V1 | Planos, progresso, notas, busca, lembretes, offline, deep links diferenciam |
| Apps de template só pelo dono do conteúdo | 4.2.6 | OBRIGATÓRIO PARA V1 | Publicar na conta da igreja/entidade dona |
| Spam: experiência "significativamente diferente" na categoria Bíblia | 4.3(b) | OBRIGATÓRIO PARA V1 | Destacar jornada própria e conteúdo da igreja |
| Não usar ícone/marca/nome de outro desenvolvedor sem aprovação | 4.1(c) | OBRIGATÓRIO PARA V1 | Autorização escrita da marca "Lagoinha" |
| Push: não obrigatório para funcionar; sem dado sensível; marketing só com opt-in + opt-out | 4.5.4 | OBRIGATÓRIO PARA V1 | Toggles separados "Lembretes" e "Avisos da igreja" |
| Login de terceiro (Google…) ⇒ oferecer opção equivalente (Sign in with Apple); dispensado se só sistema próprio | 4.8 | OBRIGATÓRIO se houver Google; NÃO RELEVANTE se só OTP | Decidir no ADR-002 (proposta: OTP + Apple + Google) |
| Política de privacidade no App Store Connect **e** no app | 5.1.1(i) | OBRIGATÓRIO PARA V1 | pt-BR, URL pública |
| Consentimento para dados de uso "mesmo anônimos"; retirada acessível | 5.1.1(ii) | OBRIGATÓRIO (se analytics) | Toggle em Configurações; default desligado |
| Minimização; pickers em vez de acesso amplo | 5.1.1(iii) | OBRIGATÓRIO PARA V1 | Sem contatos/localização/fotos |
| **Uso sem login** se não há features de conta significativas; **exclusão de conta no app** | 5.1.1(v) | OBRIGATÓRIO PARA V1 | Leitura/planos/notas locais sem conta; "Excluir conta" real |
| Apps que exigem informação sensível: submeter por **pessoa jurídica** | 5.1.1(ix) | OBRIGATÓRIO PARA V1 | Conta Apple Organização em nome da entidade |
| Divulgar compartilhamento com terceiros, "incluindo IA de terceiros", com permissão explícita | 5.1.2(i) | OBRIGATÓRIO (SDKs); SÓ SE IA EXISTIR | Listar Supabase/Sentry/PostHog/Expo/Resend |
| Kids/privacidade infantil | 5.1.4 | OBRIGATÓRIO (política + LGPD/ECA) | Não entrar na categoria Kids |
| Propriedade intelectual; "authorization must be provided upon request" | 5.2.x | OBRIGATÓRIO PARA V1 | Pasta de licenças; "Content Rights" no App Store Connect |
| Código de conduta; avaliação só via API nativa | 5.6 | OBRIGATÓRIO PARA V1 | `requestReview` apenas |
| Suporte/contato fácil | 1.5 | OBRIGATÓRIO PARA V1 | Tela "Ajuda" + Support URL |

### 2.2 Submissão e técnico (2026)

| Requisito | Vigência | Classificação | Implicação |
|---|---|---|---|
| Xcode 26 / SDK iOS 26 | desde 28/04/2026 | OBRIGATÓRIO PARA V1 | EAS com imagem Xcode 26 (Expo SDK 55+). Próximo degrau (Xcode 27) não anunciado |
| Privacy manifest (`PrivacyInfo.xcprivacy`) com required-reason APIs; SDKs listados com manifest/assinatura (inclui Hermes, GoogleSignIn, Firebase*) | desde 2024 | OBRIGATÓRIO PARA V1 | Expo agrega manifests; revisar a cada upgrade |
| App Privacy labels (Contact Info, Identifiers, User Content = notas, Usage Data, Diagnostics) | vigente | OBRIGATÓRIO PARA V1 | Decidir com advogado se declarar "Sensitive Info — religious beliefs" por inferência |
| ATT | só se rastrear | NÃO RELEVANTE AGORA | `NSPrivacyTracking=false`; sem SDKs de anúncios |
| Privacy Policy URL e Support URL (contato real: endereço, e-mail, telefone) | vigente | OBRIGATÓRIO PARA V1 | Página de suporte com CNPJ/endereço da entidade |
| Classificação etária: novo questionário (respostas até 31/01/2026; "social media" desde set/2026); Brasil com autoclassificação MJSP | 2025–2026 | OBRIGATÓRIO PARA V1 | Preencher no primeiro envio |
| Accessibility Nutrition Labels | voluntário hoje ("serão exigidos com o tempo") | RECOMENDADO | Declarar com veracidade (VoiceOver, Larger Text, Contraste, Dark) |
| Declared Age Range API; App Store bloqueia 18+ no Brasil sem confirmação de idade desde 24/02/2026 | 24/02/2026 | RECOMENDADO (provável obrigação do ECA Digital art. 14) | Usar o sinal só para adequação etária |
| Leis estaduais dos EUA (Texas desde 04/06/2026, Utah, Louisiana) | 2026 | NÃO RELEVANTE se disponibilidade = Brasil | Restringir países no App Store Connect |
| TestFlight: 100 internos, 10.000 externos, builds expiram em 90 dias | vigente | RECOMENDADO (beta com a igreja) | Não serve como distribuição definitiva |
| Unlisted App Distribution (só por link; passa por revisão) | vigente | RECOMENDADO avaliar | Alternativa se a igreja não quiser listagem pública |
| Apple Developer Program Organização: D-U-N-S, site com domínio próprio, e-mail corporativo, US$ 99/ano (isenção para ONGs: elegibilidade no Brasil NÃO VERIFICADA) | vigente | OBRIGATÓRIO PARA V1 | Iniciar D-U-N-S já (prazo não publicado; planejar 2–6 semanas) |
| Sign in with Apple: revogar tokens na exclusão (TN3194); e-mails de relay exigem SPF/DKIM registrados; novo domínio `private.icloud.com` (24/08/2026) | 2025–2026 | SÓ SE SIWA EXISTIR (proposto no ADR-002) | Guardar refresh token; registrar remetente em "Sign in with Apple for Email Communication" |

---

## 3. Google Play

### 3.1 Políticas

| Requisito | Classificação | Implicação |
|---|---|---|
| User Data: coleta mínima, HTTPS, sem venda; responsabilidade por SDKs | OBRIGATÓRIO PARA V1 | TLS; revisar cada SDK |
| **Prominent disclosure & consent** in-app, com ação afirmativa, antes da coleta de dado pessoal/sensível não esperado | OBRIGATÓRIO PARA V1 | A tela de consentimento LGPD atende se for in-app e prévia |
| Política de privacidade no Console e no app (HTML, não PDF) | OBRIGATÓRIO PARA V1 | pt-BR |
| Data safety completo e consistente (inclui "Political or religious beliefs", "Other user-generated content" = notas, crash logs, IDs) | OBRIGATÓRIO PARA V1 | Mapear SDKs; decisão jurídica sobre "religious beliefs" |
| **Exclusão de conta** no app **e** por recurso web (URL no Data safety); dados apagados; retenção só por razão legítima informada | OBRIGATÓRIO PARA V1 | Página web "Excluir minha conta" com verificação por e-mail |
| Permissões mínimas em contexto | OBRIGATÓRIO PARA V1 | INTERNET, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE |
| Alarme exato só para despertador/calendário; `SCHEDULE_EXACT_ALARM` negada por padrão | OBRIGATÓRIO evitar | Lembrete com alarme inexato; verificar se o SDK injeta a permissão e removê-la |
| Fotos: usar Photo Picker | SÓ SE FOTO DE PERFIL EXISTIR | Sem `READ_MEDIA_*` |
| Foreground service `mediaPlayback` com declaração | SÓ SE ÁUDIO EXISTIR | — |
| UGC ("visível ou acessível a pelo menos um subconjunto de usuários"): termos, denúncia, bloqueio, moderação | SÓ SE FEATURE SOCIAL EXISTIR | Notas privadas não são UGC |
| Discurso de ódio (inclui religião) | NÃO RELEVANTE AGORA (risco baixo) | Cuidado editorial |
| Público-alvo: declarar 13–15, 16–17, 18+ (sem < 13 → Families não incide); sem iconografia infantil | OBRIGATÓRIO PARA V1 | — |
| Propriedade intelectual: evidência de direitos sob demanda; avisar o Play com antecedência se houver permissão documentada | OBRIGATÓRIO PARA V1 | Pasta de licenças |
| Funcionalidade mínima (sem apps "só texto/PDF") | OBRIGATÓRIO PARA V1 | Mesmo raciocínio da Apple 4.2 |
| Device and Network Abuse: sem auto-update fora do Play; exceção para JS em interpretador | OBRIGATÓRIO (se OTA) | EAS Update permitido |
| Pagamentos (exceção para doações isentas) | NÃO RELEVANTE AGORA | — |
| Play Age Signals API (Brasil desde 17/03/2026 para o ECA Digital; uso restrito a adequação etária) | RECOMENDADO | Integrar para defaults protetivos e regra de idade da conta |
| Requisitos Brasil: bloqueio de 18+ para menores; questionário IARC/ClassInd | OBRIGATÓRIO PARA V1 | Rating "Livre" esperado |
| Leis estaduais dos EUA | NÃO RELEVANTE se distribuição = Brasil | Restringir países |

### 3.2 Técnico (2026)

| Requisito | Vigência | Classificação | Implicação |
|---|---|---|---|
| Target API 36 (Android 16); extensão até 01/11/2026 | desde 31/08/2026 | OBRIGATÓRIO PARA V1 | Expo SDK 54+ já alveja 36 |
| Edge-to-edge sem opt-out; predictive back padrão; orientação/resize ignorados em telas ≥ 600dp | target 36 | OBRIGATÓRIO PARA V1 | Insets em todas as telas; Stack v5 do Expo Router (experimental) para predictive back; layout adaptativo |
| 16 KB page size | 01/11/2025; corte 01/02/2027 | OBRIGATÓRIO PARA V1 | RN 0.81+ compatível; verificar libs nativas com `bundletool dump config` |
| AAB + Play App Signing | vigente | OBRIGATÓRIO PARA V1 | Guardar upload key |
| Play Integrity API (10.000/dia grátis) | vigente | RECOMENDADO (abuso de OTP/conta) | Endpoints de criação de conta/OTP |
| POST_NOTIFICATIONS em contexto; canais | API 33+ | OBRIGATÓRIO PARA V1 | Canais "Lembretes de leitura" e "Avisos da igreja" |
| FCM HTTP v1 (legado desativado em 2024) | vigente | OBRIGATÓRIO PARA V1 (se FCM direto) | Service account só no servidor; Expo Push usa FCM v1 por trás |
| Conta de desenvolvedor Organização: US$ 25; D-U-N-S; dados públicos na loja; sem exigência dos 12 testadores (regra de contas pessoais pós-13/11/2023) | vigente | OBRIGATÓRIO PARA V1 | Teste fechado com a igreja é recomendado mesmo assim |
| **Android Developer Verification**: identidade + D-U-N-S + package names; Play Console registra ~99% automaticamente; enforcement Brasil/Indonésia/Singapura/Tailândia em **30/09/2026**; global em 2027 | 30/09/2026 | OBRIGATÓRIO PARA V1 | Conferir "Registration status" no Console após criar a conta |

---

## 4. Brasil — LGPD, ECA Digital, Marco Civil, LBI, marca

| Requisito | Base | Classificação | Implicação concreta |
|---|---|---|---|
| Dado sensível por inferência (conta em app de igreja + progresso + notas) | LGPD art. 5º II; art. 11 §1º | OBRIGATÓRIO PARA V1 | Tratar como sensível; consentimento específico e destacado (art. 11 I); legítimo interesse não vale para sensível |
| Consentimento: destacado, finalidades determinadas, revogável, ônus da prova do controlador | LGPD art. 8º | OBRIGATÓRIO PARA V1 | Tela própria; `consents` com versão, hash do texto, data, plataforma; re-consentimento em mudanças |
| Crianças (< 12): consentimento parental específico; adolescentes: melhor interesse (Enunciado ANPD 1/2023) | LGPD art. 14 | OBRIGATÓRIO se houver contas de menores; NÃO RELEVANTE se contas só ≥ 18 | V1 proposta: contas só ≥ 18 (ou ≥ 16/17, jurídico) |
| Direitos do titular (acesso, correção, eliminação, portabilidade, revogação) | LGPD art. 18 | OBRIGATÓRIO PARA V1 | Tela "Meus dados": exportar, corrigir, excluir; canal para os demais |
| Término e eliminação; retenção documentada | LGPD arts. 15–16 | OBRIGATÓRIO PARA V1 | Backups expiram em ≤ 30 dias; logs de segurança ≤ 6 meses |
| Encarregado (ato formal; divulgado no site) ou canal se pequeno porte | LGPD art. 41; Res. ANPD 18/2024 | OBRIGATÓRIO PARA V1 | Recomendação: nomear encarregado mesmo assim |
| Agentes de pequeno porte (inclui sem fins lucrativos); **não** se beneficia quem faz tratamento de alto risco (sensível + adolescentes) | Res. ANPD 2/2022 | OBRIGATÓRIO avaliar (jurídico) | "Larga escala" com 3.000 usuários é discutível |
| Incidente: comunicar ANPD e titulares em 3 dias úteis (6 se pequeno porte); registro por 5 anos | LGPD art. 48; Res. ANPD 15/2024 | OBRIGATÓRIO PARA V1 | Quase todo incidente deste app é "relevante" (sensível + credenciais) |
| Transferência internacional: adequação (UE, Res. 32/2026), cláusulas-padrão ANPD (Res. 19/2024), ou consentimento destacado (art. 33 VIII) | LGPD art. 33 | OBRIGATÓRIO PARA V1 | Dados primários em São Paulo; Sentry/PostHog na UE; APNs/FCM/e-mail documentados na política; evitar Firebase Auth (EUA) |
| RIPD + avaliação de impacto à segurança de menores (resumo público) | LGPD art. 38; ECA Digital art. 16; Decreto art. 47 | OBRIGATÓRIO (leve) se houver adolescentes; RECOMENDADO sempre | Documento único derivado de `SECURITY_V0.md` |
| Registro das operações (ROPA) | LGPD art. 37 | OBRIGATÓRIO PARA V1 | Planilha por finalidade/base legal/compartilhamento/retenção |
| ECA Digital — âmbito "acesso provável" por adolescentes; obrigações moduladas (art. 39) | Lei 15.211/2025 art. 1º | OBRIGATÓRIO avaliar (enquadramento provável) | Assumir aplicabilidade modulada |
| Privacidade por padrão no nível mais protetivo | art. 7º | OBRIGATÓRIO PARA V1 | Analytics off; perfil não público; push mínimo |
| Evitar uso compulsivo por padrão (recompensas por tempo, notificações excessivas, autoplay); classificação indicativa nos termos | art. 8º; Decreto art. 9º e 12 §4º | OBRIGATÓRIO PARA V1 | Impacta hipóteses streak/ranking/gamificação; 1 lembrete/dia configurável |
| Verificação de idade confiável | art. 9º; Decreto arts. 14–19 | NÃO RELEVANTE AGORA (só conteúdo impróprio) | Autodeclaração de faixa etária aceitável |
| Receber sinais de idade das lojas/SO | art. 14; Decreto arts. 25–26 | RECOMENDADO (provável obrigação) | Declared Age Range + Play Age Signals; em divergência, opção mais protetiva |
| Regime mais leve para conteúdo editorial/licenciado (art. 39 §1º; Decreto art. 22) | — | RECOMENDADO enquadrar | Bíblia licenciada = conteúdo protegido previamente licenciado |
| Página "Para pais e responsáveis" (riscos, medidas, contatos) | art. 16 | OBRIGATÓRIO PARA V1 | Página web + link no app |
| Supervisão parental | arts. 17–18 | SÓ SE CONTAS DE MENORES EXISTIREM | Apoiar-se nos controles do SO |
| Contas de menores de até 16 anos vinculadas a responsável | art. 24 | OBRIGATÓRIO se houver contas ≤ 16; alcance para apps não sociais: (jurídico) | V1: não criar contas para menores; modo local |
| Canal de denúncia acessível e gratuito; retirada de conteúdo mediante notificação | arts. 28–33; Decreto arts. 41–44 | OBRIGATÓRIO (canal simples); SÓ SE SOCIAL (fluxo completo) | Formulário/e-mail "Denunciar" |
| Sanções: até 10% do faturamento ou R$ 10–1.000 por usuário cadastrado (sem faturamento), até R$ 50 mi | art. 35 | (risco) | Métrica relevante para entidade sem faturamento |
| Marco Civil: guarda de registros (6 meses) só para provedor com fins econômicos | Lei 12.965/2014 arts. 15–16 | NÃO RELEVANTE (obrigação); RECOMENDADO reter logs mínimos de segurança | Logs de auth por ≤ 6 meses |
| Responsabilidade por conteúdo de terceiros pós-Tema 987/STF (26/06/2025): remoção após notificação extrajudicial, canais, devido processo | Marco Civil art. 19/21 | SÓ SE FEATURE SOCIAL EXISTIR | Moderação humana + fila de denúncias |
| LBI: obrigação direta a apps não identificada; NBR 17060:2022 voluntária | Lei 13.146/2015 | RECOMENDADO | WCAG 2.2 AA + NBR 17060 |
| Marca "Lagoinha": litígio público em 2024 (EVIDÊNCIA); INPI NÃO VERIFICADO | Apple 4.1(c)/5.2; Play IP | OBRIGATÓRIO PARA V1 | Consultar INPI; autorização escrita; publicar na conta da titular |

---

## 5. Menores e adolescentes — mínimo defensável na V1

1. Uso completo **sem conta** (dados locais, sem analytics por padrão) — menores usam sem que a igreja trate dados deles.
2. **Conta apenas ≥ 18** (ou ≥ 16/17 se o jurídico aceitar "até 16 anos") com autodeclaração de faixa etária + sinais de idade do SO/loja; se o sinal indicar menor, bloquear com mensagem clara.
3. Consentimento LGPD destacado no cadastro, versionado.
4. Termos de uso em pt-BR com classificação indicativa; página "Para pais e responsáveis"; canal de denúncia.
5. Sem mecânicas de uso compulsivo por padrão (sem streak/recompensa por tempo, sem autoplay, push limitado).
6. Avaliação de impacto documentada com resumo público.
7. Play: público-alvo 13–15/16–17/18+; App Store: questionário completo ("social media" = não).
8. Distribuição restrita ao Brasil.

Para depois: contas 12–16 com vínculo a responsável (fluxo de aprovação), supervisão parental, revisão após as orientações definitivas da ANPD e antes da fiscalização (jan/2027).

## 6. UGC e moderação

- **Hoje (notas privadas):** não é UGC para Apple 1.2 nem para o Play; é "User Content" nos rótulos; apagar na exclusão.
- **Se houver social:** Apple 1.2 (filtro, denúncia, bloqueio, contato), Play UGC (termos, denúncia, bloqueio, ação), Tema 987 (notificação extrajudicial, canais, devido processo, relatórios), ECA Digital arts. 24, 29–30 — moderação humana + ferramentas + SLA 24–48 h. Preparar tabelas `reports`, `blocks`, `moderation_actions` só quando a feature for aprovada.

## 7. Checklist consolidado — OBRIGATÓRIO PARA V1

**Contas e presença:** Apple Organização (D-U-N-S, site, e-mail corporativo, DPLA vigente) · Play Organização (D-U-N-S, verificação, Developer Verification até 30/09/2026) · autorização da marca + INPI · disponibilidade = Brasil.

**Produto/UX:** uso sem login · excluir conta (app + web) com revogação Apple · exportar/corrigir/revogar · consentimento destacado versionado (checkboxes separados: avisos, analytics off) · push opt-in + canais + lembrete inexato · faixa etária + sinais de idade; conta só ≥ 18 (ou ≥ 16/17) · sem recompensas por tempo · termos com classificação + página para pais + canal de denúncia · tela "Sobre/Créditos" com licenças · avaliação só via API nativa.

**Documentos/governança:** política de privacidade (pt-BR, HTML) · encarregado (ou canal) · ROPA + RIPD/avaliação de impacto · inventário de SDKs/subprocessadores + mecanismo de transferência · plano de incidentes (3 dias úteis) · pasta de licenças de conteúdo.

**Técnico iOS:** Xcode 26/SDK 26 · privacy manifest + SDKs · labels · Privacy Policy URL · Support URL real · conta demo · questionário etário · Keychain · ATS · Universal Links.

**Técnico Android:** target 36 · edge-to-edge/predictive back/telas grandes · 16 KB · AAB + App Signing · Data safety + URL de exclusão · público-alvo · POST_NOTIFICATIONS + canais · sem alarme exato/mídia/foreground · Keystore · App Links.

## 8. Não verificado / exige advogado

INPI (marca); isenção de taxa Apple para ONG no Brasil; prazos de aprovação de contas e D-U-N-S; declarar "religious beliefs" nos rótulos por inferência; alcance do ECA Digital art. 24 ("até 16 anos") e leitura das orientações/FAQ da ANPD (PDFs de 20/03 e 30/07/2026); Lei art. 14 vs Decreto art. 26 (sinais de idade); enquadramento como pequeno porte; cláusulas-padrão da ANPD nos DPAs de Supabase/AWS/Google/Apple; comportamento do `expo-notifications` quanto a alarme exato; categoria "UGC" do questionário etário da Apple para notas privadas; próximo requisito de SDK da Apple (provável abril/2027); capacidade de adolescentes para consentir sem responsável.
