# Recepção Nascente — guia da gestão

Complemento do `README-RECEPCAO.md` (a gestão usa tudo o que a recepção usa, mais a tela **Gestão**). Instalação e endereço: `COMO-INSTALAR.md`. Decisões e detalhes técnicos: `PLANO-IMPLEMENTACAO.md`.

## Quem é gestão

Perfil decidido pelo e-mail logado: `administrativo@clinicanascente.com.br` mais os e-mails listados na coluna **Gestão** da aba `Listas`. Pra dar acesso a alguém, acrescente o e-mail nessa coluna; pra tirar, apague. Só a gestão vê a tela Gestão, cria aba de mês, cria colunas em Mensalistas e exporta.

## O que o app grava e onde

| Aba | O que o app faz |
|---|---|
| `Pacientes` | acrescenta linha (Novo paciente); atualiza só as células alteradas no Editar cadastro; carimbo em `Registrado por (app)` |
| aba do mês (`Outubro`, `Novembro`…) | acrescenta linha por atendimento, falta, compra de pacote e mensalidade recebida; colunas U `Registrado por (app)` e V `Pacote (ID)` no fim. **Nunca escreve nas colunas automáticas F, G, H, N** nem na linha 2 |
| `Mensalistas` | marca "Sim" no par "MÊS — pago?" e escreve a anotação na coluna "Data" (data, valor, forma, quem, NF, "app"); uma anotação anterior que não seja data é preservada como "antes: …" |
| `Pacotes` | um pacote por linha (compra, validade, sessões, status ativo/encerrado/vencido) |
| `Agenda recorrente` | horários fixos; edição "a partir de hoje" encerra a linha antiga e cria outra |
| `Lista do dia` | acréscimos do dia, confirmações, não vem, remarcações e **removidos** (Origem "Removido · motivo") |
| `Alterações de cadastro` | uma linha por campo alterado no Editar cadastro (de, para, quem informou, quem gravou) |

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

Botões:
- **Criar aba de <mês seguinte>**: duplica a estrutura da aba corrente (cabeçalho, fórmulas automáticas, validações) sem os dados. Pede dois cliques. Faça na última semana do mês.
- **Criar colunas de <mês seguinte> em Mensalistas**: acrescenta o par "MÊS — pago?" e "Data" no fim. Dois cliques.
- **Exportar <mês> (.xlsx)**: grava uma planilha só com os valores da aba do mês na pasta do Drive **Clínica Nascente / Controle Financeiro / <ano> / <MM Mês_AA> / 2_Atendimentos** (ex.: `2026/10 Out_26/2_Atendimentos`), com o nome **`OUT 26 - Recepção atendimentos (app)`** (padrão `MMM AA - Descrição`). Exportar de novo o mesmo mês **sobrescreve** esse arquivo, então há sempre uma cópia por mês, a mais recente. A tela mostra o link pra baixar o .xlsx, o link do arquivo no Drive e a pasta onde ficou. Se a pasta do mês ainda não existir, o app cria no mesmo padrão e avisa. A exportação é uma cópia: a fonte continua sendo a aba do mês.

## Rotina mensal

1. Últimos dias do mês: Gestão → criar aba do mês seguinte e as colunas em Mensalistas.
2. Dia 1: conferir se o Atendimento mostra a aba nova no topo.
3. Durante o mês: Gestão → pendências de pagamento e NF; Mensalistas → quem está pendente/atrasado (a recepção já vê o aviso ao atender).
4. Fechamento: Gestão → exportar o mês pro Financeiro / contabilidade.

## Virada de 01/11 (modelo antecipado)

A data está no servidor (`VIRADA: 2026-11-01`). A partir dela: mensalidade do próprio mês, vence dia 10, tolerância até 15, do dia 16 o app mostra "Não atender — chamar a gestão" (aviso, não bloqueio). Checklist da virada:
- trocar o rótulo de `Listas!B` "Mensalista (paga no mês seguinte)" pelo novo (decisão 7.7 do plano);
- criar a aba Novembro e as colunas NOVEMBRO em Mensalistas (pelo app);
- o "resto de outubro" dos mensalistas do modelo antigo entra como linha separada na aba do mês, com a anotação na coluna Data.

## Pacotes (regras em vigor, decisão 7.8)

Atendido e falta sem aviso consomem sessão; desmarcou com antecedência não consome até 1 por mês (a 2ª consome); faltou em cima da hora consome; cancelado pela clínica não consome. Validade: 8 semanas (pacote de 4) e 24 semanas (pacote de 12) a partir da compra. Vencido, as sessões restantes aparecem como vencidas e você decide. Sessão extra liberada: Pago? "Pacote já pago", não consome, aparece no cartão da Gestão.

## Se algo der errado

- **Erro na tela**: a mensagem vem com o texto do Apps Script. Abra a planilha → Extensões → Apps Script → Execuções pra ver o detalhe.
- **Exportar diz que não conseguiu usar a pasta do Drive**: o carregador (`Código.gs`) está numa versão antiga, sem a permissão do Drive. Siga `COMO-INSTALAR.md` › "Quando eu atualizar o app" (colar o `dist/Code.gs` novo e publicar nova versão). Enquanto isso o arquivo fica na raiz do Meu Drive.
- **App não carrega / tela em branco**: o código fica na planilha "Recepção Nascente — código do app (não mexer)", aba `arquivos`. Não edite essa planilha. Se alguém mexeu, me avise.
- **Alguém inseriu linha no meio da aba do mês**: o app localiza linhas pelo ID, então não grava em cima da linha errada. Mas as colunas automáticas da planilha podem precisar de conferência.
- **Precisa tirar um registro**: não apague a linha. Troque "O que aconteceu" pra "Cancelado pela clínica" e anote o motivo na Observação.
