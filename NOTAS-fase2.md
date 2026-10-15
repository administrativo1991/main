# NOTAS — Fase 2

Arquivo de retomada da Fase 2 (começou em 15/10/2026, à noite). Quem abrir um chat novo lê, nesta ordem: `docs/DEPLOYS.md`
("No ar agora"), este arquivo, `NOTAS-fase1.md` (modelo de cobrança e decisões da Fase 1) e `docs/ESTADO-ATUAL.md` (mapa).

> **Estado em 15/10 (noite)**: item 1 (Confirmações + WhatsApp) feito, testado em simulação e **publicado no teste**
> (ver DEPLOYS). Real continua no 2026-10-15-10 até o OK da gestão.

## Ordem combinada com a gestão (15/10)

| # | Item | Situação |
|---|---|---|
| 1 | **Confirmações + WhatsApp** (não só na véspera: a recepção escolhe amanhã, daqui a 2 dias, a semana) | feito · teste |
| 2 | Alertas | a fazer |
| 3 | Ficha do paciente | a fazer |
| 4 | Perdas | a fazer |
| 5 | Parcelas | a fazer |
| 6 | Conciliação | a fazer |

Fora da lista por enquanto: check-in e alta (não escolhidos em 15/10).

## 1. Confirmações + WhatsApp

**Pedido (15/10)**: "a mensagem de confirmação não precisa ser só na véspera. Deixa a opção dela clicar no link e enviar a
mensagem seja com 2 dias de antecedência, ou no começo da semana."

**Achado antes de começar**: dos 533 pacientes ativos da real, **só 8 têm algum telefone** (WhatsApp do pagador, telefone
do paciente ou do responsável). Decisão da gestão: **pedir na hora** — na tela de confirmações, quem não tem número mostra
um campo; a recepção digita uma vez e ele vai para `Pacientes` (coluna `WhatsApp do pagador`, já existente) com log em
`Alterações de cadastro`. O cadastro se completa com o uso.

**Texto**: provisório, até a gestão mandar o oficial ("pode colocar ele de placeholder"). Fica no código só como padrão;
o oficial vai na aba `Parâmetros`, linha nova `msg_confirmacao` (coluna Valor), com `{pagador}` (primeiro nome) e
`{sessoes}` (uma linha por sessão: "• Ana com Juliana Ribeiro — terça, 20/10, às 15:00"). Na célula, `\n` também quebra
linha. Enquanto a linha não existir, a gestão vê a faixa "Texto provisório" na tela.

Texto provisório:
```
Olá, {pagador}! Aqui é da Clínica Nascente. Passando para confirmar:
{sessoes}
Podemos confirmar? Se precisar desmarcar, é só responder por aqui.
```

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

**Falta (gestão)**: testar na CÓPIA TESTE; mandar o texto oficial; OK para a real.
