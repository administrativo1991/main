# NOTAS — IA no app (parte 1: guias de convênio lidas da pasta do Drive)

Arquivo de retomada deste item. Quem abrir um chat novo lê, nesta ordem: `docs/DEPLOYS.md` ("No ar agora"), este arquivo,
`NOTAS-fase2.md`, `NOTAS-fase1.md`, `docs/ESTADO-ATUAL.md`. Escrito pra quem não viu a conversa.

> **Estado em 16/10 (noite)**: **plano escrito, aguardando o OK da gestão. Nenhum código tocado.** Branch
> `claude/youthful-fermat-9l35tu` avançado (fast-forward) até o código que roda na real (`sweet-wozniak`, deploy 2026-10-16-11).

## Contexto

O app "Recepção Nascente" (Apps Script sobre a planilha Controle da Recepção 2026) já tem as Fases 1 e 2 no ar
(deploy 2026-10-16-11 na real). Falta o primeiro uso da API Claude: ler os PDFs das guias que a recepção salva em
`Drives compartilhados / Recepção / GUIAS DE CONVÊNIOS / {CEDPLAN | SABIN SINAI} / {MM MÊS AA}`, casar cada guia com
a(s) linha(s) da aba do mês e deixar a recepção confirmar com um clique. A infraestrutura (aba `IA`, aba `IA log`, pausa e
teto, chave em `PropertiesService`, `chamarIA(item, payload)`) é genérica: os dois itens seguintes (conciliação assistida e
"perguntar à planilha") vão reaproveitá-la.

### O que achei antes de planejar (muda o ponto de partida)

1. **O branch que recebi (`claude/youthful-fermat-9l35tu`) está em 06/10**, sem as Fases 1 e 2. O código que roda na real
   está em `origin/claude/sweet-wozniak-aviy8u` (commit 98a2cc3, 16/10: `server-fase2.js`, Meu dia, Pendências, Conciliação,
   NOTAS-fase1/2). Meu branch é ancestral dele → **passo 0: avançar `claude/youthful-fermat-9l35tu` até `sweet-wozniak`
   (fast-forward, sem força) e trabalhar daí.** Nada se perde.
2. **A pasta do Drive foi organizada hoje (16/10, 15h)** e tem um nível a mais do que o prompt diz: dentro do mês há
   **subpasta por paciente**. Olhei setembro: `CEDPLAN/09 SET 26/` tem **13 subpastas de pacientes com ~45 PDFs** (um por
   sessão, `dd-mm Nome.pdf`, 0,1–4 MB; nomes às vezes curtos: `10-09 Davi Daniel.pdf`, `09-09 sofia pires.pdf`,
   `Alexandre_Cedplan_30-09_assinado_assinado (2).pdf`), **um `.zip` por paciente** (exportação da pasta antiga) e pelo menos
   **uma duplicata** (o mesmo PDF do Alexandre com dois nomes). `SABIN SINAI/09 SET 26/` e as duas `10 OUT 26` estão vazias.
   **Os 13 pacientes de setembro estão na aba `Setembro` da CÓPIA TESTE como Cedplan · `Convênio (fatura)`**, vários com
   `Guia assinada?` em branco ou `Não`. Logo: o leitor percorre o mês **recursivamente**, aceita PDF/JPG/PNG, ignora o resto
   (registrando o motivo), detecta duplicata (mesmo tamanho + mesma leitura → "duplicada"), e usa o nome da subpasta e do
   arquivo (`dd-mm Nome`) como **dica** no casamento. E **o teste real é setembro**, não PDFs novos (ver "Testes").
3. `O7 JUL 26` (letra O) existe nos dois convênios: renomeio pra `07 JUL 26` antes de começar (o código acha o mês por
   `^0?7\b` de qualquer jeito).
4. **`Nº da carteirinha` em `Pacientes` está vazio em quase todo mundo** → o casamento vai cair quase sempre no nome. Por
   isso o Confirmar oferece "gravar a carteirinha lida no cadastro" (com log em `Alterações de cadastro`): o cadastro se
   completa com o uso, como fizemos com o WhatsApp.
5. O carregador da CÓPIA TESTE está desatualizado desde 05/10 (permissão do Drive pendente). Este item **exige** carregador
   novo (UrlFetch, gatilho, e-mail, propriedades) → a gestão vai ter de colar o `dist/Code.gs` e publicar nova versão (ver
   "O que preciso da gestão").

### Modelo

`claude-haiku-5-5`: o mais barato da família com entrada de PDF/imagem na API (US$ 0,10 entrada · US$ 0,50 saída por
milhão de tokens). Uma guia de 1 página ≈ 2–3 mil tokens de entrada (PDF + lista de pacientes de convênio + instrução) e
~200 de saída → **≈ US$ 0,001 por guia; 150 guias/mês ≈ US$ 0,15** (teto de 20 fica folgado). Pedido com `effort: low`
(Haiku 5.5 pensa por padrão; low segura o custo), resposta em JSON fixo via `output_config.format` (json_schema),
sem prefill (removido nesses modelos), `stop_reason: refusal` tratado como erro de leitura. O nome do modelo fica na aba
`IA`; se a gestão quiser mais precisão troca a célula pra `claude-sonnet-5-5` (≈ US$ 0,01/guia). Tudo isso vai pro
`NOTAS-api.md`.

## Entrega 1 — Infra genérica (reaproveitada pelos próximos itens)

Arquivo novo **`app/server/server-ia.js`** (mesmo escopo dos outros; `build.js` e `tests/carregar-servidor.js` passam a
concatená-lo antes de `server-guias.js`).

- **Aba `IA`** (criada pelo app com a carga inicial se não existir; formato de `Parâmetros`: Parâmetro · Valor · Descrição,
  lida com cache de 1 min): `ia_ativa` (Sim), `ia_guias` (Sim), `ia_conciliacao` (Sim), `ia_perguntar` (Sim), `modelo`
  (`claude-haiku-5-5`), `teto_mes_usd` (20), `teto_dia_usd` (3), `aviso_pct` (80), `preco_entrada_usd_mtok` (0,10),
  `preco_saida_usd_mtok` (0,50), `hora_gatilho` (19), `pasta_guias_id` (`15tjkAjub3f5jTc1Jy8ciklaZPG0_ULsP`),
  `guias_mes_anterior_ate_dia` (5), `guias_max_por_execucao` (25), `email_aviso` (administrativo@…),
  `instrucao_guias` (texto da instrução do modelo, editável), `instrucao_conciliacao` e `instrucao_perguntar` (vazias, pros
  próximos).
- **Aba `IA log`** (criada pelo app): Data/hora · Item · Arquivos · Linhas · Modelo · Tokens entrada · Tokens saída ·
  Custo (US$) · Quem · Resultado · Observação · Duração (s). Pausar/reativar também entra aqui (custo 0).
- **`chamarIA(item, payload)`** — `payload = { texto, documentos: [{ nome, bytes/blob, mime }], schema, maxTokens,
  arquivos, linhas }`. Faz, nesta ordem: lê a aba `IA`; confere `ia_ativa` e `ia_<item>`; soma o `IA log` do mês e do dia
  contra os tetos; pega a chave em `PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY')`; monta a
  requisição (`system` = instrução da aba, `messages` = documentos em base64 + texto, `output_config.format` json_schema,
  `max_tokens`); `UrlFetchApp.fetch` com `muteHttpExceptions` dentro de `try/catch`; grava o log (custo = tokens × preço da
  aba); devolve `{ ok, dados (JSON), usage, custo }` ou `{ ok:false, motivo: 'pausada' | 'pausada_item' | 'teto_mes' |
  'teto_dia' | 'sem_chave' | 'erro_api', mensagem }`. Ao cruzar `aviso_pct` do teto do mês manda **um** e-mail por mês
  (`MailApp`, marca em `PropertiesService` `ia_aviso_AAAA-MM`). Nunca lança exceção pra fora: quem chama decide a mensagem.
- **`API.iaEstado()`** (todos; a gestão vê mais): gasto do mês/dia, tetos, %, ativa geral e por item, motivo da pausa,
  última execução do gatilho (hora, lidas, erros), gatilho instalado ou não. **`API.iaPausar({ ativa })`** (gestão) grava
  `ia_ativa` na aba. **`API.iaInstalarGatilho()`** (gestão): `ScriptApp` cria/recria o gatilho diário na `hora_gatilho`.
- **Carregador `app/loader/Code.gs`**: função `gatilhoDiarioIA()` (o gatilho só pode apontar pra função do projeto; ela
  chama `carregarServidor_().gatilhoGuias()`), e `permissoes_()` passa a citar `UrlFetchApp`, `ScriptApp`, `MailApp`,
  `PropertiesService` (pro Google pedir as permissões). `dist/Code.gs` e `dist/Code.real.gs` saem do build como hoje.
- **Card "Uso da IA este mês: US$ X de Y"** na tela Pendências (só gestão), ao lado da Virada do mês: barra, gasto do
  dia, estado por item, aviso amarelo ≥ 80 %, botão **Pausar tudo / Reativar** (dois cliques, sem `confirm` nativo),
  **Ler guias agora**, **Instalar gatilho (19h)** e o texto do estado ("IA pausada pela gestão", "IA pausada: teto do
  mês atingido (US$ X)", "leitura automática indisponível hoje" quando a última execução falhou na API).

## Entrega 2 — Guias (`app/server/server-guias.js` + tela)

- **Aba `Guias lidas`** (criada pelo app): ID do arquivo · Nome · Pasta (convênio/mês/subpasta) · Link · Convênio ·
  Data de leitura · Status (`lida` · `sem_atendimento` · `baixa_confianca` · `confirmada` · `ignorada` · `erro` ·
  `nao_lida_tipo`) · Resultado (JSON compacto do que foi lido) · Sugestão (aba + IDs) · Confiança · Confirmado por ·
  Linhas gravadas · Observação · Páginas · Custo (US$).
- **`gatilhoGuias()`** (gatilho diário; também pelo botão "Ler guias agora", que aceita **escolher o mês** — é assim que
  setembro entra no teste): acha as pastas `CEDPLAN` e `SABIN SINAI` (mapeadas pra `Cedplan` / `Sabin Sinai` da aba Listas
  por nome sem acento; outros convênios sem pasta ficam fora), a pasta do mês corrente e, até o dia
  `guias_mes_anterior_ate_dia`, a do anterior (por `^0?M\b` no início do nome); percorre
  recursivamente; para cada PDF/JPG/PNG ainda sem linha em `Guias lidas` chama `chamarIA('guias', …)` com o arquivo, a lista
  de pacientes de convênio (nome · carteirinha · convênio — sem CPF, telefone ou valores) e a dica (subpasta, nome do
  arquivo). Schema da resposta: `{ e_guia, guias: [{ pagina, continuacao_da_anterior, convenio, numero_guia, carteirinha,
  beneficiario, datas[], procedimento, quantidade, assinatura_visivel, legibilidade, observacao }] }` — uma guia por página,
  salvo `continuacao_da_anterior`. Respeita `guias_max_por_execucao` e um orçamento de ~4,5 min por execução (o resto fica
  pro dia seguinte). Se `chamarIA` devolver pausa/teto/erro: não grava nada em `Guias lidas` (o PDF fica na pasta e é
  lido quando reativar) e o estado vai pro `iaEstado`.
- **Casamento determinístico `casarGuia_()`** (sem modelo): linhas da aba do mês de cada data da guia (e do mês vizinho
  quando a data cai na borda) com `Pago? = Convênio (fatura)` (ou `Convênio (auto)` igual, nas linhas antigas), mesmo
  convênio (da pasta), paciente por carteirinha no cadastro → senão nome normalizado (`Duplicatas.normalizar` + tokens, nota
  ≥ 0,8, reaproveitando `notaNome_` da conciliação) → senão nome da subpasta/arquivo; data igual ±1 dia. 1 linha →
  sugestão simples; várias datas/sessões → todas as linhas do período; nenhuma → `sem_atendimento`; ilegível, sem assinatura
  visível, nome sem correspondência ou carteirinha divergente do cadastro → `baixa_confianca` (laranja).
- **`API.guiasLidas()`**: pendentes de confirmação (qualquer dia) com leitura, sugestão e candidatos alternativos (linhas de
  convênio do paciente/mês). **`API.confirmarGuia({ idArquivo, linhas: [{ aba, id }], gravarCarteirinha })`** (recepção e
  gestão; lock): em cada linha grava `Guia assinada? = Sim`, **`Nº da guia`** e **`Link da guia`** (colunas novas no fim da
  aba do mês via `garantirColunas_`), carimbo em `Registrado por (app)`, log em `Alterações de lançamento` ("guia lida
  (IA) · confirmada por …"); opcionalmente grava a carteirinha em `Pacientes` com log em `Alterações de cadastro`; status
  `confirmada`; invalida o cache. Linha sem ID → "corrija na planilha" (mesma regra do Corrigir lançamento). Linha que já
  está `Sim` (caso comum em setembro): a sugestão diz "já assinada — grava só nº e link" e Confirmar não reescreve o Sim.
  **`API.ignorarGuia({ idArquivo, motivo })`**: status `ignorada` (não é guia / duplicada / outro). "Escolher outra linha"
  = `confirmarGuia` com as linhas que a recepção marcou.
- **Meu dia** (recepção e gestão): card **"Guias lidas ontem (n)"** no topo (abaixo de Lançar o dia), uma linha por guia:
  miniatura (`drive.google.com/thumbnail?id=…`) + link do PDF · lido (convênio · nº · carteirinha · nome · datas ·
  procedimento/qtd · assinatura) · linha(s) sugerida(s) · **Confirmar · Escolher outra linha · Não é guia / ignorar**.
  Laranja = baixa confiança; "sem atendimento registrado" vira pendência (botão "Lançar a sessão" leva ao Registrar). Nada
  de `alert/confirm` nativo: faixas, dois cliques e toast do app.
- **Pendências** (gestão): card **"Guias a conferir"** (sem atendimento · baixa confiança · erro de leitura) com tabela e
  as mesmas ações. A lista **"Convênio sem guia"** ganha a coluna **"PDF na pasta?"** (sim/não, lendo `Guias lidas`:
  arquivo cujo nome/paciente/data bate com a linha, confirmado ou não). Os tiles "guias a pegar" (Meu dia) e o card
  "Convênio sem guia" já caem sozinhos quando a linha ganha `Sim` (só invalidar `resumoMes` após confirmar).

## Arquivos

| Arquivo | Mudança |
|---|---|
| `app/server/server-ia.js` (novo) | aba IA, IA log, `chamarIA`, estado/pausa/gatilho, e-mail 80 % |
| `app/server/server-guias.js` (novo) | Drive, leitura, casamento, `Guias lidas`, confirmar/ignorar, "PDF na pasta?" |
| `app/server/server.js` | `CONFIG.ABA` ganha `IA`, `IA_LOG`, `GUIAS`; `CONFIG.HM` ganha `GUIA_N: 'Nº da guia'`, `GUIA_LINK: 'Link da guia'`; `gestaoResumo` devolve `pdfNaPasta` em `semGuia` |
| `app/loader/Code.gs` | `gatilhoDiarioIA()` + permissões |
| `build.js`, `tests/carregar-servidor.js` | concatenar os dois arquivos novos |
| `app/client/telas/70-meudia.html`, `js/70-meudia.js` | card Guias lidas ontem |
| `app/client/telas/50-gestao.html`, `js/50-gestao.js` | card Uso da IA; card Guias a conferir; coluna PDF na pasta? |
| `app/client/js/00-base.js` | mock dos endpoints novos pra simulação local; `doisCliques` sobe pra cá (hoje está em 50-gestao) |
| `app/client/styles.css` | estilos do card de guias (miniatura, laranja) e da barra de uso |
| `tests/servidor-ia.test.js`, `tests/servidor-guias.test.js` (novos) | fakes de `UrlFetchApp`, `DriveApp`, `PropertiesService`, `MailApp`, `ScriptApp` |
| `NOTAS-api.md` (novo), `docs/DEPLOYS.md`, `docs/ESTADO-ATUAL.md`, `docs/COMO-INSTALAR.md`, `docs/README-GESTAO.md`, `docs/README-RECEPCAO.md` | notas, deploy, passos do carregador e da chave, manual |

Reaproveito: `cacheado_`/`invalidar_` (server-cobranca), `garantirColunas_`, `gravarCelulas_`, `proximaLinha_`,
`abaComCabecalho_`, `linhasMes_`, `indicePacientes_`, `notaNome_`/`tokensNome_`, `Duplicatas.normalizar`,
`tabelaG`, `doisCliques`, `erroBox`, `toast`, `aviso`, `store`.

## Ordem de execução

1. Avançar o branch até `sweet-wozniak`; renomear `O7 JUL 26` → `07 JUL 26` (dois convênios).
2. `server-ia.js` + carregador + testes da infra (pausa geral/por item, teto mês/dia, custo, log, e-mail uma vez, sem chave).
3. `server-guias.js` + testes (pasta por número, recursão, zip ignorado, casamento 1/várias/nenhuma/baixa, confirmar grava
   Sim + nº + link + logs, ignorar, PDF na pasta?).
4. Tela: card em Meu dia, cards em Pendências, coluna nova; mocks; `node build.js`; todos os `tests/*.test.js`; simulação
   Playwright (1280 e 390 px) sem erro de console.
5. Publicar em `arquivos` com prefixo `novo:` → ler de volta e conferir contra `dist/pedacos.json` → ativar → `E2` →
   `DEPLOYS.md`. Na CÓPIA TESTE: criar/conferir abas `IA`, `IA log`, `Guias lidas`; gatilho; **"Ler guias agora → Setembro"**
   lê os ~45 PDFs reais do Cedplan (≈ US$ 0,05 no total com Haiku; a aba `Setembro` da cópia é a real de 15/10); mostrar o
   card com os 5 casos tirados de lá (1 linha · várias sessões, se houver PDF de mais de uma página · nome diferente do
   cadastro, ex. `09-09 sofia pires` · ilegível, o que o modelo marcar · "não é guia" = os `.zip` e a duplicata do Alexandre);
   medir o custo por guia no `IA log`. Se a gestão quiser, repete com PDFs de outubro quando houver.
6. `NOTAS-api.md` (modelo e por quê, custo médio por guia, estimativa mensal, o que ficou de fora, o que a conciliação e o
   perguntar precisam saber da infra). Commit e push.
7. Real só depois do seu OK, versão nomeada por data (`arquivos_real`, `Code.real.gs` novo colado pela gestão).

## O que preciso da gestão (bloqueia o teste na CÓPIA TESTE, não o código)

1. **Chave da API**: criar em console.anthropic.com e colar no Apps Script da CÓPIA TESTE → Configurações do projeto →
   Propriedades do script → `ANTHROPIC_API_KEY`. Nunca na planilha nem no código.
2. **Carregador novo**: colar `dist/Code.gs` em `Código.gs` da cópia, Implantar → Gerenciar implantações → Nova versão,
   e autorizar de novo (vai pedir Drive, conexões externas, gatilhos e e-mail). Depois clicar "Instalar gatilho" no card.
3. **PDFs de teste**: não precisa mandar — uso os de setembro do Cedplan (só leitura; o app nunca move nem renomeia
   arquivo). Sabin fica sem teste real até existir PDF na pasta dele (setembro e outubro vazias).

## Perguntas (responda junto com o OK; sem resposta sigo com o padrão)

1. **Teste lê a pasta real** (`GUIAS DE CONVÊNIOS/CEDPLAN/09 SET 26`, só leitura) a partir da CÓPIA TESTE; `Guias lidas`,
   `IA log` e as gravações ficam só na cópia. OK? (A real passa a usar a mesma pasta quando for publicada.)
2. **Subpasta por paciente** dentro do mês é o padrão da recepção (como em `09 SET 26`)? Suporto os dois jeitos; só
   confirmo pra escrever o manual certo.
3. **Quem confirma**: card do Meu dia pra recepção e gestão; "Guias a conferir" só gestão. OK?
4. Os **`.zip`** de setembro (exportação da pasta antiga) podem ficar; o app ignora. Quer que eu liste os ignorados em
   "Guias a conferir" (padrão: só na aba `Guias lidas`, sem incomodar)?

## Fica de fora (registrado no NOTAS-api.md)

Convênios sem pasta (Unafisco, IPSM…); HEIC/fotos fora de PDF-JPG-PNG; cache de prompt (prefixo curto demais pra valer);
mover/renomear arquivos no Drive (o app só lê); fatura/glosa.

## Verificação

- `node build.js && for t in tests/*.test.js; do node $t; done` — tudo verde, incluindo os dois testes novos.
- Simulação local (`dist/index.html` + Playwright): Meu dia mostra o card com os 5 casos falsos; Pendências mostra Uso da IA
  (pausar/reativar muda o estado), Guias a conferir e a coluna "PDF na pasta?"; sem erro de console em 1280 e 390 px.
- CÓPIA TESTE: abas criadas; `iaEstado` com chave ausente → "leitura automática indisponível"; com chave → "Ler guias
  agora → Setembro" lê os ~45 PDFs do Cedplan, `Guias lidas` e `IA log` preenchidos (zips e duplicata como ignorados),
  custo por guia anotado; conferência por amostra: 5 guias lidas × o PDF aberto (nº, nome, data batem?); Confirmar grava `Sim` + `Nº da guia` +
  `Link da guia` + log; tile "guias a pegar" e "Convênio sem guia" caem; pausar pela tela bloqueia a chamada seguinte;
  teto diário em 0,001 pra provar o bloqueio e depois voltar a 3.
- Peças lidas de volta iguais ao build; `E2` carimbado; `DEPLOYS.md` e `NOTAS-api.md` atualizados; push no branch.
