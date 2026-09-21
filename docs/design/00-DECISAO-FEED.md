# Decisão do fundador — o feed entra no escopo

- **Data:** 2026-09-20
- **Quem decidiu:** Davi (fundador)
- **Status:** decisão de produto tomada, **pendente de ratificação do Product Brain**
- **Por que este documento existe:** sem ele, o prompt de redesenho manda desenhar uma coisa que o resto
  deste pacote proíbe. Um pacote que se contradiz não tem autoridade nenhuma — e a autoridade dele é o
  que impede alguém de reescrever o texto da igreja ou publicar nome de líder.

---

## A decisão

O app passa a ter um **feed da comunidade**, e ele passa a ser **a primeira tela**: quem abre o app vê o
que as pessoas da igreja publicaram, como no Instagram. A pessoa publica uma foto e um texto sobre o que
Deus falou com ela naquele dia.

## O que esta decisão supera

Quatro invariantes deste pacote deixam de valer **para o feed e só para ele**:

| Invariante | O que dizia | Situação |
|---|---|---|
| **P-16** (bloqueante) | "feed, grupos, amigos, comunidade, comentários, reações" são hipóteses **não aprovadas**, não implementar sem aprovação do Product Brain | superado por esta decisão, **sujeito a ratificação** |
| **S-10** (bloqueante) | "sem conteúdo de usuário visível a terceiros na V1" | superado por esta decisão |
| **C-13** | "Compartilhar um insight permanece desativado" | superado por esta decisão |
| **C-10** | "não coletar contatos ou fotos além do avatar" | superado **apenas quanto a foto publicada pela própria pessoa** |
| **README §1** | "não é, e não deve virar: rede social, feed, ranking" | corrigido: feed sim, ranking **continua proibido** |

**Nenhum outro invariante está aberto.** Texto de tradução bíblica, nome de líder, material da igreja,
alvo de toque, Dynamic Type, números honestos, privacidade da reflexão e do jejum: tudo continua valendo
exatamente como está escrito no capítulo 04.

## O que a decisão arrasta com ela

Isto não é opinião de desenho: é o que a lei brasileira e as duas lojas exigem de qualquer app com
conteúdo publicado por usuário. Entra no escopo junto com o feed, ou o feed não pode ser publicado.

1. **Filtragem antes de publicar.** Apple 1.2 exige "a method for filtering objectionable material from
   being posted" — filtrar **antes** de aparecer, não só denunciar depois. Isso muda o fluxo: existe um
   estado entre "enviei" e "apareceu".
2. **Moderação humana com prazo** (24–48h) e as telas dela: fila de quem revisa, recibo da denúncia,
   estado da denúncia, aviso ao autor quando algo sai do ar, com motivo e caminho para contestar
   (Tema 987 do STF, 26/06/2025; ECA Digital arts. 28–33).
3. **Bloquear usuário** e **apagar o próprio post**, separados um do outro.
4. **Contato do desenvolvedor alcançável de dentro do app** (Apple 1.2, "published point of contact").
5. **Regras da comunidade** com aceite registrado antes da primeira publicação (exigência do Google Play
   para UGC; ECA Digital exige termos em pt-BR).
6. **Consentimento específico e destacado** para publicar conteúdo sobre fé. Convicção religiosa é dado
   pessoal sensível (LGPD art. 5º, II; art. 11, I). Não pode ser caixinha dentro de Termos.
7. **Idade.** Publicar exige conta, e conta é só para maiores de 18 (ou 16/17 com parecer jurídico) —
   S-11. Criança e adolescente usam o app inteiro, mas **não publicam**. Isso precisa aparecer na tela
   sem humilhar ninguém.
8. **Foto com rosto de terceiro.** A foto do culto revela a convicção religiosa de gente que não é
   usuária, não consentiu e não tem como reclamar de dentro do app (LGPD art. 11 §1º; art. 14 para
   criança). Precisa de aviso no momento de publicar, de motivo de denúncia próprio, e de um canal de
   retirada acessível a quem **não tem o app**.
9. **Exclusão de conta em cascata** (S-03), e uma ação separada de "apagar tudo o que publiquei" — quem
   sai da igreja não necessariamente quer apagar a própria jornada.
10. **Nada de mecânica compulsiva.** O Decreto 12.880/2026 (art. 9º, parágrafo único), que regulamenta o
    ECA Digital (Lei 15.211/2025), lista quatro mecanismos de incentivo ao uso compulsivo: esconder os pontos
    naturais de parada, disparar conteúdo novo sem pedido (autoplay), dar recompensa por tempo de uso e mandar
    notificação excessiva. **O feed sem fim cai quase com certeza no primeiro — o feed tem que ter fim.**
    *Corrigido em 2026-09-21:* a versão anterior deste item dizia que streak, badge de não-lidos e notificação
    de atividade alheia são "proibidos por lei". Isso era exagero: eles não aparecem no texto legal. Ficam fora
    por **decisão de produto** alinhada à lei (`CLAUDE.md`: sem mecânicas de uso compulsivo), e não por
    proibição legal — ver `docs/product/comunidade/02-lei.md`.

## Os dois conflitos que a decisão cria com o resto do produto

Não são obstáculos, são perguntas que o desenho tem de responder:

- **Uso sem conta.** Abrir, ler, concluir, refletir e ver a jornada funcionam **sem login**, e muro de
  login na abertura é rejeição da Apple (5.1.1(v), S-02). Mas o feed exige conta. Se o feed é a primeira
  tela, a primeira tela do app é, para a maioria das pessoas, um lugar onde elas não podem participar.
- **Offline.** Leitura, progresso, reflexão e jejum funcionam sem internet — é uma promessa escrita do
  produto. O feed nunca funciona offline, e o app **não tem detecção de rede** hoje. Com o feed na porta,
  quem abre o app no metrô recebe primeiro um erro, e só depois a parte que funciona perfeitamente.

## O que falta para esta decisão ficar firme

1. **Ratificação do Product Brain**, porque o `CLAUDE.md` exige aprovação dele para as hipóteses do P-16.
2. **Backend.** A área com conta nunca rodou com dado real nesta versão (`isCloudConfigured() === false`).
   Feed com foto exige banco, storage, moderação e RLS — as fases 5 a 8 existem como SQL não aplicado.
3. **Alcance.** Feed da igreja inteira (~3.000 pessoas) ou do meu grupo? Hoje o app **esconde de
   propósito** a lista de membros de quem não lidera; um feed da igreja inteira desfaz essa proteção.
