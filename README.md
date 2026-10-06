# Recepção Nascente

App web interno da recepção e da gestão da Clínica Nascente. Roda como **Google Apps Script** em cima da planilha
"Controle da Recepção 2026" e grava direto nela: registro do atendimento e do recebimento, lista do dia, cadastro de
pacientes, mensalistas, pendências do mês. Nada é apagado na planilha; toda gravação leva "Registrado por (app)".

## Comece por aqui

| Quero… | Leia |
|---|---|
| Saber o que está no ar e o que mudou em cada publicação | **`docs/DEPLOYS.md`** (registro por data; seção "No ar agora") |
| Retomar o trabalho num chat novo | `docs/ESTADO-ATUAL.md` |
| Usar o app (recepção) | `docs/README-RECEPCAO.md` |
| Usar a tela Gestão | `docs/README-GESTAO.md` |
| Instalar ou reimplantar o carregador no Apps Script | `docs/COMO-INSTALAR.md` |
| Entender decisões, regras de cobrança e como publicar | `docs/PLANO-IMPLEMENTACAO.md` (seção 10: publicação) |
| Ver como a interface revisada foi feita | `docs/NOVA-INTERFACE.md` |
| Ver o que foi feito na passagem para a planilha real | `docs/MIGRACAO-REAL-2026-10-06.md` |

## Estrutura

```
app/
  server/server.js       funções do servidor (API chamada pela tela); termina com a expressão `API`
  server/duplicatas.js   checagem de duplicata de paciente (compartilhado com a tela; testes em tests/)
  client/                tela: styles.css, layout.html, telas/*.html, js/*.js, assets/*.svg, index.tpl.html
  loader/Code.gs         carregador colado no Apps Script (lê o código da planilha de código)
  config.json            ids das planilhas e URLs dos apps (teste e real)
build.js                 monta dist/ a partir de app/
dist/                    gerado: index.html (simulação local), index.publicado.html, server.js, pedacos.json,
                         Code.gs (teste) e Code.real.gs (real)
tests/duplicatas.test.js
docs/                    documentação (tabela acima)
```

## Como funciona a publicação

O Apps Script de cada planilha contém só o carregador. O código do app fica na planilha
"Recepção Nascente — código do app (não mexer)", em pedaços de até 12.000 caracteres, uma linha por pedaço
(colunas arquivo · parte · conteúdo). Há dois canais:

- aba `arquivos` → lida pela **CÓPIA TESTE** (onde tudo é testado e aprovado pela gestão);
- aba `arquivos_real` → lida pela **planilha real** (recepção e gestão no dia a dia).

Fluxo: editar `app/` → `node build.js` → `node tests/duplicatas.test.js` → testar `dist/index.html` no navegador
(simulação, sem Google) → gravar as peças de `dist/pedacos.json` em `arquivos` → ler de volta e conferir → aprovação na
cópia → regravar em `arquivos_real` as linhas que diferem → ler de volta e conferir → **registrar em `docs/DEPLOYS.md`**.
Detalhes e armadilhas (ex.: a planilha apaga apóstrofo no início da célula) na seção 10 do plano.

## Comandos

```
node build.js                  # gera dist/ e imprime a lista de pedaços com tamanhos
node tests/duplicatas.test.js  # testes da checagem de duplicatas
```

## Regras fixas

- Nunca migrar ou duplicar dados; só acrescentar linhas ou atualizar células. Nunca apagar linha (marca "Removido").
- Nunca escrever nas colunas automáticas das abas de mês (F, G, H, N) nem limpar a linha 2.
- Achar colunas pelo cabeçalho, nunca pela posição.
- Preços só nas abas editáveis (Procedimentos, Pacientes, Mensalistas), nunca no código.
- Toda gravação leva "Registrado por (app)" = e-mail · dd/MM/yyyy HH:mm. Textos em pt-BR, datas dd/mm/aaaa, R$.
- Mudança em função do servidor só com aprovação da gestão; publicar sempre em `arquivos` primeiro.
- Nenhum dado de paciente real nos documentos do repositório.
