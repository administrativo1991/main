# Recepção Nascente — guia da gestão

Complemento do `README-RECEPCAO.md` (a gestão usa tudo o que a recepção usa, mais a tela **Gestão**). Instalação e endereço: `COMO-INSTALAR.md`. Decisões e detalhes técnicos: `PLANO-IMPLEMENTACAO.md`.

## O que é só da gestão (16/10)

A recepção faz tudo o que a gestão faz em Agenda, Confirmações, Registrar, Pacientes, Cobrança do mês, Meu dia e
Pendências (corrigir lançamentos, convênio/modalidade da linha, CPF e nascimento, cobrança por profissional, editar
sessões). Ficam **só com a gestão**: exportar o mês, virada do mês (criar aba e colunas), lembrete, **Faltas → Decidir**,
marcar ou desmarcar **Perdido / glosa** (e o relatório de perdidos), a **IA** (card de uso e "Guias a conferir") e os
menus **Repasse**, **Conciliação**, **A receber** e **Evolução**.

A gestão acompanha sem lançar em **Pendências → "O que a recepção fez · últimos 7 dias"** (primeiro card, só a gestão vê):
junta `Alterações de cadastro`, `Alterações de lançamento` e `Lembretes` gravados por e-mail que não é da gestão, com
quando, quem, o quê, de → para e quem informou/decidiu. Criar aba do mês, criar colunas e exportar ficam registrados em
`Alterações de lançamento`.

## Quem é gestão

Perfil decidido pelo e-mail logado: `administrativo@clinicanascente.com.br` mais os e-mails listados na coluna **Gestão** da aba `Listas`. Pra dar acesso a alguém, acrescente o e-mail nessa coluna; pra tirar, apague. Só a gestão vê a tela Gestão, cria aba de mês, cria colunas em Mensalistas e exporta.

## O que o app grava e onde

| Aba | O que o app faz |
|---|---|
| `Pacientes` | acrescenta linha (Pacientes → Novo paciente); atualiza só as células alteradas em Pacientes → Buscar / editar cadastro; carimbo em `Registrado por (app)` |
| aba do mês (`Outubro`, `Novembro`…) | acrescenta linha por atendimento, falta, compra de pacote e mensalidade recebida; colunas U `Registrado por (app)` e V `Pacote (ID)` no fim. **Nunca escreve nas colunas automáticas F, G, H, N** nem na linha 2 |
| `Mensalistas` | marca "Sim" no par "MÊS — pago?" e escreve a anotação na coluna "Data" (data, valor, forma, quem, NF, "app"); uma anotação anterior que não seja data é preservada como "antes: …" |
| `Planos` | um plano de consultas por linha (compra, valor pago, validade, consultas usadas, status ativo/encerrado/vencido); coluna `Plano (ID)` na aba do mês liga cada consulta ao plano |
| `Agenda recorrente` | horários fixos; edição "a partir de hoje" encerra a linha antiga e cria outra |
| `Lista do dia` | acréscimos do dia, confirmações, não vem, remarcações e **removidos** (Origem "Removido · motivo") |
| `Alterações de cadastro` | uma linha por campo alterado no cadastro (de, para, quem informou, quem gravou) |
| `Extrato bancário` (criada pelo app) | uma linha por entrada do extrato do PagBank importado (Conciliação); a situação e a ligação com o lançamento são escritas quando você confirma |
| `Vendas no cartão` (criada pelo app) | uma linha por venda do CSV do PagBank (bruto, taxa, líquido, liberação) e o depósito em que caiu |
| aba do mês, coluna `Conciliado` (no fim) | quando você confirma na Conciliação: "PagBank dd/mm · R$ valor · código · quem · quando" (ou "Cartão …") |
| `Parcelamentos` e `Pagamentos de parcelas` (criadas pelo app) | um acordo por linha (total, vencimentos, sessões ligadas, situação ativo/quitado/cancelado) e um pagamento por linha; na aba do mês, coluna `Parcelamento (ID)` no fim, nas sessões de dívida parcelada e nos lançamentos de parcela paga |

Nenhuma linha é apagada pelo app. Correções em registros já gravados são feitas por você na planilha; o ID da linha (coluna T) aparece na tela verde da recepção.

## Tela Gestão

Escolha o mês no topo. Cartões, todos imprimíveis:

- **Particulares atendidos sem pagamento registrado**: Pago? vazio ou "Não", fora convênio, pacote e mensalidade. Cobrar ou marcar na planilha.
- **Pagos sem NF emitida**: Pago? = Sim e NF diferente de Sim / Não se aplica.
- **Convênio sem guia assinada**: atendidos de convênio com Guia diferente de Sim.
- **Faltas sem aviso de particular**: candidatas à taxa de falta. A decisão (cobrar no próximo ou relevar) é sua; anote na Observação da linha.
- **Descontos aplicados**: valor cheio, cobrado, motivo e quem autorizou (vem da Observação "Desconto: …").
- **Sessões extras liberadas**: quem liberou e motivo.
- **Pagou outra pessoa**: linhas com "Quem pagou" preenchido, pra conferir o nome na NF.
- **Alterações de cadastro no mês**: tudo o que a recepção mudou em cadastros, com quem informou.

**Lembrete pra recepção** (cartão à direita): escreva o aviso do dia ou da semana ("a Dra. Luciana atende só até 16h", "feriado dia 12, não agendar") e, se quiser, até quando vale. Ele aparece no card pêssego "Lembrete da gestão" da tela Hoje, pra recepção. Um lembrete novo substitui o anterior; **Encerrar o atual** tira do ar sem escrever outro. Nada é apagado: cada lembrete vira uma linha na aba `Lembretes`, e os anteriores ficam em "Lembretes anteriores".

Botões:
- **Criar aba de <mês seguinte>**: duplica a estrutura da aba corrente (cabeçalho, fórmulas automáticas, validações) sem os dados. Pede dois cliques. Faça na última semana do mês.
- **Criar colunas de <mês seguinte> em Mensalistas**: acrescenta o par "MÊS — pago?" e "Data" no fim. Dois cliques.
- **Exportar <mês> (.xlsx)**: grava uma planilha só com os valores da aba do mês na pasta do Drive **Clínica Nascente / Controle Financeiro / <ano> / <MM Mês_AA> / 2_Atendimentos** (ex.: `2026/10 Out_26/2_Atendimentos`), com o nome **`OUT 26 - Recepção atendimentos (app)`** (padrão `MMM AA - Descrição`). Exportar de novo o mesmo mês **sobrescreve** esse arquivo, então há sempre uma cópia por mês, a mais recente. A tela mostra o link pra baixar o .xlsx, o link do arquivo no Drive e a pasta onde ficou. Se a pasta do mês ainda não existir, o app cria no mesmo padrão e avisa. A exportação é uma cópia: a fonte continua sendo a aba do mês.

## Conciliação (Fase 2)

Menu **Conciliação** (só a gestão). Confere o que entrou na conta do PagBank contra o que a recepção lançou como **Pix** ou
**cartão** (dinheiro fica só no fechar o dia).

1. **Importar extrato (OFX)**: no PagBank, Extrato → Exportar → OFX. Pode pegar um período longo: o que já foi importado
   não repete. Só as entradas contam; rendimento já entra como "não é paciente".
2. **Importar vendas no cartão (CSV)**: no PagBank, Vendas → Exportar → CSV **detalhado**. Mostra bruto, taxa, líquido e o
   dia em que caiu na conta.
3. Escolha o mês. A tela tem:
   - **Bateu**: Pix com mesmo valor, até 3 dias de diferença e nome que confere (do paciente, de quem pagou, do pagador
     habitual ou do "Nome do pagador como aparece no extrato") já vem marcado. Com aviso, confira antes: nome diferente,
     um Pix pagando vários lançamentos do mesmo pagador, ou venda no cartão maior que o lançamento (acréscimo da
     maquininha). **Confirmar marcados** grava.
   - **No banco, sem lançamento**: escolha o que é (convênio, mensalidade anotada em Mensalistas, mês anterior ao app,
     aluguel de sala, não é paciente, sem lançamento no app) ou ligue a um lançamento da lista de baixo. Pix de convênio
     (nome da lista Convênio) e de profissional (aba Profissionais) já vêm com a sugestão.
   - **Lançado, sem entrar no banco**: lançado como Pix/cartão e pago, mas não está no extrato: confira se foi pago, se a
     forma está certa ou se foi lançado duas vezes, e corrija na Agenda/Registrar.
   - **Vendas no cartão** do mês, com as taxas, e **Já resolvidas**.

Para desfazer uma confirmação: na aba `Extrato bancário` (ou `Vendas no cartão`) volte a Situação para "pendente" e apague
"Ligado a"; na aba do mês, apague a célula da coluna `Conciliado` daquele lançamento.

**Lista "o que é?" (16/10, noite)** — uma lista só, com nomes claros (a planilha grava os mesmos valores de antes):
Sessão/consulta lançada → escolher qual (= conciliado) · Sessão/consulta de antes do app, até agosto (= mês anterior ao app) ·
Sessão/consulta ainda não lançada (= sem lançamento no app: lançar no Registrar) · Mensalidade (= mensalidade anotada em
Mensalistas) · Pagamento do convênio (= convênio (fatura)) · Aluguel de sala · Movimentação financeira (= não é paciente:
resgate, transferência da própria clínica, devolução). Pagador que você sempre resolveu igual (aluguel, movimentação,
convênio) já chega com a mesma sugestão, marcada "(como antes)".

**Pix que paga sessão em aberto (17/10)** — resolve na própria conciliação, num clique (dois, com a confirmação): na faixa da
IA "sessão em aberto", **Registrar pagamento e conciliar**; ou, à mão, "o que é?" → **Sessão/consulta em aberto →** e escolher a
sessão (as do pagador vêm primeiro). O primeiro clique mostra o que vai ser feito; o segundo grava e concilia. O app nunca
recusa por valor:
- Pix **menor** que a sessão: pagamento parcial (o resto continua em aberto).
- Pix **maior**, paciente com mensalidade (fixa ou antecipado): a sobra paga os meses seguintes ainda não pagos — inteiros
  enquanto couber, e o resto como **parte** do próximo mês (ex.: "R$ 150 de R$ 200 de novembro (fica R$ 50)"), pelo mesmo
  registro da Cobrança do mês. Com mensalidade em mais de um profissional, aparece "adiantamento de qual profissional?".
- Pix **maior**, paciente que paga por sessão: a sobra vira **crédito**, anotado sozinho na Observação de cobrança do cadastro
  ("Crédito R$ X (Pix de dd/mm): abater nas próximas sessões; usou tudo, apague esta anotação"), que a recepção vê na hora
  de cobrar. A própria anotação diz o que fazer: a recepção registra a sessão como paga com o crédito e, quando o crédito
  acaba, apaga a anotação (POP da recepção, seção 3). Sessão com "pago com crédito" na Observação não aparece em
  "lançado, sem entrar no banco" (o dinheiro já foi conciliado no Pix original).
Pix com várias partes já registradas em outras telas: "o que é?" → **Sessão/consulta lançada →** aceita **vários
lançamentos**, mostrando a soma contra o valor.

**Busca de paciente** (Pacientes, Ficha, Agenda, Registrar): acha pelo nome do paciente, do pagador habitual, do nome no
extrato e do responsável, e mostra por qual achou; em Pacientes e na Ficha aparecem também os inativos.

**Conciliação assistida (IA, 17/10)** — no card "No banco, sem lançamento":
- **Sugestões fixas**, sem IA: resgate de CDB e transferência da própria clínica = "não é paciente"; entrada com data antes do
  primeiro mês do app (setembro/2026) = "mês anterior ao app". O botão **Confirmar sugestões fixas (n)** salva todas de uma
  vez (dois cliques). Útil pros meses de março a agosto, que vieram no OFX.
- **Sugerir com IA (n)**: manda pro modelo só o que sobrou das regras (até 60 entradas por clique, em lotes de 15) com os
  recebimentos lançados e ainda livres, as mensalidades pagas da aba Mensalistas e as sessões em aberto. Sem CPF, telefone nem
  dígitos de documento. Leva até uns 4 minutos; o custo aparece no aviso e no IA log.
- Cada entrada ganha uma faixa lilás **"IA · confiança …"** com o porquê. **Aceitar** grava igual ao Salvar (na Observação
  fica "IA: …"). "Parece pagar sessões em aberto" não grava nada: registre o pagamento na Ficha e a entrada concilia pela
  regra na próxima vez. **Aceitar as da IA com confiança alta (n)** aceita de uma vez as sem aviso (dois cliques).
- A sugestão fica guardada na coluna `Sugestão IA` da aba do banco (não paga de novo ao reabrir) e é conferida a cada vez:
  se o lançamento sugerido foi conciliado com outra coisa ou a sessão deixou de estar em aberto, ela some.
  **Pedir de novo à IA** refaz as soltas. A IA nunca grava sozinha.

## A receber e perdas (Fase 2)

Menu **A receber** (só a gestão).

- **Em aberto**: todo particular atendido sem pagamento (Pago? vazio, Não ou Parcial), de **todos os meses**, do mais
  antigo para o mais novo, com quantos dias tem. A regra é a mesma do card de Pendências. Clique numa faixa (até 30, 31 a
  60, mais de 60 dias) para filtrar, ou digite o paciente/pagador. O que dá para cobrar, cobre (Cobrança do mês, Ficha).
- **Dar como perdido**: marque as linhas, escreva o motivo (sugestões: glosa do convênio, guia não autorizada, paciente
  não pagou, paciente desistiu, relevado pela gestão) e clique duas vezes. Cada linha fica com Pago? = "Perdido / glosa"
  e "PERDIDO / glosa: motivo" na Observação, como na correção de Pendências.
- **Perdas do ano**: quanto se perdeu por mês (e o % do atendido), por motivo, por convênio e por profissional, e a lista.
  Linhas marcadas direto na planilha sem motivo aparecem como "sem motivo escrito".

## Evolução e saúde financeira (Fase 2, 17/10)

Menu **Evolução** (ou Pendências → Regras e tabelas → "Evolução e saúde financeira", no celular). Só a gestão vê.

- **No topo**: o último mês fechado: receita própria, resultado, resultado sem plantões, cobertura do ponto de equilíbrio
  e pessoal sobre a receita própria, com a seta contra o mês anterior.
- **Gráficos**: receita própria por origem · atendimentos, pacientes únicos e novos · resultado com e sem plantões ·
  despesa por grupo · pessoal ÷ receita própria · cobertura (100% = empata) · retenção (voltou em até 90 e 120 dias) ·
  caixa (patrimônio e acumulador). Passe o mouse (ou toque) num mês para ver os números.
- **Plantões** (Santa Casa e Unimed) ficam num bloco recolhido, fora da operação própria: receita, repasse de 82% e o que
  fica na clínica.
- **Mês a mês**: a tabela com os mesmos números, e "Como ler" com as observações de cada mês.

**De onde vêm os números**
- Dinheiro: aba `Evolução mensal`, uma linha por mês fechado (Jan–Set/26 vieram dos fechamentos 02 a 10). Colunas: receita
  por origem (Particular, Cedplan, Sabin, Aluguel de sala, Outras receitas), plantões (Santa Casa, Unimed), repasses
  (total e dos plantões — vazio = 82% dos plantões), despesa por grupo, Recuperações (negativo, abate do Pessoal),
  Despesa total e Resultado (vazios = o app soma/calcula), patrimônio, acumulador, Sessões fora do sistema, Fonte,
  Conferido (Sim / vazio = "a conferir") e Observação (aparece em "Como ler"). Mês = `MM/AAAA`.
- Cobertura = (receita própria − repasses próprios − 18% de tributo) ÷ despesa; é a régua dos fechamentos.
- Atendimentos: Jan–Ago/26 da aba `Histórico de atendimentos` (exports do ControleOdonto, com o nome do cadastro); de
  setembro em diante, das abas de mês do app (linha "Atendido", sem as linhas de pagamento: Mensalidade de…, Pagamento de…,
  compra de plano, taxa de falta). Paciente novo = primeiro atendimento desde jan/26. Retenção de um mês só aparece depois
  que a janela de 90/120 dias fecha (antes: "em apuração").
- Sessões fora do sistema (ex.: 78 do Sabin em agosto, só no relatório de guias) somam no total de atendimentos do mês,
  mas não em pacientes, novos e retenção.

**Todo mês**: depois do fechamento, acrescente a linha do mês em `Evolução mensal` (copie a linha de cima e troque os
números). Os atendimentos não precisam de nada: o app lê sozinho.

## Parcelamentos (Fase 2)

Ficam na **Ficha do paciente** (card "Parcelamentos"); gestão e recepção criam e recebem.

- **Serviço parcelado** (avaliação etc.): o acordo guarda o total e os vencimentos; cada pagamento vira um lançamento
  "Atendido" com Pago? = Sim no mês do pagamento (como foi feito à mão com o Vitor em 01/09 e 07/10), com "parcela n/N do
  parcelamento P-…" na Observação. As aplicações de teste continuam como estão (Não se aplica).
- **Sessões em aberto** (dívida renegociada): as sessões escolhidas ficam ligadas ao acordo; cada pagamento é abatido
  nelas da mais antiga para a mais nova (Parcial até quitar). Em dia, saem do a receber (Pendências e A receber); com
  parcela vencida, voltam.
- Parcela de serviço parcelado vencida aparece em **A receber → Em aberto**, em "Parcelas vencidas".
- A Conciliação lê cada pagamento anotado numa linha ("Recebido R$ … em … (Pix)") como um recebimento separado, então o
  Pix de uma parcela casa mesmo quando foi abatido em duas sessões.
- Cancelar só muda a Situação para "cancelado" (com o motivo na Observação); nada é apagado.

## Alertas (Fase 2)

Avisos por paciente, na Agenda (etiqueta ao lado do nome, painel e Pendências de hoje) e no topo da Ficha. Os limites
(5 dias depois de cobrar, 30 dias de dívida, 2 faltas em 60 dias, 21 dias sem vir, 14 dias de avaliação parada) estão no
código (`ALERTA_*`, `app/server/server-fase2.js`); para mudar, peça. "Sem celular" aparece só no painel e na Ficha.

## Rotina mensal

1. Últimos dias do mês: Gestão → criar aba do mês seguinte e as colunas em Mensalistas.
2. Dia 1: conferir se o Atendimento mostra a aba nova no topo.
3. Durante o mês: Gestão → pendências de pagamento e NF; Mensalistas → quem está pendente/atrasado (a recepção já vê o aviso ao atender).
4. Fechamento: Conciliação do mês (extrato e vendas no cartão do PagBank); depois Gestão → exportar o mês pro Financeiro / contabilidade.
5. Fechamento pronto (arquivo NN_FECHAMENTO): uma linha nova na aba `Evolução mensal` com os números dele (ver "Evolução e saúde financeira").

## Virada de 01/11 (modelo antecipado)

A data está no servidor (`VIRADA: 2026-11-01`). A partir dela: mensalidade do próprio mês, vence dia 10, tolerância até 15, do dia 16 o app mostra "Não atender — chamar a gestão" (aviso, não bloqueio). Checklist da virada:
- trocar o rótulo de `Listas!B` "Mensalista (paga no mês seguinte)" pelo novo (decisão 7.7 do plano);
- criar a aba Novembro e as colunas NOVEMBRO em Mensalistas (pelo app);
- o "resto de outubro" dos mensalistas do modelo antigo entra como linha separada na aba do mês, com a anotação na coluna Data.

## Modalidades (decisão 05/10)

A modalidade diz **como** o paciente paga; o valor fica onde já fica: na compra do plano (aba `Planos`) ou na coluna "Valor mensal" de `Mensalistas`. Lista em `Listas!H`: Consulta individual · Consulta individual – cartão de parceria · Plano de 4 consultas · Plano de 6 consultas · Plano de 12 consultas · Mensalidade fixa · Mensal (valor especial) · AAPI JF (mensal) · Convênio · Por sessão · Pro bono · Permuta.

O valor combinado de cada paciente fica em `Pacientes!N` ("Valor combinado / observação de modalidade"): **o primeiro "R$" do campo é o que o app usa** pra sugerir o valor do plano. Padrão: `Plano de 4 consultas: R$ 280 por plano (…)`, `Mensalidade fixa: R$ 200/mês, …`. Mudança de valor (ex.: os quatro que passam a R$ 250 em fev/2027) = editar esse campo e a coluna de `Mensalistas`.

## Planos de consultas (regras em vigor, decisão 7.8 + 05/10)

Atendido e falta sem aviso consomem consulta; desmarcou com antecedência não consome até 1 por mês (a 2ª consome); faltou em cima da hora consome; cancelado pela clínica não consome. Validade a partir da compra: **2 meses** (plano de 4), 3 meses (plano de 6) e **6 meses** (plano de 12). Vencido, as consultas restantes aparecem como vencidas e você decide. Sessão extra liberada: Pago? "Plano já pago", não consome, aparece no cartão da Gestão. Quem era "pacote mensal" paga outubro pela aba Mensalistas (modelo antigo) e, a partir de novembro, compra planos de 4 consultas pelo Atendimento; a linha deles em Mensalistas pode sair depois de outubro quitado.

## Se algo der errado

- **Erro na tela**: a mensagem vem com o texto do Apps Script. Abra a planilha → Extensões → Apps Script → Execuções pra ver o detalhe.
- **Exportar diz que não conseguiu usar a pasta do Drive**: o carregador (`Código.gs`) está numa versão antiga, sem a permissão do Drive. Siga `COMO-INSTALAR.md` › "Quando eu atualizar o app" (colar o `dist/Code.gs` novo e publicar nova versão). Enquanto isso o arquivo fica na raiz do Meu Drive.
- **App não carrega / tela em branco**: o código fica na planilha "Recepção Nascente — código do app (não mexer)", aba `arquivos`. Não edite essa planilha. Se alguém mexeu, me avise.
- **Alguém inseriu linha no meio da aba do mês**: o app localiza linhas pelo ID, então não grava em cima da linha errada. Mas as colunas automáticas da planilha podem precisar de conferência.
- **Precisa tirar um registro**: não apague a linha. Troque "O que aconteceu" pra "Cancelado pela clínica" e anote o motivo na Observação.


## Uso da IA (guias lidas do Drive) — 16/10

- **Pendências → card "Uso da IA este mês"**: quanto gastou (US$) do teto do mês e do dia, botão **Pausar tudo / Reativar**
  (grava na aba `IA`, sem abrir a planilha), um botão por item (Guias · Conciliação · Perguntar), **Ler guias agora** (escolha
  o mês) e **Instalar gatilho diário** (hora na aba `IA`, padrão 19h). Aos 80 % do teto o card fica amarelo e chega um e-mail;
  em 100 % a IA para sozinha. Pausar não perde nada: as guias ficam na pasta e são lidas quando reativar.
- **Mudar teto** (no mesmo card): teto do mês em US$ (1 a 500), gravado na aba `IA` e no IA log. Desde 17/10: **US$ 10/mês**
  e modelo **Sonnet 5.5** (gestão, 16/10). O custo no log segue o preço do modelo que respondeu (tabela no código).
- **Aba `IA`**: modelo, tetos, hora do gatilho, instrução que o modelo recebe (uma por item: guias, conciliação). **Aba `IA log`**: cada chamada com tokens e
  custo. **Aba `Guias lidas`**: o que foi lido de cada arquivo e a sugestão.
- **Pendências → "Guias a conferir"**: guias sem atendimento registrado, com leitura em dúvida ou que não pareceram guia.
  Na lista "Convênio sem guia assinada", a coluna **"PDF na pasta?"**: sim sem linha casada = problema de nome ou data;
  não = a guia não foi digitalizada.
- A recepção confirma as guias lidas no **Meu dia** (card "Guias lidas ontem"); a gestão também pode.
