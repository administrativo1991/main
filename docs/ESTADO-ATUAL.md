# Estado atual do app — retomar daqui

Atualizado em 06/10/2026 (noite, nova interface). Leia este arquivo primeiro ao abrir um chat novo.

## O que é

App web **Recepção Nascente** (Google Apps Script) em cima da planilha
"Controle da Recepção 2026". Tudo é desenvolvido e testado na cópia
"CÓPIA TESTE - Controle da Recepção 2026" (id `1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk`).
A planilha real (id `1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs`) começou a ser preparada em 06/10:
Listas (H, I), Procedimentos e a aba "Alterações de cadastro" já estão iguais à cópia; faltam três gravações manuais
e a implantação do carregador `dist/Code.real.gs` pela Roberta (ver `docs/MIGRACAO-REAL-2026-10-06.md` e `docs/COMO-INSTALAR.md`).

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
| Código publicado | planilha "Recepção Nascente — código do app (não mexer)" (id `1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo`), aba `arquivos` = versão de teste lida pela CÓPIA TESTE; aba `arquivos_real` = versão em uso na planilha real (criada em 06/10 como cópia de `arquivos`). Em `arquivos` (desde 06/10 à noite): linhas 2–24 (duplicatas 2, server 3–8, index 9–24); `arquivos_real` ainda tem a versão da tarde (linhas 2–23, sem o Lembrete). Publicar sempre em `arquivos` primeiro; promover copiando A1:C24 para `arquivos_real` (limpar o que sobrar abaixo) |
| Como publicar | `docs/PLANO-IMPLEMENTACAO.md`, seção 10 |
| Manuais | `docs/README-RECEPCAO.md`, `docs/README-GESTAO.md`, `docs/COMO-INSTALAR.md` |
| Testes de tela | Playwright, arquivos `*-test.js` no scratchpad (não versionados); `node tests/duplicatas.test.js` |

Última publicação: 06/10/2026 (noite) — Lembrete da gestão: server.js (6 pedaços, linhas 3–8) e index.html (16 pedaços, linhas 9–24) em `arquivos`, LEN e soma de controle conferidos nos 23 pedaços. Só na versão de teste (CÓPIA TESTE); `arquivos_real` segue com a versão da tarde.
Git: branch `claude/lucid-einstein-gd6x5l`, tudo commitado e enviado.

## Feito e publicado

- **Lembrete da gestão (06/10, noite)**: aba `Lembretes` na planilha (só acrescenta linha); a gestão escreve e encerra na tela Gestão; a tela Hoje mostra o último lembrete com texto e dentro do prazo. Publicado só na versão de teste (`arquivos`).
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
3. Carga inicial da Agenda recorrente (horários fixos de cada profissional).
4. ~440 cadastros sem modalidade: completar na véspera pela Lista do dia ("⚠ sem modalidade").
5. Piloto na planilha real (trocar `CONFIG.PLANILHA_ID`), depois virada em 01/11.

## Respostas que faltam da gestão

- Plano de 6 consultas (nutrição): validade 3 meses está assumida. Confirmar.
- "Plano de 4 consultas" foi tratado como plano por sessão contado pelo app (sem pergunta da 5ª sessão). Confirmar.
- Naimara: plano de 4 ou quinzenal? Erica: valor 0 e solidário até 01/11, vira o quê?
- Lucas Adryan e Rafaella: Mensalidade fixa na planilha, fora da lista. Continuam?
- Beatriz Botelho Del'duca: Pro bono sem regra registrada.
- Lays: pro bono desde outubro; R$ 75 de setembro seguem como devidos.
