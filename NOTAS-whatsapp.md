# NOTAS — Confirmações enviadas pelo app (WhatsApp automático) · PLANO ARQUIVADO

> **Decisão da gestão (16/10/2026): não seguir.** "Mais fácil manter a recepção enviando a mensagem, o volume não é tão
> absurdo." A tela Confirmações continua manual ("Abrir WhatsApp"). Este plano fica como registro, caso o volume cresça.

Arquivo de retomada deste item. Quem abrir um chat novo lê, nesta ordem: `docs/DEPLOYS.md` ("No ar agora"),
`NOTAS-api.md`, este arquivo, `NOTAS-fase2.md` (seção 1, Confirmações), `NOTAS-fase1.md`, `docs/ESTADO-ATUAL.md`.

> **Estado em 16/10/2026**: só plano, **nenhum código escrito**. Base: deploy real `2026-10-16-13` (branch
> `claude/youthful-fermat-9l35tu`). Preços pesquisados em 16/10/2026 (fontes no fim); conferir na hora de contratar.

## 0. Ideia em uma frase

A tela **Confirmações** continua sendo o lugar de tudo. Muda só o envio: em vez de abrir o WhatsApp para a recepção
apertar "enviar", o app manda a mensagem por um **provedor da API oficial do WhatsApp** (recomendado: Twilio), sozinho
todo dia e no botão "Enviar agora". A família responde com um botão ("Confirmo" / "Preciso remarcar" / "Não poderei ir")
e a resposta aparece no mesmo cartão como **sugestão**, que a recepção confirma com um clique. O Claude só entra quando a
família escreve texto livre em vez de tocar no botão.

Por que precisa de provedor: o Apps Script não tem como "apertar enviar" no WhatsApp do celular da recepção. O link
`api.whatsapp.com/send` de hoje só abre a conversa; quem envia é a pessoa. Envio sem ninguém apertar só existe pela API
(oficial da Meta, direta ou por um parceiro) ou por ferramentas não oficiais que simulam o WhatsApp Web.

## 1. Opções de envio (≈ 300 confirmações/mês, ≈ 250 respostas)

Câmbio usado: US$ 1 ≈ R$ 5,50. Desde 1/07/2025 a Meta cobra **por mensagem de modelo entregue**; resposta da família
(mensagem recebida) é grátis na Meta. Lembrete de consulta é modelo da categoria **utilidade**: Brasil ≈ US$ 0,0068,
**US$ 0,0078 a partir de 1/10/2026** (tabela publicada por terceiros; conferir no painel da Meta).

| Opção | Oficial? | Custo/mês estimado | O que exige | Risco principal |
|---|---|---|---|---|
| **A. Meta direto (WhatsApp Cloud API)** | sim | 300 × 0,0078 ≈ **US$ 2,3 ≈ R$ 13** | Portfólio empresarial na Meta (CNPJ), número registrado na API, nome de exibição aprovado, modelo aprovado, cartão internacional; **e um servidor de webhook fora do Google** (ver seção 3) | Respostas só chegam por webhook, e o Apps Script não serve bem de webhook da Meta → precisa de uma peça a mais (ex.: Cloudflare Worker) fora da planilha |
| **B. Twilio (parceiro oficial da Meta)** | sim | Meta ≈ US$ 2,3 + Twilio US$ 0,005 × (300 enviadas + ~250 recebidas) ≈ US$ 2,8 → **≈ US$ 5 ≈ R$ 30** | Os mesmos itens da Meta (o cadastro é feito pelo "Embedded Signup" dentro da Twilio), conta Twilio em dólar com cartão (IOF), console em inglês | Custo um pouco maior que direto; dependência de mais um fornecedor. **Vantagem decisiva: dá pra buscar as respostas pela API (sem webhook)** |
| **C. Parceiro brasileiro (Zenvia, Blip, Gupshup e similares)** | sim | Meta + mensalidade do parceiro (costuma ser fixa e bem acima das opções A/B; pedir orçamento) | Mesmo cadastro na Meta; contrato em reais, suporte em português | Mensalidade para um volume pequeno; cada um tem uma API diferente; muitos também só entregam resposta por webhook |
| **D. Z-API e similares (não oficiais)** | **não** | **R$ 99,99/instância/mês** (plano Ultimate, out/2026), sem custo por mensagem | Celular com o WhatsApp conectado por QR code (como o WhatsApp Web) | **Bloqueio do número** pela Meta (envio automático por ferramenta não oficial viola os termos); sessão cai e pede QR de novo; dado de saúde passando por um intermediário fora do acordo da Meta. Se o número bloqueado for o da recepção, a clínica perde o canal principal com as famílias |

(Z-API "Omni" é outro produto, que usa a API oficial; tem mensalidade + tarifa da Meta e cai no caso C.)

**Recomendação: B (Twilio).** Motivos:
1. É oficial: não arrisca o número da recepção.
2. **As respostas podem ser buscadas pela API** (lista de mensagens recebidas, com status de entrega e leitura das
   enviadas), por um gatilho de tempo do próprio Apps Script. Assim tudo fica dentro do Google, sem webhook e sem servidor
   extra, que é o ponto fraco da opção A nesta arquitetura.
3. O custo (≈ R$ 30/mês) é da mesma ordem de grandeza do direto e bem abaixo da Z-API, sem mensalidade fixa.
4. Se um dia a clínica quiser um painel de atendimento de verdade, o número e o modelo aprovados na Meta continuam valendo;
   dá pra migrar para a Meta direto ou para um parceiro.

## 2. O número da recepção: dá pra continuar no celular?

- **Coexistência (Meta, 2025)**: um número do **WhatsApp Business (app)** pode ser conectado à API **e continuar
  funcionando no celular**. O que a API envia aparece no app e as respostas chegam nos dois lugares. Condições relatadas
  pelos parceiros: tem de ser o app **WhatsApp Business** (não o WhatsApp comum), o app tem de ser aberto pelo menos a cada
  ~13 dias, o histórico de conversas individuais é sincronizado, e algumas funções somem no app (mensagens temporárias,
  visualização única, localização em tempo real; ligações dependem do parceiro). **Não achei confirmação de que a
  coexistência já vale para números do Brasil nem de que a Twilio oferece**: é a primeira coisa a confirmar (seção 6).
- **Cuidado**: registrar o número na API **sem** coexistência tira o número do app do celular. Não fazer isso com o número
  da recepção.
- **Plano B**: um **número novo** (chip pré-pago só para isso) dedicado às confirmações. As famílias respondem por botão a
  esse número; a mensagem diz "para falar com a recepção, chame no (32) …". Simples e sem risco para o número atual, mas
  as famílias passam a ver dois números da clínica.

## 3. Como as respostas voltam para o app

**Por que não webhook direto no Apps Script** (o app hoje só tem `doGet`):
- A implantação atual é restrita a `clinicanascente.com.br` ("Qualquer pessoa em clinicanascente.com.br"); um webhook
  exigiria outra implantação aberta a qualquer pessoa, anônima.
- O Apps Script responde com redirecionamento (302) para `script.googleusercontent.com`; a verificação do webhook da Meta
  e as entregas não lidam bem com isso (falha na verificação, reenvios e mensagens duplicadas).
- O `doPost` não dá acesso aos cabeçalhos da requisição, então não dá para conferir a assinatura (`X-Hub-Signature-256` da
  Meta, `X-Twilio-Signature` da Twilio): qualquer um que descobrisse a URL poderia "responder" em nome de uma família.
- Cota de execução e tempo de resposta do Apps Script não são garantidos para webhook.

**Como fica com a Twilio (recomendado): busca periódica.**
- Gatilho de tempo novo (ex.: a cada 15 min, das 7h às 21h) chama `API.buscarRespostasWhats`: lê da Twilio as mensagens
  **recebidas** no número da clínica desde a última busca e o **status** (enviada, entregue, lida, falhou) das enviadas.
  Credenciais (`TWILIO_SID`, `TWILIO_TOKEN`) nas propriedades do script, como a `ANTHROPIC_API_KEY`. A chamada sai do
  Google (seguro); nada entra.
- O carregador ganha uma função `gatilhoWhats()` (precisa recolar `dist/Code.real.gs` uma vez, como no 16/10).
- Cada resposta é ligada às sessões pelo número que respondeu + a última confirmação enviada para ele (aba
  `Mensagens WhatsApp`).

**Onde o Claude entra**:
1. **Botão tocado** (a maioria dos casos): resposta exata ("Confirmo" / "Preciso remarcar" / "Não poderei ir") → sugestão
   direta, **sem IA, sem custo**.
2. **Texto livre** ("vou sim, mas vou atrasar 10 min", "pode ser às 15h?", "quem vai é o pai"): `chamarIA('confirmacoes',
   { texto, schema, … })` com a instrução da aba IA (`instrucao_confirmacoes`, nova) e resposta em JSON fixo:
   `{ classe: Confirmou | Não vem | Remarcar | Outro, sessoes: [índices], resumo: "…", confianca }`. Mesma pausa
   (`ia_ativa` + `ia_confirmacoes` nova na aba IA), mesmos tetos, mesmo `IA log`. Custo estimado com
   `claude-haiku-5-5`: ≈ 500 tokens de entrada e 80 de saída por resposta → **≈ US$ 0,0001 cada**; 100 textos livres/mês
   ≈ US$ 0,01.
3. Pro modelo vão **só**: o texto que a família escreveu e a lista das sessões daquela mensagem (data, hora, primeiro nome,
   profissional). Sem telefone, CPF ou valores.
4. **Sempre sugestão.** Nada é gravado na Agenda/Lista do dia sem o clique da recepção. IA pausada ou teto atingido → a
   resposta aparece como "Outro (ler a mensagem)" e a recepção decide.

## 4. Como fica a tela Confirmações

- **Envio automático diário** (nova rotina, gatilho próprio; hora na aba de parâmetros, sugestão 9h): manda a
  confirmação das sessões de **amanhã** (regra de fim de semana a definir, seção 6) para todo cartão que tem **celular**,
  **ainda não confirmado** e **sem mensagem enviada** (nem manual nem automática). Uma mensagem por pagador, como hoje.
- **"Enviar agora"** em cada cartão (troca o "Abrir WhatsApp" como ação principal quando a API está ligada) e **"Enviar
  para todos que faltam (n)"** no topo do período escolhido, com confirmação antes ("Enviar 14 mensagens?").
- **"Abrir WhatsApp"** e "Copiar mensagem" continuam como alternativa manual (botão secundário), e são o único caminho
  para quem **não tem celular** no cadastro (o campo de digitar o número continua igual).
- Situação no cartão: "Enviada automaticamente 09:02 · entregue · lida", ou "Falhou (número sem WhatsApp)" com o botão
  manual em destaque.
- **Resposta da família** no cartão: o texto, a sugestão em cor (verde Confirmou, laranja Remarcar, vermelho Não vem,
  cinza Outro), de onde veio (botão / IA) e:
  - **Confirmar sugestão** → Confirmou grava a mesma linha "Confirmado" da `Lista do dia` (`API.confirmar` de hoje);
    Não vem / Remarcar abre a Agenda do dia com o formulário já aberto (como o botão "Não vem / remarcar" de hoje).
  - **Escolher outra** (as 4 opções) e **Ignorar**.
- Resumo do topo ganha "respondeu, a conferir (n)". Meu dia pode ganhar um card "Respostas de confirmação (n)".
- Chave geral para desligar: `whats_auto_ativo` = Não para tudo (envio automático e "Enviar agora"); o manual continua.
  Teto de mensagens por dia (ex.: 60) contra envio em massa por engano.

## 5. O que vai para fora e o que fica na planilha

**Para a Twilio/Meta (mensagem)**: primeiro nome do pagador, data, hora e nome do profissional ("Dra. Juliana Ribeiro",
da coluna `Nome na mensagem`), e o texto fixo do modelo (endereço, aviso das 24 h). **Nunca** CPF, valores, convênio,
diagnóstico, nome completo. Ponto a decidir: hoje, quando um pagador tem vários filhos, a mensagem leva o **primeiro nome
de cada paciente** (👤). Manter ou tirar? (seção 6).

**Para o Claude** (só texto livre): o texto da resposta + as sessões daquela mensagem (seção 3).

**Modelo de mensagem na Meta**: o texto vira um **modelo aprovado** pela Meta. Consequências:
- Trocar o texto passa a exigir nova aprovação (minutos a 1 dia). `Parâmetros!msg_confirmacao` continua valendo só para o
  envio manual.
- As variáveis do modelo não aceitam quebra de linha, então o bloco de sessões fica numa linha só. Proposta: dois modelos,
  `confirmacao_1` (uma sessão: data, hora, profissional em variáveis separadas) e `confirmacao_n` (várias:
  "qui 17/10 às 14h00 com Dra. Juliana; sex 18/10 às 9h00 com Dr. Victor").
- Três botões de resposta rápida: **Confirmo** · **Preciso remarcar** · **Não poderei ir**.
- O texto tem de ser só lembrete (sem promoção), senão a Meta reclassifica como marketing (≈ 9× mais caro).

**Na planilha** (nada apagado; colunas novas no fim; achadas pelo cabeçalho; `Registrado por (app)` em tudo):
- `Mensagens WhatsApp` (existe): linhas de envio automático com Tipo "Confirmação (automática)"; colunas novas no fim:
  `Canal` (manual / API), `ID no provedor`, `Status de entrega`, `Atualizado em`. `Registrado por (app)` = "envio automático ·
  data e hora" ou o e-mail de quem clicou em "Enviar agora".
- `Respostas WhatsApp` (nova): ID · Data/hora · WhatsApp · Pagador · Texto · Botão · Sugestão · Origem (botão / IA) ·
  Confiança · Sessões (JSON) · ID da mensagem de confirmação · Situação (a conferir / confirmada / ignorada) ·
  Confirmado por · Registrado por (app).
- `IA log`: as classificações de texto livre (item `confirmacoes`), como as guias.
- Parâmetros novos (aba `Parâmetros` ou aba própria `WhatsApp`): `whats_auto_ativo`, `whats_hora_envio`,
  `whats_dias_antes`, `whats_teto_dia`, `whats_modelo_1`, `whats_modelo_n` (nomes dos modelos aprovados), número remetente.
- Gasto com o provedor: o status buscado já traz o preço de cada mensagem; card de uso pode mostrar "WhatsApp este mês: n
  mensagens, US$ x" ao lado do "Uso da IA".

## 6. Perguntas para a gestão (antes de começar)

1. **Quantas famílias têm celular hoje?** Em 15/10 só 8 de 533 pacientes ativos tinham telefone; depois entraram 20. Se a
   maioria ainda não tem, o automático cobre pouco até a recepção completar os números. Fazemos antes um mutirão de
   números (ex.: tile no Meu dia "sessões de amanhã sem WhatsApp")?
2. **Provedor**: OK com a Twilio (cobrança em dólar no cartão, ≈ R$ 30/mês)? Há cartão internacional da clínica?
3. **Número**: a recepção usa o app **WhatsApp Business** ou o WhatsApp comum? Aceita testar a coexistência com o número
   atual e, se não for possível, usar um **chip novo** só para confirmações?
4. **Portfólio na Meta**: a clínica já tem Meta Business (Facebook/Instagram da clínica)? Quem é o administrador? A
   verificação pede CNPJ e um documento/site com o nome da clínica.
5. **Consentimento**: a política do WhatsApp exige que a família tenha aceitado receber mensagens. Basta ter dado o número
   para isso, ou criamos uma coluna "Aceita WhatsApp?" em Pacientes (padrão Sim) para quem pedir para não receber?
6. **Quando enviar**: que horas (sugestão 9h)? Sessões de segunda: enviar no sábado ou na sexta? Feriado: o app não sabe;
   pausar à mão?
7. **Texto**: manter o texto oficial (endereço, IMPORTANTE, 24 h) com os três botões? Nos irmãos, mostrar o primeiro nome
   de cada criança ou só a data/hora/profissional?
8. **Respostas**: Confirmou por botão pode ser gravado sozinho (sem clique), ou tudo passa pelo clique da recepção como
   pedido? (O plano assume clique em tudo.)
9. **Quem pode**: "Enviar agora"/"Enviar para todos" para recepção e gestão, ou só gestão?
10. **Caminho de publicação**: primeiro na CÓPIA TESTE (com o número de teste da Twilio) ou direto na real como a IA?

## 7. Ordem proposta (depois do OK)

0. **Sem código** (gestão + eu guiando): conta Twilio, portfólio Meta, número (coexistência ou chip), 2 modelos
   enviados para aprovação, credenciais nas propriedades do script, números de celular completados.
1. **Envio**: "Enviar agora" + "Enviar para todos" + envio automático diário + status de entrega (busca). Testes com o
   Google falso (`UrlFetchApp` programável) e simulação; publicação conforme pergunta 10; carregador novo com
   `gatilhoWhats()` (recolar uma vez).
2. **Respostas por botão** (sem IA): aba `Respostas WhatsApp`, sugestão no cartão, Confirmar sugestão.
3. **Texto livre com o Claude**: `chamarIA('confirmacoes')`, chaves novas na aba IA, sugestão com o resumo.

## Fontes (consultadas em 16/10/2026)

- Preço Meta Brasil e mudança de 1/10/2026: [ManyChat — WhatsApp pricing guide](https://help.manychat.com/hc/en-us/articles/14281380243740-WhatsApp-pricing-guide),
  [EngageLab](https://www.engagelab.com/blog/whatsapp-business-api-pricing), [Message Central — Brasil](https://www.messagecentral.com/blog/whatsapp-business-api-pricing-brazil)
- Twilio: [Customer.io — WhatsApp billing](https://docs.customer.io/accounts/billing/whatsapp-billing/),
  [Twilio — aviso de mudança de preços out/2026](https://support.twilio.com/hc/en-us/articles/53100462475931-Notice-Changes-to-WhatsApp-s-Pricing-October-2026)
- Z-API: [Cubo Suite — guia Z-API 2026](https://blog.cubosuite.com.br/z-api-guia-completo/), [tudoprawhats — Z-API](https://tudoprawhats.com.br/z-api),
  [z-api.io](https://z-api.io/en)
- Coexistência: [Kapso](https://kapso.ai/blog/whatsapp-business-app-coexistence-cloud-api), [8x8](https://developer.8x8.com/connect/docs/whatsapp/whatsapp-business-app-coexistence),
  [Wati](https://support.wati.io/en/articles/11822402-introducing-whatsapp-coexistence)
