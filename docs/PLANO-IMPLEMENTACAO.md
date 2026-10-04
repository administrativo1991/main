# Checkout — Plano de implementação (entregável 1, pra aprovação)

Clínica Nascente · 04/10/2026 (rev. 2, com as decisões da Roberta de 04/10) · base: planilha `Controle da Recepção 2026` (id `1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs`)

Escrevi este plano depois de ler a planilha real (cabeçalhos, fórmulas, validações e proteções de todas as abas), o PDF "Checkout — resumo do desenho (30-09)" e a nota "ENTRADA_Checkout_pagadores_e_valores (03-10)". **Não escrevi código ainda.** A seção 7 lista o que preciso que você decida.

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
2. **A aba `Procedimentos`** (procedimento · especialidade · valor · observação, 56 linhas, sem fisioterapia) **é a tabela de preços e a lista do campo "Procedimento" do Checkout** — decisão da Roberta, 04/10. Conferi em 04/10: a aba já tem exatamente a lista decidida e a validação de `Outubro!E` já aponta pra ela, então não criei uma cópia dentro de `Listas` (seriam duas fontes de verdade). **O valor preenche sozinho pelo procedimento escolhido e só fica editável quando o procedimento está com valor em branco** (Avaliação neuropsicológica, Avaliação de altas habilidades, Teste vocacional). A modalidade do paciente decide o procedimento padrão (ex.: "Social (R$ 200/mês)" → "Sessão de psicologia – plano social", valor 0, Pago? = "Pacote já pago").
3. **"Pago?" tem 6 opções**, não 3. O app mostra as 6 (lidas da planilha) e pré-seleciona pela regra de cobrança. "Recebeu? Sim/Não/Não se aplica" do briefing vira isso.
4. **"Cancelado pela clínica" não existe em `Listas!A`** (só 4 opções; a validação aceita até A6). Preciso que a gestão acrescente em `Listas!A6` — ou eu acrescento na cópia e você replica.
5. **Não há coluna de log** ("quem registrou"). Proponho **coluna U `Registrado por (app)`** na aba do mês e **coluna T `Registrado por (app)`** em `Pacientes`, formato `email · dd/mm/aaaa hh:mm`, com alterações acrescentadas na mesma célula (`| alterado por …`). Acrescentar coluna no fim não quebra fórmula nenhuma.
6. **`Pacientes` (A–S) não tem campos que o formulário "Novo paciente" pede**: WhatsApp do pagador, nº da carteirinha, quem indicou, data da 1ª consulta, profissional. Proponho colunas novas **U–Y** no fim: `WhatsApp do pagador` · `Nº carteirinha` · `Quem indicou` · `Data 1ª consulta` · `Profissional de referência`. Nada existente muda de lugar.
7. **`Mensalistas`** hoje tem pares de colunas por mês (`SETEMBRO … — pago?` / `Data`, `OUTUBRO … — pago?` / `Data`). O app localiza o par pelo nome do mês no cabeçalho e, na virada, a gestão (pelo app) cria o par do mês seguinte. Forma, quem pagou e NF da mensalidade ficam na **linha de recebimento** gravada na aba do mês (procedimento "Mensalidade – psicologia", a criar em `Procedimentos`).
8. **Muitos cadastros não têm CPF ou nascimento** (≈ 1/3 sem CPF). A validação de duplicata tem que funcionar mesmo quando o cadastro antigo está incompleto — por isso a regra 2 abaixo compara também sobrenomes.
9. **Isac × Isaac na planilha**: `Isac de Oliveira Souza` nasc. 07/08/2024 e `Isaac Oliveira Santos` nasc. 15/03/2022. Nascimentos **diferentes**, pagador vazio → pelas regras do briefing ao pé da letra, nenhuma delas dispararia. Proponho a regra 2 ampliada (seção 4.1). `Natalha / Natalia` aparecem como **duas pagadoras do mesmo paciente** (coluna O), então o teste "mesmo pagador" precisa comparar pagador também por fonética.

---

## 2. Stack e custo

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript**, UI com Tailwind + shadcn/ui, pt-BR, A4 via CSS `@media print` | um só projeto, server e tela juntos; imprime direto do navegador |
| Login | **Auth.js (NextAuth) com Google**, restrito ao domínio `clinicanascente.com.br`; perfil por lista de e-mails em variável de ambiente (`GESTAO_EMAILS`) | zero cadastro de senha; Workspace já existe |
| Dados | **Google Sheets API v4** com **service account** editora da planilha. Leitura com cache em memória de 60 s (`Pacientes`, `Listas`, `Procedimentos`, `Profissionais`), invalidado a cada gravação. Gravação só por `values.append` (linha nova) e `values.update` de célula localizada pelo ID da coluna T | respeita "append ou update de célula, nunca reescrever a aba" |
| Hospedagem | **Google Cloud Run** (mesmo projeto GCP da service account), domínio `checkout.clinicanascente.com.br` | fica dentro da conta Google da clínica; Vercel Hobby **proíbe uso comercial**, Vercel Pro é US$ 20/mês |
| Resiliência | rascunho do formulário em `localStorage` + fila de gravações pendentes com retentativa; faixa vermelha "planilha indisponível — seus dados estão guardados aqui" | requisito 7 |

**Custo mensal estimado:** Cloud Run neste volume (≈ 50–100 registros/dia) cabe na faixa gratuita → **R$ 0 a R$ 15/mês**; Sheets API é gratuita; domínio já é da clínica. Sem banco, sem servidor fixo. Alternativa de custo zero absoluto seria Google Apps Script (web app dentro do Workspace); descartei por tela mais lenta (1–3 s por ação) e pior de manter — mas é o plano B se Cloud Run for um obstáculo.

Limites conhecidos: quota da Sheets API é 300 leituras/min por projeto (o cache resolve); uma gravação leva ~0,5–1 s; latência pra tela de 13" e celular é ok.

---

## 3. Modelo de dados = a planilha

Nenhum dado vive só no app. Mapa do que o app lê e escreve:

| Aba | Lê | Escreve |
|---|---|---|
| `Pacientes` | A–S + U–Y (novas) | **append** linha nova (Novo paciente); **update** de O/P (pagador confirmado), F/N/R/S (só gestão), T log |
| `Outubro`, `Novembro`… | tudo | **append** linha (checkout, mensalidade, falta); **update** de célula por ID (correção, "cancelado") |
| `Mensalistas` | tudo | **update** do par "mês — pago?" / "Data" por paciente; **append** paciente novo mensalista |
| `Procedimentos` | A–D | nada (só gestão, pela planilha) |
| `Profissionais`, `Listas`, `Como preencher` | tudo | nada |
| `Agenda fixa` (**nova**, ver 7.2) | paciente · profissional · dia da semana · hora · ativo · início · fim | gestão/recepção pelo app |
| `Lista do dia` (**nova**, ver 7.2) | data · hora · paciente · profissional · origem | recepção pelo app |

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

### 4.2 Checkout → aba do mês
Fluxo em uma tela só, de cima pra baixo:
1. Paciente (busca por nome com tolerância a acento) · Profissional (lista) · Procedimento (lista da aba `Procedimentos`, filtrada pela especialidade do profissional, padrão pela modalidade; o valor vem junto) · Data/Hora (agora, editável). Botão "Novo paciente" abre o 4.1 e volta com o paciente selecionado.
2. **Bloco laranja "⚠ Atenção na cobrança"** = R + S de `Pacientes`, só leitura, acima de qualquer campo de dinheiro. Se mensalista: situação (em dia · vence dia 10 · atrasado desde dd/mm). Atrasado e hoje ≥ 16 → faixa vermelha "Não atender — chamar a gestão" (não bloqueia).
3. O que aconteceu (lista da planilha).
4. Pago? · Valor · Forma · Quem pagou (pré-preenchido com `Pacientes!O`; se diferente, pergunta "tornar pagador habitual?" → update de O/P) · NF emitida? · Nº NF · Guia assinada? (só convênio) · Observação.

Comportamento por regra de cobrança (`Listas!G`):

| Regra (R) | Valor | Pago? pré-selecionado | Observações |
|---|---|---|---|
| Tabela / vazio | do procedimento, **travado**; editável só se o procedimento está sem valor | Sim | procedimento sem valor → campo em branco + aviso "preencher à mão" |
| Valor fixo combinado | número extraído de `Pacientes!N` (se não der pra extrair, em branco + aviso) | Sim | |
| Paga o que consegue | livre, sem validar | Sim | o que for digitado quita |
| Mensalidade fixa | em branco, campos de dinheiro desabilitados | Pacote já pago | link "ver em Mensalistas" |
| Pro bono / Permuta | em branco, desabilitado | Não se aplica | pula direto pra NF? não — pula pra Observação |
| Convênio | 0 | Convênio (fatura) | exige Guia assinada?; procedimento "Aplicação de teste" não pergunta nada de convênio |

Mensalista (modalidade Social/280/360/Mensal especial, ou regra "Mensalidade fixa"): Pago? = "Pacote já pago"; e se já é novembro e a mensalidade do mês não está paga, mostra a situação e oferece "registrar mensalidade agora" (abre 4.4).

Falta sem aviso de particular (psicologia): grava a linha e marca a pendência "taxa de falta a decidir" pra gestão (4.5). Não cobra nada na tela.

### 4.3 Lista do dia (imprimível A4)
Por profissional e hora: paciente · ⚠ atenção · situação mensalista · convênio · status do checkout (feito / pendente, verificando se há linha na aba do mês com o mesmo paciente+data). Sem CPF na impressão. Monta a partir de `Agenda fixa` (recorrentes do dia da semana) + acréscimos do dia (`Lista do dia`). Botão "Marcar falta" direto da lista → grava linha com "Faltou sem aviso/com aviso". Ver questão 7.2.

### 4.4 Mensalistas
Lista com filtro em dia / vence / atrasado, valor, pagador, mês atual pago?. "Registrar mensalidade": data, forma, quem pagou, NF, pergunta da 5ª sessão em mês de 5 semanas (valor somado). Grava: update do par do mês em `Mensalistas` + append de uma linha de recebimento na aba do mês (procedimento "Mensalidade – psicologia"). Competência: pagamento até dia 10 cai no mês corrente (modelo antecipado, a partir de nov); em outubro ainda vale o modelo antigo (paga setembro), e o "resto de outubro" em nov/dez entra como linha separada — tudo isso lido do cabeçalho da coluna, não do código.

### 4.5 Gestão (só perfil gestão)
- Editar paciente: modalidade restrita, Regra de cobrança, Observação de cobrança, pagador, convênio.
- Pendências (lê a aba do mês e a anterior): particular atendido com Pago? vazio ou "Não" · NF não emitida com Pago? = Sim · convênio sem guia · falta sem aviso de particular (taxa a decidir, com botão "cobrar no próximo agendamento" que cria aviso no bloco ⚠ do paciente / "relevar").
- Criar aba do mês seguinte; criar par de colunas do mês em `Mensalistas`.
- Exportar o mês (xlsx, mesmas colunas A–U).
- Versão imprimível de todas as listas.

---

## 5. Cronograma (virada em 01/11)

| Semana | Entrega | Critério |
|---|---|---|
| 05–09/10 | Projeto, login, leitura da planilha, **Novo paciente** completo contra a **cópia** | duplicatas Isac/Isaac e Natalha/Natalia testadas |
| 12–16/10 | **Checkout** com bloco ⚠ e regras de cobrança | 6 casos do briefing: tabela, paga o que consegue, mensalidade fixa, pro bono, convênio, mensalista atrasado |
| 19–23/10 | Lista do dia imprimível + Mensalistas | recepção registra em < 1 min |
| 26–30/10 | Gestão, pendências, exportar mês, READMEs recepção e gestão, piloto na planilha real | gestão fecha outubro pelo app |
| 01/11 | Virada: aba Novembro, modelo antecipado | |

Cada semana termina com uma versão publicada pra você testar.

---

## 6. O que preciso de você antes de começar

- **Id da cópia da planilha** pra desenvolver e testar (eu não escrevo na real até o piloto).
- Projeto no Google Cloud (ou eu crio em `administrativo@`): ativar Sheets API, criar service account, compartilhar a cópia com ela como editora, criar credencial OAuth do login. Faço com você em 20 min por chamada, ou você me dá acesso.
- Autorização pra acrescentar as colunas novas (U nas abas de mês; T–Y em `Pacientes`) e as linhas em `Listas!A6` ("Cancelado pela clínica") e `Procedimentos` ("Mensalidade – psicologia").

---

## 7. Decisões que são suas — responda e eu sigo

**7.1 Aba por mês × aba única `Atendimentos`.** Recomendo **manter aba por mês**: a planilha já está montada assim (fórmulas, validações, proteções e a importação do Financeiro), a gestão e a contabilidade já conhecem, e a complexidade pro app é pequena (o botão "Criar aba de Novembro" duplica a aba). Aba única só compensaria se o Financeiro quisesse consultas que cruzam meses — e aí o "exportar o mês" resolve. **Confirma manter por mês?**

**7.2 Como a lista do dia entra no app.** Recomendo começar pela **opção (a)**: aba `Agenda fixa` com os horários recorrentes (paciente, profissional, dia da semana, hora) carregada uma vez pela gestão a partir do ControleOdonto, mais acréscimos do dia feitos pela recepção. O extrator do ControleOdonto (opção b) entra depois como melhoria — eu não tenho acesso ao `checkout.md` › "Como extrair do ControleOdonto" (não está no repositório nem no Drive que enxergo); se quiser que eu avalie a (b), me passa esse trecho. **Confirma (a)?**

**7.3 Valor fechado dentro da sessão.** Por ora só a gestão altera (via 4.5); a recepção escreve na Observação e a gestão promove. Deixo um botão na tela da gestão "promover observação pro cadastro" pra encurtar o caminho. **Ok?**

**7.4 Pacote R$ 280 em fev/2027.** Resolvido pela tabela `Procedimentos` editável + modalidade por paciente; nada no código. Sem decisão necessária agora.

**Já decidido em 04/10 (Roberta):** `Procedimentos` como lista do campo Procedimento, valor automático editável só quando em branco, fisioterapia fora; modalidade em lista única visível à recepção com aviso nas restritas; rótulos antigos renomeados em `Pacientes!F`. Observação minha: a aba `Mensalistas`, coluna B, ainda usa "Pacote mensal" e "Social mensal" (40 linhas). Não mexi porque a decisão falou só de `Pacientes!F`; o app vai tratar os dois rótulos como sinônimos até você querer renomear lá também.

**7.5 (nova) Regra de duplicata ampliada** com "≥ 1 sobrenome em comum" — sem ela, Isac × Isaac não avisa (nascimentos diferentes). **Aprova?**

**7.6 (nova) Quem acrescenta as linhas em `Listas` e `Procedimentos`** ("Cancelado pela clínica", "Mensalidade – psicologia"): você na planilha real, ou eu na cópia e você replica?

**7.7 (nova) Rótulos de `Listas!B` na virada.** "Mensalista (paga no mês seguinte)" é o modelo antigo. Em novembro vira "Mensalista (mensalidade do mês)"? O app lê o rótulo da planilha, então basta você trocar o texto — só preciso saber se troca, pra eu não fixar nada.
