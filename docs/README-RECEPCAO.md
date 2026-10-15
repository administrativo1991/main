# Recepção Nascente — guia da recepção

O app é uma página ligada à planilha "Controle da Recepção 2026". Tudo o que você grava vai direto pra planilha, na linha
certa, com a hora e o seu e-mail. Nada é apagado. Errou? Avise a gestão, que corrige em Pendências → Lançamentos.

Abra pelo link que a gestão passou, logada com o e-mail da clínica. O app é feito pra usar no computador.

Menu: **Agenda · Registrar · Pacientes · Cobrança do mês · Meu dia**.

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
5. Fim do expediente: **Meu dia** → confira as 4 listas (A cobrar · Recebido · Guias a pegar · NF a emitir) →
   **Copiar resumo** (cola no grupo) → **Fechar o dia**.

Linhas cinzas "pagamento do mês" ou "taxa de falta" na lista do dia são lançamentos à parte (o recebimento de uma
mensalidade, a taxa decidida pela gestão). Não são atendimentos e não contam na presença.

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

## 6. Perguntas frequentes

- **Agendei duas vezes a mesma pessoa**: clique no item repetido → **Remover** → motivo "duplicado". A linha fica marcada
  como removida.
- **Remarcar**: **⋯** → **Remarcar** → nova data e hora.
- **Paciente não aparece no Registrar**: só quem está em Pacientes aparece. Cadastre primeiro.
- **"A aba do mês não existe"**: peça à gestão pra criar (Pendências → Virada do mês).
- **O app demorou**: depois de 20 s aparece "Demorou mais que o normal". Espere ou clique em tentar de novo.
- **Erro vermelho**: copie a mensagem (ou tire print) e mande pra gestão. O que você digitou fica guardado.
