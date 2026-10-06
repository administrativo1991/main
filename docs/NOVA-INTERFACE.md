# Nova interface (06/10/2026) — como está organizada

Porte visual dos 6 mockups aprovados pela Roberta (pasta "Recepção Nascente — nova interface" no Drive: `Main`, `Atendimento`, `NovoPaciente`, `Mensalistas`, `Gestao`, `Celular` `.dc.html`, mais `logo-h.svg` e `simbolo.svg`). Nenhuma função do servidor (`app/server/*.js`), leitura/escrita na planilha ou regra de negócio mudou: só HTML, CSS e o JavaScript de tela. Os dados enviados a cada função do servidor são os mesmos de antes, campo a campo.

## Arquivos (um `Styles`, um layout, um arquivo por tela)

| Arquivo | O que é |
|---|---|
| `app/client/index.tpl.html` | esqueleto da página (head, fontes Poppins/Mulish, marcadores) |
| `app/client/styles.css` | a folha única: tokens da identidade, componentes, impressão, celular |
| `app/client/layout.html` | cabeçalho (logo inline, menu de 5 itens, Imprimir, chip do perfil), barra inferior do celular, toast |
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
