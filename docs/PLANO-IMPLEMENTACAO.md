# Recepção Nascente — Plano de implementação (entregável 1, pra aprovação)

**Nomes (Roberta, 05/10):** o app chama-se **Recepção Nascente**. A tela antes chamada "Atendimento" chama-se **Atendimento**; o título dela é "Registrar atendimento" e o botão "Salvar atendimento". Nada em inglês na tela.

Clínica Nascente · 04/10/2026 (rev. 2, com as decisões da Roberta de 04/10) · base: planilha `Controle da Recepção 2026` (id `1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs`)

Escrevi este plano depois de ler a planilha real (cabeçalhos, fórmulas, validações e proteções de todas as abas), o PDF "Atendimento — resumo do desenho (30-09)" e a nota "ENTRADA_Atendimento_pagadores_e_valores (03-10)". **Não escrevi código ainda.** A seção 7 lista o que preciso que você decida.

---

## 1. O que a planilha real diz (e onde difere do briefing)

Li a aba `Outubro` célula a célula. As colunas são estas, e não exatamente as do briefing:

| Col | Cabeçalho | Quem preenche |
|---|---|---|
| A | Data | app |
| B | Hora | app |
| C | Paciente (lista `Pacientes!A`) | app |
| D | Profissional (lista `Profissionais!A`) | app |
| E | Procedimento (lista `Procedimentos!A`) | app |
| **F** | Convênio (auto) | fórmula — **não escrever** |
| **G** | Modalidade (auto) | fórmula — **não escrever** |
| **H** | ⚠ Atenção na cobrança (auto) = R + " — " + S de `Pacientes` | fórmula — **não escrever** |
| I | O que aconteceu (`Listas!A2:A6`) | app |
| J | Valor (R$) | app |
| K | Pago? (`Listas!B2:B8`: Sim · Não · Convênio (fatura) · Mensalista · Pacote já pago · Não se aplica) | app |
| L | Data do pagamento | app |
| M | Forma de pagamento (`Listas!C2:C7`: Pix · Dinheiro · Cartão de débito · Cartão de crédito · Link) | app |
| **N** | Pagador habitual (auto) | fórmula — **não escrever** |
| O | Quem pagou (só se foi outra pessoa) | app |
| P | NF emitida? | app |
| Q | Nº da NF | app |
| R | Guia assinada? (convênio) | app |
| S | Observação | app |
| **T** | ID (gerado pelo app) | app — protegida, já prevista pra isso |

Diferenças que mudam o desenho:

1. **Automáticas são F, G, H e N** (o briefing dizia E–G e M). E = Procedimento é digitável e obrigatório na planilha.
2. **A aba `Procedimentos`** (procedimento · especialidade · valor · observação, 56 linhas, sem fisioterapia) **é a tabela de preços e a lista do campo "Procedimento" do Atendimento** — decisão da Roberta, 04/10. Conferi em 04/10: a aba já tem exatamente a lista decidida e a validação de `Outubro!E` já aponta pra ela, então não criei uma cópia dentro de `Listas` (seriam duas fontes de verdade). **O valor preenche sozinho pelo procedimento escolhido e só fica editável quando o procedimento está com valor em branco** (Avaliação neuropsicológica, Avaliação de altas habilidades, Teste vocacional). **Em qualquer procedimento, inclusive nos de valor cheio, existe o botão "Aplicar desconto"** (Roberta, 04/10): abre o campo de desconto em R$ ou %, recalcula o valor, exige um motivo curto (quem autorizou) e grava "Desconto R$ X — motivo" na Observação; a gestão vê todos os descontos do mês na tela de pendências. A modalidade do paciente decide o procedimento padrão (ex.: "Social (R$ 200/mês)" → "Sessão de psicologia – plano social", valor 0, Pago? = "Pacote já pago").
3. **"Pago?" tem 6 opções**, não 3. O app mostra as 6 (lidas da planilha) e pré-seleciona pela regra de cobrança. "Recebeu? Sim/Não/Não se aplica" do briefing vira isso.
4. **"Cancelado pela clínica" não existe em `Listas!A`** (só 4 opções; a validação aceita até A6). Preciso que a gestão acrescente em `Listas!A6` — ou eu acrescento na cópia e você replica.
5. **Não há coluna de log** ("quem registrou"). Proponho **coluna U `Registrado por (app)`** na aba do mês e **coluna T `Registrado por (app)`** em `Pacientes`, formato `email · dd/mm/aaaa hh:mm`, com alterações acrescentadas na mesma célula (`| alterado por …`). Acrescentar coluna no fim não quebra fórmula nenhuma.
6. **`Pacientes` (A–S) não tem campos que o formulário "Novo paciente" pede**: WhatsApp do pagador, nº da carteirinha, quem indicou, data da 1ª consulta, profissional. Proponho colunas novas **U–Y** no fim: `WhatsApp do pagador` · `Nº carteirinha` · `Quem indicou` · `Data 1ª consulta` · `Profissional de referência`. Nada existente muda de lugar.
7. **`Mensalistas`** hoje tem pares de colunas por mês (`SETEMBRO … — pago?` / `Data`, `OUTUBRO … — pago?` / `Data`). O app localiza o par pelo nome do mês no cabeçalho e, na virada, a gestão (pelo app) cria o par do mês seguinte. Forma, quem pagou e NF da mensalidade ficam na **linha de recebimento** gravada na aba do mês (procedimento "Mensalidade – psicologia", a criar em `Procedimentos`).
8. **Muitos cadastros não têm CPF ou nascimento** (≈ 1/3 sem CPF). A validação de duplicata tem que funcionar mesmo quando o cadastro antigo está incompleto — por isso a regra 2 abaixo compara também sobrenomes.
9. **Procedimento na tela (Roberta, 05/10: a lista completa confunde).** A recepção não vê a lista de 56 procedimentos. Ela escolhe só o **Tipo de atendimento** (psicologia: Sessão · 1ª consulta (anamnese) · Aplicação de teste · Taxa de falta; pediatria: Consulta · Retorno; e assim por especialidade) e o app **deriva o procedimento** da modalidade do paciente (ex.: Pacote 4 → "Sessão de psicologia – pacote 4 sessões"), mostra o nome derivado só pra leitura e grava esse nome na coluna E. Um link "alterar procedimento" abre a lista completa pra exceção.
10. **Contagem de sessões do pacote (Roberta, 05/10).** Aba nova **`Pacotes`**, uma linha por pacote comprado: `ID · Paciente · Modalidade · Nº de sessões · Valor · Data da compra · Válido até · Pago? · Forma · Quem pagou · NF · Nº NF · Status · Registrado por`. Na aba do mês, coluna nova **V `Pacote (ID)`** liga cada sessão ao pacote. Usadas = linhas do pacote com "Atendido" ou "Faltou sem aviso" (falta com aviso e desmarcação não consomem; ver questão 7.8). O app mostra **"2 de 4 usadas, esta é a 3ª, válido até dd/mm"** no bloco ⚠ do registro do atendimento e na lista do dia; na última avisa; com o pacote encerrado oferece **"Lançar pacote novo e receber"** (cria a linha em `Pacotes` + a linha de recebimento na aba do mês, e a sessão de hoje já conta como 1) ou "cobrar sessão avulsa". A compra do pacote precisa de linhas próprias em `Procedimentos` (ex.: "Pacote 4 sessões – psicologia (compra)" R$ 400, "Pacote 12 sessões – psicologia (compra)" R$ 960, idem nutrição, psicopedagogia e ABA). Para mensalistas o contador é por mês: "3 sessões em novembro". Nos pacotes mensais (280/360, 400) ele serve pra pergunta da 5ª sessão; na Social e nos valores especiais a 5ª está incluída (decisão 05/10) e o app só mostra a contagem.
11. **Isac × Isaac na planilha**: `Isac de Oliveira Souza` nasc. 07/08/2024 e `Isaac Oliveira Santos` nasc. 15/03/2022. Nascimentos **diferentes**, pagador vazio → pelas regras do briefing ao pé da letra, nenhuma delas dispararia. Proponho a regra 2 ampliada (seção 4.1). `Natalha / Natalia` aparecem como **duas pagadoras do mesmo paciente** (coluna O), então o teste "mesmo pagador" precisa comparar pagador também por fonética.

---

## 2. Stack e custo

Decisão de 04/10 (Roberta, depois de comparar AppSheet × Apps Script × Next.js/Cloud Run): **Google Apps Script como web app**, dentro do Workspace da clínica.

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Google Apps Script (web app)** vinculado à planilha, HTML/CSS/JS no `HtmlService`, pt-BR, A4 via CSS `@media print`. Código versionado neste repositório e publicado com `clasp` | roda dentro da conta Google da clínica; publicar é um clique em "Implantar"; nada pra hospedar |
| Login | o próprio login Google do Workspace (`Session.getActiveUser()`), acesso restrito ao domínio `clinicanascente.com.br`; perfil (recepção / gestão) por lista de e-mails na aba `Listas` (coluna nova `Gestão`) | zero senha, zero tela de consentimento |
| Publicação | o app **não fica colado no Apps Script**: lá vai só um **carregador** de 60 linhas (`dist/Code.gs`), colado uma vez. Ele lê os 3 arquivos do app (`duplicatas.js`, `server.js`, `index.html`, em pedaços de até 12 mil caracteres gerados por `node build.js` em `dist/pedacos.json`) da planilha **"Recepção Nascente — código do app (não mexer)"** (id `1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo`, pasta Gestão), guarda em cache por 90 s e executa. Cada atualização do app é uma gravação nessa planilha, sem a Roberta mexer em nada. Passo a passo: `docs/COMO-INSTALAR.md` | decisão 05/10: zero fricção pra quem não é técnico |
| Dados | leitura e escrita direto na planilha com `SpreadsheetApp`, executando **como o dono do script** (`administrativo@`) pra poder gravar nas abas protegidas; `LockService` em toda gravação; cache de 60 s (`CacheService`) pra `Pacientes`, `Listas`, `Procedimentos`, `Profissionais`, invalidado a cada gravação. Gravação só por `appendRow` e `setValue` de célula localizada pelo ID da coluna T | respeita "append ou update de célula, nunca reescrever a aba"; sem service account, sem chave |
| Identidade visual | **Manual da Marca 2026 + paleta do site:** lavanda `#F1EEF6` de fundo, roxo `#543060` em títulos e botões, lilás `#9C78A8` em rótulos, pêssego/nude só no bloco ⚠ e em toques; Poppins (títulos, rótulos, botões), Mulish (corpo), Bitter (frases). Sem azul. Cards com barra lateral colorida, como no manual. **Menu lateral em roxo escuro** (decisão 05/10); o resto da tela clara. **Só tema claro**, sem modo escuro. Lista do dia em duas camadas: "Visão geral" com os profissionais em colunas lado a lado e uma aba por profissional (decisão 05/10) | decisão da Roberta, 05/10 |
| Resiliência | rascunho do formulário em `localStorage` + fila de gravações pendentes com retentativa; faixa vermelha "planilha indisponível — seus dados estão guardados aqui" | requisito 7 |
| Colunas | o app localiza cada coluna **pelo cabeçalho**, nunca pela letra | uma coluna inserida no meio não corrompe dado em silêncio |

**Custo mensal: R$ 0.** Apps Script é incluído no Workspace; não há servidor, domínio nem conta de faturamento. Cotas relevantes: 6 h/dia de execução por usuário e 30 execuções simultâneas — a clínica usa uma fração disso (≈ 50–100 registros/dia).

**O preço conhecido:** cada gravação leva 1 a 3 s (o Apps Script é lento pra responder) e a tela é uma página web dentro do `script.google.com` (a URL é feia; vira um atalho na área de trabalho e no celular). Pra registrar um atendimento em menos de 1 minuto, cabe com folga.

Descartados: **AppSheet** (não faz a validação fonética de duplicata e imprime mal) e **Next.js em Cloud Run** (app melhor, mas a clínica herdaria projeto GCP, service account, OAuth e dependências pra manter; Vercel Hobby proíbe uso comercial). O plano das telas e do modelo de dados (seções 3 e 4) não depende da stack.

---

## 3. Modelo de dados = a planilha

Nenhum dado vive só no app. Mapa do que o app lê e escreve:

| Aba | Lê | Escreve |
|---|---|---|
| `Pacientes` | A–S + U–Y (novas) | **append** linha nova (Novo paciente); **update** de O/P (pagador confirmado), F/N/R/S (só gestão), T log |
| `Outubro`, `Novembro`… | tudo | **append** linha (registro do atendimento, mensalidade, falta); **update** de célula por ID (correção, "cancelado") |
| `Mensalistas` | tudo | **update** do par "mês — pago?" / "Data" por paciente; **append** paciente novo mensalista |
| `Procedimentos` | A–D | nada (só gestão, pela planilha) |
| `Profissionais`, `Listas`, `Como preencher` | tudo | nada |
| `Agenda recorrente` (**nova**, ver 7.2; criada pelo app em 05/10) | ID · paciente · profissional · dia da semana · hora · frequência (semanal/quinzenal) · começa em · termina em · ativo · observação · registrado por | **append** de horário novo; **update** da linha ao editar; mudança "a partir de hoje" encerra a antiga e acrescenta outra |
| `Lista do dia` (**nova**, ver 7.2; criada pelo app em 05/10) | ID · data · hora · paciente · profissional · origem · observação · registrado por | **append** (acréscimo do dia, "Não vem · remarcado para…", "Remarcação de…") |
| `Alterações de cadastro` (**nova**, 4.3b; criada pelo app em 05/10) | data/hora · paciente · campo · de · para · quem informou · registrado por | **append** a cada campo alterado pelo Editar cadastro |
| `Pacotes` (**nova**, item 10) | um pacote comprado por linha, com validade e pagamento | **append** na compra; **update** de Status (ativo · encerrado · vencido) |

Regras de gravação: nunca apagar linha ("excluir" = `O que aconteceu` → "Cancelado pela clínica" + observação + log); ID na coluna T é um ULID; antes de um update, o app relê a célula T da linha pra confirmar que o ID bate (protege contra alguém ter inserido linha no meio).

Aba por mês: o app descobre a aba pelo nome do mês em pt-BR (`Novembro`), e a tela da gestão tem o botão **"Criar aba de Novembro"** que duplica a aba corrente (fórmulas, validações e proteções vêm junto) e limpa as linhas. Ver questão 7.1.

---

## 4. Telas (ordem de entrega)

### 4.1 Novo paciente → `Pacientes`
Campos conforme briefing. **Modalidade: lista única, as 17 opções de `Listas!H2:H18`, visível à recepção** (decisão da Roberta, 04/10) — Avulso (valor da tabela) é o padrão. Ao lado de **Social (R$ 200/mês)**, **Pacote mensal preexistente (R$ 280 ou R$ 360)** e **Mensal (valor especial)** o app mostra o aviso "só com aviso da psicóloga/gestão pelo grupo Nascente | Tratamentos" e pede confirmação antes de salvar. Conferi em 04/10: `Listas!H` já tem as 17 opções (incluindo Pro bono e Permuta) e a coluna F de `Pacientes` já usa os rótulos novos; não restou "Social mensal" nem "Pacote mensal" lá. R e S não aparecem.

Validação de duplicata (roda a cada tecla, antes de salvar):
- **Bloqueia:** CPF igual (comparando só dígitos).
- **Avisa, deixa prosseguir:** primeiro nome **fonético** igual (algoritmo tipo BuscaBR/Metaphone-pt: acentos fora, PH→F, SS/Ç/Z→S, Y→I, W→V, K/Q→C, CH/X→X…) **ou** distância de edição ≤ 2, **e** pelo menos um de: (a) mesma data de nascimento; (b) mesmo pagador habitual (também fonético — pega Natalha/Natalia); (c) **≥ 1 sobrenome em comum** (proposta minha — é o que pega Isac de **Oliveira** Souza × Isaac **Oliveira** Santos).
- Nome exato igual **também** avisa (não bloqueia — pode ser homônimo).
- A mensagem mostra nome, nascimento, pagador e modalidade do possível duplicado, e o botão "É outra pessoa, cadastrar mesmo assim".

Casos de teste: Isac/Isaac, Natalha/Natalia (como pagadoras), Laura de Oliveira Souza × Isac de Oliveira Souza (gêmeos, mesmo nascimento, **não** deve bloquear), Isabella × Isabelli Abranches Portes (irmãs, nascimentos diferentes, deve avisar), Agatha/Ágatha/Agata (3 pacientes distintas).

### 4.2 Atendimento → aba do mês
Fluxo em uma tela só, de cima pra baixo:
1. Paciente (busca por nome com tolerância a acento) · Profissional (lista) · Procedimento (lista da aba `Procedimentos`, filtrada pela especialidade do profissional, padrão pela modalidade; o valor vem junto) · Data/Hora (agora, editável). Botão "Novo paciente" abre o 4.1 e volta com o paciente selecionado.
2. **Bloco laranja "⚠ Atenção na cobrança"** = R + S de `Pacientes`, só leitura, acima de qualquer campo de dinheiro. Se mensalista: situação (em dia · vence dia 10 · atrasado desde dd/mm). Atrasado e hoje ≥ 16 → faixa vermelha "Não atender — chamar a gestão" (não bloqueia).
3. O que aconteceu (lista da planilha).
4. Pago? · Valor · Forma · Quem pagou (pré-preenchido com `Pacientes!O`; se diferente, pergunta "tornar pagador habitual?" → update de O/P) · NF emitida? · Nº NF · Guia assinada? (só convênio) · Observação.

Comportamento por regra de cobrança (`Listas!G`):

| Regra (R) | Valor | Pago? pré-selecionado | Observações |
|---|---|---|---|
| Tabela / vazio | do procedimento, **travado**; editável só se o procedimento está sem valor | Sim | procedimento sem valor → campo em branco + aviso "preencher à mão". Botão **"Aplicar desconto"** sempre disponível: desconto em R$ ou %, motivo obrigatório, vai pra Observação |
| Valor fixo combinado | número extraído de `Pacientes!N` (se não der pra extrair, em branco + aviso) | Sim | |
| Paga o que consegue | livre, sem validar | Sim | o que for digitado quita |
| Mensalidade fixa | em branco, campos de dinheiro desabilitados | Pacote já pago | link "ver em Mensalistas" |
| Pro bono / Permuta | em branco, desabilitado | Não se aplica | pula direto pra NF? não — pula pra Observação |
| Convênio | 0 | Convênio (fatura) | exige Guia assinada?; procedimento "Aplicação de teste" não pergunta nada de convênio |

Mensalista (modalidade Social/280/360/Mensal especial, ou regra "Mensalidade fixa"): Pago? = "Pacote já pago"; e se já é novembro e a mensalidade do mês não está paga, mostra a situação e oferece "registrar mensalidade agora" (abre 4.4).

Pacote (4 ou 12 sessões): o bloco ⚠ mostra o contador e a validade; a linha gravada recebe o ID do pacote na coluna V e Pago? = "Pacote já pago"; pacote encerrado → botão "Lançar pacote novo e receber" (seção 1, item 10).

Falta sem aviso de particular (psicologia): grava a linha e marca a pendência "taxa de falta a decidir" pra gestão (4.5). Não cobra nada na tela.

### 4.3 Lista do dia (imprimível A4) — ✅ publicada na cópia em 05/10
Duas camadas: **"Visão geral"** com os profissionais em colunas lado a lado (hora · paciente · ⚠ atenção · selos de pacote/mensalidade · situação) e **uma aba por profissional** em tabela. Contadores no topo (na lista · registrados · pendentes · não vêm). Sem CPF. Botão **Imprimir** (A4, só a lista).

Monta o dia a partir de três fontes: a aba **`Agenda recorrente`** (horários semanais ou quinzenais, vigentes entre "Começa em" e "Termina em"), a aba **`Lista do dia`** (acréscimos daquele dia e ausências avisadas) e a **aba do mês** (quem já foi registrado; encaixes feitos direto no Atendimento também aparecem).

Clicando num nome a recepção escolhe: **Registrar atendimento** (abre o Atendimento já preenchido com paciente, profissional, data e hora) · **Não vem** (grava a linha na aba do mês com o motivo — desmarcou com antecedência, faltou em cima da hora, faltou sem aviso, cancelado pela clínica — e consome a sessão do pacote só nos casos que consomem, ver 7.8) · **Remarcar** (o item do dia vira "Não vem · remarcado para dd/mm" e a nova data recebe "Remarcação de dd/mm", sem mexer na recorrência).

**Confirmou** (05/10, pedido da Roberta): na véspera a recepção abre a lista de amanhã e marca quem confirmou. Antes do atendimento o paciente tem três estados: *a confirmar*, *confirmado* e *não vem*; depois do registro vira *registrado*. Os contadores do topo mostram quantos faltam confirmar. Na planilha é uma linha em `Lista do dia` com Origem "Confirmado" e quem confirmou. Não é etapa obrigatória: o atendimento registra normalmente sem confirmação.

**Cadastro na hora de agendar e de atender** (05/10): ao escolher o paciente, o app mostra o que está no cadastro (convênio, modalidade, regra). Se não houver nada, avisa "cadastro incompleto" e oferece **Completar cadastro**, que abre a tela Editar cadastro e volta pra onde estava. Motivo: na cópia, de 528 pacientes só ~90 têm Modalidade e ~100 têm Convênio preenchidos.

**+ Agendar no dia**: acrescenta um atendimento avulso naquele dia (origem: avulso, encaixe, retorno, avaliação) ou, com "Tornar recorrente", cria de uma vez o horário semanal a partir daquele dia.

**Agenda recorrente** (dentro da Lista do dia): cadastro completo dos horários fixos — paciente, profissional, dia da semana, hora, frequência (semanal/quinzenal), começa em, termina em, ativo, observação — com edição. Ao mudar dia, hora ou profissional de um horário existente, o app pergunta se vale **a partir de hoje**: a linha antiga termina ontem e nasce uma nova, preservando o histórico. Pausar = Ativo "Não". Nada é apagado.

As duas abas são criadas pelo app na primeira gravação, com cabeçalhos próprios; o servidor só acrescenta linhas e atualiza células específicas.

### 4.3b Editar cadastro — ✅ publicada na cópia em 05/10 (decisão 7.3)
Recepção e gestão. Escolhe o paciente e edita: modalidade, convênio, nº da carteirinha, regra de cobrança, valor combinado, observação de cobrança, pagador habitual (atualiza também "Nome do pagador como aparece no extrato"), WhatsApp do pagador, profissional de referência. **"Quem informou" é obrigatório.** Modalidades restritas pedem a confirmação de que houve aviso no grupo. O servidor grava só as células que mudaram, acrescenta um carimbo em `Registrado por (app)` e registra cada mudança na aba **`Alterações de cadastro`** (Data/hora · Paciente · Campo · De · Para · Quem informou · Registrado por), criada na primeira gravação. Acessível pelo menu, pelo link "Editar cadastro" no Atendimento e pelo botão "Completar cadastro" nos avisos de cadastro incompleto.

### 4.4 Mensalistas
**Decisão 05/10 (Roberta): a pergunta da 5ª sessão só vale para pacotes mensais (R$ 280/360, R$ 400). Na Social (R$ 200/mês) e nos valores especiais a 5ª sessão está incluída: o app não pergunta nem cobra.**

Lista com filtro em dia / vence / atrasado, valor, pagador, mês atual pago?. "Registrar mensalidade": data, forma, quem pagou, NF, pergunta da 5ª sessão em mês de 5 semanas (valor somado). Grava: update do par do mês em `Mensalistas` + append de uma linha de recebimento na aba do mês (procedimento "Mensalidade – psicologia"). Competência: pagamento até dia 10 cai no mês corrente (modelo antecipado, a partir de nov); em outubro ainda vale o modelo antigo (paga setembro), e o "resto de outubro" em nov/dez entra como linha separada — tudo isso lido do cabeçalho da coluna, não do código.

### 4.5 Gestão (só perfil gestão)
- Editar paciente: modalidade restrita, Regra de cobrança, Observação de cobrança, pagador, convênio.
- Pendências (lê a aba do mês e a anterior): particular atendido com Pago? vazio ou "Não" · NF não emitida com Pago? = Sim · convênio sem guia · falta sem aviso de particular (taxa a decidir, com botão "cobrar no próximo agendamento" que cria aviso no bloco ⚠ do paciente / "relevar") · **descontos aplicados no mês** (paciente, valor cheio, valor cobrado, motivo, quem registrou).
- Criar aba do mês seguinte; criar par de colunas do mês em `Mensalistas`.
- Exportar o mês (xlsx, mesmas colunas A–U).
- Versão imprimível de todas as listas.

---

## 5. Cronograma (virada em 01/11)

| Semana | Entrega | Critério |
|---|---|---|
| 05–09/10 | ✅ 05/10: carregador, servidor, tela **Novo paciente**, módulo de duplicatas com 10 grupos de testes automáticos (Isac/Isaac, Natalha/Natalia, gêmeos, Isabella/Isabelli, Agatha×3, CPF). ✅ Instalado na cópia em 04/10 às 22h09 (implantação v1); a tela abriu lendo a cópia. Falta: primeiro cadastro de teste e conferência da linha em Pacientes | duplicatas Isac/Isaac e Natalha/Natalia testadas |
| 12–16/10 | ✅ Adiantado para 05/10: **Atendimento** publicado na cópia, com bloco ⚠, regras de cobrança, procedimento derivado, desconto, pacotes (aba `Pacotes` + coluna V), sessão extra, pagador novo, gravação na aba do mês (colunas U/V criadas no fim). Testado no navegador com os 6 casos do briefing mais pacote 2/4, pacote encerrado com lançamento, falta e pediatria. Falta: teste da Roberta na cópia e conferência das linhas | 6 casos do briefing: tabela, paga o que consegue, mensalidade fixa, pro bono, convênio, mensalista atrasado |
| 19–23/10 | ✅ Adiantado para 05/10: **Editar cadastro** publicado (recepção e gestão, log em `Alterações de cadastro`), **Confirmou** na Lista do dia, aviso de cadastro ao agendar e ao atender. ✅ **Lista do dia** publicada na cópia (visão geral em colunas + aba por profissional, imprimível, registrar/não vem/remarcar, agendar no dia, **Agenda recorrente** semanal/quinzenal com edição "a partir de hoje"). Falta: **Mensalistas** (registrar mensalidade, 5ª sessão só em pacotes mensais, filtros) e o teste da Roberta na cópia | recepção registra em < 1 min |
| 26–30/10 | Gestão, pendências, exportar mês, READMEs recepção e gestão, piloto na planilha real | gestão fecha outubro pelo app |
| 01/11 | Virada: aba Novembro, modelo antecipado | |

Cada semana termina com uma versão implantada pra você testar. Protótipo navegável das telas: https://claude.ai/artifact/LuVb9tDGaLtALBtHnfLsGz (cópia em `docs/prototipo/checkout-prototipo.html`).

---

## 6. O que preciso de você antes de começar

- ✅ **Cópia da planilha** criada em 05/10: "CÓPIA TESTE - Controle da Recepção 2026", id `1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk`. O script fica vinculado à cópia durante o desenvolvimento e, no piloto, é vinculado à planilha real.
- Autorização pra acrescentar as colunas novas (U nas abas de mês; T–Y em `Pacientes`; `Gestão` em `Listas`) e as linhas em `Listas!A6` ("Cancelado pela clínica") e `Procedimentos` ("Mensalidade – psicologia").
- Na primeira implantação, você autoriza o script uma vez na sua conta (`administrativo@`), porque ele executa como dono.

---

## 7. Decisões que são suas — responda e eu sigo

**7.1 ✅ Decidido 05/10: aba por mês.** Aba por mês × aba única `Atendimentos`. Recomendo **manter aba por mês**: a planilha já está montada assim (fórmulas, validações, proteções e a importação do Financeiro), a gestão e a contabilidade já conhecem, e a complexidade pro app é pequena (o botão "Criar aba de Novembro" duplica a aba). Aba única só compensaria se o Financeiro quisesse consultas que cruzam meses — e aí o "exportar o mês" resolve. **Confirma manter por mês?**

**7.2 ✅ Decidido 05/10: opção (a), aba `Agenda recorrente` (nome escolhido pela Roberta; antes "Agenda fixa").** Como a lista do dia entra no app. Recomendo começar pela **opção (a)**: aba `Agenda fixa` com os horários recorrentes (paciente, profissional, dia da semana, hora) carregada uma vez pela gestão a partir do ControleOdonto, mais acréscimos do dia feitos pela recepção. O extrator do ControleOdonto (opção b) entra depois como melhoria — eu não tenho acesso ao `registro do atendimento.md` › "Como extrair do ControleOdonto" (não está no repositório nem no Drive que enxergo); se quiser que eu avalie a (b), me passa esse trecho. **Confirma (a)?**

**7.3 ✅ Decidido 05/10: a própria recepção atualiza o cadastro** (modalidade, valor combinado, regra e observação de cobrança) quando a psicóloga ou a gestão avisa no grupo de WhatsApp com recepção, gestão e psicologia. A tela "Editar cadastro" fica disponível pra recepção, com os campos "quem informou" e "quando" obrigatórios, gravados no log; a gestão vê as alterações do mês numa lista de conferência. Proposta original: Por ora só a gestão altera (via 4.5); a recepção escreve na Observação e a gestão promove. Deixo um botão na tela da gestão "promover observação pro cadastro" pra encurtar o caminho. **Ok?**

**7.4 Pacote R$ 280 em fev/2027.** Resolvido pela tabela `Procedimentos` editável + modalidade por paciente; nada no código. Sem decisão necessária agora.

**Já decidido em 04/10 (Roberta):** `Procedimentos` como lista do campo Procedimento, valor automático editável só quando em branco, fisioterapia fora; modalidade em lista única visível à recepção com aviso nas restritas; rótulos antigos renomeados em `Pacientes!F`; botão "Aplicar desconto" disponível em todo procedimento, com motivo obrigatório e conferência pela gestão. Observação minha: a aba `Mensalistas`, coluna B, ainda usa "Pacote mensal" e "Social mensal" (40 linhas). Não mexi porque a decisão falou só de `Pacientes!F`; o app vai tratar os dois rótulos como sinônimos até você querer renomear lá também.

**7.5 ✅ Decidido 05/10: sim.** Regra de duplicata ampliada com "≥ 1 sobrenome em comum" — sem ela, Isac × Isaac não avisa (nascimentos diferentes). **Aprova?**

**7.6 ✅ Decidido 05/10: eu acrescento** (na cópia durante o desenvolvimento; na real, no piloto). Quem acrescenta as linhas em `Listas` e `Procedimentos` ("Cancelado pela clínica", "Mensalidade – psicologia"): você na planilha real, ou eu na cópia e você replica?

**7.8 Regras do contador de pacote — decidido em 05/10 (Roberta).** Atendido e falta sem aviso consomem sessão. Falta com aviso não consome até 1 por mês; a 2ª consome. Desmarcou e Cancelado pela clínica não consomem. **Validade: 8 semanas pro pacote de 4 e 24 pro de 12** (pensado pra sessão quinzenal), contadas da compra. Vencido, as sessões restantes aparecem como "vencidas" e a gestão decide. O app avisa, nunca bloqueia. **Sessão extra discricionária:** com o pacote encerrado ou vencido, a recepção pode "Liberar sessão extra" informando quem liberou (Recepção · Gestão · Psicóloga) e o motivo; a linha vai com Pago? = "Pacote já pago", a Observação recebe "Sessão extra liberada por … — motivo", não consome sessão nem cobra, e aparece na lista da gestão. Ver 7.9 pra como "falta com aviso" e "desmarcou" se encaixam.

**7.9 (nova) "Faltou com aviso" × "Desmarcou".** Hoje as duas opções se confundem porque a lista mistura *quem avisou* com *quando avisou*. Proposta: definir pelo prazo, que é o que a regra de reposição usa.

| Opção (rótulo proposto em `Listas!A`) | Quando usar | Consome sessão do pacote? | Repõe? | Taxa de falta (particular)? |
|---|---|---|---|---|
| Atendido | veio | sim | — | — |
| **Desmarcou com antecedência (≥ 24h)** | avisou com um dia ou mais; o horário pôde ser oferecido a outro | não, até 1 por mês; a 2ª consome | sim | não |
| **Faltou avisando em cima da hora (< 24h)** | avisou, mas no mesmo dia ou na véspera à noite; o horário ficou vago | sim (gestão pode relevar) | não | gestão decide |
| Faltou sem aviso | não veio e não avisou | sim | não | sim, candidata |
| Cancelado pela clínica | profissional faltou, feriado, clínica fechou | não | sim, sem contar no limite | não |

Ou seja: **"desmarcou" é o aviso em tempo; "faltou com aviso" é o aviso tarde demais.** Se concordar, troco os dois rótulos em `Listas!A` (o protótipo já mostra assim) e a regra do 7.8 fica: "desmarcou com antecedência" não consome até 1/mês; "faltou em cima da hora" consome. **✅ Decidido 05/10: ok.**

**7.10 (anotado 05/10) "Mensalidade fixa" × modalidades mensais.** No comportamento são iguais (valor fixo por mês, independe de quantas sessões). A regra de cobrança "Mensalidade fixa (independe do nº de sessões)" é redundante com as modalidades Social, Pacote mensal preexistente e Mensal (valor especial). O app trata toda modalidade mensal igual, com ou sem essa regra. Quando o app estiver pronto, decidir se tira "Mensalidade fixa" de `Listas!G`, deixando a regra de cobrança só pra exceções (paga o que consegue, valor fixo combinado, pro bono, permuta, convênio).

**7.7 ✅ Decidido 05/10: sim, muda em novembro** (vai pro checklist da virada). Rótulos de `Listas!B` na virada. "Mensalista (paga no mês seguinte)" é o modelo antigo. Em novembro vira "Mensalista (mensalidade do mês)"? O app lê o rótulo da planilha, então basta você trocar o texto — só preciso saber se troca, pra eu não fixar nada.


## 10. Como publicar uma atualização (nota técnica)

1. Editar `app/server/*.js` ou `app/client/index.html`; `node build.js`; `node tests/duplicatas.test.js`; teste no navegador em simulação (`dist/index.html`, sem Google).
2. Gravar os fontes na planilha de código (`arquivos`): linha 2 `duplicatas.js`, linha 3 `server.js`, linhas 4+ `index.html` em partes de até 45.000 caracteres (coluna B = nº da parte). O carregador junta as partes e guarda em cache por 90 s.
3. O carregador (`dist/Code.gs`) só muda em caso raro; aí a Roberta repete o passo "Implantar → Gerenciar implantações → Nova versão".
