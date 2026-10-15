# Recepção Nascente — guia da recepção

O app é uma página ligada à planilha "Controle da Recepção 2026". Tudo o que você grava vai direto pra planilha, na linha
certa, com a hora e o seu e-mail. Nada é apagado. Errou? Avise a gestão, que corrige em Pendências → Lançamentos.

Abra pelo link que a gestão passou, logada com o e-mail da clínica. O app é feito pra usar no computador.

Menu: **Agenda · Confirmações · Registrar · Pacientes · Cobrança do mês · Meu dia**.

**Cobrança** (o bloco colorido "O que fazer agora", a pergunta **Recebeu?** e o que cada frase quer dizer): está tudo no
**`docs/POP-RECEPCAO-COBRANCA.md`**, de uma página. Este guia cobre o resto.

---

## 1. O dia

1. **Agenda** abre no dia de hoje. Cada linha mostra hora, tipo, paciente, profissional e a coluna **Cobrança hoje**.
2. Paciente chegou: **Chegou**. Depois, **Registrar atendimento**: o Registrar abre com paciente, profissional, hora e tipo
   já preenchidos.
3. Não veio ou avisou que não vem: **⋯** → **Não vem hoje** → motivo e **Detalhe** (quem avisou, a que horas, como).
   O Detalhe é obrigatório em falta sem aviso e em cima da hora. A gestão decide a cobrança depois.
4. Encaixe ou paciente sem horário fixo: clique num horário vago da Agenda, ou **+ Agendamento**.
5. Fim do expediente: **Meu dia** → **Lançar o dia**: para cada paciente ainda sem registro, marque Veio · Faltou · Em cima
   da hora · Desmarcou · Clínica cancelou (e Recebeu?, forma, guia ou Detalhe quando o app pedir) → **Gravar**. Dá para
   lançar dias atrasados pelas setas. Pagou só uma parte ou NF com número: use o Registrar.
6. Depois, ainda no **Meu dia** → confira as 4 listas (A cobrar · Recebido · Guias a pegar · NF a emitir) →
   **Copiar resumo** (cola no grupo) → **Fechar o dia**.

Linhas cinzas "pagamento do mês" ou "taxa de falta" na lista do dia são lançamentos à parte (o recebimento de uma
mensalidade, a taxa decidida pela gestão). Não são atendimentos e não contam na presença.

## 1a. Confirmações (WhatsApp)

1. Menu **Confirmações** → escolha o período: **Amanhã**, **Daqui a 2 dias**, **Resto da semana**, **Próxima semana** ou
   **Outro período**. Dá pra filtrar por profissional.
2. Cada cartão é uma família (irmãos com o mesmo pagador ficam juntos, numa mensagem só).
3. **Abrir WhatsApp**: abre a conversa com a mensagem pronta. Confira e aperte enviar no WhatsApp. O app anota "mensagem
   enviada" com a hora.
4. Sem número ("sem WhatsApp no cadastro"): pergunte ou procure o número, digite no campo e **Salvar no cadastro**. Fica
   gravado no paciente (e nos irmãos) para as próximas vezes.
5. A família respondeu:
   - confirmou → **Confirmou** (a Agenda do dia passa a mostrar "confirmado");
   - não vem ou quer outro horário → **Não vem / remarcar**: abre a Agenda daquele dia com o paciente e o formulário
     "Não vem hoje" aberto (o **Remarcar** fica ao lado). Escreva o Detalhe, como sempre.
6. **Copiar mensagem**: para mandar por outro caminho (ex.: celular da clínica).

## 2. Registrar

Passo 1 · Quem (paciente, profissional, data, hora, tipo) → leia o **bloco "O que fazer agora"** → passo 2 · O que
aconteceu → passo 3 · **Recebeu?** (só quando o bloco pergunta) → Guia assinada (convênio) → Observação → **Salvar**.

- Trocou o profissional? O bloco muda: a cobrança é por paciente **e** profissional.
- **"Já registrado"**: o app não grava duas vezes o mesmo paciente, profissional, dia, hora e "o que aconteceu". A
  mensagem diz a aba e a linha onde já está. Se for mesmo outro atendimento, confira a hora ou clique em **É outro
  atendimento: gravar mesmo assim**.
- Se a internet falhar, o rascunho fica guardado no computador por 2 horas. Tente de novo.

## 3. Agenda recorrente (horários fixos)

Agenda → **Horários fixos**. Paciente, profissional, dia, hora, frequência (semanal/quinzenal), começa/termina em, ativo e
**Tipo**:

- **Sessão / consulta** (o normal).
- **Aplicação de teste** ou **Retorno**: a Agenda já mostra "sem cobrança" e esses horários não entram na conta do
  antecipado do mês. (Aplicação de teste em geral não é horário fixo: veja "Aplicações de teste" abaixo.)

Mudou dia, hora ou profissional: Editar → ao salvar, deixe marcado "vale a partir de hoje" (encerra o horário antigo e
guarda o histórico). Paciente parou por um tempo: Ativo = Não.

### Aplicações de teste (avaliação neuropsicológica)

Não são horário fixo: agende **cada aplicação** pelo **+ Agendamento** (ou clicando na vaga da grade) com Tipo =
**Aplicação de teste**. A Agenda mostra "Aplicação nº N · sem cobrança", contando as que o paciente já fez com aquele
profissional. Não há número fixo de aplicações: a profissional avisa quando a avaliação termina.

**Avaliação de convênio (Sabin)**: o pacote são 5 sessões, somando as da psicóloga e as aplicações de teste; da 6ª em
diante, **cada sessão precisa de autorização do convênio** (guia). A Agenda e o Registrar mostram "Avaliação Sabin Sinai:
sessão 3 de 5" e, depois, "sessão 6 · adicional" (confira a autorização antes de atender). Sessão da avaliação feita pela
psicóloga: no Registrar, tipo **Avaliação neuropsicológica** (para paciente de convênio o app grava a sessão do pacote).
Aplicação de teste de paciente de convênio pede a **guia assinada**, como qualquer sessão de convênio.

## 4. Pacientes

- **Novo paciente**: dados pessoais, quem paga, convênio e carteirinha. O app avisa se já existe alguém parecido (nome,
  CPF, nascimento). A **cobrança é da gestão**: até ela cadastrar, o app cobra pela tabela e mostra "sem cobrança
  cadastrada". Avise a gestão.
- **Buscar / editar**: "Quem informou" é obrigatório. Cada mudança fica registrada em "Alterações de cadastro". A seção
  **Cobrança por profissional** a recepção só lê.
- Depois de cadastrar aqui, cadastre também no ControleOdonto.

## 5. Cobrança do mês

Uma linha por paciente × profissional que paga **antecipado** (até o dia 10), **no fim do mês** ou **mensalidade**: valor
do mês (sessões agendadas × valor, menos as canceladas pela clínica), situação (em dia · vence dia 10 · tolerância até 15 ·
atrasada · a receber) e **Registrar pagamento** (pode marcar mais de um mês = adiantamento).

**Cobrar no WhatsApp** (linhas em aberto): abre a conversa com a mensagem oficial de cobrança (mensalidade, ou consultas
do mês para quem paga no fim do mês), com valor, Pix e favorecido. Confira e envie no WhatsApp. A linha passa a mostrar
"cobrado" com a data. Sem número no cadastro, o app pede o WhatsApp e guarda no paciente.

## 6. Perguntas frequentes

- **Agendei duas vezes a mesma pessoa**: clique no item repetido → **Remover** → motivo "duplicado". A linha fica marcada
  como removida.
- **Remarcar**: **⋯** → **Remarcar** → nova data e hora.
- **Paciente não aparece no Registrar**: só quem está em Pacientes aparece. Cadastre primeiro.
- **"A aba do mês não existe"**: peça à gestão pra criar (Pendências → Virada do mês).
- **O app demorou**: depois de 20 s aparece "Demorou mais que o normal". Espere ou clique em tentar de novo.
- **Erro vermelho**: copie a mensagem (ou tire print) e mande pra gestão. O que você digitou fica guardado.
