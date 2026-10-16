# Estado atual do app — retomar daqui

Atualizado em 16/10/2026 (A receber, perdas e parcelamentos na real). Ao abrir um chat novo, leia nesta ordem:

1. **`docs/DEPLOYS.md`**, seção "No ar agora": o que roda em cada canal (teste e real), com commit e linhas da planilha de código.
2. **`NOTAS-fase1.md`** (raiz): o modelo de cobrança da Fase 1, as decisões da gestão, o que falta e o que a gestão precisa olhar.
3. **`NOTAS-fase2.md`** (raiz): a Fase 2 em andamento (ordem dos itens, decisões, o que está no teste).
4. Este arquivo: o mapa do projeto.

O histórico deste arquivo até 08/10 (planos, pacotes, Mensalistas como tela) está no git. Aquele modelo saiu do app em 15/10.

## O que é

App web **Recepção Nascente** (Google Apps Script) sobre a planilha **"Controle da Recepção 2026"** (real,
id `1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs`), com uma **CÓPIA TESTE** (id `1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk`)
pra testar antes. O código fica numa terceira planilha, **"Recepção Nascente — código do app (não mexer)"**
(id `1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo`): aba `arquivos` = canal de teste (lido pela cópia), aba `arquivos_real`
= canal real. O carregador (`app/loader/Code.gs`) lê as peças das colunas A–C e ignora as linhas com prefixo (`novo:`, `antigo…:`).

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Servidor | `app/server/server.js` + `app/server/server-cobranca.js` (Fase 1) + `app/server/server-fase2.js` (Fase 2), os três no mesmo escopo, + `app/server/duplicatas.js` |
| Regra de cobrança (servidor e tela) | `app/shared/cobranca.js`: a única fonte das frases do bloco "O que fazer agora" |
| Tela | `app/client/` (`layout.html`, `telas/*.html`, `js/00-base.js … 90-boot.js`, `styles.css`) |
| Build | `node build.js` → `dist/index.html` (simulação local, dados falsos), `dist/pedacos.json` (peças ≤ 12.000 caracteres), `dist/Code.gs` / `dist/Code.real.gs` |
| Testes | `for t in tests/*.test.js; do node $t; done` (servidor contra a planilha falsa de `tests/planilha-falsa.js`) |
| Publicação | `docs/DEPLOYS.md` ("Como registrar um deploy novo") e `docs/PLANO-IMPLEMENTACAO.md`, seção 10 |
| Manuais | recepção: `docs/POP-RECEPCAO-COBRANCA.md` (cobrança) e `docs/README-RECEPCAO.md`; gestão: `docs/README-GESTAO.md` |

## Telas

Recepção: **Agenda · Confirmações (Fase 2) · Registrar · Pacientes · Cobrança do mês · Meu dia**. Gestão: tudo isso + **Pendências · Repasse · Conciliação · A receber (Fase 2)**. Parcelamentos ficam na Ficha do paciente.

## Jeito de trabalhar (combinado com a gestão)

- Nada é apagado na planilha; colunas novas sempre no fim; colunas achadas pelo cabeçalho; toda gravação leva
  "Registrado por (app)" = e-mail · data e hora; valores e regras em abas editáveis (`Parâmetros`, `Valores por sessão`,
  `Cobrança por profissional`, `Procedimentos`), nunca no código.
- Toda publicação vai primeiro para `arquivos` (teste). A planilha real (`arquivos_real`) só recebe com o OK da gestão.
- Peças novas são gravadas com prefixo `novo:`, lidas de volta e conferidas contra `dist/pedacos.json` antes de trocar os
  nomes. A planilha está em português: nas fórmulas os argumentos são separados por **`;`** (`MID(C50;1;100)`).
- Dados reais para conferir uma mudança: dá pra baixar as abas da real só para leitura (Google Sheets) e rodar o servidor em
  node sobre uma planilha falsa montada com elas (foi assim a conferência de 15/10; ver NOTAS, seção 7).
