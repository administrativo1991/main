# NOTAS — IA no app (parte 1: guias de convênio lidas da pasta do Drive · parte 2: conciliação assistida)

Arquivo de retomada deste item. Quem abrir um chat novo lê, nesta ordem: `docs/DEPLOYS.md` ("No ar agora"), este arquivo,
`NOTAS-fase2.md`, `NOTAS-fase1.md`, `docs/ESTADO-ATUAL.md`. Escrito pra quem não viu a conversa.

> **Estado em 16/10 (noite)**: código **publicado direto na planilha real** (deploys `2026-10-16-12` e `-13`, decisão da
> gestão: "vamos fazer direto na planilha oficial"). A gestão já colou a chave, o carregador novo (versão 2 do projeto real),
> instalou o gatilho (19h) e rodou **"Ler guias agora → Setembro"**: 45 PDFs do Cedplan lidos, todos `ok`, **≈ US$ 0,021 no
> total** (seção 2). O que a leitura real mostrou e o que mudou por causa dela está na seção 2 ("Setembro na real").
> Próximo passo da recepção/gestão: confirmar as guias no card "Guias lidas ontem" (Meu dia). Seção 6 diz como.

> **Parte 2 (17/10)**: conciliação assistida **no branch, ainda não publicada** (seção 8). Junto: modelo **Sonnet 5.5** pra
> todos os itens, preço por modelo no código e teto do mês **US$ 10** (decisões da gestão em 16/10). Na publicação, gravar
> `modelo` e `teto_mes_usd` na aba IA da real (a carga inicial só vale pra planilha nova).

## 1. O que foi feito

**Infra genérica** (`app/server/server-ia.js`), reaproveitada pelos próximos itens (conciliação assistida, perguntar à planilha):

- **Aba `IA`** (criada pelo app na primeira chamada, com a carga inicial; a gestão edita): `ia_ativa`, `ia_guias`,
  `ia_conciliacao`, `ia_perguntar` (Sim/Não), `modelo` (`claude-haiku-5-5`), `esforco` (`low`), `teto_mes_usd` (20),
  `teto_dia_usd` (3), `aviso_pct` (80), `preco_entrada_usd_mtok` (0,10), `preco_saida_usd_mtok` (0,50), `email_aviso`,
  `hora_gatilho` (19), `pasta_guias_id`, `guias_mes_anterior_ate_dia` (5), `guias_max_por_execucao` (25),
  `instrucao_guias` (texto que o modelo recebe), `instrucao_conciliacao` e `instrucao_perguntar` (vazias). Chaves novas de
  versões futuras são acrescentadas no fim sem mexer nas existentes.
- **Aba `IA log`**: Data/hora · Item · Arquivos · Linhas · Modelo · Tokens entrada · Tokens saída · Custo (US$) · Quem ·
  Resultado · Observação · Duração (s). Pausar/reativar e trocar hora do gatilho também entram (item `config`, custo 0).
- **`chamarIA(item, payload)`**: confere `ia_ativa` e `ia_<item>`, soma o `IA log` do mês e do dia contra os tetos, pega a
  chave em `PropertiesService` (`ANTHROPIC_API_KEY`), monta a requisição (`system` = instrução da aba, documentos PDF/imagem
  em base64, texto, `output_config.format` json_schema quando há `schema`, `output_config.effort`), `UrlFetchApp.fetch`
  com `muteHttpExceptions` dentro de `try/catch`, grava o log (custo = tokens × preço da aba) e devolve `{ ok, dados, usage,
  custo }` ou `{ ok:false, motivo, mensagem }` (motivos: `pausada`, `pausada_item`, `teto_mes`, `teto_dia`, `sem_chave`,
  `erro_api`, `recusa`, `json_invalido`). Nunca lança exceção pra fora. Aos 80 % do teto do mês manda um e-mail por mês.
- **`API.iaEstado`**, **`API.iaDefinir`** (só `ia_*` e `hora_gatilho`, gestão), **`API.iaPausar`**,
  **`API.iaInstalarGatilho`** (`ScriptApp`, diário na hora da aba), **`API.gatilhoDiarioIA`** (roda as rotinas registradas
  em `ROTINAS_IA_`; a das guias é a primeira).
- **Carregador** (`app/loader/Code.gs`): função `gatilhoDiarioIA()` (o gatilho precisa de uma função do projeto) e
  `permissoes_()` cita `UrlFetchApp`, `PropertiesService`, `ScriptApp`, `MailApp` pro Google pedir as permissões.

**Guias** (`app/server/server-guias.js` + `app/client/js/75-guias.js`):

- Leitura (`lerGuias_`): pasta raiz da aba IA → uma pasta por convênio (`CEDPLAN`, `SABIN SINAI`, mapeadas pra `Cedplan` /
  `Sabin Sinai` de Listas por nome sem acento) → pasta do mês achada pelo **número no início do nome** (`^0?7`, tolera
  `O7`; confere o ano se o nome terminar em 2 dígitos) → recursiva até 3 níveis (subpasta por paciente). Aceita PDF, JPG,
  PNG, WEBP, GIF; outros tipos (zip) ficam como `nao_lida_tipo`; **duplicata** (mesmo MD5 de um arquivo já lido) fica como
  `duplicada` sem chamada. Mês lido: o corrente (+ o anterior até o dia 5), ou o escolhido no botão "Ler guias agora".
  Máximo `guias_max_por_execucao` arquivos e ~4,5 min por execução; o resto fica pro dia seguinte. Pausa/teto/sem chave no
  meio: nada é gravado, o arquivo fica pra próxima.
- Pro modelo vai: o arquivo, o nome do arquivo e da subpasta, o convênio e o mês da pasta e a lista de pacientes de
  convênio cadastrados (nome · carteirinha · convênio). **Sem CPF, telefone ou valores.** Resposta em JSON fixo
  (`GUIA_SCHEMA`): `e_guia`, `observacao`, `guias[{ pagina, continuacao_da_anterior, convenio, numero_guia, carteirinha,
  beneficiario, datas[], procedimento, quantidade, assinatura_visivel, legibilidade }]` — uma guia por página.
- Casamento **sem modelo** (`casarGuia_`): paciente por carteirinha no cadastro → nome lido (`notaNome_` ≥ 0,8, o mesmo da
  conciliação) → nome da subpasta/arquivo; linhas das abas do mês da data (e vizinhos) com `Atendido`, `Pago? = Convênio`
  ou convênio na linha, mesmo convênio da pasta, data igual (±1 dia se não houver igual). 1 linha → `lida`; várias datas →
  todas as linhas; nenhuma → `sem_atendimento`; leitura parcial/ilegível, sem assinatura, nome sem correspondência,
  carteirinha divergente, nome da pasta não bate → `baixa_confianca`; o modelo não viu guia → `nao_e_guia`.
- **Aba `Guias lidas`**: ID do arquivo · Nome · Pasta · Link · Convênio · Data de leitura · Status · Resultado (JSON) ·
  Sugestão (JSON) · Confiança · Motivos · Confirmado por · Linhas gravadas · Observação · Páginas · Custo (US$) · Hash.
- **Meu dia** (recepção e gestão): card **"Guias lidas ontem (n)"** com todas as pendentes (o título diz quantas foram
  lidas ontem). Por guia: miniatura + link do PDF · o que foi lido · linha(s) sugerida(s) com caixinhas · **Confirmar** ·
  **Escolher outra linha** (outras sessões de convênio do paciente) · **Não é guia / ignorar** (dois cliques) · "Lançar a
  sessão" quando não há atendimento registrado (abre o Registrar com paciente e data). Confirmar grava `Guia assinada? =
  Sim` (se ainda não era), **`Nº da guia`** e **`Link da guia`** (colunas novas no fim da aba do mês), carimbo em
  `Registrado por (app)`, uma linha por campo em `Alterações de lançamento`; e, se marcado, a **carteirinha** lida vai pro
  cadastro (só se estiver vazio) com log em `Alterações de cadastro`. Laranja = baixa confiança; vermelho = sem atendimento.
- **Pendências** (gestão): card **"Uso da IA este mês: US$ X de Y"** (barra, gasto do dia, chamadas, item por item
  clicável, Pausar tudo / Reativar, Ler guias agora com o mês, Instalar gatilho, última leitura, aviso amarelo ≥ 80 %, aviso
  de chave ausente); card **"Guias a conferir (lidas pela IA)"** (sem atendimento, baixa confiança, não é guia, erro) com os
  mesmos botões; a lista **"Convênio sem guia assinada"** ganhou a coluna **"PDF na pasta?"** (sim = há arquivo lido com
  esse paciente/data ou apontando pra linha; não = a guia não foi digitalizada).
- Tiles "guias a pegar" (Meu dia) e card "Convênio sem guia" caem sozinhos quando a linha vira `Sim`.

## 2. Modelo e custo

- **`claude-haiku-5-5`**: o mais barato da família Claude com entrada de PDF e imagem na API (US$ 0,10 por milhão de tokens
  de entrada, 0,50 de saída). Pensa por padrão; `esforco = low` segura o custo. Resposta forçada em JSON (`json_schema`),
  sem prefill (removido nessa geração), `stop_reason = refusal` tratado como erro de leitura. Trocar pra
  `claude-sonnet-5-5` (≈ 10× o custo, mais preciso) é só editar a célula `modelo` da aba IA.
- **Custo estimado por guia**: ≈ 2–3 mil tokens de entrada (PDF de 1 página + lista de ~80 pacientes de convênio +
  instrução) e ~200 de saída → **≈ US$ 0,0004 por guia** (teste com o Google falso: 0,00039). **150 guias/mês ≈ US$ 0,06**;
  mesmo com Sonnet seriam ≈ US$ 0,60. O teto de 20 fica muito folgado.
- **Custo medido na real (16/10, setembro do Cedplan)**: 45 PDFs lidos, todos `ok`, ≈ 3,5 mil tokens de entrada e ≈ 220 de
  saída por arquivo (a lista enviada tinha os 19 pacientes de convênio do Cedplan) → **≈ US$ 0,00047 por guia, ≈ US$ 0,021
  pelos 45**. Projeção: **150 guias/mês ≈ US$ 0,07**; com Sonnet ≈ US$ 0,70. O teto de US$ 20/mês é só rede de segurança.
- **Setembro na real — o que a leitura mostrou**: nomes, números de guia e carteirinhas lidos certos em todas as amostras
  conferidas. Resultado da primeira passada: 28 `lida` (sugestão pronta), 16 `sem_atendimento`, 1 `baixa_confianca`
  (Alexandre 30-09, sem assinatura visível), 1 `duplicada`, 12 `nao_lida_tipo` (os `.zip`). **Os 16 "sem atendimento" eram
  quase todos o mesmo caso: o modelo lê a data de emissão impressa na guia, e a sessão (que está no nome do arquivo,
  `dd-mm Nome.pdf`) é outro dia.** Correção no deploy `-13`: o casamento também procura a linha pela data do nome do
  arquivo quando ela difere da lida na guia; as duas entram marcadas, com o motivo "data lida na guia (…) difere da do
  nome do arquivo (…): confira qual sessão é", e a guia vai pra conferência (laranja) em vez de "sem atendimento". E toda
  execução (gatilho ou botão) **refaz, sem chamar o modelo, a sugestão das guias ainda pendentes** (`recasarGuia_`): a
  sessão lançada depois da leitura passa a ser sugerida no dia seguinte; o que mudou ganha "sugestão refeita em …" na
  coluna Observação. Os 16 de setembro são refeitos na próxima execução (gatilho das 19h ou "Ler guias agora → Setembro",
  custo 0: nenhum arquivo novo).

## 3. Decisões

- **Direto na planilha real** (gestão, 16/10): sem passar pela CÓPIA TESTE. Publicado em `arquivos_real`
  (`2026-10-16-12`); a aba `arquivos` (teste) ficou no 16-10.
- O modelo **nunca grava**: `Guias lidas` é sugestão; só Confirmar escreve na aba do mês.
- `Guia assinada?` já `Sim`: Confirmar não reescreve, só grava nº e link.
- Subpasta por paciente dentro do mês (como a recepção organizou setembro) é suportada; arquivo direto na pasta do mês também.
- `.zip` e outros tipos ficam registrados como `nao_lida_tipo` só na aba (não aparecem nos cards).
- O gatilho roda sem usuário logado: `Quem` no log = `gatilho`.
- Linha da aba do mês sem ID (digitada à mão) não é confirmável pelo app (mesma regra do Corrigir lançamento).
- Data da guia × data do arquivo: o modelo devolve as datas que vê (muitas vezes só a emissão); o nome do arquivo
  (`dd-mm Nome`) é a data da sessão pra recepção. As duas valem como candidatas; quando divergem a recepção decide.
- Sugestão pendente é refeita a cada execução (sem custo); confirmada/ignorada nunca é mexida.

## 4. O que falta / fica de fora

- Feito pela gestão em 16/10: chave, carregador novo (versão 2), gatilho, leitura de setembro, custo medido (seção 2).
- Pendente: confirmar as guias de setembro no Meu dia; Sabin só pode ser testado quando houver PDF na pasta dele.
- Convênios sem pasta no Drive (Unafisco, IPSM…) ficam fora da leitura automática.
- HEIC e fotos fora de PDF/JPG/PNG/WEBP: `nao_lida_tipo`.
- Cache de prompt da API: não usado (o prefixo estável é curto demais pra valer).
- Mover/renomear arquivos no Drive: o app só lê.
- Fatura/glosa por guia: fora deste item.

## 5. Perguntas pra gestão

- Sabin: `SABIN SINAI/09 SET 26` está vazia. As guias do Sabin estão em outro lugar ou ainda não foram digitalizadas?
- "Guias a conferir" mostra pendências de qualquer mês (não só o mês escolhido). OK assim?

## 6. Como testar / operar (gestão)

1. **Chave**: planilha real → Extensões → Apps Script → ⚙ Configurações do projeto → Propriedades do script → Adicionar:
   `ANTHROPIC_API_KEY` = chave criada em console.anthropic.com → Salvar.
2. **Carregador**: no mesmo editor, apagar o `Código.gs` e colar `dist/Code.real.gs` → salvar → Implantar → Gerenciar
   implantações → ✎ → Versão: Nova versão → Implantar. Ao abrir o app, autorizar de novo (vai pedir conexão externa,
   gatilhos, e-mail e Drive).
3. No app: Pendências → card "Uso da IA este mês" → **Instalar gatilho diário (19h)** → escolher **Setembro** → **Ler guias
   agora** (até 5 min; lê no máximo 25 por vez — repetir até dizer "nenhum arquivo novo").
4. Meu dia → card "Guias lidas ontem": conferir 5 guias contra o PDF (nº, nome, datas), Confirmar; testar "Escolher outra
   linha" e "Não é guia" (zip não aparece; a duplicata do Alexandre fica como `duplicada` na aba).
5. Pendências → "Convênio sem guia assinada" → coluna "PDF na pasta?"; "Guias a conferir".
6. `IA log`: custo por guia (coluna Custo) — anotar na seção 2. Testar a pausa: Pausar tudo → "Ler guias agora" tem de
   recusar com "IA pausada pela gestão"; Reativar. Teto: pôr `teto_dia_usd` = 0,0001 na aba IA → recusa "teto do dia";
   voltar pra 3.
7. Local: `node build.js && for t in tests/*.test.js; do node $t; done` (`servidor-ia.test.js` e `servidor-guias.test.js`
   cobrem pausa, teto, custo, e-mail, pasta por número, zip, duplicata, os 6 casos de casamento, confirmar, ignorar, PDF na
   pasta?). Simulação: `dist/index.html` (Meu dia e Pendências com os casos falsos).

## 7. Pro próximo prompt (conciliação assistida e perguntar à planilha): o que a infra já dá

- Chame `chamarIA('conciliacao', { texto, documentos?, schema?, maxTokens?, arquivos, linhas, observacao })`. A instrução do
  sistema vem de `instrucao_conciliacao` na aba IA (hoje vazia: preencha a carga inicial em `IA_PADRAO` de `server-ia.js`
  e a `abaIA_()` acrescenta a chave nas planilhas que já têm a aba). Idem `'perguntar'`.
- Pausa por item já existe (`ia_conciliacao`, `ia_perguntar`) e aparece no card; tetos e log são compartilhados.
- Mande só o necessário: para conciliação, linhas do extrato + lançamentos candidatos (sem CPF/telefone); para perguntar,
  um recorte da aba, não a planilha inteira (o teto diário de US$ 3 é a rede de segurança).
- A resposta deve ser **sugestão** que a tela confirma com um clique; nunca grave direto do retorno do modelo.
- `iaBloqueio_(item, cfg)` serve pra desabilitar o botão na tela antes de chamar (`API.iaEstado().pausada`).
- Rotina diária nova: `ROTINAS_IA_.push(function () { ... })` em qualquer arquivo do servidor.
- Testes: `tests/fakes-google.js` tem `UrlFetchApp` (resposta programável por requisição), `PropertiesService`, `MailApp`,
  `ScriptApp` e um Drive em memória.

## 8. Parte 2 — conciliação assistida (17/10)

**Pedido da gestão (16/10)**: depois das guias, a conciliação; um item por vez, plano aprovado antes do código. Decisões: regra
fixa (sem IA) pros meses antes do app; Sonnet 5.5 pra todos os itens ("o gasto está bem baixo"); preço por modelo no código;
teto de US$ 10/mês, com a possibilidade de aumentar pela tela.

**Infra (`server-ia.js`)**:
- `IA_PRECOS` (Haiku 5.5 0,10/0,50 · Sonnet 5.5 e Sonnet 5 2/10 · Opus 5.5 4/20, US$ por milhão) e `custoIA_` pelo modelo
  **que respondeu** (`j.model`); modelo fora da tabela usa as células `preco_*` da aba IA.
- `IA_PADRAO`: `modelo` = `claude-sonnet-5-5`, `teto_mes_usd` = 10, `instrucao_conciliacao` com o texto padrão. `abaIA_()`
  agora escreve o padrão numa `instrucao_*` que já existia **vazia** (o caso da real), uma vez.
- Sonnet/Opus 5.x mandam `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): se o classificador recusar, a API
  refaz no modelo indicado. Se a API responder 400 citando o fallback, refaz sem ele. No Sonnet 5.5 o fallback só cobre recusas
  de categoria cyber/frontier_llm: raríssimo aqui, mas não custa nada.
- `iaDefinir` aceita `teto_mes_usd` (1 a 500); o card "Uso da IA" ganhou **Mudar teto**.

**Conciliação (`server-fase2.js` + `server-conciliacao-ia.js` + `62-conciliacao.js`)**:
- `API.conciliacao` virou `conciliacaoCalc_` (o mesmo cálculo; devolve também os recebimentos livres e as linhas lidas) +
  `iaConciliacaoAnexar_`. Regras fixas novas, marcadas `fixa`: "Renda Fixa / Resgate de CDB" e "Clínica Nascente" no quem
  pagou = **não é paciente**; data antes do 1º mês com lançamento (`inicioApp_`, a menor data das abas de mês) = **mês
  anterior ao app**.
- `API.conciliacaoIA({ chave, refazer })` (só gestão): manda pro modelo as entradas soltas **sem sugestão** (Pix e vendas no
  cartão), em lotes de 15, até 60 por clique, ~4 min no máximo. Candidatos: L = recebimentos livres de 45 dias antes do mês a
  10 depois; M = mensalidades pagas (Mensalistas) do mês e do anterior; A = sessões em aberto (`emAberto_`) de 60 dias antes
  até o fim do mês. "Quem pagou" sai sem dígitos (o PagBank põe pedaço de CPF). JSON fixo (`CONC_SCHEMA`): `acao` ligar ·
  situacao · em_aberto · nenhuma.
- **O app confere tudo** (`concIAConferir_`): código existe, lançamento livre e no mesmo lugar (ID), não usado por outra
  entrada, Pix só com Pix e venda só com cartão, soma × valor (venda até 10 % maior = acréscimo), data a mais de 45 dias =
  aviso; com aviso, "alta" vira "média". Sugestão que não passa vira "nenhuma — descartada pela conferência". A mesma
  conferência roda a cada carregamento sobre a coluna **`Sugestão IA`** (nova, no fim de `Extrato bancário` e `Vendas no
  cartão`, JSON): sugestão velha que não vale mais some.
- Tela: botão **Sugerir com IA (n)** / **Pedir de novo à IA**, faixa lilás por entrada com **Aceitar** (= `API.conciliar`, Observação
  "IA: …"), **Aceitar as da IA com confiança alta** e **Confirmar sugestões fixas** (dois cliques cada). Desabilitado com o
  motivo quando a IA está pausada, no teto ou sem chave.
- Testes: `tests/servidor-conciliacao-ia.test.js` (regras fixas, sem chave, pausa do item, o que vai e o que não vai no texto,
  descarte de código inventado / lançamento repetido / Pix × cartão, coluna gravada, sugestão guardada conferida, aceitar,
  refazer, erro da API). `servidor-ia.test.js` cobre preço por modelo, fallback, refazer sem beta, teto pela tela e a
  instrução vazia preenchida. Simulação 1280/390 sem erro e sem rolagem lateral.

**Custo esperado (Sonnet 5.5)**: ≈ 4–8 mil tokens de entrada e 1–2 mil de saída por lote de 15 → **≈ US$ 0,03 por lote**;
um mês com ~30 entradas soltas ≈ US$ 0,06. Guias com Sonnet: ≈ US$ 0,009 por guia (150/mês ≈ US$ 1,40). Medir na real e
anotar aqui.

**Como testar na real (depois da publicação)**: Conciliação → Setembro e Outubro → **Sugerir com IA** → conferir 5–10
sugestões contra o extrato → Aceitar as certas. Março a agosto: **Confirmar sugestões fixas**. IA log: custo por lote.

