# Migração Modalidade + Regra → Cobrança + Pagamento — relatório (SIMULAÇÃO, nada gravado)

Lido da planilha real em 08/10/2026 (Pacientes, 530 linhas; Mensalistas, 43 linhas). Pedido da gestão de 07/10.

## Contagem por caso

| Hoje | Vira | Qtde |
|---|---|---|
| Por sessão com "R$ X por sessão" | Por sessão (combinado) · X/sessão · Na sessão | 7 |
| Por sessão sem valor | Tabela · Na sessão | 2 |
| Pagamento posterior com "R$ X por sessão" | Por sessão (combinado) · X/sessão · Posterior | 15 (+ Naimara, ver decisões) |
| Pagamento posterior com R$/mês | Mensalidade · Posterior | 0 |
| Pagamento antecipado | — | 0 |
| Mensalidade social | Mensalidade social · Posterior | 21 |
| Mensal (valor especial) | Mensalidade · 150/250 por mês · Posterior | 3 |
| Convênio | Convênio · Posterior | 34 |
| Pro bono / Permuta | Pro bono / Permuta · Não se aplica | 8 / 5 |
| Em branco | em branco (= Tabela, aviso "completar cadastro") · Na sessão | 434 |
| Regra fora do padrão ("Paga o que consegue", "Valor fixo combinado") | — | 0 |

Nenhum caso de convênio sem convênio, nem de convênio de plano com modalidade particular.

## Listas

- Por sessão (combinado) · Na sessão: Diogo Gustavo Ovidio de Paula 90 · Inglidy Fagundes Cassemiro 60 · Isaac Oliveira Santos 120 · Lays Xavier Salge 25 · Luccas Gabriel Fagundes Cassemiro 60 · Michele Silva de Almeida Mendes 120 · Victor de Souza Richarti 70
- Tabela · Na sessão: Francisco Luiz Freitas do Couto · Marcos Batista Gomes
- Por sessão (combinado) · Posterior: Cristina de Andrade 70 · Daniela Gomes da Silveira 80 · Davi Maia Marques 80 · Elisa Figueiredo Vieira Arcanjo 100 · Esther Piconcelli Possidonio 80 · Fernanda dos Reis 70 · Julia Nascimento Monteiro Pereira 70 · Lara Vitoria Pacheco Rodrigues 70 · Luan Franzoni Beccari 70 · Lucila de Assis Silva 70 · Mariana Aparecida de Oliveira 85 · Paulo Henrique Ribeiro Costa 70 · Paulo Henrique Souza e Silva 70 · Roberta Gray de Souza Leal 95 · Sarah Vieira Lop 85
- Mensalidade · Posterior: Matheus Borchert de Almeida 150 · Miguel Borchert de Almeida 150 · Oziel Martins Palacio Abreu 250
- Mensalidade social · Posterior (revisar): Adirlene, Ana Júlia, Ana Lucia, Angela Maria, Anthony, Bernardo, Eloa, Gabriel Pinheiro, Gabriel Rodrigues, Helena Siqueira, Igor, Isabella Araújo, Lucas Adryan, Maria Clara, Maria Eduarda Alves, Maria Eduarda Torres, Rafaella, Sthefany, Wayllon, Yahn, Samantha
- Pro bono: Aline Rezende, Ana Luiza Oliveira, Arima, Beatriz Botelho Del'duca, Erica (até 31/10), Heitor Fortunato, Michelle Rose, Pâmela · Permuta: Clarice, Daniel Alcici, João Victor, Michelle Soares Alcici, Vinicius Elias
- Convênio (34): Sabin Sinai 20, Cedplan 13, IPSM 1 (João Pedro Netto Luiz)

## Decidir com a gestão

1. Naimara Paula Sa da Silva: Pagamento posterior com valor "a definir pela gestão" (o texto antigo cita "quinzenal R$ 120/sessão"). Proposta: Por sessão (combinado) R$ 120 · Posterior, ou outro valor.
2. Aba Mensalistas, quem sai: 16 linhas de ex-plano ("Plano de 4 consultas · mensalista só até outubro") e a da Lays têm o histórico de setembro (quem pagou, NF). Regra do projeto: nunca apagar linha. Proposta: as linhas ficam na aba, mas somem da tela Mensalistas (o app só mostra quem tem Cobrança = Mensalidade/Mensalidade social).
3. Divergências coluna C × cadastro: nenhuma nos mensalistas que ficam (21 × R$ 200; Borchert 150/150; Oziel 250). Erica: C = 0 e cadastro Pro bono até 31/10 → fora da tela até virar Mensalidade social em 01/11. Lucas Adryan: R$ 200 "a confirmar". Alice Oliveira Mendes de Souza: está em Mensalistas (R$ 150) mas ainda não em Pacientes; Julia Borrajo Xavier também não cadastrada.
4. Histórico do Valor combinado: o pedido manda o texto antigo ("Antes: Plano de 4 consultas…") para a Observação de cobrança. Essa observação aparece em destaque pra recepção no Registrar, na Agenda e na coluna "⚠ Atenção na cobrança (auto)" das abas de mês; em ~95 cadastros viraria um parágrafo longo de histórico na hora de cobrar. Proposta: guardar o histórico numa coluna nova "Histórico de cobrança (antigo)" (não aparece pra recepção) e deixar a Observação só com o que a recepção precisa.

## Onde cada campo fica na planilha (proposta)

- Coluna F ("Modalidade") passa a ser **Cobrança** (mesmo lugar: a coluna "Modalidade (auto)" das abas de mês continua puxando dela).
- Colunas novas no fim de Pacientes: **Valor combinado (R$)** (número), **Unidade** (por sessão / por mês), **Pagamento**.
- Coluna R ("Regra de cobrança") esvaziada depois do backup (assim a coluna "⚠ Atenção na cobrança (auto)" mostra só a Observação).
- Backup: aba `_migracao_07-10` com nome, Modalidade, Regra e Valor combinado antigos de todos os cadastros, mantida 30 dias.
- Listas: colunas novas Cobrança / Pagamento / Unidade; a validação das colunas F e da nova Pagamento passa a usar essas listas.
