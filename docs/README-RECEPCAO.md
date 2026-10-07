# Recepção Nascente — guia da recepção

O app é uma página web ligada à planilha "Controle da Recepção 2026". Tudo o que você grava vai direto pra planilha, na linha certa, com a hora e quem gravou. Nada é apagado: quando algo "sai", a linha fica marcada como removida.

Abra pelo link que a gestão passou (só funciona logado com o e-mail da clínica). No celular, "Adicionar à tela inicial"; no Chrome, "Instalar página como app".

Menu de cima: **Hoje · Registrar · Pacientes · Mensalistas · Gestão** (Gestão abre só pra gestão). No celular o menu vira a barra de baixo, com Hoje, Registrar, Pacientes e Mensalistas. O chip no canto mostra o perfil (recepção ou gestão); quem gravou fica sempre registrado na planilha pelo e-mail logado.

---

## 1. Rotina do dia

**Véspera (fim da tarde)**
1. Hoje → seta **›** (ou o botão do calendário) pra ver amanhã.
2. Confirme com cada paciente. Na linha dele, botão **Confirmou**. O filtro "A confirmar" vai zerando e a linha passa a **Aguardando**.
3. Quem avisou que não vem: botão **⋯** da linha → **Não vem hoje** → motivo (desmarcou com antecedência / faltou em cima da hora / cancelado pela clínica).

**No dia**
1. Hoje (abre no dia de hoje). Paciente chegou → botão **Chegou** na linha (ela fica destacada em roxo) → **Registrar atendimento**: a tela Registrar abre preenchida com paciente, profissional, data e hora. Confira os avisos, o passo 2 (o que aconteceu) e o passo 3 (cobrança), e **Salvar atendimento** (volta pra Hoje) ou **Salvar e registrar outro**. O "Chegou" é uma marcação deste computador, pra organizar a fila; o que vai pra planilha é o registro do atendimento.
2. Paciente sem horário (encaixe, retorno, avaliação): **+ Agendamento**, escolha o paciente, profissional, hora e tipo. Se for toda semana, **Tornar recorrente**.
3. Quem não apareceu nem avisou: **⋯** → **Não vem hoje** → "Faltou sem aviso". Remarcar e Remover da lista também ficam no **⋯**.
4. Precisa imprimir a lista (A4): botão **Imprimir**.

**Situações na lista**: *A confirmar* → *Aguardando* → *Chegou* → *Atendido* (ou *Não vem*). As etiquetas coloridas seguem as cores da planilha: laranja = atenção na cobrança (paga o que consegue, valor combinado, cadastro sem modalidade), lilás = pro bono/permuta/convênio, amarelo = pendência (mensalidade em aberto), verde = ok (mês pago, plano em dia), vermelho = atrasado ou não vem. Embaixo do nome aparece profissional e **modalidade** do cadastro. Se aparecer "sem modalidade · completar cadastro", aproveite a confirmação da véspera pra perguntar como o paciente paga e completar em Pacientes → Buscar / editar cadastro. O card pêssego **Lembrete da gestão** (à direita) é o aviso que a gestão deixou pra você; some sozinho quando vence ou quando a gestão encerra. No fim do expediente, a caixa **Fim do dia** (à direita) é um checklist deste computador; **Fechar o dia** só deixa fechar sem ninguém em Aguardando/Chegou.

---

## 2. Registrar atendimento (uma sessão ou consulta)

1. **Passo 1 · Quem**: paciente (comece a digitar e escolha da lista; se não estiver, "+ Novo paciente" ali mesmo), profissional, data, hora e tipo. O cartão à direita mostra o cadastro do paciente e, embaixo, **Vai ser gravado**: exatamente a linha que vai pra planilha, atualizada enquanto você preenche.
2. Leia o **bloco de avisos**. Ele diz como esse paciente paga:
   - **Convênio**: Pago? vira "Convênio (fatura)", valor zerado. A caixa **"Guia assinada antes da sessão"** começa desmarcada: marque só depois de conferir a guia. Sem marcar, a linha grava "guia não assinada" e a gestão vê isso na conferência do convênio.
   - **Plano de consultas** (4, 6 ou 12): mostra quantas já usou (ex.: "3 de 4 usadas · esta é a 4ª"). Na última, avise que o próximo plano é pago na chegada. Plano encerrado ou vencido (4 consultas valem 2 meses, 12 valem 6): o app oferece **Lançar plano e receber**, já com o valor combinado daquele paciente (grava a compra na aba Planos e o recebimento na aba do mês), **Cobrar consulta individual** ou **Liberar sessão extra** (precisa dizer quem liberou e por quê).
   - **Mensalidade fixa** e **valor especial**: diz se a mensalidade do mês está paga. Mensalidade fixa não tem remarcação de faltas. A partir de novembro: vence dia 10, tolerância até 15; **do dia 16 em diante sem pagar, não atende e chama a gestão**.
   - **Atenção na cobrança**: paga o que consegue, valor fixo combinado, pro bono, permuta. Siga o que está escrito. Se o paciente disser algo diferente, anote na Observação e avise a gestão.
   - **Cadastro incompleto**: sem modalidade nem convênio. Pergunte como paga e clique em **Completar cadastro**.
3. **Profissional** e **Tipo de atendimento**. O procedimento certo (ex.: "Sessão – convênio", "Sessão – pacote 4") é escolhido sozinho a partir do cadastro; só mude se precisar ("alterar").
4. **O que aconteceu**: Atendido, ou o motivo da falta. Falta não cobra nada na linha; falta sem aviso de particular vira pendência pra gestão decidir a taxa.
5. **Valor** vem da tabela e fica travado. Pra dar desconto, use **Aplicar desconto** (valor ou %, e **quem autorizou** é obrigatório). O desconto fica registrado pra conferência da gestão.
6. **Pago?**, **Forma**, **Data do pagamento**, **Quem pagou** (vem o pagador habitual; se outra pessoa pagou, digite o nome e, se for passar a ser sempre essa pessoa, marque "tornar pagador habitual"), **NF** e número.
7. **Salvar atendimento**. A tela mostra a aba e a linha onde gravou.

Se a internet falhar na hora de salvar, o rascunho fica guardado no computador. Tente de novo em instantes.

---

## 3. Pacientes → Novo paciente

Nome completo, CPF, nascimento, pagador, WhatsApp, modalidade, convênio e carteirinha, profissional de referência, primeira consulta.

- O app avisa se já existe alguém parecido (nome parecido, mesmo CPF, mesma data de nascimento). Leia o aviso: se for a mesma pessoa, cancele e use o cadastro que existe; se for outra pessoa (gêmeos, homônimos), clique em **É outra pessoa, cadastrar mesmo assim**.
- **Modalidades**: Consulta individual (paga pela tabela a cada vez) · Consulta individual – cartão de parceria · Plano de 4, 6 ou 12 consultas (paga o plano adiantado, valor combinado por paciente) · Mensalidade fixa (R$ 200/mês, sem remarcação) · Mensal (valor especial) · AAPI JF (mensal) · Convênio · Por sessão · Pro bono · Permuta. As mensais (✋) só com aviso da psicóloga ou da gestão no grupo **Nascente | Tratamentos**. O app pede pra você confirmar que o aviso foi dado.
- Depois de cadastrar aqui, cadastre também no ControleOdonto.

---

## 4. Pacientes → Buscar / editar cadastro

Use quando a psicóloga ou a gestão avisar no grupo que algo mudou: modalidade, convênio, carteirinha, regra de cobrança, valor combinado, observação de cobrança, pagador habitual, WhatsApp, profissional de referência.

**"Quem informou" é obrigatório.** O app grava só o que mudou e registra cada mudança na aba "Alterações de cadastro" pra gestão conferir. Também abre pelo botão **Completar cadastro** quando aparecer "cadastro incompleto" ao agendar ou atender; depois de salvar, volta pra onde você estava.

---

## 5. Mensalistas

Lista dos mensalistas com a situação do mês: **em dia · pendente · atrasada**. Dá pra buscar por nome ou pagador e filtrar. A coluna "Sessões em outubro" mostra quantas sessões o paciente já teve no mês.

Pra receber uma mensalidade: **Registrar pagamento** na linha do paciente (abre um painel em cima da lista) → confira valor, data, forma, quem pagou, NF. Em mês de 5 semanas, nos antigos **pacotes mensais** (só até o pagamento de outubro) aparece a pergunta da 5ª sessão (soma 1/4 do valor); na mensalidade fixa e nos valores especiais a 5ª já está incluída e a pergunta não aparece. A partir de novembro quem era pacote mensal passa a comprar **plano de 4 consultas** pelo Atendimento. Ao salvar, o app marca "Sim" na coluna do mês em Mensalistas, anota data/valor/forma ao lado e grava o recebimento na aba do mês.

Até 31/10 vale o modelo antigo (paga o mês anterior). De novembro em diante a mensalidade é do próprio mês, vence dia 10.

---

## 6. Perguntas frequentes

- **Agendei duas vezes a mesma pessoa.** Clique no item repetido → **Remover** → motivo "duplicado". A linha fica marcada como removida (nada é apagado). O app também já recusa agendar igual duas vezes seguidas.
- **Remarcar**: clique no nome → **Remarcar** → nova data e hora. O item de hoje vira "não vem · remarcado para dd/mm" e a nova data recebe o paciente.
- **Horário fixo mudou** (dia, hora ou profissional): Hoje → **Agenda recorrente** → Editar na linha → ao salvar, deixe marcado "vale a partir de hoje" pra guardar o histórico. Paciente parou por um tempo: Ativo = Não.
- **Paciente não aparece na lista do Registrar**: só quem está em Pacientes aparece. Cadastre em Pacientes → Novo paciente.
- **Errei um registro já gravado**: avise a gestão com a aba, a linha e o ID que apareceram na tela verde. A correção é feita pela gestão na planilha.
- **A aba do mês "não existe"**: o aviso aparece em Hoje e no topo do Registrar. Peça pra gestão criar (botão na tela Gestão).
- **Deu erro vermelho**: copie a mensagem (ou print) e mande pra gestão. O que você digitou fica guardado.
