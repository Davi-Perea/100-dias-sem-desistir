# Segurança e privacidade V0

- **Status:** PROPOSTA (Sprint 0, 2026-09-07). Depende de ADR-001/ADR-002. Itens legais marcados "(jurídico)" exigem revisão de advogado.
- **Premissa central:** um app bíblico de uma igreja trata **dado pessoal sensível** (convicção religiosa — LGPD art. 5º, II) mesmo sem perguntar religião:
  inscrição em plano, progresso, notas e destaques revelam a convicção do titular identificado. Toda a arquitetura assume isso.

---

## 1. Inventário e classificação de dados (V1)

| Dado | Classificação | Onde vive | Retenção (default proposto) |
|---|---|---|---|
| E-mail, nome de exibição, avatar | Pessoal | Supabase Auth/`profiles`/Storage (São Paulo) | Até exclusão da conta |
| Identidades Apple/Google (sub, e-mail relay) | Pessoal | Supabase Auth | Até exclusão; token Apple revogado na exclusão |
| Inscrições em planos, progresso, eventos de leitura | **Sensível** (revela convicção religiosa) | SQLite local + Postgres (RLS) | Até exclusão |
| Notas, destaques, posição de leitura | **Sensível** | SQLite local + Postgres (RLS) | Até exclusão |
| Tokens push, plataforma, versão do app | Pessoal (identificador de dispositivo) | `devices` | Até exclusão ou `DeviceNotRegistered` |
| Consentimentos (versão da política, data) | Registro legal | `consents` (append-only) | 5 anos após exclusão, sem PII além do `user_id` hash (jurídico) |
| Pedidos de exclusão (hash do e-mail) | Registro legal | `deletion_requests` | 5 anos (jurídico) |
| Eventos de produto (PostHog) | Pseudonimizado | PostHog UE | 12 meses |
| Erros/crashes (Sentry) | Técnico, sem PII | Sentry UE | 90 dias |
| Logs de plataforma | Técnico | Supabase (7 dias) | 7 dias |
| Textos bíblicos, planos | Conteúdo (não pessoal) | App/Storage | — |

Minimização: **não coletar** CPF, telefone (salvo se SMS for aprovado), endereço, data de nascimento exata (ver menores), localização, contatos, fotos além do avatar.

## 2. Modelo de ameaças (resumo)

| Ator / vetor | Ameaça | Controle principal |
|---|---|---|
| Qualquer pessoa com a `anon key` (é pública no app) | Ler/alterar dados de outros via PostgREST se RLS faltar | RLS em todas as tabelas + advisor zero ERROR + testes de autorização no CI |
| Usuário mal-intencionado autenticado | Escalar acesso via políticas frouxas, `user_metadata`, views sem `security_invoker` | Políticas `to authenticated` explícitas; nunca `user_metadata`; views com `security_invoker` |
| Aparelho perdido/roubado | Acesso a notas locais e sessão | SQLite local sem cifra própria (SO cifra o sandbox), sessão em SecureStore; opção "sair de todos os aparelhos"; sem dados de terceiros no aparelho |
| Abuso de auth (OTP flooding, contas anônimas em massa) | Custo de e-mail, poluição | Rate limits do Supabase; anônimos sob demanda; limpeza > 30 dias; CAPTCHA como contingência |
| Vazamento de segredo (`service_role`, `.p8` Apple, SMTP) | Comprometimento total | Segredos só em EAS Secrets/Supabase Vault; nunca no app; rotação documentada |
| Operador/insider (dashboard) | Acesso indevido a dados sensíveis | MFA obrigatório; mínimo de contas; `audit_log`; sem export ad hoc |
| SDK de terceiros (analytics/crash) | Exfiltração de PII, transferência internacional | Só Sentry/PostHog na UE, sem PII, sem replay; lista de suboperadores publicada |
| Cadeia de suprimentos (npm) | Pacote malicioso | Lockfile, `npm audit`/Dependabot, pinagem de versões nativas, revisão de plugins de config |
| Deep link malicioso | Navegar para estado inválido/injetar parâmetros | Validação estrita de parâmetros; sem IDs internos em links |
| Conteúdo (planos/devocionais) | Alteração indevida | Escrita só por admin via migração/seed versionado; sem CMS aberto em V1 |
| Incidente no provedor | Indisponibilidade/perda | Backups diários + dump semanal off-site + restore testado; leitura offline continua funcionando |

## 3. Controles por camada

### 3.1 App (React Native + Expo)
- Nenhum segredo no bundle além da `anon key` e URLs públicas. Chaves de terceiros (PostHog/Sentry) são públicas por design; não dão acesso a dados.
- Sessão: `LargeSecureStore` (chave AES-256 no SecureStore, payload cifrado no AsyncStorage/MMKV), `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; limpar sessão no primeiro launch após instalação (Keychain persiste).
- Dados locais: SQLite no sandbox do app (cifra do SO). Sem cifra adicional em V1 (INFERÊNCIA: risco baixo, custo alto; SQLCipher via op-sqlite fica como opção). Textos abertos **não** podem ser cifrados de modo a impedir extração (cláusula anti-DRM das licenças CC).
- Validação de entrada: tamanho de nota (≤ 5.000 caracteres), referências bíblicas dentro do cânon, parâmetros de deep link.
- Sem screenshots bloqueados (app de leitura); sem `FLAG_SECURE`.
- Permissões mínimas: notificações (opt-in contextual), fotos só via Photo Picker se avatar existir. Nada de localização/contatos.
- Privacy manifest (iOS) gerado/agregado pelo Expo e pelos SDKs; revisar "required reason APIs" a cada upgrade.

### 3.2 Transporte
- TLS 1.2+ (padrão das plataformas); sem certificate pinning em V1 (custo operacional > benefício para este perfil).

### 3.3 Backend (Supabase)
- **RLS habilitado em 100% das tabelas de `public`**; políticas nomeadas por role; `(select auth.uid())`; índices nas colunas filtradas.
- `service_role` exclusivamente em Edge Functions; funções validam JWT do chamador; CORS fechado; funções que tocam o DB fixadas em `sa-east-1`.
- Storage: buckets privados; políticas por `user_id` no caminho; limite de 1 MB; allowlist de MIME.
- Auth: OTP 6 dígitos (expira ≤ 1 h; 1 pedido/60 s), SMTP próprio com SPF/DKIM/DMARC; Apple/Google com nonce; anônimos sob demanda; MFA TOTP disponível mas não exigido de usuários.
- Rede/DB: SSL enforcement; restrições de rede no Postgres; conexões só via SDK/pooler.
- Dashboard: MFA obrigatório; princípio do menor privilégio; convites nominais.
- Migrações revisadas e versionadas; `supabase db lint` + testes de RLS no CI; sem alterações manuais em produção.

### 3.4 Dados
- Criptografia em repouso do provedor (AES-256) e em trânsito; backups do provedor cifrados; dump semanal off-site cifrado (chave separada).
- Pseudonimização em analytics: `distinct_id` = hash com sal do `user_id`; sem e-mail/nome/conteúdo de notas em eventos.
- Soft delete com tombstones apenas para sync; **exclusão de conta é hard delete** (cascata), e os backups retêm por até 7 dias após (informar na política).

### 3.5 Operação
- Segredos: EAS Secrets (build), Supabase Vault (runtime), gestor de senhas do time; rotação a cada saída de pessoa ou suspeita.
- Dependências: Dependabot/`npm audit` semanal; upgrade de SDK Expo 1× por versão; changelog de segurança.
- Monitoramento: alertas de erro (Sentry), uso/gasto (Supabase spend cap), uptime; `audit_log` para ações administrativas (≥ 12 meses).
- Ambientes separados (dev/prod); dados reais nunca em dev.

## 4. Privacidade e LGPD (jurídico deve revisar)

### 4.1 Bases legais (FATO: Lei 13.709/2018)
- Dado sensível (art. 11): em V1, **consentimento específico e destacado** (art. 11, I) para tratar notas, destaques e progresso — apresentado antes da primeira sincronização,
  com texto próprio (não escondido nos termos), versão registrada em `consents`. Alternativas do art. 11, II (ex.: exercício regular de direitos, tutela) são discutíveis — jurídico.
- Dados cadastrais (e-mail/nome): execução de contrato/legítimo interesse (art. 7º) — jurídico confirma.
- Analytics agregado: legítimo interesse com opt-out, ou consentimento — jurídico confirma; default técnico: opt-in simples nas configurações, desligado para menores.

### 4.2 Direitos do titular (art. 18) — implementação
| Direito | Como | Prazo alvo |
|---|---|---|
| Acesso/confirmação | Tela "Meus dados" + exportação JSON (Edge Function) | Imediato |
| Correção | Edição de perfil/notas no app | Imediato |
| Eliminação | Exclusão de conta no app + link web; cascata; revogação Apple; backups expiram em 7 dias | ≤ 30 dias (efetivo em minutos) |
| Portabilidade | Exportação JSON | Imediato |
| Revogação do consentimento | Configurações → registra `revoked_at`; para sync de dados sensíveis, oferece exclusão | Imediato |
| Informação sobre compartilhamento | Política lista suboperadores (Supabase, Expo, Sentry, PostHog, Resend, Apple/Google) | — |

### 4.3 Governança
- **Encarregado (DPO)** nomeado e publicado na política (Res. CD/ANPD 18/2024; agentes de pequeno porte podem ter dispensa — jurídico).
- **Relatório de impacto (RIPD)**: recomendado (dado sensível em escala de milhares) — rascunho técnico a partir deste documento (jurídico).
- **Transferência internacional**: dados primários em São Paulo; satélites na UE (adequação — Res. CD/ANPD 32/2026); se algum fornecedor ficar nos EUA, cláusulas-padrão da ANPD (Res. 19/2024). Pendência: o DPA do Supabase não menciona LGPD — perguntar ao suporte/jurídico se aceita anexar as cláusulas-padrão.
- **Incidentes**: comunicar ANPD e titulares em **3 dias úteis** (Res. CD/ANPD 15/2024) quando houver risco relevante — dado sensível conta como critério. Runbook em §7.
- **Política de privacidade** em português, URL pública (obrigatória nas duas lojas), alinhada aos rótulos de privacidade da Apple e ao Data safety do Google.

### 4.4 Menores e adolescentes (ECA Digital — Lei 15.211/2025, em vigor desde 17/03/2026; Decreto 12.880/2026; fiscalização ANPD prevista a partir de jan/2027)
- Público esperado inclui adolescentes (12–17). Crianças (< 12) não são alvo. O app é "de acesso provável" por adolescentes → obrigações moduladas (art. 39).
- **Mínimo defensável V1 (FATO/RECOMENDAÇÃO, detalhado em `MOBILE_STORE_REQUIREMENTS.md` §5):**
  1. Uso completo sem conta (dados locais, sem analytics por padrão) — menores usam sem que a igreja trate dados deles.
  2. Conta apenas ≥ 18 (ou ≥ 16/17 se o jurídico aceitar a leitura de "até 16 anos" do art. 24), com autodeclaração de faixa etária + sinais de idade do SO/loja (Declared Age Range API; Play Age Signals, disponível no Brasil desde 17/03/2026); em divergência, adotar a alternativa mais protetiva (Decreto art. 25 §4º).
  3. Privacidade por padrão no nível mais protetivo (art. 7º): analytics off, perfil não público, push mínimo.
  4. Sem mecânicas de uso compulsivo por padrão (Decreto art. 9º): sem streak/recompensa por tempo, sem autoplay, 1 lembrete/dia configurável — isso condiciona as hipóteses de gamificação/ranking.
  5. Termos de uso em pt-BR com classificação indicativa; página "Para pais e responsáveis" (art. 16); canal de denúncia acessível e gratuito (art. 28).
  6. Avaliação de impacto (RIPD + segurança de menores) com resumo público (art. 16; Decreto art. 47).
- Verificação de idade robusta **não** é exigida (só para conteúdo impróprio — art. 9º); autodeclaração basta para adequação de experiência.
- Sanção relevante para entidade sem faturamento: R$ 10 a R$ 1.000 por usuário cadastrado (art. 35).
- Para depois: contas 12–16 com vínculo a responsável; supervisão parental; revisar após orientações definitivas da ANPD (PDFs de 20/03 e 30/07/2026 ainda não lidos — jurídico).

## 5. Exclusão de conta — fluxo (requisito Apple 5.1.1(v) e Google Play)

1. Entrada no app (Perfil → Excluir conta) e por link web (exigência do Google Play), com reautenticação recente.
2. Edge Function (`service_role`): revogar token Apple via REST da Apple (refresh token guardado cifrado no Vault desde o cadastro) → apagar objetos de Storage →
   `auth.admin.deleteUser` (cascata em todas as tabelas com FK) → inserir `deletion_requests` (hash do e-mail, data, método, `apple_revoked`) → e-mail de confirmação.
3. Dados locais no aparelho apagados pelo app após sucesso.
4. Eventos de analytics: `distinct_id` pseudonimizado; solicitar exclusão no PostHog por API (opcional, retenção 12 meses).
5. Backups do provedor expiram em 7 dias; informar na política.
6. Testar o ciclo criar → excluir → recriar com Apple (issue supabase/auth #2049) antes do lançamento.

## 6. UGC e moderação

- V1: notas e destaques são **privados** — não há conteúdo gerado por usuário visível a terceiros; regras de UGC das lojas (Apple 1.2, Google UGC) não se aplicam.
- Se qualquer feature social for aprovada: denúncia in-app, bloqueio de usuário, moderação humana com prazo, remoção, termos de conduta, contato do desenvolvedor — antes do lançamento da feature (detalhe em `MOBILE_STORE_REQUIREMENTS.md`).

## 7. Resposta a incidentes (runbook mínimo)

1. Detecção (Sentry/alertas/relato) → registrar em `audit_log` e canal interno.
2. Conter: rotacionar segredos afetados; revogar sessões (`auth.admin.signOut` global) se necessário; desligar Edge Function afetada.
3. Avaliar: quais dados, quantos titulares, se sensíveis (sim, por padrão), risco relevante.
4. Comunicar: ANPD + titulares em até 3 dias úteis (Res. 15/2024) com modelo pré-aprovado pelo jurídico.
5. Corrigir e registrar lições; atualizar este documento.

## 8. Checklist pré-lançamento (bloqueante)

- [ ] Projeto Supabase Pro em `sa-east-1`; MFA no dashboard; SSL enforcement; restrições de rede.
- [ ] RLS em todas as tabelas; advisor zero ERROR; testes de autorização (A≠B, anon, anônimo) verdes no CI.
- [ ] `service_role`, `.p8` Apple, SMTP e demais segredos fora do app; rotação documentada.
- [ ] Consentimento destacado implementado e gravado antes da primeira sync de dado sensível.
- [ ] Exclusão (app + web) e exportação testadas fim-a-fim, incluindo revogação Apple e re-cadastro.
- [ ] Política de privacidade (pt-BR) publicada; rótulos Apple e Data safety preenchidos e coerentes com os SDKs reais.
- [ ] Sentry/PostHog na UE, sem PII, sem replay; suboperadores listados.
- [ ] Backups diários confirmados; dump semanal off-site; restore testado.
- [ ] Encarregado nomeado; runbook de incidente e modelo de comunicação aprovados.
- [ ] Classificação etária e medidas para menores conforme `MOBILE_STORE_REQUIREMENTS.md`.

## 9. Não verificado / exige advogado

- Se consentimento é a base correta para dado sensível neste contexto ou se cabe hipótese do art. 11, II.
- Se organização religiosa sem fins lucrativos se enquadra como agente de pequeno porte (Res. CD/ANPD 2/2022) e quais flexibilizações valem.
- Se acesso remoto de suporte de operador estrangeiro (dados em São Paulo) configura transferência internacional.
- Aceitação, pelo Supabase, de cláusulas-padrão da ANPD anexas ao DPA.
- Alcance do ECA Digital art. 24 (vínculo de contas "de até 16 anos" a responsável) para apps não sociais; leitura das orientações/FAQ da ANPD (20/03 e 30/07/2026).
- Se declarar "Sensitive Info — religious beliefs" (Apple) / "Political or religious beliefs" (Play) nos rótulos por inferência — sem orientação oficial encontrada.
- Isenção de taxa do Apple Developer Program para organizações sem fins lucrativos no Brasil; titularidade da marca "Lagoinha" no INPI (litígio público em 2024).
