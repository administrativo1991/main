# Deploys — registro por data

Toda publicação do app (código na planilha de código, carregador no Apps Script ou carga de dados na planilha real)
ganha uma entrada aqui, **no momento em que é feita**, com um nome no formato `AAAA-MM-DD-NN` (NN = ordem no dia).
Este arquivo é a memória do projeto: pra saber o que está no ar, leia a seção "No ar agora"; pra saber o que mudou e
quando, leia a lista. A entrada mais recente fica no topo.

Onde cada coisa roda:

| Canal | Lê | Quem usa | Como chega |
|---|---|---|---|
| **Teste** | aba `arquivos` da planilha de código | CÓPIA TESTE (`appUrlCopia` em `app/config.json`) | gravar as peças de `dist/pedacos.json` em `arquivos`, uma linha por peça |
| **Real** | aba `arquivos_real` | planilha real, recepção e gestão (`appUrlReal`) | depois da aprovação na cópia: regravar em `arquivos_real` as linhas que diferem |
| **Carregador** | `dist/Code.gs` (teste) / `dist/Code.real.gs` (real) | Apps Script de cada planilha | só quando `app/loader/Code.gs` muda: colar e "Implantar → Nova versão" (feito pela Roberta) |

Em até 90 s depois da gravação na aba, o app passa a servir a versão nova (cache do carregador).

## No ar agora

| Canal | Deploy | Peças | Commit |
|---|---|---|---|
| Real (`arquivos_real`) | **2026-10-06-09** | 27 (duplicatas 1 · server 6 · index 20; linhas 2–28) | 135de84 |
| Teste (`arquivos`) | **2026-10-06-08** (mesmo conteúdo do 09) | 27 | 135de84 |
| Carregador real | 2026-10-06-02 (`dist/Code.real.gs`, implantado pela Roberta) | — | 4ad0272 |
| Carregador teste | 2026-10-04-01 + nova versão pendente desde 05/10 (permissão do Drive, ver `COMO-INSTALAR.md`) | — | — |

## Como registrar um deploy novo

1. Fazer a publicação (seção 10 do `PLANO-IMPLEMENTACAO.md`): build, testes, gravar as peças, ler de volta e conferir
   contra `dist/pedacos.json` (peças idênticas, index/server/duplicatas remontados iguais).
2. Acrescentar a entrada no topo da lista abaixo com: nome, canal, o que mudou (uma linha por item), peças e linhas
   regravadas, resultado da conferência, commit, quem aprovou.
3. Atualizar a tabela "No ar agora".
4. Commitar junto com o código.

Modelo:

```
### AAAA-MM-DD-NN · <canal> · <título curto>
- **O que mudou**: …
- **Peças**: N no total; regravadas: <arquivo partes (linhas)>
- **Conferência**: lido de volta, N/N iguais ao build; index/server/duplicatas remontados idênticos
- **Commit**: <hash> · **Aprovação**: <quem, quando>
```

## Lista

### 2026-10-06-09 · Real · promoção: correção de lançamentos + plano "vai pagar depois"
- **O que mudou**: `arquivos_real` recebeu tudo o que estava em `arquivos` desde o 06 (correção de lançamentos,
  plano a receber, pendência da compra, tabela de correção em largura cheia, cortes novos do build).
- **Peças**: 27; regravadas só as 21 linhas que diferiam: server.js 1–5 (linhas 4–8), index.html 2 (linha 11) e 5–19
  (linhas 14–28). As outras 6 já eram iguais.
- **Conferência**: lido de volta, 27/27 iguais ao build; index, server e duplicatas remontados idênticos.
- **Commit**: 135de84 (código) · 79b59f0 (docs) · **Aprovação**: Roberta, 06/10 à noite ("ótimo, pode atualizar a planilha nova").

### 2026-10-06-08 · Teste · plano "vai pagar depois", pendência da compra, correção em largura cheia, build
- **O que mudou**: "Lançar plano" com Pagou agora / Vai pagar depois (compra entra com Pago? = Não, sem data nem
  forma, "(a receber)" na observação; Planos normal); `gestaoResumo` e a tela Hoje listam a compra "(compra)" sem Pago?
  na pendência de pagamento; `pacotesPorPaciente_` devolve `pago`; tag "a pagar" no paciente; tabela e painel de
  correção da Gestão em largura cheia abaixo das duas colunas; `build.js` não corta pedaço antes de linha que comece
  com `'`, `=`, `+`, `-` ou `@` (a planilha apagava o apóstrofo inicial do pedaço 9 na primeira gravação desta rodada;
  os cortes do index mudaram do pedaço 8 em diante).
- **Peças**: 27; regravadas: server.js 1–5 (linhas 4–8), index.html 5–19 (linhas 14–28; a primeira gravação pegou
  5–7 e a segunda, depois do ajuste do build, 8–19).
- **Conferência**: lido de volta, 27/27 iguais ao build; remontagens idênticas.
- **Commit**: 135de84 · **Aprovação**: Roberta, 06/10 à noite ("pode fazer os 3").

### 2026-10-06-07 · Teste · correção de lançamentos (gestão e recepção)
- **O que mudou**: função nova `corrigirLancamento` no servidor (acha a linha pelo ID; grava só Pago?, data, forma,
  quem pagou, NF, nº da NF, guia, observação; carimbo "corrigido por"; compra de plano atualiza Planos); na Gestão as
  linhas das pendências ficaram clicáveis com botão Receber · NF · Guia · Anotar e painel de correção; na tela Hoje,
  "Corrigir cobrança" no painel do paciente e no menu ⋯. Valor não se corrige pelo app (decisão da Roberta).
- **Peças**: 27 (o index passou de 19 pra 20 pedaços); regravadas: server.js 1–5 (linhas 4–8), index.html 2 e 5–19
  (linhas 11 e 14–28).
- **Conferência**: lido de volta, 27/27 iguais ao build; remontagens idênticas.
- **Commit**: 632cb0b · **Aprovação**: Roberta, 06/10 ("1. ótimo. 4. gostei também. quero que a recepção já consiga também").

### 2026-10-06-06 · Real (dados) · aba `Setembro` copiada da cópia para a real
- **O que mudou**: a aba `Setembro` importada na cópia (399 lançamentos, IDs `IMP-SET26-001`–`399`, 24 colunas) foi
  copiada inteira para a planilha real com `copySheetTo`, renomeada e movida para antes de `Outubro` (gid 373771041).
  Não é código: é dado. Com isso Setembro entra no seletor de mês da Gestão.
- **Conferência**: cabeçalho, datas e IDs relidos; 399 linhas nas duas.
- **Commit**: bcc598e · Detalhes em `MIGRACAO-REAL-2026-10-06.md`.

### 2026-10-06-05 · Real · promoção: interface revisada + Mensalistas em cards no celular
- **O que mudou**: `arquivos_real` recebeu a interface revisada (menu lateral, Hoje em tabela com painel do paciente,
  valores do dia, Imprimir no cabeçalho, Mensalistas em cards no celular). Antes disso, em `arquivos`: index.html
  pedaços 1, 2 e 16 (linhas 10, 11 e 25) com os cards.
- **Peças**: 26 (duplicatas 1 · server 6 · index 19; linhas 2–27); as 26 linhas gravadas em `arquivos_real`.
- **Conferência**: lido de volta, 26/26 iguais ao build; index e server remontados idênticos.
- **Commits**: 4bdeadd, 672a2b5 · **Aprovação**: Roberta, 06/10 à noite (escolheu cards no celular).

### 2026-10-06-04 · Teste · Pacientes, Mensalistas e Gestão conferidas contra os mockups revisados
- **O que mudou**: botões Imprimir voltaram ao cabeçalho de Mensalistas e Gestão; a tabela de Mensalistas deixou de
  alargar a página no celular.
- **Peças**: 26; regravadas: index.html 0, 1, 2, 4–9, 17, 18 (linhas 9, 10, 11, 13–18, 26, 27).
- **Conferência**: 26/26 iguais ao build; index remontado igual a `dist/index.publicado.html`.
- **Commit**: 59ed7c0.

### 2026-10-06-03 · Teste · Hoje: valores do dia pra recepção e estado da guia
- **O que mudou**: `listaDoDia` passou a devolver também Valor, Pago?, Forma, NF, Guia e Convênio da linha já
  registrada (só leitura, aprovado pela Roberta); tiles em R$ do dia e etiqueta "Guia assinada / a emitir" na tela Hoje.
- **Peças**: 26; regravadas: server.js 3–5 (linhas 6–8), index.html 1, 2 e 9–18 (linhas 10, 11 e 18–27).
- **Conferência**: 26/26 iguais ao build; index remontado idêntico.
- **Commit**: dd2520b.

### 2026-10-06-02b · Teste · tela Hoje revisada + menu lateral
- **O que mudou**: menu lateral de 220 px em todas as telas; Hoje em tabela (hora · paciente · profissional ·
  cobrança · situação · ação), tiles-filtro, busca, painel do paciente à direita (folha no celular), pendências de hoje
  e fim do dia. Nota revisada da Roberta.
- **Peças**: 26 (index virou 19 pedaços, linhas 9–27); server e duplicatas não mudaram.
- **Conferência**: todas as peças conferidas contra o build.
- **Commit**: fb4e6c9.

### 2026-10-06-02a · Teste · guia de convênio começa desmarcada
- **O que mudou**: a caixa "Guia assinada antes da sessão" começa desmarcada e zera a cada paciente (antes vinha
  marcada por padrão).
- **Peças**: regravadas index.html 4, 10, 11, 12 e 13 (linhas 13 e 19–22); LEN e soma de controle conferidos.
- **Commit**: 546ed92.

### 2026-10-06-02 · Real · planilha real no ar (primeira versão em `arquivos_real`) + carregador real
- **O que mudou**: a planilha real "Controle da Recepção 2026" recebeu a configuração da cópia (Listas, Procedimentos,
  Pacientes F/N/Q/R/S/T, Mensalistas B, aba "Alterações de cadastro"; `MIGRACAO-REAL-2026-10-06.md`); o carregador
  ganhou o canal por aba (`Code.gs` lê `arquivos`, `Code.real.gs` lê `arquivos_real`); a Roberta colou
  `dist/Code.real.gs` no Apps Script da real e implantou (URL em `appUrlReal`). `arquivos_real` recebeu a versão
  aprovada daquela noite: 23 peças (interface nova de 5 telas + Lembrete da gestão).
- **Conferência**: 23 pedaços conferidos contra o build.
- **Commits**: 4ad0272, 50496fc, b8bfd23, 1f59bd5 · **Aprovação**: Roberta, 06/10 à noite.

### 2026-10-06-01 · Teste · interface nova (5 telas) + Lembrete da gestão
- **O que mudou**: Hoje, Registrar, Pacientes, Mensalistas e Gestão portadas dos mockups da Roberta (`NOVA-INTERFACE.md`);
  aba `Lembretes` na planilha (só acrescenta linha), card na tela Hoje e campo na Gestão; dica da mensalidade lê a aba
  (sem valor fixo no código); anotação em Mensalistas leva e-mail e hora.
- **Peças**: 23: duplicatas 1 (linha 2), server.js 6 (linhas 3–8), index.html 16 (linhas 9–24).
- **Commits**: 22bb763, 486ee96, 75a7a5e.

### 2026-10-05-01 · Teste · app completo na cópia (série de publicações do dia)
- **O que mudou**, na ordem dos commits: Novo paciente com checagem de duplicatas, carregador e guia de instalação
  (429b32c); modalidades agrupadas por especialidade (baeca38, f126962); Atendimento com regras de cobrança, planos,
  mensalidade, desconto, sessão extra (76de418); Lista do dia + Agenda recorrente semanal/quinzenal, agendar no dia,
  não vem, remarcar, impressão, servidor cria aba do mês (36dcbfe, 0c5d782, 3ae71f6, 3465660, 5caaadf); Editar
  cadastro com log, confirmação da véspera, build em pedaços de 12 k (69856da); Mensalistas, Gestão e remoção de
  agendamento duplicado (2d2262c); Exportar mês salva em `Controle Financeiro/<ano>/<MM Mês_AA>/2_Atendimentos`
  (91be556); modalidades enxutas, "Plano" em vez de "Pacote" (6a24f0c, d22cf26).
- **Peças**: não registradas na época (o registro por deploy começou em 06/10). Cada publicação foi conferida por
  `=LEN()` nas células.
- **Carregador**: mudou em 05/10 pra pedir a permissão do Drive (exportação); a nova versão no Apps Script da cópia
  ficou pendente (`COMO-INSTALAR.md`, "Pendente em 05/10").

### 2026-10-04-01 · Teste · CÓPIA TESTE criada e carregador implantado
- **O que mudou**: a planilha "CÓPIA TESTE - Controle da Recepção 2026" (id `1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk`)
  recebeu o carregador `dist/Code.gs` no Apps Script; URL em `appUrlCopia`. Planilha de código
  "Recepção Nascente — código do app (não mexer)" (id `1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo`) criada com a aba
  `arquivos`.
- **Commits**: 8b96a5f, bf89070, dcc5ff3 (plano), 23153d7 (stack Apps Script), 791a72f (protótipo).
