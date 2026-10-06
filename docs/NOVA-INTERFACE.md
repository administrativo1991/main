# Nova interface (06/10/2026) — como está organizada

> **Revisão de 06/10 (noite)** — nota revisada da Roberta: menu lateral de 220 px em todas as telas, tela Hoje em
> tabela com painel do paciente à direita, sem o estado "Em atendimento". A tela Hoje foi refeita e publicada na
> versão de teste (`arquivos`); as outras telas seguem o mesmo layout e serão revistas uma a uma
> (Registrar → Pacientes → Mensalistas → Gestão), publicando depois de cada uma. Detalhes na seção
> "Revisão 06/10: menu lateral e tela Hoje em tabela", no fim deste arquivo.

Porte visual dos 6 mockups aprovados pela Roberta (pasta "Recepção Nascente — nova interface" no Drive: `Main`, `Atendimento`, `NovoPaciente`, `Mensalistas`, `Gestao`, `Celular` `.dc.html`, mais `logo-h.svg` e `simbolo.svg`). Nenhuma função do servidor (`app/server/*.js`), leitura/escrita na planilha ou regra de negócio mudou: só HTML, CSS e o JavaScript de tela. Os dados enviados a cada função do servidor são os mesmos de antes, campo a campo.

## Arquivos (um `Styles`, um layout, um arquivo por tela)

| Arquivo | O que é |
|---|---|
| `app/client/index.tpl.html` | esqueleto da página (head, fontes Poppins/Mulish, marcadores) |
| `app/client/styles.css` | a folha única: tokens da identidade, componentes, impressão, celular |
| `app/client/layout.html` | menu lateral de 220 px (logo, 5 itens com ícone, chip do perfil embaixo), cabeçalho do celular (símbolo + título + inicial), barra inferior do celular, toast |
| `app/client/telas/10-hoje.html` … `50-gestao.html` | a estrutura de cada tela, só HTML |
| `app/client/js/00-base.js` | ponte com o Apps Script, simulação local, utilitários, leitura das regras do cadastro (reaproveitado do app anterior), navegação |
| `app/client/js/10-hoje.js` … `50-gestao.js` | o JavaScript de cada tela; `90-boot.js` arranca |
| `app/client/assets/*.svg` | logo horizontal e símbolo, embutidos pelo build |
| `build.js` | junta tudo em `dist/index.html` (simulação) e `dist/index.publicado.html` (planilha), e corta os pedaços |

O carregador na planilha continua lendo um único `index.html`: o build monta esse arquivo a partir das partes. Em `dist/` fica a cópia pra simulação (abre direto no navegador, com dados falsos) e a cópia publicada (sem a simulação e sem indentação, 16 pedaços).

## O que foi reaproveitado do JavaScript anterior

Toda a lógica que decide o que vai pra planilha: ponte `call()`, módulo de duplicatas, máscaras e formatos, `derivarProc` (procedimento pela modalidade), `aplicarRegra` (Pago?, valor, forma e NF por regra de cobrança), planos (`pacoteInfoMod`, lançar plano, sessão extra), desconto com motivo, pagador diferente, situação de mensalista, `dadosAt` (payload do atendimento), validações, `lerCadastro`/`atualizarCadastro`, `registrarMensalidade`, gestão (`gestaoResumo`, criar aba, colunas, exportar). Mudou só a camada de renderização e a ligação com os novos elementos.

## Decisões e limites que valem conferir no teste

- **"Chegou"** não existe no servidor e a instrução era não mexer nele: é uma marcação local (localStorage, por dia) do computador da recepção, só pra organizar a fila. O que vai pra planilha continua sendo o registro do atendimento. O mesmo vale pro checklist **Fim do dia** e pro **Fechar o dia**.
- **Lembrete da gestão** (card pêssego da tela Hoje): desde 06/10 vem da aba `Lembretes` da planilha (função `salvarLembrete` e campo `lembrete` do `bootstrap`). A gestão escreve na tela Gestão; vale o último lembrete com texto e dentro do prazo; nunca se apaga linha, os anteriores ficam como histórico.
- **Resumo de hoje**: `listaDoDia` não devolve valores pagos; pra recepção mostra registrados, na recepção, aguardando e não vêm. Pra gestão mostra também NF pendente e guia a emitir do dia (filtrando o `gestaoResumo` do mês). "Recebido" do dia precisaria de servidor.
- **Gestão**: o 5º indicador é "convênio sem guia" (contagem), porque `gestaoResumo` não devolve o total a faturar. A 5ª pendência é "Pagou outra pessoa — conferir o nome na NF" (lista que já existia); "observações da recepção pra promover ao cadastro" com botão Aceitar precisa de função nova no servidor.
- **Pacientes**: Novo paciente e Editar cadastro viraram uma tela com alternância no topo. Pra recepção, as modalidades restritas (Mensalidade fixa, Mensal (valor especial), AAPI JF, Pro bono, Permuta) aparecem num cartão trancado, e Regra/Observação de cobrança não existem na tela (como o mockup pede). Pra gestão, viram cartões reais e os campos aparecem; no Novo paciente eles são gravados logo depois do cadastro pela mesma função do Editar (`atualizarCadastro`), porque `criarPaciente` não os recebe. Os valores dos cartões vêm da aba Procedimentos (pelo profissional escolhido) e da lista de modalidades; nada no HTML.
- **Registrar**: "Pago?" aparece como Sim/Não; as outras opções da planilha (Convênio, Plano já pago, Não se aplica) são preenchidas pela regra e explicadas pelas faixas; "outra opção" abre a lista completa. "NF emitida?" Sim/Depois grava Sim/Não. A faixa vermelha de mensalidade atrasada esconde o passo 3 (o app avisa, nunca bloqueia). "Cobrar mesmo assim" no pro bono libera o passo 3.
- **Chip do usuário** mostra o perfil (Recepção · recepção / Gestão · gestão), não o nome da recepcionista; o e-mail logado fica no tooltip e continua indo pra planilha no "Registrado por (app)".
- **Logo**: `logo-h.svg` vem com o texto branco (feito pra fundo roxo); no cabeçalho branco o texto é pintado de roxo pelo build (`currentColor`), o símbolo continua pêssego.

## Como testar

`node build.js && node tests/duplicatas.test.js`; abrir `dist/index.html` no navegador (perfil gestão simulado). O roteiro Playwright usado no desenvolvimento (fluxo completo + prints em 1280 e 390 px) fica fora do repositório, no scratchpad da sessão.

## Revisão 06/10: menu lateral e tela Hoje em tabela

Fonte: `Main.dc.html` e `Celular.dc.html` revisados (13:01 de 06/10) e a nota "Prompt pro Claude Code — nova interface",
versão revisada em 06/10. Nenhuma gravação no servidor mudou; os dados enviados ao servidor são os mesmos
(`listaDoDia`, `confirmar`, `acrescentarAoDia`, `remarcar`, `removerDoDia`, `registrarAtendimento` para "não vem",
`agendaFixa`/`salvarAgendaFixa`, `gestaoResumo` só pra gestão). A única mudança no servidor, aprovada pela Roberta
em 06/10 ("ok, pode fazer"), é **só de leitura**: `listaDoDia` passou a devolver, no `registro` de quem já foi
registrado no dia, o que a própria linha da aba do mês já tem (Valor, Pago?, Forma, NF, Guia, Convênio (auto)).
Nada a mais é gravado.

### Estrutura comum (todas as telas)

- `.app` é uma linha flex: `nav.lado` (220 px, branco, fixo na rolagem) + `.conteudo` (cabeçalho do celular + `main`).
- Menu: Hoje · Registrar · Pacientes · Mensalistas · Gestão (só gestão), item ativo com fundo lavanda e texto roxo;
  embaixo, o chip do perfil ("Recepção · recepção" / "Gestão · gestão"). Os botões Imprimir ficam no cabeçalho de cada
  tela, como nos mockups (Hoje, Mensalistas "Imprimir lista de cobrança", Gestão "Imprimir pendências"); no celular não aparecem.
- ≤ 480 px: o menu some, aparece o cabeçalho do celular (símbolo, título da tela, inicial) e a barra inferior com 4 ícones.
- As telas Registrar, Pacientes, Mensalistas e Gestão não mudaram por dentro: só passaram a viver à direita do menu.
  Cada uma foi conferida contra o `.dc.html` revisado de 06/10 (texto visível e estrutura): a diferença é só o menu lateral.
- Telas em coluna (Mensalistas, Gestão): os filhos esticam a largura toda (`.tela.coluna{align-items:stretch}`); sem isso,
  no celular a tabela de Mensalistas alargava a página inteira em vez de rolar dentro do próprio card.

### Tela Hoje (`telas/10-hoje.html`, `js/10-hoje.js`)

- **Barra de ferramentas**: ‹ data › (o texto da data abre o calendário) · botão "Hoje" · select de profissional
  (preenchido com quem tem paciente no dia) · busca por nome **ou pagador** (sem acento) · Imprimir · primário "+ Encaixe no dia".
  "Agenda recorrente" virou um link discreto no rodapé da tabela.
- **Tiles-filtro** com contagem (na lista · aguardando · chegou · registrados · não vem). "Aguardando" soma os "a confirmar";
  clicar de novo no tile volta a "na lista". **Tiles de resumo** (recepção e gestão, só do dia aberto, calculados das linhas
  já registradas que `listaDoDia` devolve): R$ recebido hoje (Pago? = Sim), R$ a receber hoje (particular com Pago? vazio
  ou Não, fora mensalidade/pacote/convênio), NF a emitir hoje (Pago? Sim e NF nem Sim nem "Não se aplica") e guia a emitir hoje
  (convênio com Guia ≠ Sim). Pra gestão, os dois últimos levam à tela Gestão; pra recepção só informam.
  Decisão da Roberta (06/10): a recepção vê os valores do dia porque é quem mexe com o dinheiro; o que continua só da gestão
  é o resumo do mês (`gestaoResumo`).
- **Tabela**: Hora · Paciente (nome + idade, ou "adulto") · Profissional · modalidade · Cobrança (as etiquetas de `tagsDe`:
  regra laranja, mensalidade, plano, pro bono, convênio; depois de registrado, o convênio vira "Guia assinada" verde ou
  "Guia a emitir" amarela, conforme a coluna Guia da linha) · Situação (pill) · um botão de ação pela situação
  (A confirmar → Confirmou · Aguardando → Chegou · Chegou → Registrar atendimento · Não vem → Remarcar · registrado → Ver registro) + ⋯.
  Quem chegou e não foi registrado: fundo `#F8F5FA` e barra roxa de 4 px; atendido e não vem com opacidade .7, não vem riscado.
  Até 1400 px de largura (o computador de 13" da recepção), a coluna Profissional · modalidade vai pra baixo do nome.
- **Painel do paciente** (coluna branca de 360 px à direita; folha que sobe de baixo no celular): abre ao clicar na linha.
  Inicial, nome, idade · nascimento · pagador; Hoje (hora · tipo), Profissional, Modalidade, Convênio; bloco ⚠ Atenção na cobrança
  (laranja) quando há regra/observação; etiquetas; 4 botões de situação (Confirmou · Chegou hh:mm · Não vem hoje · Remarcar) com o atual
  marcado; botão grande "Registrar atendimento →" (abre a tela 2 preenchida); links "Ver cadastro" e "Remover da lista".
  Quando o paciente já foi registrado, o painel mostra o resumo do registro (procedimento, valor, Pago?/forma, NF, guia).
  Os formulários de "não vem", "remarcar" e "remover" agora abrem dentro do painel. Sem linha selecionada, o painel mostra o resumo do dia.
- **Abaixo da tabela**: "Pendências de hoje" (linhas clicáveis: mensalista de hoje com mês em aberto → Mensalistas; cadastro sem
  modalidade → Pacientes; paciente fora de Pacientes; e, pra gestão, guia a emitir hoje, NF a emitir hoje/ontem, particular sem Pago? → Gestão)
  e "Fim do dia" (os 4 itens de antes, anotação local deste computador).
- O lembrete da gestão virou uma faixa pêssego acima da tabela (assim aparece também no celular).
- Impressão: só o título "Lista do dia · data" e a tabela sem a coluna de ação; sem CPF.

### Limites desta rodada

- O que a tela Hoje mostra de dinheiro é só o dia aberto e só o que já foi gravado na linha do mês (leitura nova em
  `listaDoDia`, nenhuma gravação). O resumo do mês continua só pra gestão (`gestaoResumo`).
- "Guia assinada / a emitir" só aparece depois de registrar: antes não há como saber (a guia se marca no registro).
- "Últimos 3 atendimentos" do painel do paciente precisaria de outra leitura nova (histórico por paciente); ficou de fora.
- "Editar horário" no menu ⋯ não existe (não há função pra isso; horário fixo se muda na Agenda recorrente).
- Registrar, Pacientes, Mensalistas e Gestão foram conferidas contra os `.dc.html` revisados: por dentro são iguais aos
  mockups anteriores, só ganharam o menu lateral. Nomes e valores das modalidades continuam vindo da planilha (o mockup
  usa nomes ilustrativos como "Pacote mensal"; o app mostra os da aba Listas, como "Plano de 4 consultas").
- No celular (≤ 480 px), Mensalistas vira cards, como a lista do dia: nome + horário, valor em destaque, plano, pagador,
  pill do mês, caixa da 5ª semana e o botão da linha na largura toda (atrasado com fundo rosado). Só CSS e classes nas
  células (`table.mens`, `.td-*`); o rótulo "Pagador:" usa `.so-tel`, visível só no celular. No computador a tabela não muda.
  Escolha da Roberta em 06/10, depois de ver o protótipo.
