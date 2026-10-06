# Estado atual do app — retomar daqui

Atualizado em 06/10/2026 (noite, correção de lançamentos publicada na versão de teste). Leia este arquivo primeiro ao abrir um chat novo.

## O que é

App web **Recepção Nascente** (Google Apps Script) em cima da planilha
"Controle da Recepção 2026". Tudo é desenvolvido e testado na cópia
"CÓPIA TESTE - Controle da Recepção 2026" (id `1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk`).
**A planilha real (id `1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs`) está no ar com o app desde 06/10 à noite.**
Ela recebeu a configuração da cópia (Listas, Procedimentos, Pacientes F/N/Q/R/S/T, Mensalistas B, "Alterações de cadastro"),
tudo conferido por releitura (`docs/MIGRACAO-REAL-2026-10-06.md`), e em 06/10 à noite também a aba `Setembro`
(399 lançamentos importados, copiada inteira da cópia e colocada antes de `Outubro`); foi movida para Meu Drive → Clínica Nascente → Gestão →
App Recepção (fora do drive compartilhado da recepção) e o carregador `dist/Code.real.gs` foi implantado pela Roberta.
URL definitivo da recepção em `app/config.json` (`appUrlReal`) e em `docs/COMO-INSTALAR.md`. A recepção usa só o app.

Regras fixas: nunca migrar/duplicar dados; só acrescentar linhas ou atualizar células;
nunca apagar linha (marcar "Removido"); nunca escrever nas colunas automáticas (F, G, H, N
das abas de mês; nunca limpar a linha 2); achar colunas pelo cabeçalho; toda gravação leva
"Registrado por (app)" = e-mail · dd/MM/yyyy HH:mm; pt-BR, dd/mm/aaaa, R$.
Preços só em abas editáveis (Procedimentos, Pacientes, Mensalistas), nunca no código.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Código-fonte | servidor `app/server/server.js` + `app/server/duplicatas.js`; tela `app/client/` (`styles.css`, `layout.html`, `telas/*.html`, `js/*.js`, `assets/*.svg`; ver `docs/NOVA-INTERFACE.md`); carregador `app/loader/Code.gs` |
| Build | `node build.js` → `dist/index.html` (simulação), `dist/index.publicado.html`, `dist/pedacos.json` + `dist/pedacos/index-N.json` (pedaços ≤ 12.000 caracteres) e `dist/Code.gs` (teste) + `dist/Code.real.gs` (real) |
| Código publicado | planilha "Recepção Nascente — código do app (não mexer)" (id `1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo`), aba `arquivos` = versão de teste lida pela CÓPIA TESTE (linhas 2–28: duplicatas 2, server 3–8, index 9–28, 27 peças); aba `arquivos_real` = versão em uso na planilha real (linhas 2–28, as mesmas 27 peças de `arquivos` desde 06/10 à noite: correção de lançamentos + plano "vai pagar depois", aprovados pela Roberta). Publicar sempre em `arquivos` primeiro; depois da aprovação, promover gravando as mesmas 26 linhas em `arquivos_real` (uma chamada por linha, só nas linhas que diferem; a cópia de intervalo entre abas é barrada pela permissão da sessão) |
| Como publicar | `docs/PLANO-IMPLEMENTACAO.md`, seção 10 |
| **Histórico de publicações (o que está no ar, por data)** | **`docs/DEPLOYS.md`** — toda publicação ganha uma entrada `AAAA-MM-DD-NN` na hora |
| Manuais | `docs/README-RECEPCAO.md`, `docs/README-GESTAO.md`, `docs/COMO-INSTALAR.md` |
| Testes de tela | Playwright, arquivos `*-test.js` no scratchpad (não versionados); `node tests/duplicatas.test.js` |

Última publicação (registro completo em `docs/DEPLOYS.md`, deploy **2026-10-06-09**): 06/10/2026 (noite, 5ª) — **Plano "vai pagar depois" + correção em largura cheia**: "Lançar plano" ganhou Pagou agora / Vai pagar depois (compra entra com Pago? = Não, sem data nem forma, "(a receber)" na observação; Planos normal, consultas contam), `gestaoResumo` e a tela Hoje passam a listar a compra de plano a receber na pendência de pagamento, `pacotesPorPaciente_` devolve `pago`, e a tabela/painel de correção da Gestão ficou em largura cheia abaixo das duas colunas. `build.js` deixou de cortar pedaço em linha que começa com `'`, `=`, `+`, `-` ou `@` (a planilha apagava o apóstrofo inicial do pedaço 9: lido de volta com 1 caractere a menos; corrigido recortando do pedaço 8 em diante). server.js pedaços 1–5 (linhas 4–8) e index.html pedaços 5–19 (linhas 14–28) regravados em `arquivos`; as 27 peças lidas de volta e conferidas contra o build, index, server e duplicatas remontados idênticos. **Aprovado pela Roberta e promovido para `arquivos_real` na mesma noite**: 21 linhas que diferiam regravadas (server 4–8, index 11 e 14–28), lidas de volta: 27/27 iguais ao build, index, server e duplicatas remontados idênticos. A planilha real já roda esta versão. Ver `docs/NOVA-INTERFACE.md`, seção "Plano vai pagar depois". Antes dela, na mesma noite (4ª): **Correção de lançamentos (gestão e recepção)**: função nova `corrigirLancamento` no servidor (aprovada pela Roberta; valor fica de fora), linhas das pendências da Gestão clicáveis com painel de correção, e "Corrigir cobrança" no painel do paciente da tela Hoje. server.js pedaços 1–5 (linhas 4–8) e index.html pedaços 2 e 5–19 (linhas 11 e 14–28; o index passou a ter 20 pedaços) regravados em `arquivos`; as 27 peças conferidas contra o build, index e server remontados idênticos. Só na versão de teste, aguardando a Roberta testar na cópia; `arquivos_real` segue na versão anterior (26 peças). Ver `docs/NOVA-INTERFACE.md`, seção "Correção de lançamentos". Antes dela, na mesma noite (3ª): **Interface revisada aprovada pela Roberta e promovida para `arquivos_real`**, já com Mensalistas em cards no celular (index.html pedaços 1, 2 e 16, linhas 10, 11 e 25, regravados em `arquivos`; depois as 26 linhas gravadas em `arquivos_real`, lidas de volta e conferidas: 26/26 iguais ao build, index e server remontados idênticos). A recepção já recebe a interface nova na planilha real. Antes dela, na mesma noite: **Pacientes, Mensalistas e Gestão conferidas contra os mockups revisados**: botões Imprimir voltaram ao cabeçalho de Mensalistas e Gestão (como nos mockups; saíram do menu lateral) e a tabela de Mensalistas deixou de alargar a página no celular (`.tela.coluna{align-items:stretch}`). index.html pedaços 0, 1, 2, 4–9, 17 e 18 (linhas 9, 10, 11, 13–18, 26, 27) regravados em `arquivos`; as 26 peças conferidas contra o build e o index remontado igual ao `dist/index.publicado.html`. Só na versão de teste. Antes dela, na mesma noite: **Hoje: valores do dia pra recepção e estado da guia**: `listaDoDia` ganhou uma leitura a mais (Valor, Pago?, Forma, NF, Guia, Convênio da linha já registrada; nenhuma gravação nova; aprovado pela Roberta); server.js pedaços 3–5 (linhas 6–8) e index.html pedaços 1, 2 e 9–18 (linhas 10, 11 e 18–27) regravados em `arquivos`; as 26 peças conferidas contra o build e o index remontado igual ao `dist/index.publicado.html`. Só na versão de teste, aguardando a Roberta olhar; `arquivos_real` segue na versão anterior à tela Hoje revisada. Antes dela, na mesma noite: **tela Hoje revisada + menu lateral** (nota revisada da Roberta): index.html em 19 pedaços (linhas 9–27 de `arquivos`, todos conferidos contra o build; server e duplicatas não mudaram). Antes dela: correção da guia de convênio (a caixa "Guia assinada antes da sessão" começa desmarcada e zera a cada paciente; antes vinha marcada por padrão): index.html pedaços 4, 10, 11, 12 e 13 (linhas 13 e 19–22) regravados em `arquivos`, LEN e soma de controle conferidos. Antes dela, na mesma noite: Lembrete da gestão — server.js (6 pedaços, linhas 3–8) e index.html (16 pedaços, linhas 9–24). Versão aprovada pela gestão em 06/10 à noite e promovida para `arquivos_real` na mesma noite (23 pedaços conferidos contra o build).
Git: branch `claude/lucid-einstein-gd6x5l`, tudo commitado e enviado.

## Feito e publicado

- **Ajustes de 06/10 (deploy 2026-10-06-10, só na real)**: Novo paciente com profissional primeiro; "Registrado!" + "ver na lista de hoje";
  Mensalistas no mês atual + faixa do mês anterior; Agenda recorrente carregada (28 horários semanais da Juliana). Ver `docs/DEPLOYS.md`.
  Faltam da gestão: horários da Giovana (semanais × aplicação de teste), quinzenais da Juliana, e 3 pacientes ainda sem cadastro
  (Vinicius Elias Ribeiro de Almeida, Julia Borrajo Xavier, Samantha Hadassa Oliveira dos Santos). A aba `arquivos` (teste) ficou no 2026-10-06-08.

- **Plano "vai pagar depois" (06/10, noite)**: ao lançar um plano, a recepção escolhe Pagou agora ou Vai pagar depois; no segundo caso a compra fica a receber (Pago? = Não na aba do mês e em Planos), as consultas contam normalmente, a tag do paciente fica amarela "a pagar", a compra aparece na pendência de pagamento da Gestão e o recebimento se registra depois pela correção de lançamentos (que atualiza Planos também). Tabela e painel de correção da Gestão em largura cheia no computador. **Aprovado e promovido para `arquivos_real` em 06/10 à noite.** Ver `docs/NOVA-INTERFACE.md`.
- **Correção de lançamentos (06/10, noite)**: gestão corrige a cobrança clicando na linha da pendência (Receber · NF · Guia · Anotar) e a recepção corrige pelo painel do paciente na tela Hoje ("Corrigir cobrança"). Grava só Pago?, data, forma, quem pagou, NF, guia e observação (acrescenta), com carimbo "corrigido por" em "Registrado por (app)"; compra de plano atualiza também a aba Planos. Valor não muda pelo app. **Aprovado e promovido para `arquivos_real` em 06/10 à noite.** Ver `docs/NOVA-INTERFACE.md`.
- **Aba `Setembro` na planilha real (06/10, noite)**: a aba importada na cópia (IDs `IMP-SET26-001`–`399`, 24 colunas) foi copiada inteira para a real com `copySheetTo`, renomeada e movida para antes de `Outubro` (gid `373771041`); cabeçalho, datas e IDs conferidos por releitura, 399 linhas nas duas. Com isso `Setembro` entra no seletor de mês da tela Gestão da real (pendências do mês e exportar), que lista as abas de mês existentes. Detalhes em `docs/MIGRACAO-REAL-2026-10-06.md`.
- **Lembrete da gestão (06/10, noite)**: aba `Lembretes` na planilha (só acrescenta linha); a gestão escreve e encerra na tela Gestão; a tela Hoje mostra o último lembrete com texto e dentro do prazo. Publicado só na versão de teste (`arquivos`).
- **Tela Hoje revisada (06/10, noite)**: menu lateral de 220 px em todas as telas; Hoje em tabela (hora · paciente · profissional/modalidade · cobrança · situação · 1 ação + ⋯), tiles-filtro com contagem, tiles de resumo em R$ do dia (recepção e gestão, das linhas já registradas), "Guia assinada / a emitir" na linha depois do registro, busca por nome/pagador, painel do paciente à direita (folha no celular), "Pendências de hoje" e "Fim do dia" abaixo da tabela. Registrar, Pacientes, Mensalistas e Gestão conferidas contra os mockups revisados (sem mudança por dentro; Imprimir no cabeçalho de cada tela). No celular, Mensalistas vira cards (escolha da Roberta em 06/10, entre tabela rolando e cards). **Aprovado e promovido para `arquivos_real` em 06/10 à noite.** Ver `docs/NOVA-INTERFACE.md`, seção "Revisão 06/10".
- **Nova interface (06/10, mockups da Roberta)**: telas Hoje, Registrar atendimento, Pacientes (novo + editar), Mensalistas e Gestão com o visual aprovado; mesmo HTML no computador e no celular (barra inferior ≤ 480 px); impressão sem CPF. Servidor e regras intactos. Detalhes, decisões e limites em `docs/NOVA-INTERFACE.md`.

- Novo paciente (com checagem de duplicata), Registrar atendimento, Lista do dia (com modalidade
  do paciente), Agenda recorrente, Remarcar, Confirmar, Remover do dia, Mensalistas, Editar cadastro,
  Gestão (pendências do mês, criar aba/colunas do mês seguinte, exportar).
- Exportar salva em `Controle Financeiro/<ano>/<MM Mês_AA>/2_Atendimentos`, arquivo
  `MMM AA - Recepção atendimentos (app)`, sobrescrito a cada exportação do mesmo mês.
- Modalidades novas (12) na aba Listas; "Pacote" virou "Plano"; "Avulso" virou "Consulta individual".
- Planos: nº de consultas vem do nome da modalidade; valor vem do cadastro (Valor combinado) ou do
  procedimento "(compra)"; validade 2 meses (plano de 4), 3 meses (plano de 6, assumido), 6 meses (plano de 12).
- Cadastro dos 38 mensalistas da lista de novembro preenchido na cópia (modalidade, valor, observação).

## Pendente antes de usar

1. **Colar o `dist/Code.gs` novo no Apps Script e publicar nova versão** (pede permissão do Drive; sem isso o Exportar não salva na pasta).
2. Coluna "Gestão" na aba Listas (quem vê a tela Gestão). Hoje só vale `CONFIG.GESTAO` no código.
3. Carga inicial da Agenda recorrente: Juliana feita (28 semanais, 06/10); faltam Giovana, quinzenais e os demais profissionais.
4. ~440 cadastros sem modalidade: completar na véspera pela Lista do dia ("⚠ sem modalidade").
5. Mandar o link do app (`appUrlReal`) para `atendimento@clinicanascente.com.br` com a orientação de salvar como atalho (`docs/COMO-INSTALAR.md`, "Para a recepção usar").
6. ~~Copiar `Mensalistas!I2:I42` da real para a cópia~~ feito em 06/10 à noite (11 células; as duas planilhas estão iguais em Mensalistas).

## Respostas que faltam da gestão

- Plano de 6 consultas (nutrição): validade 3 meses está assumida. Confirmar.
- "Plano de 4 consultas" foi tratado como plano por sessão contado pelo app (sem pergunta da 5ª sessão). Confirmar.
- Naimara: plano de 4 ou quinzenal? Erica: valor 0 e solidário até 01/11, vira o quê?
- Lucas Adryan e Rafaella: Mensalidade fixa na planilha, fora da lista. Continuam?
- Beatriz Botelho Del'duca: Pro bono sem regra registrada.
- Lays: pro bono desde outubro; R$ 75 de setembro seguem como devidos.
