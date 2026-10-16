# NOTAS — Fase 2

Arquivo de retomada da Fase 2 (começou em 15/10/2026, à noite). Quem abrir um chat novo lê, nesta ordem: `docs/DEPLOYS.md`
("No ar agora"), este arquivo, `NOTAS-fase1.md` (modelo de cobrança e decisões da Fase 1) e `docs/ESTADO-ATUAL.md` (mapa).

> **Estado em 15/10 (noite)**: item 1 (Confirmações + WhatsApp) e 1b (Cobrar no WhatsApp) **no ar na real** = deploy
> **2026-10-15-14**; item 2 (Lançar o dia) no ar na real = **2026-10-15-16** (teste = 15, mesmo código). Próximo: item 3,
> carga de telefones do ControleOdonto (depende da exportação da gestão) e item 4, Ficha do paciente.

## Ordem combinada com a gestão (15/10; revista à noite: "sua ordem está perfeita")

| # | Item | Situação |
|---|---|---|
| 1 | **Confirmações + WhatsApp** (não só na véspera: a recepção escolhe amanhã, daqui a 2 dias, a semana) | **real** (14) |
| 1b | **Cobrar no WhatsApp** (Cobrança do mês, textos oficiais) | **real** (14) |
| 2 | **Lançar o dia em lote** (Meu dia) | **real** (16) |
| 3 | Carga de telefones do ControleOdonto | em andamento: 14 gravados na real (16/10); faltam as outras páginas |
| 4 | **Ficha do paciente** | teste (16-02) |
| 5 | Perdas → Parcelas → Conciliação | a fazer |
| 6 | Alertas (avisos dentro da Ficha e da Agenda, não tela própria) | a fazer |

Fora da lista por enquanto: check-in e alta (não escolhidos em 15/10).

## 1. Confirmações + WhatsApp

**Pedido (15/10)**: "a mensagem de confirmação não precisa ser só na véspera. Deixa a opção dela clicar no link e enviar a
mensagem seja com 2 dias de antecedência, ou no começo da semana."

**Achado antes de começar**: dos 533 pacientes ativos da real, **só 8 têm algum telefone** (WhatsApp do pagador, telefone
do paciente ou do responsável). Decisão da gestão: **pedir na hora** — na tela de confirmações, quem não tem número mostra
um campo; a recepção digita uma vez e ele vai para `Pacientes` (coluna `WhatsApp do pagador`, já existente) com log em
`Alterações de cadastro`. O cadastro se completa com o uso.

**Texto**: o **oficial da clínica**, mandado pela gestão em 15/10 (noite). Está em `app/shared/mensagens.js` (o mesmo
módulo no servidor e na tela). Com **uma sessão** sai exatamente como a gestão escreveu; com **várias sessões da família**
no período sai "das suas consultas" e um bloco Data/Horário por sessão (com 👤 nome quando são vários pacientes e "com
profissional" quando são vários profissionais). Hora no formato 09h30. A gestão pode trocar o texto na aba `Parâmetros`,
linha nova `msg_confirmacao`, usando `{pagador}` (primeiro nome de quem paga; sem pagador, do paciente),
`{da_sua_consulta}`, `{com_profissional}` e `{sessoes}`; `\n` escrito na célula quebra linha.

```
Olá, {pagador}! Passando para lembrar {da_sua_consulta} na Clínica Nascente{com_profissional}:

{sessoes}
📍 *Local:* Av. Andradas, 547 – Térreo, Loja 5

📋 *IMPORTANTE: É obrigatório passar pela recepção para registrar sua chegada antes de seguir para o consultório.*

⚠️ Caso não possa comparecer, avise a recepção com pelo menos *24 horas de antecedência*. A falta sem aviso impede que o profissional disponibilize esse horário para outro paciente.

Agradecemos a compreensão e a colaboração!
```

Pergunta da gestão (15/10): a mensagem é só a de confirmação de consulta. **Mensagem de cobrança** (valor, mês, Pix) fica
para o item 2 (Alertas), com o texto que a clínica usa.

**Como funciona** (menu **Confirmações**, recepção e gestão):
- Período: Amanhã · Daqui a 2 dias · Resto da semana · Próxima semana · Outro período (até 14 dias). Filtro por
  profissional; "A confirmar" esconde as famílias já confirmadas.
- Um cartão por **pagador** (irmãos recebem uma mensagem só, com o número de quem tiver). Sem pagador: por número; sem os
  dois: por paciente. Número: WhatsApp do pagador; se vazio, telefone do responsável; depois telefone do paciente.
- Entram as sessões da agenda (horários fixos + agendamentos) do período que ainda não foram registradas e não estão
  como "Não vem". Aplicação de teste entra (é horário marcado).
- **Abrir WhatsApp**: abre `wa.me/55…` com a mensagem (só as sessões que faltam confirmar) e grava "mensagem enviada" na aba
  nova **`Mensagens WhatsApp`** (ID · Data/hora · Tipo · Pagador · WhatsApp · Paciente · Profissional · Data da sessão · Hora ·
  Registrado por (app)), uma linha por sessão. A aba é criada sozinha no primeiro envio. Não prova que a mensagem saiu:
  registra que a recepção abriu.
- **Confirmou**: a mesma linha "Confirmado" da `Lista do dia` que a Agenda já usava (a Agenda mostra "confirmado").
- **Não vem / remarcar**: abre a Agenda naquele dia com o paciente selecionado e o formulário "Não vem hoje" aberto (o
  Remarcar fica ao lado). Mesmo fluxo de sempre: a falta vai para a aba do mês e a gestão decide em Pendências.
- Copiar mensagem / Ver mensagem: para mandar por outro caminho (WhatsApp Web já aberto, celular da clínica).

**Por que a aba própria e não a `Lista do dia`**: o código antigo (real no 2026-10-15-10) trataria uma Origem nova como
agendamento avulso e duplicaria a sessão na Agenda. Na aba própria, voltar o código não estraga nada.

**Arquivos**: `app/server/server-fase2.js` (novo; `API.confirmacoes`, `API.marcarMensagemEnviada`, `API.salvarWhats`),
`app/server/server.js` (índice de pacientes leva `whats`), `app/client/telas/12-confirmar.html`, `app/client/js/12-confirmar.js`,
menu em `layout.html`, `INICIAR.hoje` aceita `{data, paciente, profissional, form}`, `build.js` e
`tests/carregar-servidor.js` (montam o server com o arquivo novo), `tests/servidor-fase2.test.js`.

**Testado**: `tests/servidor-fase2.test.js` (agrupamento dos irmãos, "Olá!" sem pagador, quem não vem fica de fora,
confirmados no fim, período > 14 dias recusado, texto do Parâmetros com `\n`, mensagem enviada na aba nova sem mexer na
Lista do dia nem duplicar a Agenda, Confirmou tira a sessão da mensagem, WhatsApp inválido recusado e válido indo para o
cadastro com log); simulação Playwright 1280 e 390 px sem erro de console (Próxima semana, Confirmou, Ver mensagem,
salvar WhatsApp, link `wa.me`, Não vem → Agenda com o formulário aberto).

**Nome do profissional** (gestão, 15/10: "coloca com dra. Juliana Ribeiro, dr. Victor Cunha, etc"): coluna nova no fim
de `Profissionais`, **`Nome na mensagem`**; vazia = nome da aba (Dr. Victor, Dra. Tatiana e Dra. Luciana já têm o título
no nome). Não se deduz Dr./Dra. pelo nome: a gestão diz como cada um sai.

Gestão (15/10): "pode colocar todo mundo como Dr. e Dra., é mensagem automática". Depois: "Dra. Giovana Grossi, Dra. Marileia,
etc". Preenchido na CÓPIA TESTE: Dra. para todas as profissionais ativas, Dr. Victor Cunha e Dr. Vitor Barcelos. Na real,
junto com a promoção.

Na real desde o deploy 2026-10-15-14 (código + coluna `Nome na mensagem`), com o OK da gestão.

**Emojis (gestão, 15/10, print do WhatsApp)**: com o link `wa.me` os emojis chegavam como "�" (acentos e travessão
chegavam certos). O texto que o app monta está certo; o defeito é conhecido do `wa.me` e o contorno relatado é
`https://api.whatsapp.com/send?phone=…&text=…`. Trocado nas duas telas (`Mensagens.linkWhats`), no ar no teste 13. **Testado pela gestão (15/10): emojis chegam certos.** Os asteriscos que aparecem na
caixa de digitação somem ao enviar (formatação de negrito do WhatsApp): conferido pela gestão.

## 1b. Cobrar no WhatsApp (Cobrança do mês)

**Pedido (15/10)**: textos oficiais da clínica para cobrança de mensalidade antecipada e de consultas no fim do mês.

- Em cada linha em aberto da **Cobrança do mês**, botão **Cobrar no WhatsApp**. Texto escolhido pela forma de pagamento:
  Mensalidade fixa e antecipado → "pagamento da mensalidade … referente a {mes}" com o valor do mês (o que falta, se pagou
  em parte); Por sessão no fim do mês → "consultas realizadas … durante o mês de {mes}" com o total a receber do mês.
- Pix (CNPJ 52.763.088/0001-05) e favorecido (Clínica Nascente LTDA.) estão no texto, como a gestão mandou.
- Textos em `app/shared/mensagens.js`; a gestão troca em `Parâmetros` (linhas novas `msg_cobranca_mensalidade` e
  `msg_cobranca_consultas`, com `{pagador}`, `{mes}`, `{valor}`).
- Sem número: o botão pede o WhatsApp e grava no cadastro (com log), como em Confirmações.
- Abrir o WhatsApp grava na aba `Mensagens WhatsApp` uma linha com Tipo "Cobrança mensalidade" / "Cobrança consultas",
  `Competência` e `Valor (R$)` (colunas novas no fim da aba); a linha da Cobrança do mês mostra "cobrado dd/mm hh:mm" e o
  botão vira "Cobrar de novo". É a base dos Alertas (item 2).
- Uma mensagem por paciente × profissional (irmãs com mensalidade recebem uma cada). Juntar por família fica para depois,
  se a gestão quiser.
- Testes: `tests/servidor-fase1.test.js` (bloco "cobrar no WhatsApp"); simulação: digitar número → link → "cobrado".
- **Testado pela gestão na CÓPIA TESTE (15/10)**: confirmação e cobrança funcionando (número digitado na caixinha → link →
  mensagem). Atenção: na cópia ficou gravado em `Pacientes` o número que a gestão digitou para testar.

## 2. Lançar o dia em lote (Meu dia)

**Por quê**: a recepção quase não lança (Outubro sem nenhum lançamento de 14 e 15/10, com atendimento); lançar sessão por
sessão no Registrar é o passo que fica para trás. Ordem revista com a gestão em 15/10 (noite).

**Como funciona**: no topo do **Meu dia**, seção **Lançar o dia** com quem estava na agenda e não tem registro
(aguardando · chegou · a confirmar). Para cada um: **Veio · Faltou · Em cima da hora · Desmarcou · Clínica cancelou**
(quem está como "Chegou" já vem marcado "Veio"); "Marcar todos como Veio". Conforme o bloco de cobrança do paciente ×
profissional: **Recebeu? Sim/Não** com o padrão do bloco (na hora = Sim; fim do mês = Não), valor pré-preenchido e forma;
**guia assinada** no convênio; **Detalhe** nas faltas (obrigatório em "Faltou" e "Em cima da hora"). **Gravar N
lançamentos** grava tudo numa chamada (`API.registrarLote`), e cada linha passa pelo mesmo `registrarAtendimento` do
Registrar (mesma validação, mesmo Pago?, mesma trava de repetido). As que dão erro ficam em vermelho com a mensagem; as
gravadas saem da lista. Procedimento = o que o Registrar escolheria vindo da Agenda (tipo da agenda ou Sessão/Consulta,
com a variante de convênio). Fica para o Registrar: pagou só uma parte, NF com número, outro pagador. Serve também para
**lançar dias atrasados** (setas do Meu dia).

**Testado**: `tests/servidor-fase1.test.js` (lote com 1 erro e 2 gravados, falta com Detalhe vai para Faltas → Decidir,
repetido barrado); simulação Playwright 1280 e 390 px sem erro (Detalhe obrigatório cobrado, 2 gravados, 9 ficam).

## 3. Carga de telefones do ControleOdonto

**16/10**: a gestão conseguiu exportar só uma página da lista de pacientes do ControleOdonto (arquivo "Pacientes
Exportados", "Escopo: Pacientes filtrados em tela": 20 pacientes, de Adirlene a Amanda Marques). Cruzamento pelo nome com
`Pacientes` da real: 20/20 achados. Gravado na real, com o OK da gestão, **14 celulares** em `Pacientes!U` (WhatsApp do
pagador), só onde estava vazio, formato "(32) 9 9999-9999"; log em `Alterações de cadastro!A382:G395` ("ControleOdonto
(exportação …)"). Lido de volta: nomes × números conferidos. **Não gravados**: 3 só com telefone fixo (Ágatha Helena, Aline
Amaral, Amanda Calichio); 2 com DDD "00" no ControleOdonto (Aleff, Alexsandra); Alice Oliveira já tinha WhatsApp.
Próximo: a gestão exporta as outras páginas (mesmo de 20 em 20); o cruzamento e a gravação se repetem igual.
O app relê o cadastro em até 5 min (cache).
**Fixos (gestão, 16/10: "deve ser anotado, caso precisemos entrar em contato")**: vão para `Pacientes` → "Telefone do
paciente" (vazio nos três), **depois** que a regra "WhatsApp só em celular" (deploy 16-02) estiver na real; antes disso o
app usaria o fixo como WhatsApp. DDD "00" (Aleff, Alexsandra): a gestão confirma o DDD.

## 4. Ficha do paciente

**O que é**: tela só de leitura com tudo de um paciente (`API.fichaPaciente`, `app/client/js/32-ficha.js`): cabeçalho
(idade, convênio, CPF final, quem paga com o WhatsApp clicável, responsável, observação de cobrança), resumo (a receber,
guias a assinar, última vez, atendimentos, faltas), **Em aberto** (a receber, guia a assinar, NF a emitir: mesma regra das
pendências da Agenda), **Sessões** das abas de mês (mais recentes primeiro, até 80), **Próximos 14 dias** (como na Agenda:
confirmado, não vem, registrado) e horário fixo, **Cobrança por profissional** (a que vale hoje e as encerradas/futuras),
**Mensalidade/antecipado** (mês anterior, atual e próximo, com a situação), **Mensagens de WhatsApp** (confirmações e
cobranças mandadas) e **Alterações de cadastro**. Botões: Registrar atendimento, Editar cadastro, Cobrança do mês.

**Por onde abre**: Pacientes → **Ficha** (terceiro botão, com busca própria); painel da Agenda → **Ver ficha**; Registrar →
**Ficha**; Cobrança do mês → clique no nome. Não está no menu lateral (a gestão pode pedir).

**Testado**: `tests/servidor-fase1.test.js` (bloco "ficha do paciente"); simulação 1280/390 px pelos 3 caminhos, sem erro.

