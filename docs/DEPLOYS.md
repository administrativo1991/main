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

**Carimbo na planilha de código**: a célula `E2` de cada aba (`arquivos` e `arquivos_real`) guarda o nome do deploy que
está naquela aba (ex.: `2026-10-06-09 · commit 135de84 · 27 peças · real`). O carregador só lê as colunas A–C, então a
coluna E não afeta o app. Atualizar `E2` faz parte de toda publicação (passo 2 abaixo).

## No ar agora

| Canal | Deploy | Peças | Commit |
|---|---|---|---|
| Real (`arquivos_real`) | **2026-10-07-07** | 34 (duplicatas 1 · server 8 · index 25); ativas = linhas com nome sem prefixo na coluna A (2; 115–117; 123–128; 147–170); `antigoN:` = versões anteriores | branch `claude/busy-wright-xf0hql` |
| Teste (`arquivos`) | **2026-10-06-08** (atrás da real: não recebeu o 10, o 11, o 07-01 nem os de 07/10) | 27 | 135de84 |
| Carregador real | 2026-10-06-02 (`dist/Code.real.gs`, implantado pela Roberta) | — | 4ad0272 |
| Carregador teste | 2026-10-04-01 + nova versão pendente desde 05/10 (permissão do Drive, ver `COMO-INSTALAR.md`) | — | — |

## Como registrar um deploy novo

1. Fazer a publicação (seção 10 do `PLANO-IMPLEMENTACAO.md`): build, testes, gravar as peças, ler de volta e conferir
   contra `dist/pedacos.json` (peças idênticas, index/server/duplicatas remontados iguais).
2. Gravar o nome do deploy em `E2` da aba publicada (`arquivos` ou `arquivos_real`) e acrescentar a entrada no topo da lista abaixo com: nome, canal, o que mudou (uma linha por item), peças e linhas
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

### 2026-10-07-07 · Real (direto) · cobrança por sessão no lugar dos planos + valor da sessão na Agenda
- **O que mudou**:
  - **Modalidades** (gestão, 07/10): os planos de 4/6/12 consultas saíram. A lista em `Listas!H2:I9` passou a ser
    Pagamento antecipado · Por sessão · Pagamento posterior · Mensalidade fixa · Mensal (valor especial) · Pro bono ·
    Permuta · Convênio (saíram também Consulta individual, Cartão de parceria e AAPI JF (mensal), que não tinham paciente).
  - **Valor por sessão no cadastro**: "Valor combinado" no formato `R$ 70 por sessão`. O Registrar usa esse valor
    (travado) em Por sessão, Pagamento posterior e Pagamento antecipado; sem ele, a tabela do procedimento.
  - **Pagamento posterior**: a sessão sai com Pago? = Não; o total do mês aparece em Pendências.
  - **Pagamento antecipado**: botão "Recebeu adiantado: lançar sessões pagas" no Registrar. `API.proximasSessoes` busca as
    próximas datas na agenda; `API.lancarAntecipado` grava uma linha por sessão (Atendido, valor por sessão, Pago? = Sim,
    data e forma do pagamento, observação "Pagamento antecipado de N sessões…"). Recusa data já lançada e mês sem aba.
  - **Valor da sessão** ao lado da modalidade no painel do paciente (Agenda) e no cartão do Registrar.
  - **Corrigir lançamento**: botão "Marcar como lançado por engano" (vira "Cancelado pela clínica"); mudar "O que
    aconteceu" de uma sessão de plano devolve ou consome a consulta em Planos.
- **Dados (planilha real)**: 17 pacientes de "Plano de 4 consultas" → "Pagamento posterior" (Valor combinado com
  `R$ <plano/4> por sessão` e o texto antigo depois de "Antes:"; Naimara ficou "a definir pela gestão"), registrados em
  "Alterações de cadastro". Davi Maia Marques e Cristina de Andrade: linhas de compra do plano → "Cancelado pela clínica";
  sessões de 07/10 (Davi, R$ 80) e 06/10 (Cristina, R$ 70) com Pago? = Não; a duplicada da Cristina (A-20261007-193656-j61)
  → "Cancelado pela clínica"; os dois planos em `Planos` → encerrado.
- **Peças**: 24 trocadas (server 3–7, index 6–24; index 24 é nova), gravadas nas linhas 147–170 como `novo:`, lidas de
  volta e conferidas 24/24 contra `dist/pedacos.json`; troca num único update (118–122 e 129–146 viraram `antigo6:`).
  Pra voltar: inverter os nomes dessas linhas.
- **Commit**: ver branch `claude/busy-wright-xf0hql` · **Aprovação**: gestão, 07/10 ("pode publicar direto na versão oficial").


### 2026-10-07-06 · Real (direto) · Pendências pra recepção, Lançamentos e recebimento parcial
- **O que mudou**:
  - Tela "Gestão" virou **Pendências** e abre pra recepção (menu lateral e do celular). Exportar, virada do mês, lembrete e
    regras de cobrança continuam só da gestão. `gestaoResumo` não exige mais perfil gestão.
  - **Lançamentos** (em Pendências): `API.lancamentos` busca por paciente no mês ou em todos os meses; clicar abre a correção
    ampla (data no mesmo mês, hora, paciente, profissional, procedimento, o que aconteceu, valor, valor recebido, cobrança).
    Mudança desses campos exige "quem informou / motivo", vai pra observação da linha e pra aba nova **Alterações de lançamento**.
    O painel da Agenda ("Corrigir lançamento") usa a mesma correção. "+ Lançar sessão que faltou" abre o Registrar
    (a data define a aba; o Registrar mostra "Grava na aba …").
  - **Recebimento parcial**: "Parcial" acrescentado em Listas!B8 (a validação da coluna Pago? já cobria B2:B8). Coluna nova
    **Valor recebido (R$)** criada no fim da aba do mês quando precisa. Registrar ganhou o botão Parcial + "Recebido agora";
    Receber (Agenda e Pendências) recebe total ou parte (soma ao recebido; completa vira "Sim"); cada pagamento fica na
    observação (data, valor, forma, NF) e o Nº da NF acumula ("101, 102"). Pendências, recebido do mês e "a receber" usam o saldo.
- **Peças**: 32 trocadas (server 0–7, index 0–23), gravadas nas linhas 115–146 como `novo:`, conferidas 32/32, troca num update
  (as substituídas viraram `antigo5:`).
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10 ("recepção também… mudar o nome para pendências"; "nf sobre o valor recebido a cada pagamento").

### 2026-10-07-05 · Real (direto) · responsável legal e CPF do pagador
- **O que mudou**: Pacientes ganhou "CPF do pagador" (Quem paga) e o bloco **Responsável** (nome, parentesco com sugestões,
  telefone, CPF), que aparece pra menor de idade ou quando já tem algo preenchido. CPFs extras opcionais, mas validados se
  preenchidos. Colunas novas no fim de Pacientes, criadas no primeiro salvamento: `CPF do pagador`, `Responsável (nome)`,
  `Parentesco do responsável`, `Telefone do responsável`, `CPF do responsável`. Edição grava e registra em "Alterações de cadastro".
  Painel da Agenda mostra "Responsável: nome (parentesco) · telefone".
- **Peças**: 23 trocadas (server 0–6; index 7–22), gravadas nas linhas 92–114 como `novo:`, conferidas 23/23, troca num update
  (as substituídas viraram `antigo4:`).
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10.

### 2026-10-07-04 · Real (direto) · pendências anteriores aparecem pra recepção
- **O que mudou**: `listaDoDia` devolve `pendencias` dos pacientes do dia (mês do dia e o anterior, só sessões de antes do dia):
  particular atendido sem "Pago?" (mesma regra da Gestão) e convênio sem guia assinada. Falta sem aviso não entra (decisão da gestão).
  Na tela: etiqueta na coluna Cobrança ("deve sessão de 29/09 · R$ 70", "guia a assinar · 30/09"), faixa no painel do paciente
  com **Receber** / **Guia assinada** (grava na linha antiga via `corrigirLancamento`) e linhas em "Pendências de hoje".
  Texto do erro "Escolha o profissional."
- **Peças**: 25 trocadas (server 0, 4, 5, 6; index 2–22), gravadas nas linhas 67–91 como `novo:`, conferidas 25/25, troca de nomes num update
  (as substituídas viraram `antigo3:`).
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10 ("sessão sem pagar … guia sem assinatura também … falta sem aviso não precisa").

### 2026-10-07-03 · Real (direto) · nomes: "Horário dos profissionais" e "Agendamento"
- **O que mudou**: "Horário das profissionais" → **Horário dos profissionais**; "Todas as profissionais" → **Todos os profissionais**;
  o botão e o painel "Encaixe no dia" → **Agendamento** (vaga: "+ agendar"). Só textos da tela; servidor igual.
- **Peças**: 6 do index (partes 4, 5, 10, 12, 13, 14) gravadas nas linhas 61–66 como `novo:`, conferidas 6/6, e troca de nomes num update
  (43, 44, 49, 51, 52, 53 viraram `antigo2:`). Pra voltar: inverter os nomes dessas 12 linhas.
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10.

### 2026-10-07-02 · Real (direto) · tela Agenda (grade de horários) + Horário das profissionais
- **O que mudou**: a tela Hoje passa a se chamar **Agenda**, com seletor **Lista | Agenda**. Na Agenda: **Dia** (todas as
  profissionais lado a lado) ou **Semana** (uma profissional). Ocupado = nome do paciente (cor da situação); vaga = branco
  tracejado; intervalo e horário fechado = cinza. Clicar numa vaga abre o "Encaixe no dia" com profissional, dia e hora;
  clicar num nome abre o painel do paciente. Botão **Horário das profissionais**: a recepção grava, por profissional, as faixas
  de cada dia (ex.: `08:00-12:00, 13:00-19:00`) e a duração da sessão; vai para colunas novas no fim da aba **Profissionais**
  (`Horário segunda` … `Horário sábado`, `Duração da sessão (min)`, `Horário alterado por (app)`), criadas no primeiro salvamento.
  Servidor: `listaDoDia` passou a usar `montarDia_` (mesma regra) e ganhou `agendaSemana` e `salvarExpediente`.
- **Publicação sem janela quebrada**: as 29 peças novas foram gravadas nas linhas 32–60 com prefixo `novo:` (o carregador ignora),
  conferidas 29/29 e só então os nomes da coluna A foram trocados num único update (3–28 viraram `antigo:`, 32–60 os nomes reais).
  **Pra voltar atrás**: trocar de volta a coluna A (3–28 sem `antigo:`, 32–60 com `novo:`).
- **Conferência**: lido de volta e remontado como o carregador faz (por arquivo e parte): index igual ao `dist/index.publicado.html`,
  server igual ao fonte.
- **Aprovação**: gestão, 07/10 ("pode colocar as 2 opções", "Clicar numa vaga abre o Encaixe… perfeito").

### 2026-10-07-01 · Real (direto) · convênio de plano não mostra mensalidade/modalidades
- **O que mudou**: no cadastro (Pacientes), com convênio de plano (qualquer um que não seja Particular nem convênio de desconto)
  os cards de modalidade/mensalidade somem e a modalidade fica "Convênio", com a dica "só preencher a carteirinha".
  Particular e convênios de desconto continuam com os cards. Lista de convênios de desconto fixa no código
  (`CONVENIOS_DESCONTO` em `app/client/js/30-pacientes.js`): AAPI JF, Plan Minas. A gestão avisa quando houver outro.
  Na edição, trocar para convênio de desconto não apaga em silêncio a modalidade já gravada.
- **Peças**: 27; regravadas 5: index.html 15–19 (linhas 24–28).
- **Conferência**: as 27 linhas lidas de volta, 27/27 iguais ao build; index remontado igual ao `dist/index.publicado.html`.
- **Aprovação**: gestão, 06–07/10 ("AAPI JF, Plan Minas").

### 2026-10-06-11 · Real (direto) · botão "Horários fixos" na tela Hoje
- **O que mudou**: botão "Horários fixos" no topo da tela Hoje, ao lado de "Encaixe no dia", abre o mesmo painel da Agenda recorrente
  (antes só havia o link discreto no rodapé da tabela, que continua). A recepção mantém os horários fixos por ali (editar, incluir, pausar).
- **Peças**: 27; regravadas 13: index.html 4–8 (linhas 13–17) e 12–19 (linhas 21–28).
- **Conferência**: as 27 linhas lidas de volta, 27/27 iguais ao build; index remontado igual ao `dist/index.publicado.html`, server igual ao fonte.
- **Aprovação**: gestão, 06/10 à noite ("pode fazer a alteração e incluir o botão").

### 2026-10-06-10 · Real (direto, sem passar pela cópia — autorizado pela gestão) · ajustes da avaliação de 06/10
- **O que mudou**:
  - Pacientes (Novo paciente): Profissional vem primeiro e é obrigatório; sem ele os cartões de modalidade ficam
    escondidos e aparece a frase-guia; com ele, só as modalidades da especialidade (coluna "Especialidade (modalidade)" da aba Listas).
  - Registrar ("Salvar e registrar outro"): faixa verde "Registrado! …" com o link "ver na lista de hoje".
  - Mensalistas: abre na competência do mês atual; faixa amarela com as pendências do mês anterior, que troca a competência ao clicar
    (`mensalistasPainel` devolve `anterior`).
  - Fora do código: aba `Agenda recorrente` criada na planilha real com os 28 horários semanais da Juliana (lista da gestão, 06/10),
    IDs `F-20261006-carga-01`–`28`, Hora como texto, listas de escolha em Paciente/Profissional/Dia/Frequência/Ativo.
    A tela Hoje já usa esses horários automaticamente (decisão da gestão: a lista continua automática e a recepção confere com o ControleOdonto).
- **Peças**: 27; regravadas 10: server.js 4–5 (linhas 7–8), index.html 6–7 (linhas 15–16) e 14–19 (linhas 23–28).
- **Conferência**: as 27 linhas lidas de volta, 27/27 iguais ao build; index remontado igual ao `dist/index.publicado.html`, server igual ao fonte.
- **Commit**: este · **Aprovação**: gestão (administrativo@), 06/10 à noite ("pode ir direto pra oficial").
- **Não fizemos** (decidido): virada das colunas automáticas (o app não grava em F/G/H/N; sem conflito), card de "Alterações de cadastro"
  (a linha já abre a tabela com de → para, quem informou e e-mail), painel "Montar a lista".

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
