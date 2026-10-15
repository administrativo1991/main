# NOTAS — Fase 1 (financeiro simples, rápido e usado)

Arquivo de retomada. Quem abrir um chat novo começa por aqui: diz o que foi feito, o que falta, as decisões, as perguntas
abertas pra gestão e como testar. Atualizado a cada item concluído. Data de início: 15/10/2026.

> **Estado em 15/10 (noite): Fase 1 codificada, testada na simulação, publicada no teste (`arquivos`, 2026-10-15-01) e,
> com o OK da gestão ("amei, tá aprovado"), promovida pra planilha real (`arquivos_real`, 2026-10-15-02).**
> Ficam pra acompanhar nos primeiros dias de uso: tempos reais (rodapé da gestão), as 16 linhas "a confirmar" e
> os casos reais do passo 5.3 observados no uso. A Fase 2 (WhatsApp, conciliação, parcelas, perdas, confirmação da véspera,
> check-in, alertas, alta, ficha) começa em chat novo, lendo este arquivo primeiro. Decisões da gestão em 15/10: (a) OK no plano e no relatório do item 0; (b) perguntas 1 e 2 da
> seção 3: **sim** (coluna `Profissional` + 6 colunas por competência em `Mensalistas`; `Vigente desde/até`);
> (c) os 13 pares "a decidir" do relatório **não bloqueiam**: foram carregados com o valor proposto e a observação
> "migração 15/10 — a confirmar" (16 linhas; a gestão confirma quando quiser em Pacientes → Cobrança por profissional);
> (d) a carga de dados foi feita **direto na planilha real** (a gestão achou que não compensa passar pela cópia: o app
> foi pouco usado pela recepção); (e) celular não é prioridade: "o app é usado, via de regra, pelo computador".
>
> **Já na planilha real** (15/10): abas novas `Cobrança por profissional` (165 linhas, IDs `C-20261015-001…165`),
> `Valores por sessão` (A1:D34), `Parâmetros` (A1:C9), `_relatorio cobrança 15-10` (192 linhas, só leitura);
> `Listas!K1:M6` (Cobrança/Pagamento por profissional, Feriados); log das 165 linhas em `Alterações de cadastro`
> (A189:G353). A CÓPIA TESTE recebeu as mesmas abas e as 14 abas de dados da real atualizadas em 15/10 (as antigas viraram
> `_antes 15-10 …`). **Nenhuma coluna existente foi renomeada, movida ou apagada.**
>
> **Como retomar**: `git log` (commits 08dedba servidor, 24d34fa cliente, e os seguintes), `node build.js && for t in
> tests/*.test.js; do node $t; done`, simulação com `node <scratchpad>/sim.js` (script de Playwright; se o scratchpad sumiu,
> abrir `dist/index.html` no navegador e passar pelas telas: Agenda numa segunda-feira, Registrar, Cobrança do mês, Meu dia,
> Pendências, Pacientes → editar). Depois os casos reais do passo 5.3 na CÓPIA TESTE (`appUrlCopia`).

---

## 0. Onde o projeto estava quando a Fase 1 começou

- **Código no ar** (planilha real e CÓPIA TESTE): deploy `2026-10-10-02`, branch `claude/kind-franklin-q0je9a`
  (commit `0ba4b3b`). O branch desta fase, `claude/bold-edison-l0keb0`, foi avançado até esse commit: o repositório
  agora reflete exatamente o que roda (41 peças na planilha de código: duplicatas 1 · server 12 · index 28).
  O `docs/ESTADO-ATUAL.md` está desatualizado (fala em 06/10); `docs/DEPLOYS.md` é a fonte confiável.
- **Estrutura**: servidor `app/server/server.js` (1.726 linhas, Apps Script V8, carregado da planilha de código pelo
  `app/loader/Code.gs`); tela `app/client/` (`styles.css`, `layout.html`, `telas/*.html`, `js/00-base.js … 90-boot.js`);
  `node build.js` gera `dist/` e as peças de ≤ 12.000 caracteres; testes em `tests/` (`planilha-falsa.js` simula a
  planilha em memória pros testes do servidor).
- **Telas hoje**: Agenda (lista do dia + grade da semana) · Registrar · Pacientes · Pacotes · Pendências · Repasse (gestão).
- **Modelo de cobrança hoje** (cadastro `Pacientes`): `Cobrança` (F) com Tabela · Por sessão (combinado) · Pacote 4 sessões ·
  Pacote 12 sessões · Mensalidade social · Mensalidade especial · Convênio · Pro bono · Permuta; `Pagamento` (AH) com
  Na sessão · No início do mês · No mês seguinte · Não se aplica; `Valor combinado (R$)` (AE), `Sessões por pacote` (AF),
  `Valor do pacote (R$)` (AG). `Regra de cobrança` (R) está vazia. Um único profissional de referência (Y).
- **Aba do mês**: A–T como sempre; U `Registrado por (app)`, V `Plano (ID)`, W `Valor recebido (R$)`, X `Sessões do pacote`.
  F/G/H/N (convênio, modalidade, atenção, pagador) são **gravadas pelo app** desde 10/10 (não são mais fórmula).
- **Pago? (K)** hoje em `Listas!B`: Sim · Não · Convênio (fatura) · Pacote (sessão já paga) · Não se aplica (pro bono /
  permuta) · Perdido / glosa · Parcial · Incluída na mensalidade. O fechamento do mês lê esses valores: **continuam**.
- **Mensalidades/pacotes hoje**: aba `Mensalistas` (uma linha por paciente, pares "MÊS — pago?" / "Data") + aba
  `Renovações` (pagamentos de mensalidade registrados pelo app em outubro, coluna "Referente a") + coluna X da aba do mês.
- **Por que as telas Pacotes/Pendências demoram 25–40 s**: cada chamada relê abas inteiras com `getValues()` (Pacientes
  35 colunas × 535 linhas; todas as abas de mês em `pacotesEstado_`; Alterações de cadastro; Mensalistas), sem cache
  nenhum; `bootstrapAtendimento` faz tudo isso de novo a cada abertura; a tela espera uma chamada terminar pra começar
  a outra.

---

## 1. Plano da Fase 1 (ordem de execução)

### Passo 0 — Relatório "Cobrança por profissional" (modo relatório, nada gravado) → **esperar OK**

Fonte: planilha real (`Pacientes`, `Setembro`, `Outubro`, `Agenda recorrente`, `Mensalistas`, `Renovações`), lida em 15/10.
Uma linha por paciente ativo × profissional que o atendeu em set/out ou que está na agenda recorrente, com Cobrança ·
Valor por sessão / Valor mensal · Pagamento (com a virada 31/10 → 01/11 onde valer) · fonte de cada valor · divergências ·
lista "decidir com a gestão". Entregue como arquivo (`.md`) fora do repositório e, pra facilitar a revisão, também numa
aba `_relatorio cobrança por profissional 15-10` na CÓPIA TESTE (só leitura; a gestão pode anotar numa coluna "OK?").

Depois do OK: gravar as linhas na aba nova `Cobrança por profissional` da CÓPIA TESTE (uma chamada por linha, log em
`Alterações de cadastro`, `Valor decidido por` = "migração 14/10").

### Passo 1 — Base de dados nova (CÓPIA TESTE; nada nas colunas existentes)

| Aba | Colunas | Observação |
|---|---|---|
| **`Cobrança por profissional`** (nova) | ID · Paciente · Profissional · Ativo · Cobrança · Convênio · Valor por sessão (R$) · Valor mensal (R$) · Pagamento · Vigente desde · Vigente até · Valor decidido por · Valor decidido em · Observação de cobrança · Registrado por (app) | `Vigente desde/até` resolvem "Posterior até 31/10 e Antecipado a partir de 01/11" (duas linhas, uma termina em 31/10, a outra começa em 01/11) e "Pro bono até 31/10 → social". O app escolhe a linha **do profissional** vigente na data; mais de uma vigente → a mais recente + aviso à gestão |
| **`Valores por sessão`** (nova) | Especialidade · Valor · Nome · Ativo | carga: psicologia 120 cheio · 100 · 95 · 90 · 85 · 80 · 70 · 60 · 50 · 25; demais especialidades = valores de `Procedimentos`. A lista do cadastro mostra só os da especialidade do profissional |
| **`Parâmetros`** (nova) | Parâmetro · Valor · Descrição | `vencimento_dia` 10 · `tolerancia_dia` 15 · `taxa_falta_pct` 50 · `rascunho_horas` 2 · `chave_pix` (Fase 2). Nada disso no código |
| `Listas` | colunas novas no fim: `Cobrança (por profissional)` = Por sessão · Mensalidade fixa · Convênio · Pro bono · Permuta; `Pagamento (por profissional)` = Na hora · Antecipado · Posterior · Não se aplica; `Feriados` (dd/mm/aaaa) | as colunas antigas H/J ficam (não são mais lidas) |
| `Mensalistas` | colunas novas no fim: `Profissional` e, por competência, `MÊS/AAAA — sessões agendadas` · `— valor cobrado` · `— pago?` · `— data` · `— forma` · `— NF` (e `— última cobrança`, Fase 2) | continua a base da tela Cobrança do mês; linha = paciente × profissional (as 44 linhas atuais ganham o profissional na carga). Botão "Criar colunas de {mês}" cria as 6 colunas |
| aba do mês | coluna nova no fim `Detalhe da falta` (texto livre) e `Decisão da gestão` (não abate · abate no mês seguinte · taxa de falta · relevar) | gravadas pela recepção e pela gestão; a Observação (S) recebe o prefixo "Falta/desmarcação — " como pedido |
| `Alterações de cadastro` | — | toda linha criada/alterada em `Cobrança por profissional` vai pra cá (campo = "Cobrança por profissional · {profissional} · {campo}") |

Regras: gravação célula a célula; nada apagado; colunas sempre no fim; o app **nunca** recalcula valor a partir da
tabela depois que a linha existe. `Planos`, `Renovações` e a coluna X viram só histórico (o app continua **lendo**
`Renovações` pra saber que outubro de quem pagou pelo app está pago; não cria linha nova lá).

### Passo 2 — Módulo compartilhado `app/shared/cobranca.js` (servidor e tela, testável em node)

Uma função pura `calcularCobranca({ linha, especialidade, valorCheio, tipoAtendimento, oque, competencia, hoje, params })`
devolve `{ situacao, cor, frase, apoio, recebeu: 'sim-nao-parcial' | 'sim-nao' | null, valor, pagoK, nf: bool, guia: bool,
botaoPagarMes: bool, obsAutomatica, valorDecididoPor }` — exatamente a tabela do item 2 do pedido. É a única fonte das
frases: Registrar, Agenda ("Cobrança hoje"), Cobrança do mês e o POP usam a mesma função. Mapeamento de K: Sim/Não/Parcial
→ idem; Antecipado (qualquer estado) e Mensalidade fixa → `Incluída na mensalidade` (J vazio); Fim do mês → `Não` com J;
Convênio → `Convênio (fatura)`; pro bono/permuta/teste/retorno → `Não se aplica (pro bono / permuta)`; não atendido → vazio.
`Pacote (sessão já paga)` deixa de ser gerado. Testes em `tests/cobranca.test.js` com os 13 casos do item 9.3.

### Passo 3 — Servidor (`app/server/server.js`)

- **Cache** (`CacheService`, 5 min, chaves com pedaços de 90 KB): Pacientes (índice), Procedimentos, Listas, Profissionais,
  Valores por sessão, Parâmetros, Regras de repasse, Cobrança por profissional, índice de competências (Mensalistas +
  Renovações). Invalidado por toda função que grava na aba correspondente. Leitura de cada aba **uma vez por chamada**,
  só nas colunas usadas (`getRange(2, 1, n, ultimaColUsada)`), nunca `getDataRange()`.
- **Funções novas**: `cobrancasDoPaciente` (lê CPP) · `salvarCobrancaProf` (gestão; cria/edita linha com log) ·
  `cobrancaMes` (uma chamada, objeto pronto: linhas paciente × profissional com sessões agendadas pela Agenda recorrente
  − feriados + encaixes, abatimentos de "Cancelado pela clínica" do mês anterior e de faltas decididas, valor cobrado,
  pago?/data/forma/NF, situação em dia · vence dia 10 · tolerância até 15 · atrasada · a receber) · `registrarPagamentoMes`
  (uma ou várias competências = adiantamento de N meses; grava as colunas de Mensalistas + linha de recebimento na aba do
  mês; no Posterior marca cada linha do mês com Sim/data/forma) · `editarSessoesCompetencia` (gestão, com log) ·
  `decidirFalta` (gestão: grava decisão + observação + log; "taxa" gera a linha `Taxa de falta – psicologia` = 50 % do valor
  da sessão, parâmetro) · `criarColunasMes` passa a criar as 6 colunas.
- **Funções alteradas**: `bootstrap`/`bootstrapAtendimento` enxutos (tudo em cache; devolvem CPP + estado das competências
  do mês atual e anterior + valores por sessão); `registrarAtendimento` recebe `detalheFalta`, grava K pelo módulo
  compartilhado, obriga Detalhe em "Faltou sem aviso" e "Faltou avisando em cima da hora", valida tudo de novo no servidor;
  `listaDoDia` devolve por item o objeto `cobrancaHoje` (mesma função) e o `tipo` (sessão · aplicação de teste · consulta ·
  retorno, pela Agenda recorrente/Lista do dia — coluna nova `Tipo` na `Agenda recorrente`, no fim) ; `gestaoResumo` devolve
  "Faltas → Decidir" (todas as faltas e desmarcações com Detalhe e decisão) e "Cadastro incompleto" (paciente atendido sem
  linha pro profissional); fica sem `viradaPropostas`/`aplicarAlteracoesLote` do modelo antigo (código removido da tela,
  função fica inerte até a Fase 2 confirmar).
- **Tempo**: toda resposta leva `_ms` (tempo no servidor); a tela mede o tempo total e, no perfil gestão, mostra num
  rodapé discreto "Agenda 2,1 s · servidor 1,4 s". Medição antes/depois registrada aqui.

### Passo 4 — Tela (`app/client/`)

| Tela | O que muda |
|---|---|
| **Menu** (`layout.html`, `00-base.js`) | recepção: Agenda · Registrar · Pacientes · Cobrança do mês · Meu dia. Gestão: tudo isso + Pendências · Repasse. Rodapé "Nada é apagado…" só na gestão. Menu sempre clicável: trocar de tela cancela (ignora) a chamada anterior; esqueleto cinza enquanto carrega; > 20 s → "Demorou mais que o normal" + Tentar de novo |
| **Registrar** (`20-registrar.*`) | passo 1 Quem (paciente em lista própria com busca por nome ou pagador, setas, Enter, clique; profissional; data; hora; tipo) → **bloco "O que fazer agora"** (grande, cor + ícone, frase + apoio + "Valor definido por X em dd/mm" + observação da linha em itálico; recalcula ao trocar o profissional) → passo 2 O que aconteceu (+ campo **Detalhe** quando ≠ Atendido) → passo 3 **Recebeu? Sim · Não · Parcial** só quando o bloco pede (Sim: valor pré-preenchido editável, forma, quem pagou, NF emitida ☐ + nº; Parcial: recebido + forma, observação automática) → checklist **Guia assinada ☐** (convênio) → Observação. Prévia "Vai ser gravado" usa a frase do bloco. Some tudo de pacote/plano/renovação/sessão extra/"outra opção" do Pago?. Rascunho descartado com > 2 h; vindo da Agenda chega com paciente, profissional, hora e tipo |
| **Agenda** (`10-hoje.*`, `15-agenda.js`) | coluna **"Cobrança hoje"** (ícone + frase curta, vermelha se atrasado) no lugar das etiquetas de pacote; **Tipo** ao lado da hora; botão **Chegou** visível na linha (fica com etiqueta "na recepção"); tiles **A cobrar hoje R$ · Recebido hoje R$ · Guias a pegar · NF a emitir** e contadores de presença em linha menor; botão **Fechar o dia**; menu "…" abre pra cima quando não cabe (bug) |
| **Meu dia** (nova, `70-meudia.*`) | **Fechar o dia**: 4 listas (ficou em "aguardando" com Veio / Faltou sem aviso / Faltou avisando em cima da hora / Desmarcou com antecedência, cada uma pedindo o Detalhe; pagou hoje sem NF → NF emitida (nº); convênio sem guia → Guia assinada; a receber de hoje com pagador e WhatsApp) + resumo Dinheiro em espécie · Pix · Cartão · Total · registrados/na lista, **Copiar resumo** e **Imprimir**; dia fica "aberto" na Agenda enquanto a lista 1 não zerar. Abaixo, NF/guia pendentes dos últimos 7 dias |
| **Cobrança do mês** (`40-cobranca-mes.*`, substitui Pacotes) | uma linha por paciente × profissional com Pagamento Antecipado/Posterior ou Mensalidade: cobrança (Sessão R$ 70 × 4 agendadas = R$ 280 · Mensalidade R$ 200), competência, pago?/data/forma/NF, situação, abatimentos ("− 1 sessão cancelada em dd/mm"), botão **Registrar pagamento** (Sim/Parcial, valor pré-preenchido, pode marcar várias competências = adiantamento), gestão edita o nº de sessões; botão "Criar colunas de {mês}" |
| **Pendências** (`50-gestao.*`, só gestão) | card **Faltas → Decidir** (toda falta/desmarcação com Detalhe; decisões não abate · abate no mês seguinte · cobrar taxa · relevar); card **Cadastro incompleto** (atendido sem linha pro profissional); some a "Virada de novembro" do modelo antigo. Pendências do mês, Repasse, Perdas, Conciliação só gestão |
| **Pacientes** (`30-pacientes.*`) | seção **Cobrança por profissional** (resumo "Juliana: sessão R$ 80, antecipado · Giovana: pro bono · Victor: consulta R$ 200, na hora"); gestão edita e tem **+ Adicionar profissional** (lista de valores da especialidade; "outro" só gestão com observação obrigatória; Pagamento sugerido pela Cobrança); recepção só lê. Saem da tela `Regra de cobrança`, os cartões de `Cobrança` antiga, pacote e valores numéricos antigos (F fica na planilha, sem ser lida). Novo paciente (recepção): dados pessoais + convênio; a cobrança é da gestão (bloco laranja "cadastro incompleto" até existir linha) |
| **Vocabulário** | item 1 do pedido aplicado em todo texto visível: Sessão R$ X · Mensalidade R$ X/mês · Na hora / Antecipado (até dia 10) / Fim do mês · Convênio {nome} · Pro bono / Permuta; somem pacote, plano, crédito, saldo, recarga, renovação, "não se aplica" como rótulo |
| **Layout estreito** (`styles.css`) | tiles e tabelas quebram em ≤ 900 px (tablet) e ≤ 480 px (celular); campo paciente e menu "…" revistos |

### Passo 5 — Testes, tempos, POP, publicação

1. `node build.js && node tests/*.test.js` (duplicatas, cobrança, servidor com planilha falsa).
2. Simulação (`dist/index.html`) com Playwright: fluxo de cada tela em 1280 e 390 px, prints no scratchpad.
3. **CÓPIA TESTE**: antes de testar, atualizar as abas de dados da cópia com as da real (como em 10/10; as antigas viram
   `_antes 15-10 …`), porque a gestão lançou em lote na real até 13/10. Publicar na aba `arquivos` da planilha de código
   (canal de teste) e rodar os casos reais do item 9.3 com print do bloco + linha gravada: Inglidy · Matheus e Miguel
   Borchert · Oziel · Pâmela · Lays · Julia · um Sabin Sinai · um Cedplan · Davi (trocar o profissional e ver o bloco mudar) ·
   Borchert com o Victor · falta sem aviso com Detalhe em "Faltas → Decidir" · antecipado em aberto depois do dia 15 ·
   mês de 5 semanas · cancelado pela clínica abatendo no mês seguinte · paciente sem cobrança.
4. Tempos antes/depois (Agenda, Registrar, Cobrança do mês, Pendências), meta < 5 s depois da primeira carga.
5. POP de 1 página pra recepção (`docs/POP-RECEPCAO-COBRANCA.md`): as frases do bloco e o que fazer em cada uma.
6. **Só depois do OK da gestão**: promover pra `arquivos_real`, registrar em `docs/DEPLOYS.md` com nome por data.

---

## 2. Decisões tomadas (e por quê)

1. **`Cobrança por profissional` com `Vigente desde/até`** em vez de trocar o valor na mesma linha: resolve a virada
   31/10 → 01/11 dos 16 ex-planos, o pro bono com prazo (Erica) e deixa o histórico legível. "Alterar valor" = a gestão
   encerra a linha e cria outra (ou edita e o log guarda de/para).
2. **Mensalistas continua a base da Cobrança do mês** (pedido), ganhando `Profissional` e 6 colunas por competência.
   Uma aba "longa" (uma linha por competência) seria mais simples pro código, mas o pedido foi explícito.
3. **Módulo compartilhado** pra frase do bloco: a Agenda, o Registrar, a Cobrança do mês e o POP não podem divergir.
4. **Cache de 5 min com invalidação na gravação**: o custo é que uma edição feita direto na planilha demora até 5 min
   pra aparecer no app (a gravação pelo app aparece na hora). Aceitável; documentado no POP da gestão.
5. **Pacote 4/12, Planos, Renovações, Sessões do pacote**: saem da interface; as abas ficam como histórico; o app lê
   `Renovações` só pra saber os meses já pagos em outubro.
6. **Linha de recebimento na aba do mês** continua existindo pra Antecipado e Mensalidade (uma linha "Mensalidade de
   novembro" / "Antecipado novembro (4 sessões)" com Pago? = Sim, valor, forma, NF): é o que o fechamento, o Repasse e a
   exportação usam; no Posterior não há linha extra, cada sessão vira Sim/data/forma.

## 3. Perguntas em aberto pra gestão (respondem antes do item correspondente; o resto não espera)

> Relidas em 15/10 contra o pedido de 14/10: as perguntas 3, 4, 6 e 7 já estão respondidas pelo próprio pedido e a 5 não se
> aplica (só a Alice estava em "Pacote de sessões" e `Mensalistas` já diz Mensalidade fixa R$ 150). **Faltam só a 1 e a 2.**
> Decisão da gestão em 15/10: linhas de um segundo profissional podem ser acrescentadas a qualquer momento (nov, dez, fev…)
> por "+ Adicionar profissional"; sem linha o app cobra pela tabela cheia e avisa "cadastro incompleto".

1. **Mensalistas por paciente × profissional**: ok acrescentar a coluna `Profissional` no fim e as 6 colunas por
   competência (`NOVEMBRO/2026 — sessões agendadas`, `— valor cobrado`, `— pago?`, `— data`, `— forma`, `— NF`)?
   As colunas antigas (SETEMBRO/OUTUBRO) continuam lidas como estão.
2. **Vigência** (`Vigente desde/até`) na `Cobrança por profissional`: aceita o campo? Sem ele, a virada de 01/11 dos
   16 ex-planos teria de ser feita à mão no dia.
3. **Taxa de falta = 50 % do valor da sessão** (parâmetro `taxa_falta_pct`): hoje `Procedimentos` diz "Taxa de falta –
   psicologia · R$ 120 (valor integral)". Vale o 50 % do pedido de 14/10?
4. **Antecipado em mês de 5 semanas**: 5 sessões × valor (pedido). Confirmar que vale também pra quem está em
   `Mensalidade fixa` (não: mensalidade não conta sessões — só confirmando).
5. **Pacientes hoje em "Pacote 4/12 sessões"** (se houver na real): viram Por sessão · Antecipado com valor = pacote ÷ sessões?
   (O relatório lista nome a nome.)
6. **Linhas de outubro gravadas com `Pacote (sessão já paga)` / `Plano já pago`**: não corrigir (pedido). Confirmado.
7. **Aplicação de teste / retorno**: sem cobrança sempre, inclusive pra convênio (gestão 08/10 confirmou pra teste). Mantido.

## 4. Como testar (será detalhado a cada item)

- Simulação local: `node build.js` e abrir `dist/index.html` (sem Google, dados falsos; `?recepcao` força o perfil recepção).
- Testes automáticos: `node tests/duplicatas.test.js`, `node tests/cobranca.test.js` (novo), `node tests/servidor-*.test.js`.
- CÓPIA TESTE: URL em `app/config.json` (`appUrlCopia`); o carregador lê a aba `arquivos` da planilha de código.

## 5. Registro de progresso

| Data | Item | Feito | Falta |
|---|---|---|---|
| 15/10 | plano | NOTAS escritas; branch avançado até o código no ar | OK da gestão |
| 15/10 | item 0 | relatório entregue (arquivo + aba `_relatorio cobrança 15-10` na cópia); regras aplicadas: social → Mensalidade fixa 200 (Antecipado desde 01/11; Posterior até 31/10 pra quem não adiantou outubro); especial → Mensalidade fixa com Mensalistas!C; ex-planos → Por sessão = cadastro AE (= Mensalistas!C ÷ 4), Posterior até 31/10 + Antecipado desde 01/11; Por sessão (combinado) → valor de AE; 2º profissional de outra especialidade → só o que as linhas de set/out mostram (tabela cheia = sem linha; Convênio/PLASC pelas linhas); aplicação de teste → sem linha; Davi × Giovana → Pro bono (obs. do cadastro) | OK da gestão; carga na cópia |
| 15/10 | decisões | perguntas 1 e 2 = sim; 13 "a decidir" carregados como "a confirmar"; carga direto na real; celular secundário | — |
| 15/10 | carga | real: `Cobrança por profissional` 165 linhas · `Valores por sessão` · `Parâmetros` · `Listas!K:M` · `_relatorio cobrança 15-10` · log A189:G353; cópia: idem + 14 abas de dados atualizadas | gestão confirmar as 16 linhas "a confirmar" |
| 15/10 | passos 2–3 | `app/shared/cobranca.js` (bloco, K, situação da competência; 9 grupos de teste) · servidor `app/server/server-cobranca.js` (cache, CPP, competências, `cobrancaMes`, `registrarPagamentoMes`, `editarSessoesCompetencia`, `criarColunasMes`, `decidirFalta`, `cobrancasDoPaciente`, `salvarCobrancaProf`, `_ms` em toda resposta) · `server.js` sem pacotes/planos · `tests/servidor-fase1.test.js` | — |
| 15/10 | passo 4 | tela inteira: menu por perfil, Registrar (bloco + Recebeu? + Detalhe + lista própria), Agenda (Cobrança hoje, tipo, Chegou, tiles, Fechar o dia, menu "…" pra cima, lista própria no Agendamento e na recorrente), Cobrança do mês (substitui Pacotes; `abrirPagamentoMes` com várias competências; gestão edita sessões; criar colunas), Meu dia (4 listas, resumo por forma, Copiar resumo, Imprimir, NF/guia dos últimos 7 dias), Pendências (Faltas → Decidir com 4 botões, Atendidos sem cobrança cadastrada, colunas de Mensalistas na Virada do mês; some a Virada de novembro), Pacientes (seção Cobrança por profissional; some a cobrança antiga do cadastro), rodapé de tempos (gestão), aviso > 20 s, esqueleto, `aindaNa` | layout estreito (≤ 900 px) só o que já existia: prioridade baixa (decisão 15/10) |
| 15/10 | passo 5 | simulação Playwright 1280 px: 0 erros de console nas 7 telas, prints em `docs/prints-fase1/` (dados fictícios da simulação); `node tests/*.test.js` todos ok; publicado em `arquivos` (teste) = deploy **2026-10-15-01**, commit 24d34fa; POP em `docs/POP-RECEPCAO-COBRANCA.md` | casos reais 9.3 na cópia com prints · tempos antes/depois · OK da gestão · `arquivos_real` · atualizar `docs/README-RECEPCAO.md` e `ESTADO-ATUAL.md` |
| 15/10 tarde | conferência com dados reais | servidor rodado em node sobre a cópia de leitura da real (Agenda 01/10–06/11, 436 itens; casos do passo 5.3; Cobrança do mês out/nov): ver seção 7 · melhorias de código no commit 7a184e1 (testes ok, simulação sem erros) · peças em `arquivos!A88:C133` com `novo:` conferidas 46/46 | ativar no teste (barrado pela permissão da sessão) · decisões de dados da seção 7 · casos na CÓPIA TESTE com o app de verdade |

## 6. O que a gestão precisa olhar (15/10)

1. **16 linhas "a confirmar"** em `Cobrança por profissional` (observação começa com "migração 15/10 — a confirmar"):
   abrir Pacientes → Buscar / editar → seção Cobrança por profissional → Editar (ou corrigir direto na aba; o app relê em 5 min).
2. **Mensalistas**: as 44 linhas antigas ainda **não** têm a coluna `Profissional` preenchida; o app usa a linha do paciente
   sem profissional pra todas as linhas dele até a gestão (ou o primeiro pagamento pelo app) gravar o profissional.
   As colunas de `Novembro/2026` são criadas por "Criar colunas" (Pendências → Virada do mês, ou Cobrança do mês) ou
   sozinhas no primeiro pagamento registrado.
3. **Taxa de falta**: 50 % do valor da sessão (`Parâmetros!taxa_falta_pct`). `Procedimentos` diz R$ 120 integral; a linha
   gerada usa o parâmetro. Mudar? É só trocar o número na aba.
4. **Testar na CÓPIA TESTE** (`appUrlCopia`): os casos do passo 5.3. O canal de teste já está com o código novo.

## 7. Conferência com os dados reais (15/10, tarde) e melhorias

**Como foi feita**: as abas da planilha real foram baixadas só para leitura e o servidor (o mesmo código do ar) rodou em
node sobre uma planilha falsa montada com elas: Agenda dia a dia de 01/10 a 06/11 (436 itens), os casos do passo 5.3 pelo
Registrar e a Cobrança do mês de outubro e novembro. Nada foi gravado na real. Resultado: a virada de 01/11 (vigência)
está certa; as frases batem com o pedido de 14/10 (Inglidy, Borchert × Juliana/Giovana, Oziel, Pâmela, Lays, Julia em
out/nov, Sabin, Cedplan, Davi trocando de profissional, falta com Detalhe em Faltas → Decidir, cancelado pela clínica
abatendo em novembro). Mês de 5 semanas: nenhum antecipado da real cai em segunda-feira em novembro; o teste automático
cobre (5 segundas × valor).

**Defeitos de código achados e corrigidos** (commit 7a184e1, **ainda não ativos**: ver DEPLOYS 2026-10-15-03):
1. Pagamento do mês (Mensalidade de…, Antecipado de…, Pagamento de…) e Taxa de falta gravados no mesmo dia de uma sessão
   ocupavam o lugar da sessão na Agenda (mesma chave paciente × profissional): a sessão sumia, ou o pagamento sumia do
   "Recebido hoje". Agora são itens à parte, cinza, fora da grade e da contagem de presença.
2. Lançamento repetido: em 13/10 a Ana Luiza (Giovana, 13:30, Desmarcou) foi gravada duas vezes, com um minuto de
   diferença. O servidor agora recusa o mesmo paciente + profissional + dia + hora + "o que aconteceu" e diz a linha; o
   Registrar oferece "É outro atendimento: gravar mesmo assim".
3. O servidor gravava Pago? = Sim (com o valor da tabela e sem forma) se a chamada chegasse sem resposta ao Recebeu? num
   paciente sem cobrança cadastrada. A tela sempre pergunta, mas agora o servidor também recusa.
4. Agenda recorrente sem **Tipo**: as aplicações de teste semanais (Giovana) apareciam na Agenda como "R$ 120 · cobrar ·
   sem cadastro". Campo Tipo (Sessão/consulta · Aplicação de teste · Retorno) no formulário de horários fixos; a coluna
   `Tipo` é criada no fim da aba na primeira vez que alguém escolhe.

**Decisões de dados para a gestão** (nada foi gravado; cada item é uma correção pequena na planilha real):
1. **Feriados vazios** (`Listas!M`): o antecipado conta sessão em feriado. Ex.: Elisa (sexta) em novembro sai 4 × R$ 100
   em vez de 3 (20/11). Proposta: 02/11, 20/11, 25/12, 01/01/2027 e os municipais de Juiz de Fora que a clínica fecha.
2. **Borchert × Dr. Victor** (Matheus C-…-119 e Miguel C-…-127): carregados como `Convênio` com convênio "Particular". Em
   outubro as consultas foram particulares (R$ 200, Pago? Não; aviso "Particular — NÃO é Cedplan"). Do jeito que está, o
   app manda "Não cobrar — convênio Particular" e grava R$ 0. Proposta: `Por sessão` R$ 200 (tabela), Pagamento a definir
   (Na hora ou Posterior).
3. **Helena (Giovana) e Igor (Juliana)**: pagaram outubro adiantado e ficaram só com a linha de mensalidade "a partir de
   01/11"; em outubro o app diz "sem cobrança cadastrada — cobrar R$ 120". Proposta: apagar o "Vigente desde" dessas duas
   linhas (C-…-063 e C-…-064).
4. **Gabriel Rodrigues Pereira**: tem mensalidade com a Giovana **e** com a Juliana; passou pra Giovana em 03/10. Proposta:
   linha da Juliana com Ativo = Não.
5. **Sem linha nenhuma**: Alice Oliveira Mendes de Souza (Mensalistas: R$ 150/mês fixo; está **duas vezes** em Pacientes),
   Samantha Hadassa (Mensalistas: social R$ 200; com quem?), Silvana Aparecida Dotano Silva (Juliana, valor?), Vitor
   Barcelos Aroni (avaliação neuropsicológica R$ 400). Os pacientes do Dr. Victor e da Dra. Tatiana sem linha saem pela
   tabela cheia (R$ 200 / R$ 180), que é o combinado.
6. **Aplicações de teste semanais** na Agenda recorrente (Giovana): Jhonne (ter 16:00), Igor (qua 08:30), Luiz Miguel
   (qua 09:00), Davi Maia (qui 13:00). Marcar Tipo = Aplicação de teste quando o código estiver no ar.
7. **Emily Rocha Erculano × Dra. Tatiana**: `Convênio` sem nome (ela saiu do Sabin para o PLASC, que a clínica não atende).
8. **Ana Luiza Oliveira Barros da Cunha**, Outubro, 13/10 13:30: duas linhas iguais (A-20261013-110409-s03 e
   A-20261013-110515-nca). Proposta: a segunda vira "Cancelado pela clínica" com observação "lançado em duplicidade".
9. **Mensalistas → Profissional**: 39 das 43 linhas têm um profissional só na `Cobrança por profissional` e podem ser
   preenchidas automaticamente; Gabriel depende do item 4; Lays não é mais mensalista; Alice e Samantha dependem do item 5.
10. **Uso**: a aba Outubro não tem nenhum lançamento de 14/10 nem de 15/10 (só até 09/10 e dois de 13/10). Se a recepção
    está atendendo, os registros estão ficando de fora.

**Respostas da gestão (15/10, ~12h45) e o que foi gravado na real**:
- Item 3 (Helena, Igor): **gravado**. `Cobrança por profissional!J64:J65` ("Vigente desde" 01/11/2026 → vazio); log em
  `Alterações de cadastro!A354:G355`.
- Item 8 (Ana Luiza): **gravado em parte**. `Outubro!I157` → "Cancelado pela clínica" (log `Alterações de lançamento!A46`).
  A Observação (S157) e o carimbo (U157) foram **barrados pela permissão da sessão**, e a linha 47 de "Alterações de
  lançamento" (que descreve a Observação) ficou gravada sem a mudança correspondente: falta escrever em `Outubro!S157`
  "Lançado em duplicidade — repetição da linha 156 (A-20261013-110409-s03); não houve outro atendimento (gestão 15/10)".
- Item 9 (Mensalistas → Profissional): aprovado, **não gravado** (barrado). Valores prontos: J1 = "Profissional", J2:J44 com
  39 preenchidos (Juliana 20 · Giovana 18 · Marileia 1); vazios: Gabriel Rodrigues Pereira, Lays, Alice, Samantha.
- Feriados: a gestão decide a partir da lista (até dezembro). Borchert × Victor: a gestão perguntou se o "não cobrar" é por
  convênio ou pro bono (é convênio, ver item 2). Gabriel: a confirmar. Alice: começou no fim de setembro. Samantha e
  Silvana: a gestão vai perguntar à Juliana.
- Pergunta da gestão sobre o Tipo: ele não marca nada como pago; diz à Agenda que o horário é aplicação de teste (sem
  cobrança) e tira esse horário da conta do antecipado. No Registrar, escolher o procedimento "Aplicação de teste" já não
  cobra (isso já está no ar).
