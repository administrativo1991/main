# POP · Recepção · Cobrança no app (Fase 1, a partir de 15/10/2026)

Uma página. O app diz o que fazer; você só confere, cobra e responde **Recebeu?**. Nada é apagado: errou, avise a
gestão (Pendências → Lançamentos corrige).

## 1. O dia, em ordem

1. **Agenda** → a coluna **Cobrança hoje** já diz o que fazer com cada paciente. Clique em **Chegou** quando a pessoa chegar.
2. **Registrar atendimento** (botão na linha ou no painel da direita): confira o profissional, leia o **bloco colorido**,
   marque **O que aconteceu**, responda **Recebeu?** quando o app perguntar, marque **Guia assinada** se for convênio, Salvar.
3. Antes de ir embora: **Meu dia** → conferir as 4 listas (A cobrar · Recebido · Guias a pegar · NF a emitir) →
   **Copiar resumo** (cola no grupo) → **Fechar o dia**.

## 2. O bloco "O que fazer agora" (as mesmas frases aparecem na Agenda)

| Cor | Frase | O que você faz | O app grava em Pago? |
|---|---|---|---|
| 🟡 amarelo | **Cobrar R$ X agora** (pagador: …) | cobra na hora; responde **Recebeu? Sim · Não · Parcial**; marca **NF emitida** e o nº | Sim · Não · Parcial |
| 🟡 amarelo | **Mensalidade de {mês} em aberto — cobrar R$ X** / **{Mês} em aberto — cobrar R$ X** (antecipado) | cobra o mês; se pagar, clique em **Registrar pagamento do mês** (no bloco ou na tela Cobrança do mês). A sessão de hoje não pede Recebeu? | Incluída na mensalidade |
| 🔴 vermelho | **… atrasada/atrasado — chamar a gestão** | não atende sem a gestão liberar; se liberar, registra normalmente (o app anota "atendido com mês em atraso") | Incluída na mensalidade |
| 🟢 verde | **Não cobrar — {mês} pago** | nada a cobrar | Incluída na mensalidade |
| 🔵 azul | **Não cobrar hoje — paga no fim do mês** | nada a cobrar hoje; fica em "a receber" na Cobrança do mês. Se a pessoa quiser pagar agora, marque **Sim** | Não (com o valor em J) |
| 🔵 azul | **Não cobrar — convênio {nome}** · guia assinada obrigatória | pega a **guia assinada** e marca ☑ Guia assinada | Convênio (fatura) |
| ⚪ cinza | **Não cobrar — pro bono / permuta** · **Não cobrar — aplicação de teste / retorno** | nada a cobrar | Não se aplica (pro bono / permuta) |
| ⚪ cinza | **Sem cobrança — faltou / desmarcou. A gestão decide.** | escreva no **Detalhe** quem avisou, a que horas e como (obrigatório em falta sem aviso e em cima da hora). A gestão decide depois em Pendências → Faltas | (vazio) |
| 🟠 laranja | **Sem cobrança cadastrada pra {profissional} — cobrar R$ X** | cobra o valor da tabela e **avisa a gestão** (ela cadastra a cobrança por profissional) | Sim · Não · Parcial |

Regras que o app já aplica: antecipado = valor × sessões agendadas no mês; sessão **cancelada pela clínica** abate no mês
seguinte; **falta** só abate se a gestão decidir; mensalidade vence dia **10**, tolerância até dia **15** (parâmetros da
gestão, aba `Parâmetros`).

## 3. Recebeu?

- **Sim**: confere o valor (já vem preenchido), forma, data; **Quem pagou** só se foi outra pessoa (o app pergunta se vira
  o pagador habitual); **NF emitida** ☑ + nº quando emitir.
- **Não**: fica em aberto na linha com o valor; aparece em "A cobrar" no Meu dia e em "a receber" na Cobrança do mês.
- **Parcial**: valor recebido agora; o resto fica em aberto (o app escreve o saldo na observação).

## 4. Pacientes

- **Novo paciente**: dados pessoais, quem paga, convênio e carteirinha. A **cobrança é da gestão** (seção "Cobrança por
  profissional"); até existir, o app cobra pela tabela e mostra "sem cobrança cadastrada".
- Pediu desconto ou social? Não negocia: **"Aguarde a avaliação da psicóloga."** Cobra pela tabela e anota na observação.

## 5. Quando chamar a gestão

Mês atrasado (bloco vermelho) · paciente sem cobrança cadastrada (laranja) · valor diferente do que a pessoa diz ·
qualquer correção de linha já gravada · falta com dúvida (descreva no Detalhe, a decisão é dela).

## 6. "Já registrado"

O app não grava duas vezes o mesmo paciente, profissional, dia, hora e "o que aconteceu": ele mostra a aba e a linha onde
já está. Se for mesmo outro atendimento, confira a hora ou clique em **É outro atendimento: gravar mesmo assim**.

## 7. Se o app demorar

Depois de 20 s aparece "Demorou mais que o normal": espere mais um pouco ou clique em **tentar de novo**. O que você
digitou fica guardado no computador por 2 h (rascunho). Trocar de tela pelo menu sempre funciona.
