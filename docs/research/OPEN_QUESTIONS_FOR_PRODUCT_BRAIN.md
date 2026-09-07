# Perguntas que o Product Brain precisa responder

Data: 2026-09-07 (Sprint 0). Cada pergunta traz **por que importa tecnicamente** e o **default que a engenharia assume se não houver resposta**.
As perguntas marcadas com ★ bloqueiam o início do Sprint 1.

## A. Existência e posicionamento

1. ★ **Por que não usar o que já existe?** A Lagoinha já tem app oficial (inChurch) com Bíblia offline, planos de leitura e notas; o YouVersion publica planos de igrejas de graça
   (ver `REUSE_ALTERNATIVES.md`). Qual é a razão de produto para um app próprio (UX de leitura, jornada guiada, dados próprios, comunidade futura, independência)?
   *Default:* app próprio focado em jornada + leitura; app inChurch e YouVersion como canais de divulgação.
2. ★ **Quem é "a Lagoinha" deste produto?** Qual unidade/ministério/entidade jurídica é dona (contas de desenvolvedor, domínio, LGPD, marca)? Os ~3.000 são de qual base (membros, células, jovens)?
   *Default:* entidade a definir; identificadores de app sem marca; domínio próprio da entidade.
3. **Marca:** o app nasce "Lagoinha" ou neutro? (Afeta só nome de exibição e assets — identificadores ficam neutros.)
   *Default:* nome de exibição decidido depois; identificadores neutros.

## B. Conteúdo bíblico (decide a ordem das fontes; ver `BIBLE_CONTENT_OPTIONS.md`)

4. ★ **Quais traduções o público exige?** Hipótese: NVI, NAA/ARA, NTLH (todas licenciadas). Sem contrato, V1 só pode empacotar textos abertos (Bíblia Livre, ONBV, NVA…).
   Uma tradução aberta é aceitável como padrão de lançamento, rotulada como provisória? Ou o lançamento espera a licença?
   *Default:* lançar com Bíblia Livre (padrão) + ONBV (leitura fácil), com tela de atribuição; negociação de NVI/NAA em paralelo.
5. **Disposição de negociar e orçamento** para licenciar SBB (NAA/ARA/NTLH) e Biblica (NVI) — inclusive uso offline. Quem assina (entidade)?
   *Default:* iniciar contato exploratório sem compromisso.
6. **Aceitação do YouVersion Platform / API.Bible como fonte online** de traduções licenciadas (sem offline ou com cache limitado), com as restrições contratuais listadas na frente C?
   *Default:* não depender de plataforma de terceiros para a experiência central até análise jurídica.
7. **Planos:** "Bíblia em 100 dias" e "Bíblia em 1 ano" terão cronograma próprio (fato, seguro) e devocional original (quem escreve? volume por dia?) — ou só leitura sem devocional?
   *Default:* cronograma próprio + campo de devocional opcional por dia.
8. **Áudio da Bíblia** está no horizonte de 12 meses? (Muda peso de libs e licenças.)
   *Default:* não.

## C. Jornada e modelo de uso

9. ★ **Leitura e início de plano sem conta** são aceitáveis? (Recomendação técnica e regulatória: sim; conta só para sincronizar/lembretes em outro aparelho.)
   *Default:* sim.
10. **Dias fixos no calendário** (todos começam no mesmo dia, ex.: campanha da igreja) ou **ritmo pessoal** (cada um começa quando quiser)? Ou ambos?
    *Default:* modelo suporta ambos; V1 expõe ritmo pessoal + "entrar na campanha".
11. **Pular domingos / dias de descanso / recuperar atraso**: qual a regra de agenda? O que acontece quando a pessoa atrasa (mostra tudo pendente? re-planeja?)
    *Default:* agenda diária; atraso mostra pendências; "recalcular a partir de hoje" opcional.
12. **Notas e destaques** são suficientes como "reflexão" em V1, ou "reflexões" são uma feature própria (prompts diários, diário)?
    *Default:* notas por versículo/dia, privadas.
13. **Lembrete diário**: horário escolhido pelo usuário; tolerância de ±30 min (alarme inexato) é aceitável?
    *Default:* sim.
14. **Métodos de login**: e-mail OTP + Apple + Google bastam? A base tem e-mail? Se for necessário WhatsApp/SMS, há custo (~US$ 0,11/verificação).
    *Default:* e-mail OTP + Apple + Google.

## D. Privacidade, menores e conteúdo

15. ★ **Adolescentes (12–17) são público esperado e precisam de conta?** O ECA Digital (em vigor desde 17/03/2026) impõe defaults protetivos, página para pais,
    canal de denúncia, avaliação de impacto e, possivelmente, vínculo de contas de menores de até 16 anos a um responsável (art. 24 — jurídico).
    *Default:* uso completo sem conta para todos; conta (sincronização/push) só para ≥ 18 (ou ≥ 16/17 se o jurídico aceitar); sem features sociais; sem perfilamento.
15b. **Distribuição geográfica da V1:** só Brasil (evita leis estaduais dos EUA e GDPR) ou também diáspora (EUA/Portugal)?
    *Default:* só Brasil.
15c. **Marca e contas:** quem é a titular da marca "Lagoinha" (há litígio público de 2024) e ela autoriza por escrito o uso do nome/logo? A conta Apple/Google será da igreja (exigido para app com dado sensível e para conteúdo/marca de terceiros)?
    *Default:* contas em nome da entidade dona; identificadores neutros; consulta ao INPI antes de publicar.
16. **Texto de consentimento** para dado sensível (convicção religiosa) e política de privacidade em português — quem redige/revisa (jurídico)? Quem é o encarregado (DPO)?
    *Default:* engenharia entrega rascunho técnico; jurídico revisa antes do lançamento.
17. **Retenção**: por quanto tempo manter dados de contas inativas? (Default: anônimos 30 dias; contas inativas 24 meses com aviso.)
18. **Compartilhamento de versículo como imagem** com marca do app/igreja — desejado em V1?
    *Default:* texto + imagem simples.

## E. Escopo e sequência

19. **Ordem das hipóteses não aprovadas** (grupos, streak, feed…): qual é a primeira candidata após V1? (Define se PowerSync/Realtime entram cedo.)
    *Default:* nenhuma até dados de uso de V1.
20. **Tablet/iPad** em V1? (Android 16 já impede travar orientação em telas grandes; iPad exige layout responsivo.)
    *Default:* layout responsivo básico, sem otimização específica.
21. **Distribuição**: pública nas lojas desde o início, ou fase fechada (TestFlight / teste fechado do Play com os 3.000)?
    *Default:* fase fechada com a igreja → pública.
22. **Data-alvo** de lançamento e se existe campanha (ex.: "100 dias" começando em data fixa) — define a pressão sobre licenciamento e contas de loja (D-U-N-S leva semanas).

## F. Decisões que o Product Brain deve apenas confirmar (recomendações técnicas)

- Stack: React Native + Expo (ADR-001). Backend: Supabase em São Paulo (ADR-002).
- Sem SaaS multi-igreja, sem pagamentos, sem IA, sem social em V1.
- Lembretes locais; push remoto só para comunicados aprovados.
- Analytics agregado sem PII; sem SDKs de anúncios; Sentry/PostHog na UE.
