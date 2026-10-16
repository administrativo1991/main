# Deploys — registro por data

Toda publicação do app (código na planilha de código, carregador no Apps Script ou carga de dados na planilha real)
ganha uma entrada aqui, **no momento em que é feita**, com um nome no formato `AAAA-MM-DD-NN` (NN = ordem no dia).
Este arquivo é a memória do projeto: pra saber o que está no ar, leia a seção "No ar agora"; pra saber o que mudou e
quando, leia a lista. A entrada mais recente fica no topo.

Onde cada coisa roda:

| Canal | Lê | Quem usa | Como chega |
|---|---|---|---|
| **Teste** | aba `arquivos` da planilha de código | CÓPIA TESTE (`appUrlCopia` em `app/config.json`) | gravar as peças de `dist/pedacos.json` em `arquivos`, uma linha por peça |
| **Real** | aba `arquivos_real` | planilha real, recepção e gestão (`appUrlReal`) | depois da aprovação na cópia: regravar em `arquivos_real` as linhas que diferem |
| **Carregador** | `dist/Code.gs` (teste) / `dist/Code.real.gs` (real) | Apps Script de cada planilha | só quando `app/loader/Code.gs` muda: colar e "Implantar → Nova versão" (feito pela Roberta) |

Em até 90 s depois da gravação na aba, o app passa a servir a versão nova (cache do carregador).

**Carimbo na planilha de código**: a célula `E2` de cada aba (`arquivos` e `arquivos_real`) guarda o nome do deploy que
está naquela aba (ex.: `2026-10-06-09 · commit 135de84 · 27 peças · real`). O carregador só lê as colunas A–C, então a
coluna E não afeta o app. Atualizar `E2` faz parte de toda publicação (passo 2 abaixo).

## No ar agora

| Canal | Deploy | Peças | Commit |
|---|---|---|---|
| Real (`arquivos_real`) | **2026-10-16-05** (Conciliação PagBank) | 54 (duplicatas 3 · server 17 · index 34); ativas = 830–883; `antigo34:` = as do 2026-10-16-03 (780–829) | branch `claude/sweet-wozniak-aviy8u`, commit 64a8e16 |
| Teste (`arquivos`) | **2026-10-16-04** (Conciliação PagBank) | 54 (duplicatas 3 · server 17 · index 34), linhas 522–575; `antigo38:` = as do 16-02 (472–521) | branch `claude/sweet-wozniak-aviy8u`, commit 64a8e16 |
| Carregador real | 2026-10-06-02 (`dist/Code.real.gs`, implantado pela Roberta) | — | 4ad0272 |
| Carregador teste | 2026-10-04-01 + nova versão pendente desde 05/10 (permissão do Drive, ver `COMO-INSTALAR.md`) | — | — |

## Como registrar um deploy novo

1. Fazer a publicação (seção 10 do `PLANO-IMPLEMENTACAO.md`): build, testes, gravar as peças, ler de volta e conferir
   contra `dist/pedacos.json` (peças idênticas, index/server/duplicatas remontados iguais).
2. Gravar o nome do deploy em `E2` da aba publicada (`arquivos` ou `arquivos_real`) e acrescentar a entrada no topo da lista abaixo com: nome, canal, o que mudou (uma linha por item), peças e linhas
   regravadas, resultado da conferência, commit, quem aprovou.
3. Atualizar a tabela "No ar agora".
4. Commitar junto com o código.

Modelo:

```
### AAAA-MM-DD-NN · <canal> · <título curto>
- **O que mudou**: …
- **Peças**: N no total; regravadas: <arquivo partes (linhas)>
- **Conferência**: lido de volta, N/N iguais ao build; index/server/duplicatas remontados idênticos
- **Commit**: <hash> · **Aprovação**: <quem, quando>
```

## Lista

### 2026-10-16-05 · Real · Conciliação (PagBank)
- **O que mudou**: o mesmo código do teste 2026-10-16-04 (menu Conciliação, só gestão).
- **Peças**: 54 em `arquivos_real!A830:C883` com `novo:`; o conteúdo (coluna C) copiado por "colar valores" de
  `arquivos!C522:C575` (já conferidas). Lidas de volta: **54/54 iguais a `dist/pedacos.json`**; index igual a
  `dist/index.publicado.html`, duplicatas + server iguais a `dist/server.js`. Ativação numa gravação só (A780:A883):
  780–829 → `antigo34:`; ativas = só 830–883 (coluna A inteira conferida). E2 carimbado.
- **Dados**: nenhum ainda (as abas `Extrato bancário` e `Vendas no cartão` nascem na primeira importação; a coluna
  `Conciliado` da aba do mês, na primeira confirmação). **Voltar**: `antigo34:` → nome (780–829) e 830–883 → `antigo35:`.
- **Commit**: 64a8e16 · **Aprovação**: gestão, 16/10 ("perfeito, pode publicar no real").

### 2026-10-16-04 · Teste · Conciliação (PagBank)
- **O que mudou**: menu **Conciliação** (só gestão; ver `NOTAS-fase2.md`, item 5 e `README-GESTAO.md`): importa o extrato
  OFX e o CSV de vendas no cartão do PagBank, sugere as ligações com os lançamentos em Pix/cartão, e a gestão confirma ou
  classifica (convênio, aluguel de sala, mês anterior…). Abas novas criadas pelo app na primeira importação: `Extrato
  bancário` e `Vendas no cartão`; coluna nova `Conciliado` no fim da aba do mês, na primeira confirmação.
- **Peças**: 54 em `arquivos!A522:C575` com `novo:`; 6 iguais ao 16-02 copiadas por "colar valores", 48 gravadas (6
  agentes; 8 tiveram de ser regravadas porque dois agentes pararam no meio). Lidas de volta: **54/54 iguais a
  `dist/pedacos.json`**; index igual a `dist/index.publicado.html`, duplicatas + server iguais a `dist/server.js`.
  Ativação numa gravação só (A472:A575): 472–521 → `antigo38:`; ativas = só 522–575 (coluna A inteira conferida). E2 carimbado.
- **Dados**: nenhum (as abas novas só nascem quando a gestão importar). **Voltar**: `antigo38:` → nome (472–521) e
  522–575 → `antigo39:`.
- **Commit**: 64a8e16 · **Aprovação**: só teste.

### 2026-10-16-03 · Real · Ficha do paciente + WhatsApp só em celular (+ dados)
- **O que mudou**: o mesmo código do teste 2026-10-16-02 (Ficha do paciente; botão de WhatsApp só com celular).
- **Peças**: 50 em `arquivos_real!A780:C829`: nomes com `novo:` e conteúdo copiado por "colar valores" das ativas do teste
  (`arquivos!C472:C521`). Lidas de volta: **50/50 iguais a `dist/pedacos.json`**; index e duplicatas + server remontados
  iguais. Ativação numa gravação só (A731:A829): 731–779 → `antigo33:`; ativas = só 780–829. E2 carimbado.
- **Dados (real, 16/10)**: `Pacientes!U` (WhatsApp do pagador) de 19 pacientes da exportação do ControleOdonto (14 + Aleff e
  Alexsandra com DDD 32 + 3 celulares no formato antigo gravados com o 9 a mais, a pedido da gestão); log em
  `Alterações de cadastro!A382:G400`. Ver `NOTAS-fase2.md`, item 3.
- **Voltar**: `antigo33:` → nome (731–779) e 780–829 → `antigo34:`.
- **Commit**: f3ba88c · **Aprovação**: gestão, 16/10 ("pode levar a Ficha").

### 2026-10-16-02 · Teste · WhatsApp só em celular (+ Ficha)
- **O que mudou**: o botão de WhatsApp (Confirmações, Cobrança do mês, Ficha) só usa **celular** (DDD + 9 + 8 dígitos); um
  telefone fixo no cadastro não vira link de WhatsApp e aparece na Ficha como "fixo (ligar)" (gestão, 16/10: os fixos do
  ControleOdonto devem ser anotados para contato).
- **Peças**: 50 em `arquivos!A472:C521` com `novo:`; 46 iguais ao 16-01 copiadas por "colar valores", 4 gravadas (1 agente).
  Lidas de volta: **50/50 iguais a `dist/pedacos.json`** (emojis da peça de mensagens conferidos); index e duplicatas +
  server remontados iguais. Ativação numa gravação só (A422:A521): 422–471 → `antigo37:`; ativas = só 472–521. E2 carimbado.
- **Dados**: nenhum. **Voltar**: `antigo37:` → nome (422–471) e 472–521 → `antigo38:`.
- **Commit**: f3ba88c · **Aprovação**: só teste (promovido no 2026-10-16-03).

### 2026-10-16-01 · Teste · Ficha do paciente
- **O que mudou**: tela **Ficha do paciente** (ver `NOTAS-fase2.md`, item 4), aberta por Pacientes → Ficha, Agenda → Ver
  ficha, Registrar → Ficha e o nome na Cobrança do mês.
- **Peças**: 50 em `arquivos!A422:C471` com `novo:`; 22 iguais ao 15 copiadas por "colar valores", 28 gravadas (4 agentes).
  Lidas de volta (direto em arquivo): **50/50 iguais a `dist/pedacos.json`**; index e duplicatas + server remontados iguais.
  Ativação numa gravação só (A373:A471): 373–421 → `antigo36:`; ativas = só 422–471. E2 carimbado.
- **Dados**: nenhum. **Voltar**: `antigo36:` → nome (373–421) e 422–471 → `antigo37:`.
- **Commit**: 78d631a · **Aprovação**: só teste.

### 2026-10-15-16 · Real · Lançar o dia em lote
- **O que mudou**: o mesmo código do teste 2026-10-15-15 (seção **Lançar o dia** no Meu dia).
- **Peças**: 49 em `arquivos_real!A731:C779`: nomes com `novo:` e conteúdo copiado por "colar valores" das ativas do teste
  (`arquivos!C373:C421`). Lidas de volta: **49/49 iguais a `dist/pedacos.json`**; index e duplicatas + server remontados
  iguais. Ativação numa gravação só (A683:A779): 683–730 → `antigo32:`; ativas = só 731–779. E2 carimbado.
- **Dados**: nenhum. **Voltar**: `antigo32:` → nome (683–730) e 731–779 → `antigo33:`.
- **Commit**: 9fe7855 · **Aprovação**: gestão, 15/10 ("ótimo, vi aqui no teste, pode colocar no app oficial").

### 2026-10-15-15 · Teste · Lançar o dia em lote (Meu dia)
- **O que mudou**: seção **Lançar o dia** no topo do Meu dia (ver `NOTAS-fase2.md`, item 2): quem estava na agenda sem
  registro, Veio/Faltou/Em cima da hora/Desmarcou/Clínica cancelou, Recebeu?/forma/guia/Detalhe quando o bloco pede,
  gravação em lote (`API.registrarLote` → `registrarAtendimento` linha a linha).
- **Peças**: 49 em `arquivos!A373:C421` com `novo:`; 39 iguais ao 13 copiadas por "colar valores", 10 gravadas (2 agentes).
  Lidas de volta (direto em arquivo): **49/49 iguais a `dist/pedacos.json`**; index e duplicatas + server remontados iguais.
  Ativação numa gravação só (A325:A421): 325–372 → `antigo35:`; ativas = só 373–421. E2 carimbado.
- **Dados**: nenhum. **Voltar**: `antigo35:` → nome (325–372) e 373–421 → `antigo36:`.
- **Commit**: 9fe7855 · **Aprovação**: só teste (promovido no 2026-10-15-16).

### 2026-10-15-14 · Real · Fase 2: Confirmações + Cobrar no WhatsApp (+ dados)
- **O que mudou**: o mesmo código do teste 2026-10-15-13 (11 + 12 + 13): tela **Confirmações** (período escolhido, uma
  mensagem por família, texto oficial, "Dra./Dr." pela coluna `Nome na mensagem`), **Cobrar no WhatsApp** na Cobrança do
  mês (textos oficiais de cobrança), link `api.whatsapp.com/send` (emojis certos, testado pela gestão), WhatsApp digitado
  vai para o cadastro com log, envios na aba `Mensagens WhatsApp` (criada pelo app no primeiro envio).
- **Peças**: 48 em `arquivos_real!A683:C730`: nomes com `novo:` e conteúdo copiado por "colar valores" das ativas do teste
  (`arquivos!C325:C372`, já conferidas). Lidas de volta: **48/48 iguais a `dist/pedacos.json`**; index e duplicatas + server
  remontados iguais. Ativação numa gravação só (A637:A730): 637–682 → `antigo31:`; lido de volta: ativas = só 683–730.
  E2 carimbado.
- **Dados (real)**: `Profissionais` ganhou 1 coluna no fim (L) **`Nome na mensagem`**, igual à cópia: Dra. para as
  profissionais ativas, Dr. Victor Cunha e Dr. Vitor Barcelos; inativos vazios. Lido de volta. Nada mais mexido.
- **Voltar**: `antigo31:` → nome (637–682) e 683–730 → `antigo32:`. Seguro: o código antigo não lê `Mensagens WhatsApp`
  nem a coluna `Nome na mensagem`.
- **Commit**: b3cb7b6 · **Aprovação**: gestão, 15/10 ("ok", depois de testar confirmação e cobrança na CÓPIA TESTE).
  A primeira tentativa foi barrada pelo modo Auto da sessão ("Production Deploy"); a gestão trocou o modo e mandou seguir.

### 2026-10-15-13 · Teste · link api.whatsapp.com + Cobrar no WhatsApp
- **O que mudou**: (1) os links do WhatsApp passam de `wa.me` para `api.whatsapp.com/send` (com `wa.me` os emojis chegavam
  como "�", print da gestão); (2) **Cobrar no WhatsApp** na Cobrança do mês, com os textos oficiais de cobrança
  (mensalidade/antecipado e consultas do fim do mês, Pix CNPJ); envio gravado em `Mensagens WhatsApp` com Tipo,
  `Competência` e `Valor (R$)` (colunas no fim, criadas pelo app); a linha mostra "cobrado dd/mm hh:mm".
- **Peças**: 48 em `arquivos!A325:C372` com `novo:`; 38 iguais ao 12 copiadas por "colar valores", 10 gravadas (2 agentes,
  nenhuma regravação). Lidas de volta (leitura salva direto em arquivo): **48/48 iguais a `dist/pedacos.json`**; index e
  duplicatas + server remontados iguais. Ativação numa gravação só (A277:A372): 277–324 → `antigo34:`; ativas = só
  325–372. E2 carimbado.
- **Dados**: nenhum.
- **Voltar**: `antigo34:` → nome (277–324) e 325–372 → `antigo35:`.
- **Commit**: b3cb7b6 · **Aprovação**: só teste.

### 2026-10-15-12 · Teste · Confirmações: texto oficial da clínica + "Nome na mensagem"
- **O que mudou**: mensagem de confirmação = texto oficial mandado pela gestão (uma sessão: igual ao texto; várias sessões
  da família: "das suas consultas" + Data/Horário de cada uma), num módulo compartilhado servidor/tela
  (`app/shared/mensagens.js`, vai na peça `duplicatas.js`); some a faixa "texto provisório"; profissional sai como na
  coluna nova **`Nome na mensagem`** da aba `Profissionais` (vazia = nome da aba).
- **Peças**: 48 em `arquivos!A277:C324` com `novo:`; 34 iguais ao 11 copiadas por "colar valores", 14 gravadas (o build
  mudou no meio da gravação, com o "Nome na mensagem": as peças afetadas foram regravadas). Lidas de volta: **48/48 iguais
  a `dist/pedacos.json` do commit 053a9f9**; index e duplicatas + server remontados iguais. Ativação numa gravação só
  (A229:A324): 229–276 → `antigo33:`; ativas = só 277–324. E2 carimbado. O 2026-10-15-11 ficou ativo até aqui.
- **Dados (CÓPIA TESTE, 15/10 noite)**: `Profissionais` ganhou 1 coluna no fim (L) **`Nome na mensagem`**: Dra. Juliana
  Ribeiro (gestão); Dr. Victor Cunha, Dra. Tatiana Grünewald, Dra. Luciana Fiorilo (o título que já estava no nome); os
  outros 10 ativos com Dra., e Dr. Vitor Barcelos (gestão: "Dra. Giovana Grossi, Dra. Marileia, etc"); inativos vazios.
  Nada mais mexido. **Na real: ainda não.**
- **Voltar**: `antigo33:` → nome (229–276) e 277–324 → `antigo34:`.
- **Commit**: 053a9f9 · **Aprovação**: só teste.

### 2026-10-15-11 · Teste · Fase 2: Confirmações por WhatsApp
- **O que mudou**: tela nova **Confirmações** (menu, recepção e gestão): período escolhido (amanhã · daqui a 2 dias · resto
  da semana · próxima semana · outro, até 14 dias), uma mensagem por família, **Abrir WhatsApp** com o texto pronto
  (provisório; oficial em `Parâmetros!msg_confirmacao`), "mensagem enviada" gravada na aba nova `Mensagens WhatsApp`
  (criada no primeiro envio), **Confirmou** = linha "Confirmado" da Lista do dia, **Não vem / remarcar** abre a Agenda do
  dia com o formulário; sem número, a recepção digita e ele vai para `Pacientes` (WhatsApp do pagador) com log. Detalhes em
  `NOTAS-fase2.md`.
- **Peças**: 48 em `arquivos!A229:C276` com `novo:`; 10 iguais ao 09 copiadas por "colar valores" das ativas, 38 gravadas
  (4 agentes em paralelo; uma peça saiu errada na 1ª gravação e foi regravada). Lidas de volta: **48/48 iguais a
  `dist/pedacos.json`**; index = `dist/index.publicado.html`, duplicatas + server = `dist/server.js`. Ativação numa
  gravação só (A183:A276): 183–228 → `antigo32:`; lido de volta: ativas = só 229–276. E2 carimbado.
- **Dados**: nenhum. A aba `Mensagens WhatsApp` da CÓPIA TESTE nasce no primeiro envio.
- **Voltar**: `antigo32:` → nome (183–228) e 229–276 → `antigo33:`. Seguro mesmo com linhas na aba nova (o código antigo
  não a lê).
- **Commit**: 80e62b4 · **Aprovação**: só teste; real espera o OK da gestão.

### 2026-10-15-10 · Real · avaliação neuropsicológica de convênio (+ dados)
- **Regra (gestão, 15/10)**: o pacote Sabin (R$ 475) são 5 sessões, somando sessões da psicóloga e aplicações de teste; da 6ª
  em diante, cada sessão é autorizada à parte, R$ 95; repasse 0% (inclusive Juliana).
- **O que mudou no app**: aplicação de teste de paciente de convênio grava "Convênio (fatura)" e pede guia (desde a Fase 1
  saía "Não se aplica"); contagem da avaliação por paciente (todas as profissionais): "Avaliação Sabin Sinai: sessão N de 5"
  e, depois, "sessão N · adicional" (Registrar: faixa amarela "confira a autorização do convênio"); Repasse: aplicação de
  setembro (sem procedimento) usa a regra da avaliação pela observação. O commit 4a07d6f (aplicação = previsto 0) nunca foi
  publicado e foi desfeito.
- **Dados (13:45)**: Procedimentos linha 65 "Avaliação neuropsicológica – sessão – convênio" (Psicologia, 0); Parâmetros
  linha 10 `avaliacao_pacote_sessoes` = 5; Regras de repasse linha 23 (Sabin · Avaliação neuropsicológica · 0%) valor
  475 → **95**. Efeito no previsto Sabin da Giovana: set R$ 760 → R$ 1.145 (7 aplicações a R$ 95), out R$ 1.585 → R$ 445.
- **Peças**: 46 em `arquivos_real!A637:C682` (fórmulas sobre 591–636), 46/46 iguais ao build; ativação numa gravação só
  (A591:A682); ativas = só 637–682. E2 carimbado.
- **Voltar**: `antigo30:` → nome (591–636) e 637–682 → `antigo31:`; regra 23 de volta a 475 se voltar o código.
- **Commit**: e79f8fd · **Aprovação**: gestão, 15/10 (R$ 95; Juliana 0%; procedimento próprio).

### 2026-10-15-09 · Teste · avaliação neuropsicológica de convênio
- **Peças**: 46 em `arquivos!A183:C228` (fórmulas sobre 137–182), 46/46 iguais ao build; ativação A137:A228 (137–182 →
  `antigo31:`). E2 carimbado. **Commit**: e79f8fd.

### 2026-10-15-08 · Real · aplicações de teste (+ dados)
- **O que mudou**: o mesmo código do 2026-10-15-07: Agendamento com tipo "Aplicação de teste" (sem cobrança na Agenda);
  contagem das aplicações por paciente × profissional ("Aplicação nº N" na Agenda e no Registrar; setembro, importado sem
  procedimento, conta pela observação "Teste da avaliação…"); card "Avaliações em andamento" em Pendências; Agenda →
  Registrar leva o tipo; horários fixos mostram "consulta" para médicos.
- **Peças**: 46 em `arquivos_real!A591:C636` (fórmulas sobre 545–590, congeladas), lidas de volta 46/46 iguais ao build,
  index e duplicatas + server remontados iguais. Ativação numa gravação só (A545:A636); ativas = só 591–636. E2 carimbado.
- **Dados (13:15–13:24)**: Agenda recorrente ganhou a coluna L `Tipo`; Jhonne (gio-10), Igor (gio-14), Luiz Miguel
  (gio-15) e Davi Maia (gio-19) com Tipo = Aplicação de teste e depois **Ativo = Não** (aplicações agendadas uma a uma).
  Logs: "Alterações de cadastro" A367 e A368.
- **Voltar**: `antigo29:` → nome (545–590) e 591–636 → `antigo30:`; horários: Ativo = Sim.
- **Commit**: 5fdbeb4 · **Aprovação**: gestão, 15/10 ("ótimo", "pode desativar").

### 2026-10-15-07 · Teste · aplicações de teste
- **Peças**: 46 em `arquivos!A137:C182` (fórmulas sobre as ativas 134–136 e 91–133), 46/46 iguais ao build; ativação
  numa gravação só (A91:A182: 91–136 → `antigo30:`). E2 carimbado.
- **Commit**: 5fdbeb4 · **Aprovação**: gestão, 15/10.

### 2026-10-15-06 · Real · melhorias pós-Fase 1 + linha inativa
- **O que mudou**: o mesmo código do teste (2026-10-15-03 + 05): pagamento do mês e taxa de falta como linhas à parte na
  Agenda; trava de lançamento repetido; Recebeu? obrigatório no servidor; Tipo na Agenda recorrente; linha de cobrança
  com Ativo = Não deixa de valer.
- **Peças**: 46 em `arquivos_real!A545:C590`, gravadas com `novo:` como fórmulas sobre as ativas (500–544, conferidas
  45/45 iguais ao build 24d34fa antes), congeladas como texto e lidas de volta: **46/46 iguais a `dist/pedacos.json`**;
  index = `dist/index.publicado.html`, duplicatas + server = `dist/server.js`. Ativação numa gravação só (A500:A590):
  500–544 → `antigo28:`; lido de volta: ativas = só 545–590. E2 carimbado.
- **Voltar**: `antigo28:` → nome (500–544) e 545–590 → `antigo29:`.
- **Commit**: 8a5eade · **Aprovação**: gestão, 15/10 ("ok, vamos seguir").

### 2026-10-15-05 · Teste · linha de cobrança inativa deixa de valer
- **O que mudou**: `Cobranca.linhaDe` (módulo compartilhado) normalizava de novo uma linha já normalizada e transformava
  `ativo: false` em `"false"`, que não começa com "N": uma linha com Ativo = Não continuava valendo na Agenda e no
  Registrar (só a Cobrança do mês respeitava). Achado com o Gabriel × Juliana (inativada em 15/10). **O defeito também
  está na real** (2026-10-15-02) até a promoção. Teste novo em `tests/servidor-fase1.test.js` (falha sem a correção).
- **Peças**: só as 3 de `duplicatas.js` mudam; gravadas em `arquivos!A134:C136` com `novo:` por fórmula a partir das
  ativas (88–90), congeladas e lidas de volta: 3/3 iguais ao build; duplicatas + server remontados = `dist/server.js`; as 43
  de server/index ativas iguais ao build novo. Ativação numa gravação só (A88:A136): 88–90 → `antigo29:`, 134–136 ativas.
  E2 carimbado.
- **Voltar**: 134–136 → `antigo30:` e `antigo29:` → nome (88–90).
- **Commit**: 8a5eade · **Aprovação**: gestão, 15/10 (teste).

### 2026-10-15-04 · Real (dados) · correções de cobrança aprovadas pela gestão
- **O que mudou** (planilha real, 15/10 12:46–12:55, tudo com log em "Alterações de cadastro" A354:G361 e
  "Alterações de lançamento" A46:I47): Helena e Igor sem "Vigente desde" (pagaram outubro); Borchert × Dr. Victor
  (C-…-119, -127) de Convênio "Particular" para Por sessão R$ 200 · Na hora; Alice com 2 linhas novas (C-20261015-166
  Posterior até 31/10, -167 Antecipado desde 01/11, R$ 150, Juliana); Pacientes linha 601 (Alice repetida) Ativo = Não;
  Mensalistas coluna J "Profissional" (39 preenchidas); Outubro linha 157 (Ana Luiza, duplicada) → "Cancelado pela clínica".
- **Conferência**: abas baixadas de novo e o servidor rodado sobre elas: Borchert "Cobrar R$ 200 agora", Alice "fim do
  mês R$ 150" em outubro e antecipado em novembro, Helena/Igor "mensalidade de outubro paga", Ana Luiza uma vez só em
  Faltas → Decidir. Mensalistas J conferida célula a célula (a linha 7, Bernardo, saiu errada na 1ª gravação e foi corrigida).
- **Pendente**: `Outubro!S157` (observação "lançado em duplicidade") foi barrada pela permissão; a linha 47 de
  "Alterações de lançamento" descreve essa observação.
- **13:00, mesma rodada**: Gabriel × Juliana (C-…-060) Ativo = Não; Samantha × Giovana com 2 linhas novas (C-20261015-168
  Posterior até 31/10, -169 Antecipado desde 01/11, R$ 200); Mensalistas J17 e J44 = Giovana; Silvana (Outubro linha
  138, 08/10): Pago? → "Não se aplica (pro bono / permuta)", NF → "Não se aplica", observação "veio conversar sobre a
  filha; não houve sessão cobrada". Logs: "Alterações de cadastro" A362:G366 e "Alterações de lançamento" A48:I50.
  Conferido com o app: Samantha "fim do mês R$ 200" em outubro e antecipado em novembro; Silvana sem pendência na chegada.
- **Código**: nenhum. **Aprovação**: gestão, 15/10.

### 2026-10-15-03 · Teste · melhorias pós-Fase 1
- **O que muda**: pagamento do mês e taxa de falta não escondem mais a sessão do dia na Agenda (itens à parte, fora da
  grade); trava de lançamento repetido no Registrar; Recebeu? obrigatório também no servidor; campo **Tipo** na Agenda
  recorrente. Ver `NOTAS-fase1.md`, seção 7.
- **Peças**: 46 (duplicatas 3 · server 14 · index 29) em `arquivos!A88:C133` com prefixo `novo:`. Gravadas como fórmulas
  que copiam trechos das peças ativas (`MID(C50;1;6135)&"…código novo…"`; só ~10 mil caracteres trafegaram), congeladas
  como texto (colar valores) e lidas de volta: **46/46 iguais a `dist/pedacos.json`**, index e duplicatas + server
  remontados iguais ao build, nenhuma fórmula restante. Primeira tentativa com `,` nas fórmulas deu `#ERROR!` (a planilha
  é pt-BR: separador `;`).
- **Ativação** (15/10, ~12h50, com o OK da gestão "pode ativar o teste"; a primeira tentativa tinha sido barrada pela
  permissão da sessão): A43:A87 → `antigo28:` e A88:A133 sem `novo:`, numa gravação só; lido de volta: ativas = só as 46
  das linhas 88–133 (duplicatas 0–2 · server 0–13 · index 0–28). E2 carimbado.
- **Voltar** (depois de ativado): `antigo28:` → nome e A88:A133 → `antigo29:`.
- **Commit**: 7a184e1 · **Aprovação**: gestão, 15/10 ("pode ativar o teste"); real só depois do teste na CÓPIA TESTE.

### 2026-10-15-02 · Real · Fase 1 do financeiro
- **O que mudou**: o mesmo código do 2026-10-15-01 (teste). Aprovado pela gestão em 15/10 ("amei, tá aprovado").
- **Peças**: 45 em `arquivos_real!A500:C544` (gravadas com prefixo `novo:`, lidas de volta e conferidas 45/45 contra
  `dist/pedacos.json`); então A459:A499 → `antigo27:` e `novo:` removido. E2 carimbado.
- **Voltar**: `antigo27:` → nome e A500:A544 → `antigo28:` (as abas de dados novas não atrapalham o código antigo).
- **Commit**: 24d34fa · **Aprovação**: gestão, 15/10.


### 2026-10-15-01 · Teste · Fase 1 do financeiro (cobrança por profissional, bloco "O que fazer agora", Cobrança do mês, Meu dia)
- **O que mudou**: ver `NOTAS-fase1.md` (seções 1 e 5). Resumo: cobrança por paciente × profissional (aba nova), módulo
  compartilhado das frases, cache de 5 min no servidor, Registrar com Recebeu? Sim/Não/Parcial e Detalhe da falta, Agenda
  com "Cobrança hoje" e tiles, tela Cobrança do mês no lugar de Pacotes, tela Meu dia (Fechar o dia), Pendências com
  Faltas → Decidir e Atendidos sem cobrança cadastrada, Pacientes com a seção Cobrança por profissional. `duplicatas.js`
  na planilha passa a conter também `app/shared/cobranca.js`; `server.js` passa a conter também `app/server/server-cobranca.js`
  (o carregador não mudou).
- **Dados** (planilha real e cópia, 15/10, antes do código): abas `Cobrança por profissional` (165 linhas), `Valores por
  sessão`, `Parâmetros`, `_relatorio cobrança 15-10`; `Listas!K:M`; log em `Alterações de cadastro` A189:G353. Colunas por
  competência em `Mensalistas` e `Detalhe da falta`/`Decisão da gestão` na aba do mês são criadas pelo app quando precisar.
- **Peças**: 45 em `arquivos!A43:C87` (gravadas com prefixo `novo:` e conferidas 45/45 contra `dist/pedacos.json` antes de
  ativar); então A2:A42 → `antigo27:` e `novo:` removido. E2 carimbado.
- **Voltar**: `antigo27:` → nome e A43:A87 → `antigo28:`.
- **Commit**: 24d34fa · **Aprovação**: pendente (canal de teste; a gestão testa na CÓPIA TESTE).


### 2026-10-10-02 · Real · convênio gravado na linha + virada de Setembro e Outubro
- **O que mudou**: o mesmo código do 2026-10-10-01 (teste), autorizado pela gestão em 09/10 à noite.
- **Peças**: 41 copiadas de `arquivos!A2:C42` para `arquivos_real!A459:C499` (colar valores) e, na mesma operação, as 40
  ativas do 09-08 (2, 123, 281, 345, 401–405, 426–448, 451–458) viraram `antigo25:`. Lidas de volta: duplicatas, server e
  index montados pelo critério do carregador = build. E2 carimbado. 23:31.
- **Virada (23:31)**: Setembro F2:H420 e N2:N420, Outubro F2:H155 e N2:N155 colados como valor (antes: 0 #REF!; depois:
  F2/G2/H2/N2 sem fórmula, 0 células diferentes; Repasse idêntico antes/depois nos dois meses). Log em "Alterações de
  lançamento" (linhas 36–37).
- **Emily (23:32)**: IMP-SET26-037, -235, -333 e A-20261009-215500-set (linhas 38, 236, 333, 420): F = Sabin Sinai,
  G = Convênio, U + "corrigido por … 23:32 (Convênio, Modalidade)"; 8 linhas em "Alterações de lançamento" (38–45). Só essas
  12 células mudaram. Repasse Juliana set: Sabin 78 · Cedplan 40 · Particular 106, sem "Convênio (sem nome)".
- **Voltar**: `antigo25:` → nome e 459–499 → `antigo26:` (o código antigo volta a funcionar; as abas ficam com valor,
  sem fórmula — recolocar a ARRAYFORMULA só se for voltar de vez).
- **Aprovação**: gestão, 09/10 ("autorizo publicar na planilha real e virar Setembro e Outubro lá").


### 2026-10-10-01 · Teste · convênio gravado na linha (virada F/G/H/N)
- **O que mudou**: botão "Virar aba {Mês} para o app" (Pendências → Virada do mês, gestão); registrar / plano / antecipado /
  renovação / mensalidade gravam Convênio, Modalidade, Atenção e Pagador do cadastro na linha; aba ainda com fórmula não
  recebe gravação ("…ainda está em modo planilha…"); Corrigir lançamento: gestão troca Convênio e Modalidade da linha (U +
  "Alterações de lançamento"), recepção vê travado; card "Linhas de convênio sem convênio"; cadastro com convênio/cobrança
  novo pergunta só pelas linhas do mês aberto de hoje em diante; aba nova nasce sem fórmula.
- **CÓPIA TESTE atualizada com as abas da real de 10/10** (Setembro, Outubro, Pacientes, Listas, Profissionais,
  Procedimentos, Regras de repasse, Alterações de lançamento, Planos, Mensalistas, Alterações de cadastro, Agenda recorrente,
  Lista do dia, copiadas com `copyTo`); as antigas da cópia ficaram como `_antes 10-10 …`. F2/G2/H2/N2 regravadas com o
  mesmo texto pra ligar ao Pacientes novo; Setembro da cópia conferido igual ao da real (420 linhas, 0 diferenças, 0 erros).
- **Peças**: 41 em `arquivos` linhas 2–42; cada peça é uma fórmula `MID(arquivos_real!C…)` + trechos novos na aba
  `lits_teste` (35 trechos, 22.746 caracteres, conferidos por LEN e soma de controle). Lidas de volta: 41/41 iguais ao build.
- **Congelado** (09/10 23:00): `arquivos!C2:C42` colado como valor (0 fórmulas, 41/41 iguais ao build); E2 carimbado.
- **Na CÓPIA TESTE** (09/10 23:04–23:05, mesma operação do botão: F2:H e N2:N até a última linha colados como valor):
  Setembro 419 linhas, Outubro 154; antes, 0 #REF!; depois, F2/G2/H2/N2 sem fórmula e 0 células diferentes; Repasse
  idêntico antes/depois (Juliana set: Sabin 74 · Cedplan 40 · Particular 106 · sem nome 4). Emily (IMP-SET26-037, -235,
  -333, A-20261009-215500-set): F = Sabin Sinai, G = Convênio, U + "corrigido por … 23:05 (Convênio, Modalidade)",
  10 linhas em "Alterações de lançamento" (2 da virada, 8 da Emily); só essas 12 células mudaram; Juliana set: Sabin 78,
  sem "Convênio (sem nome)".
- **Real**: não publicado. A gravação em `arquivos_real` foi barrada pela permissão da sessão (deploy em produção);
  a virada da real espera o código (a guarda precisa estar no ar antes).
- **Commit**: 6554ae0.


### 2026-10-09-08 · Real (direto) · Profissionais: coluna Ativo
- **O que mudou**: aba Profissionais ganhou a coluna K **Ativo**; "Não" = saiu da clínica e some das listas do app
  (Registrar, Agenda, Pacientes, Repasse); os lançamentos antigos continuam com o nome.
- **Dados** (gestão, 09/10): saíram Gabriela Ramos, Maria Fernanda, Camila Barros e Ana Beatriz (Ativo = Não; nenhuma
  tinha horário fixo na Agenda recorrente; regras de repasse das 3 estagiárias desligadas). Entrou **Laryssa Dutra
  Simili** (Nutrição), quinta 08:00-12:00, 13:00-18:00. Regra de repasse do Pacote Acolhimento desligada (não existe mais).
- **Peças**: 4 novas (455–458, server 0–3); 369, 398–400 viraram `antigo24:`. 4/4 iguais ao build.
- **Voltar**: `antigo24:` → nome e 455–458 → `antigo25:`.
- **Aprovação**: gestão, 09/10.

### 2026-10-09-07 · Real (direto) · Repasse: PLASC, desconto mensal, valores dos convênios
- **O que mudou**: % negativo = a profissional deve à clínica (linhas "PLASC (fatura da Luciana)" viram convênio PLASC,
  "faturado pela profissional"); convênio "Desconto mensal" + valor = abatimento fixo do mês, com colunas Desconto e
  Líquido no resumo; regras só de valor por procedimento.
- **Regras** (aba Regras de repasse, linhas 21–28, das fichas "Valores dos convênios v1.0" e "Repasse v1.2"): Sabin
  consulta R$ 95, nutrição R$ 40, pacote avaliação R$ 475; Cedplan R$ 120 (psicoterapia/consulta), nutrição R$ 60;
  Luciana PLASC −40% sobre R$ 86,30; Juliana desconto mensal R$ 1.621 (pró-labore); Juliana Acolhimento 40%.
- **Conferência**: 4/4 peças iguais ao build (451–454); ativas = 1 + 11 + 28; testes passam; cópia de Setembro dá
  Luciana −R$ 138,08 (igual à planilha SET 26).
- **Voltar**: `antigo23:` → nome e 451–454 → `antigo24:`.
- **Aprovação**: gestão, 09/10.

### 2026-10-09-06 · Real (direto) · tela Repasse (só gestão)
- **O que mudou**: menu **Repasse**, visível só pra gestão. Calcula na hora, a partir da aba do mês, o repasse de cada
  linha e o resumo por profissional e convênio: "já recebido" (Sim / parte recebida do Parcial) e "previsto" (inclui
  em aberto e convênio a receber). Perdido / glosa, sem cobrança e sessão incluída em pacote/mensalidade = 0. Linha
  com valor e sem regra fica fora do total e aparece em laranja.
- **Regras**: aba nova **Regras de repasse** (Ativa · Profissional · Convênio · Procedimento (contém) · % · Valor da
  sessão (convênio) · Observação · Alterado por), editável na tela ou direto na aba. Vale a mais específica:
  procedimento > profissional > convênio. "Ativa = Não" desliga sem apagar; o app grava só o que mudou.
  19 regras iniciais copiadas da FICHA de repasse v1.2 e do 00_CONSTITUICAO (Juliana: Particular 80, Cedplan 40,
  Sabin 80; Victor 80; não-sócios 40; estagiários 0; avaliação neuro e altas habilidades 0; Sabin R$ 40 por sessão).
- **Peças**: 27 novas (424–450: server 9–10, index 3–27); 25 viraram `antigo22:`.
- **Conferência**: 27/27 iguais ao build; ativas = 1 + 11 + 28; `tests/repasse.test.js` passa; rodado também numa cópia
  dos dados reais de Setembro.
- **Voltar**: `antigo22:` → nome e 424–450 → `antigo23:` (a aba Regras de repasse pode ficar).
- **Aprovação**: gestão, 09/10.

### 2026-10-09-05 · Real (direto) · Pago? = "Perdido / glosa"
- **O que mudou**: opção nova no Pago? para valor dado como perdido (glosa, guia não autorizada, calote). Fica fora de
  a receber, pendências da chegada, convênio sem guia, faltas a decidir e recebido; o Valor fica como referência.
  Só a gestão marca ou desmarca (na correção do lançamento), com **motivo obrigatório** (vai pra Observação como
  "PERDIDO / glosa: …"). A recepção vê a linha como perdida, com o Pago? travado; a opção não aparece no Registrar.
  Pendências (gestão) ganhou o card **Perdidos e glosas**: data, paciente, profissional, convênio, valor de referência,
  observação e o total do mês. Se o dinheiro entrar, a gestão troca pra Sim com data e forma.
- **Planilha**: Listas B7 "Perdido / glosa" (Parcial e Incluída na mensalidade desceram pra B8/B9); validação de
  Setembro!K e Outubro!K agora `Listas!$B$2:$B$20` (a próxima aba do mês copia da última). Emily Rocha Erculano
  (Setembro, IDs IMP-SET26-037, -235 e -333; a de 25/09 está na linha 333): Pago? → Perdido / glosa, Valor R$ 40,00;
  na de 25/09, observação + "guia 1504122 = 4 sessões / R$ 160; 4ª sessão não localizada na planilha"; coluna U com
  "corrigido por … (Pago?, Valor)"; 6 linhas em "Alterações de lançamento".
- **Peças**: 26 novas (398–423: server 1–9, index 10–26); 26 viraram `antigo21:` (370–378, 381–397).
- **Conferência**: 26/26 iguais ao build; ativas = 1 + 10 + 27; `tests/perdido-glosa.test.js` passa com os dados de
  exemplo e com uma cópia dos dados reais de Setembro (linha da Emily e uma particular em aberto).
- **Voltar**: `antigo21:` → nome e 398–423 → `antigo22:`.
- **Aprovação**: gestão, 09/10.

### 2026-10-09-04 · Real (direto) · Pagamento: "No início do mês" / "No mês seguinte"
- **O que mudou**: Pagamento "Antecipado" passa a se chamar **No início do mês** e "Posterior", **No mês seguinte** (o app
  lê os nomes antigos como os novos). A virada de novembro não propõe mais Pacote 4 sessões pros ex-planos: eles ficam em
  Por sessão (combinado) (gestão, 09/10).
- **Dados**: Listas J2:J5 com os nomes novos; Pacientes AH: 80 "Posterior" → "No mês seguinte" e 2 "Antecipado" →
  "No início do mês" (localizar e substituir só na coluna AH, célula inteira).
- **Peças**: 29 novas (369–397: server 0–9, index 8–26); 28 viraram `antigo20:` (335–344, 351–368).
- **Conferência**: 29/29 iguais ao build; ativas = 1 + 10 + 27; testes do servidor e simulação passam.
- **Voltar**: `antigo20:` → nome e 369–397 → `antigo21:` (o código antigo não entende os nomes novos: voltar também
  Listas J e a coluna AH com localizar e substituir).
- **Aprovação**: gestão, 09/10.

### 2026-10-09-03 · Real (direto) · agendar na vaga; pacote com valor automático
- **O que mudou**: na Agenda, clicar num horário vago abre um cartão ali mesmo (profissional, dia e hora já preenchidos):
  paciente, tipo, observação → **Agendar** ou **Toda semana neste horário**. Esc ou clique fora fecha. Pacote 4 sessões e
  Pacote 12 sessões com valor automático e travado (R$ 400 / R$ 900), como a Mensalidade social; a virada de novembro
  propõe R$ 400 para os ex-planos.
- **Peças**: 34 novas (335–368); 34 viraram `antigo19:` (301–305, 330–334, 282–286, 311–329).
- **Conferência**: 34/34 iguais ao build; ativas = 1 + 10 + 26; testes do servidor e simulação passam.
- **Voltar**: `antigo19:` → nome e 335–368 → `antigo20:`.
- **Aprovação**: gestão, 09/10.

### 2026-10-09-02 · Real (direto) · pacotes 4/12 e mensalidades
- **O que mudou**: cobranças novas (gestão, 09/10): Tabela (outras especialidades) · Por sessão (combinado) · Pacote 4 sessões
  (R$ 400) · Pacote 12 sessões (R$ 900) · Mensalidade social (R$ 200/mês) · Mensalidade especial (valor do cadastro) ·
  Convênio · Pro bono · Permuta. Nenhuma é mais restrita à gestão. Sessão de mensalista grava Pago? = "Incluída na
  mensalidade"; botão "Registrar pagamento da mensalidade" grava em Renovações com "Referente a" (mês). Mês pago também é
  lido das linhas "Mensalidade…" já lançadas na aba do mês. Pacotes e Agenda mostram mensalidade em aberto (vence dia 10).
- **Dados**: Listas H2:I10 (cobranças novas) e B8 "Incluída na mensalidade". Pacientes: 22 Pacote social → Mensalidade
  social (AE 200, AF/AG limpos); Borchert ×2 → Mensalidade especial 150; Oziel → 250; Inglidy e Luccas → 120 (obs.
  "Quinzenal: mensalidade R$ 120."); obs. da Erica. 30 linhas em "Alterações de cadastro" (143–172).
- **Peças**: 29 novas (301–305 e 330–334 server; 311–329 index 7–25); 306–310 `descartado:` (versão anterior do server
  5–9, refeita antes da troca). 28 viraram `antigo18:`.
- **Conferência**: 34/34 iguais ao build; ativas = 1 + 10 + 26; testes do servidor e simulação (gestão e recepção) passam.
- **Voltar**: `antigo18:` → nome; 301–305, 311–334 → `antigo19:`; Listas H/B8 e Pacientes pelo log de 09/10.
- **Aprovação**: gestão, 09/10.

### 2026-10-09-01 · Real (direto) · hora "30/12/1899" na Agenda
- **O que mudou**: agendamentos avulsos (aba Lista do dia) apareciam com hora "30/12/1899": o app gravava "08:00", a planilha
  convertia em horário antes do formato texto, e na leitura o horário virava data. Leitura corrigida (horário de 1899 = hora,
  no fuso da planilha) e, em Lista do dia / Agenda recorrente, a célula vira texto antes de gravar a hora. As abas de mês
  não mudam.
- **Peças**: 8 novas (293–300, server 2–9); 244–251 viraram `antigo17:`.
- **Conferência**: 8/8 iguais ao build; ativas = 1 + 10 + 25; `tests/servidor-pacotes.test.js` passa (caso novo da hora).
- **Voltar**: `antigo17:` → nome e 293–300 → `antigo18:`.
- **Aprovação**: gestão, 09/10.

### 2026-10-08-09 · Real (direto) · Agenda: ações sempre visíveis
- **O que mudou**: na tabela da Agenda a coluna de ações ("Confirmou" e ⋯) fica presa na borda direita (no computador da
  recepção os 3 pontinhos sumiam); "guia a assinar" com mais de 2 datas vira "N sessões (dd/mm a dd/mm)"; até 1600 px a
  coluna "Profissional · modalidade" vai pra baixo do nome e o painel da direita fica com 300 px. Francisco Luiz Freitas
  do Couto: observação de cobrança da avaliação (2 × R$ 1.050; 2ª ao fim dos testes).
- **Peças**: 12 novas (281–292, index 1–12); trocadas viraram `antigo16:` (124, 125, 201–203, 235, 252, 255–257, 271, 272).
- **Conferência**: 12/12 iguais ao build; ativas = 1 + 10 + 25.
- **Voltar**: `antigo16:` → nome e 281–292 → `antigo17:`.
- **Aprovação**: gestão, 08/10.

### 2026-10-08-08 · Real (direto) · cobrança "a definir"
- **O que mudou**: Por sessão (combinado) com valor em branco é aceito ("valor a definir": no Registrar o valor abre pra
  digitar, faixa laranja; etiqueta "valor a definir · completar cadastro" na Agenda); paciente novo sem cobrança escolhida
  é aceito (= Tabela, com o aviso de cadastro incompleto). Dados: Inglidy e Luccas Fagundes Cassemiro → Pacote de sessões
  2 / R$ 120 · Posterior (gestão, 08/10: R$ 120/mês, quinzenal), com registro em "Alterações de cadastro".
- **Peças**: 11 novas (270 server 1; 271–280 index 7, 9, 17–24); trocadas viraram `antigo15:` (243, 253, 254, 262–269).
- **Conferência**: 11/11 iguais ao build; ativas = 1 + 10 + 25; `tests/servidor-pacotes.test.js` passa.
- **Voltar**: `antigo15:` → nome e 270–280 → `antigo16:`.
- **Aprovação**: gestão, 08/10.

### 2026-10-08-07 · Real (direto) · telefone do paciente, Responsável acima do pagador, CPF/nascimento opcionais
- **O que mudou**: campo "Telefone do paciente" no cadastro (coluna nova em Pacientes, criada no 1º cadastro salvo) e no
  painel da Agenda; card Responsável acima de "Quem paga"; CPF e data de nascimento deixam de ser obrigatórios (gestão:
  há pacientes no ControleOdonto sem eles) — se preenchidos, são validados e CPF repetido bloqueia; faltando, etiqueta
  laranja na Agenda, faixa no Registrar e item em "Pendências de hoje"; no Editar, os campos vazios destravam pra
  completar (trocar um valor já preenchido só a gestão).
- **Dados**: 15 linhas "Pagamento de setembro (valor do mês)" na aba Setembro (401–415, IDs SETABERTO-01…15), Pago? = Não,
  com o valor que a aba Mensalistas diz que cada um deve; Lays fora (as 3 sessões já estavam "Não"); Maria Clara e Lucas
  Adryan com "CONFERIR antes de cobrar".
- **Peças**: 36; novas nas linhas 243–269 (server 1–9, index 6, 7, 9–24) mais 223 (server 0) e 235 (index 8) gravadas
  na rodada do telefone; 191–200 e 204–222 viraram `antigo14:`; sobras da rodada do telefone = `antigo13:`.
- **Conferência**: 29/29 lidas de volta iguais ao build; ativas = 1 + 10 + 25, sem repetição; `tests/servidor-pacotes.test.js` passa.
- **Voltar**: `antigo14:` → nome nas linhas 191–200 e 204–222; 223, 235 e 243–269 → `antigo15:`.
- **Aprovação**: gestão, 08/10.

### 2026-10-08-06 · Real (direto, de madrugada) · Cobrança + Pagamento + pacotes de sessões
- **O que mudou**: cadastro com **Cobrança** (Tabela · Por sessão (combinado) · Pacote de sessões · Pacote social · Convênio ·
  Pro bono · Permuta) e **Pagamento** (Na sessão · Antecipado · Posterior · Não se aplica), com Valor combinado (R$), Sessões
  por pacote e Valor do pacote (R$) numéricos; Registrar com a linha-resumo da cobrança, consumo do pacote (1ª falta avisada
  do mês não gasta, mesma semana não gasta), pacote esgotado (renovar ou cobrar avulsa pela Tabela) e pacote no Posterior
  lançado não pago (pacote ÷ sessões); tela **Pacotes** no lugar de Mensalistas; aba **Renovações** (criada na 1ª
  renovação); **Virada de novembro** em Pendências (só gestão). Ninguém começa com sessões.
- **Dados (planilha real)**: backup em `_migracao_07-10` (Pacientes) e `_migracao_07-10 Listas`; Pacientes F → "Cobrança",
  N → "Histórico de cobrança (antigo)", colunas novas AE–AH, R (Regra) limpa, S sem as frases do modelo antigo
  ("Mensalidade fixa de R$ 200/mês, sem remarcação de faltas" etc.); conversão feita por fórmulas na aba `_calc` e colada
  como valores: 7 Por sessão · Na sessão, 15 Por sessão · Posterior (com Naimara R$ 120), 22 Pacote social · Posterior
  (com Paulo Henrique Souza e Silva), 3 Pacote de sessões · Posterior (Borchert 2 × 4/150, Oziel 4/250), 34 Convênio,
  8 Pro bono, 5 Permuta, 2 Tabela. Listas: H = Cobrança, J = Pagamento (nova), B (Pago?) troca "Mensalista…" e "Plano já
  pago" por "Pacote (sessão já paga)".
- **Peças**: 36; gravadas as 32 que mudaram nas linhas 191–222 (server 0–9, index 3–24); index 0–2 (123–125) e
  duplicatas (2) iguais; 30 linhas da versão anterior viraram `antigo12:`.
- **Conferência**: 32/32 lidas de volta iguais ao build; ativas = 1 + 10 + 25, sem repetição; `tests/servidor-pacotes.test.js`
  (servidor contra planilha falsa) passa.
- **Voltar**: renomear `antigo12:` → nome (linhas 115–117, 126–128, 147–152, 156–162, 175, 177–178, 180–181, 183, 186–190)
  e 191–222 → `antigo13:`; dados: copiar F, N, R, S de `_migracao_07-10` e Listas de `_migracao_07-10 Listas`.
- **Aprovação**: gestão, 08/10 ("direto no oficial, à noite"; "pode gravar a conversão nos cadastros dos pacientes").

### 2026-10-08-05 · Real (direto) · modalidade Pro bono/Permuta basta pra não cobrar
- **O que mudou**: o Registrar deixa de cobrar quando a modalidade é Pro bono ou Permuta, mesmo com a regra de cobrança em
  branco (antes só olhava a regra).
- **Peças**: 1 (index 17) na linha 190, conferida; 179 virou `antigo11:`.
- **Aprovação**: gestão, 08/10.


### 2026-10-08-04 · Real (direto) · "Mensalidade fixa" vira "Mensalidade social"
- **O que mudou**: o app aceita "Mensalidade social" (e ainda "Mensalidade fixa") como mensalidade; cartão do cadastro
  diz "social · valor mensal fixo (R$ 200)". Procedimento "Sessão de psicologia – mensalidade fixa" e a regra
  "Mensalidade fixa (independe do nº de sessões)" mantêm o nome.
- **Dados**: Listas!H5, 21 cadastros em Pacientes (log em "Alterações de cadastro" A113:G134), 22 linhas de Mensalistas e a
  observação da Erica renomeados.
- **Peças**: 4 (index 8, 9, 20, 22) nas linhas 186–189, conferidas 4/4; 155, 176, 184 e 185 viraram `antigo10:`.
- **Aprovação**: gestão, 08/10.


### 2026-10-08-03 · Real (direto) · Novo paciente com profissional opcional
- **O que mudou**: "Profissional de referência" deixou de ser obrigatório no Novo paciente (paciente pode ser atendido por
  mais de um profissional); sem profissional, aparecem todas as modalidades.
- **Peças**: 3 (index 7, 8, 20) nas linhas 183–185, conferidas 3/3; 153, 154 e 182 viraram `antigo9:`.
- **Aprovação**: gestão, 08/10.


### 2026-10-08-02 · Real (direto) · aplicação de teste nunca é cobrada
- **O que mudou**: aplicação de teste sai sem cobrança ("já paga na avaliação neuropsicológica · só controle das sessões de
  teste"); "Cobrar à parte como particular" (paciente de convênio) só na Avaliação neuropsicológica.
- **Peças**: 4 (index 17–20) nas linhas 179–182, conferidas 4/4; 171–174 viraram `antigo8:`.
- **Aprovação**: gestão, 08/10.


### 2026-10-08-01 · Real (direto) · aplicação de teste sem cobrança + exceção ao convênio na avaliação
- **O que mudou**: no Registrar, o valor por sessão do cadastro só vale pra procedimento de sessão (Sessão/Consulta/Terapia);
  procedimento R$ 0 na tabela (aplicação de teste, retorno) sai sem cobrança (Pago? = Não se aplica). Paciente de convênio:
  na avaliação neuropsicológica (avaliação e aplicação de teste) aparece "Cobrar à parte como particular" (valor à mão).
- **Dados (08/10)**: listas da Juliana e da Giovana conferidas; cadastros completados e corrigidos, tudo em "Alterações de
  cadastro" (linhas 50–110). Mensalistas: Oziel (Mensal valor especial R$ 250), Lays (por sessão R$ 25), Erica (pro bono até 31/10).
- **Peças**: 8 (index 17–24) gravadas nas linhas 171–178 como `novo:`, conferidas 8/8; 163–170 viraram `antigo7:`.
- **Aprovação**: gestão, 08/10.


### 2026-10-07-07 · Real (direto) · cobrança por sessão no lugar dos planos + valor da sessão na Agenda
- **O que mudou**:
  - **Modalidades** (gestão, 07/10): os planos de 4/6/12 consultas saíram. A lista em `Listas!H2:I9` passou a ser
    Pagamento antecipado · Por sessão · Pagamento posterior · Mensalidade fixa · Mensal (valor especial) · Pro bono ·
    Permuta · Convênio (saíram também Consulta individual, Cartão de parceria e AAPI JF (mensal), que não tinham paciente).
  - **Valor por sessão no cadastro**: "Valor combinado" no formato `R$ 70 por sessão`. O Registrar usa esse valor
    (travado) em Por sessão, Pagamento posterior e Pagamento antecipado; sem ele, a tabela do procedimento.
  - **Pagamento posterior**: a sessão sai com Pago? = Não; o total do mês aparece em Pendências.
  - **Pagamento antecipado**: botão "Recebeu adiantado: lançar sessões pagas" no Registrar. `API.proximasSessoes` busca as
    próximas datas na agenda; `API.lancarAntecipado` grava uma linha por sessão (Atendido, valor por sessão, Pago? = Sim,
    data e forma do pagamento, observação "Pagamento antecipado de N sessões…"). Recusa data já lançada e mês sem aba.
  - **Valor da sessão** ao lado da modalidade no painel do paciente (Agenda) e no cartão do Registrar.
  - **Corrigir lançamento**: botão "Marcar como lançado por engano" (vira "Cancelado pela clínica"); mudar "O que
    aconteceu" de uma sessão de plano devolve ou consome a consulta em Planos.
- **Dados (planilha real)**: 17 pacientes de "Plano de 4 consultas" → "Pagamento posterior" (Valor combinado com
  `R$ <plano/4> por sessão` e o texto antigo depois de "Antes:"; Naimara ficou "a definir pela gestão"), registrados em
  "Alterações de cadastro". Davi Maia Marques e Cristina de Andrade: linhas de compra do plano → "Cancelado pela clínica";
  sessões de 07/10 (Davi, R$ 80) e 06/10 (Cristina, R$ 70) com Pago? = Não; a duplicada da Cristina (A-20261007-193656-j61)
  → "Cancelado pela clínica"; os dois planos em `Planos` → encerrado.
- **Peças**: 24 trocadas (server 3–7, index 6–24; index 24 é nova), gravadas nas linhas 147–170 como `novo:`, lidas de
  volta e conferidas 24/24 contra `dist/pedacos.json`; troca num único update (118–122 e 129–146 viraram `antigo6:`).
  Pra voltar: inverter os nomes dessas linhas.
- **Commit**: ver branch `claude/busy-wright-xf0hql` · **Aprovação**: gestão, 07/10 ("pode publicar direto na versão oficial").


### 2026-10-07-06 · Real (direto) · Pendências pra recepção, Lançamentos e recebimento parcial
- **O que mudou**:
  - Tela "Gestão" virou **Pendências** e abre pra recepção (menu lateral e do celular). Exportar, virada do mês, lembrete e
    regras de cobrança continuam só da gestão. `gestaoResumo` não exige mais perfil gestão.
  - **Lançamentos** (em Pendências): `API.lancamentos` busca por paciente no mês ou em todos os meses; clicar abre a correção
    ampla (data no mesmo mês, hora, paciente, profissional, procedimento, o que aconteceu, valor, valor recebido, cobrança).
    Mudança desses campos exige "quem informou / motivo", vai pra observação da linha e pra aba nova **Alterações de lançamento**.
    O painel da Agenda ("Corrigir lançamento") usa a mesma correção. "+ Lançar sessão que faltou" abre o Registrar
    (a data define a aba; o Registrar mostra "Grava na aba …").
  - **Recebimento parcial**: "Parcial" acrescentado em Listas!B8 (a validação da coluna Pago? já cobria B2:B8). Coluna nova
    **Valor recebido (R$)** criada no fim da aba do mês quando precisa. Registrar ganhou o botão Parcial + "Recebido agora";
    Receber (Agenda e Pendências) recebe total ou parte (soma ao recebido; completa vira "Sim"); cada pagamento fica na
    observação (data, valor, forma, NF) e o Nº da NF acumula ("101, 102"). Pendências, recebido do mês e "a receber" usam o saldo.
- **Peças**: 32 trocadas (server 0–7, index 0–23), gravadas nas linhas 115–146 como `novo:`, conferidas 32/32, troca num update
  (as substituídas viraram `antigo5:`).
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10 ("recepção também… mudar o nome para pendências"; "nf sobre o valor recebido a cada pagamento").

### 2026-10-07-05 · Real (direto) · responsável legal e CPF do pagador
- **O que mudou**: Pacientes ganhou "CPF do pagador" (Quem paga) e o bloco **Responsável** (nome, parentesco com sugestões,
  telefone, CPF), que aparece pra menor de idade ou quando já tem algo preenchido. CPFs extras opcionais, mas validados se
  preenchidos. Colunas novas no fim de Pacientes, criadas no primeiro salvamento: `CPF do pagador`, `Responsável (nome)`,
  `Parentesco do responsável`, `Telefone do responsável`, `CPF do responsável`. Edição grava e registra em "Alterações de cadastro".
  Painel da Agenda mostra "Responsável: nome (parentesco) · telefone".
- **Peças**: 23 trocadas (server 0–6; index 7–22), gravadas nas linhas 92–114 como `novo:`, conferidas 23/23, troca num update
  (as substituídas viraram `antigo4:`).
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10.

### 2026-10-07-04 · Real (direto) · pendências anteriores aparecem pra recepção
- **O que mudou**: `listaDoDia` devolve `pendencias` dos pacientes do dia (mês do dia e o anterior, só sessões de antes do dia):
  particular atendido sem "Pago?" (mesma regra da Gestão) e convênio sem guia assinada. Falta sem aviso não entra (decisão da gestão).
  Na tela: etiqueta na coluna Cobrança ("deve sessão de 29/09 · R$ 70", "guia a assinar · 30/09"), faixa no painel do paciente
  com **Receber** / **Guia assinada** (grava na linha antiga via `corrigirLancamento`) e linhas em "Pendências de hoje".
  Texto do erro "Escolha o profissional."
- **Peças**: 25 trocadas (server 0, 4, 5, 6; index 2–22), gravadas nas linhas 67–91 como `novo:`, conferidas 25/25, troca de nomes num update
  (as substituídas viraram `antigo3:`).
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10 ("sessão sem pagar … guia sem assinatura também … falta sem aviso não precisa").

### 2026-10-07-03 · Real (direto) · nomes: "Horário dos profissionais" e "Agendamento"
- **O que mudou**: "Horário das profissionais" → **Horário dos profissionais**; "Todas as profissionais" → **Todos os profissionais**;
  o botão e o painel "Encaixe no dia" → **Agendamento** (vaga: "+ agendar"). Só textos da tela; servidor igual.
- **Peças**: 6 do index (partes 4, 5, 10, 12, 13, 14) gravadas nas linhas 61–66 como `novo:`, conferidas 6/6, e troca de nomes num update
  (43, 44, 49, 51, 52, 53 viraram `antigo2:`). Pra voltar: inverter os nomes dessas 12 linhas.
- **Conferência**: remontado como o carregador: index = `dist/index.publicado.html`, server e duplicatas = fonte.
- **Aprovação**: gestão, 07/10.

### 2026-10-07-02 · Real (direto) · tela Agenda (grade de horários) + Horário das profissionais
- **O que mudou**: a tela Hoje passa a se chamar **Agenda**, com seletor **Lista | Agenda**. Na Agenda: **Dia** (todas as
  profissionais lado a lado) ou **Semana** (uma profissional). Ocupado = nome do paciente (cor da situação); vaga = branco
  tracejado; intervalo e horário fechado = cinza. Clicar numa vaga abre o "Encaixe no dia" com profissional, dia e hora;
  clicar num nome abre o painel do paciente. Botão **Horário das profissionais**: a recepção grava, por profissional, as faixas
  de cada dia (ex.: `08:00-12:00, 13:00-19:00`) e a duração da sessão; vai para colunas novas no fim da aba **Profissionais**
  (`Horário segunda` … `Horário sábado`, `Duração da sessão (min)`, `Horário alterado por (app)`), criadas no primeiro salvamento.
  Servidor: `listaDoDia` passou a usar `montarDia_` (mesma regra) e ganhou `agendaSemana` e `salvarExpediente`.
- **Publicação sem janela quebrada**: as 29 peças novas foram gravadas nas linhas 32–60 com prefixo `novo:` (o carregador ignora),
  conferidas 29/29 e só então os nomes da coluna A foram trocados num único update (3–28 viraram `antigo:`, 32–60 os nomes reais).
  **Pra voltar atrás**: trocar de volta a coluna A (3–28 sem `antigo:`, 32–60 com `novo:`).
- **Conferência**: lido de volta e remontado como o carregador faz (por arquivo e parte): index igual ao `dist/index.publicado.html`,
  server igual ao fonte.
- **Aprovação**: gestão, 07/10 ("pode colocar as 2 opções", "Clicar numa vaga abre o Encaixe… perfeito").

### 2026-10-07-01 · Real (direto) · convênio de plano não mostra mensalidade/modalidades
- **O que mudou**: no cadastro (Pacientes), com convênio de plano (qualquer um que não seja Particular nem convênio de desconto)
  os cards de modalidade/mensalidade somem e a modalidade fica "Convênio", com a dica "só preencher a carteirinha".
  Particular e convênios de desconto continuam com os cards. Lista de convênios de desconto fixa no código
  (`CONVENIOS_DESCONTO` em `app/client/js/30-pacientes.js`): AAPI JF, Plan Minas. A gestão avisa quando houver outro.
  Na edição, trocar para convênio de desconto não apaga em silêncio a modalidade já gravada.
- **Peças**: 27; regravadas 5: index.html 15–19 (linhas 24–28).
- **Conferência**: as 27 linhas lidas de volta, 27/27 iguais ao build; index remontado igual ao `dist/index.publicado.html`.
- **Aprovação**: gestão, 06–07/10 ("AAPI JF, Plan Minas").

### 2026-10-06-11 · Real (direto) · botão "Horários fixos" na tela Hoje
- **O que mudou**: botão "Horários fixos" no topo da tela Hoje, ao lado de "Encaixe no dia", abre o mesmo painel da Agenda recorrente
  (antes só havia o link discreto no rodapé da tabela, que continua). A recepção mantém os horários fixos por ali (editar, incluir, pausar).
- **Peças**: 27; regravadas 13: index.html 4–8 (linhas 13–17) e 12–19 (linhas 21–28).
- **Conferência**: as 27 linhas lidas de volta, 27/27 iguais ao build; index remontado igual ao `dist/index.publicado.html`, server igual ao fonte.
- **Aprovação**: gestão, 06/10 à noite ("pode fazer a alteração e incluir o botão").

### 2026-10-06-10 · Real (direto, sem passar pela cópia — autorizado pela gestão) · ajustes da avaliação de 06/10
- **O que mudou**:
  - Pacientes (Novo paciente): Profissional vem primeiro e é obrigatório; sem ele os cartões de modalidade ficam
    escondidos e aparece a frase-guia; com ele, só as modalidades da especialidade (coluna "Especialidade (modalidade)" da aba Listas).
  - Registrar ("Salvar e registrar outro"): faixa verde "Registrado! …" com o link "ver na lista de hoje".
  - Mensalistas: abre na competência do mês atual; faixa amarela com as pendências do mês anterior, que troca a competência ao clicar
    (`mensalistasPainel` devolve `anterior`).
  - Fora do código: aba `Agenda recorrente` criada na planilha real com os 28 horários semanais da Juliana (lista da gestão, 06/10),
    IDs `F-20261006-carga-01`–`28`, Hora como texto, listas de escolha em Paciente/Profissional/Dia/Frequência/Ativo.
    A tela Hoje já usa esses horários automaticamente (decisão da gestão: a lista continua automática e a recepção confere com o ControleOdonto).
- **Peças**: 27; regravadas 10: server.js 4–5 (linhas 7–8), index.html 6–7 (linhas 15–16) e 14–19 (linhas 23–28).
- **Conferência**: as 27 linhas lidas de volta, 27/27 iguais ao build; index remontado igual ao `dist/index.publicado.html`, server igual ao fonte.
- **Commit**: este · **Aprovação**: gestão (administrativo@), 06/10 à noite ("pode ir direto pra oficial").
- **Não fizemos** (decidido): virada das colunas automáticas (o app não grava em F/G/H/N; sem conflito), card de "Alterações de cadastro"
  (a linha já abre a tabela com de → para, quem informou e e-mail), painel "Montar a lista".

### 2026-10-06-09 · Real · promoção: correção de lançamentos + plano "vai pagar depois"
- **O que mudou**: `arquivos_real` recebeu tudo o que estava em `arquivos` desde o 06 (correção de lançamentos,
  plano a receber, pendência da compra, tabela de correção em largura cheia, cortes novos do build).
- **Peças**: 27; regravadas só as 21 linhas que diferiam: server.js 1–5 (linhas 4–8), index.html 2 (linha 11) e 5–19
  (linhas 14–28). As outras 6 já eram iguais.
- **Conferência**: lido de volta, 27/27 iguais ao build; index, server e duplicatas remontados idênticos.
- **Commit**: 135de84 (código) · 79b59f0 (docs) · **Aprovação**: Roberta, 06/10 à noite ("ótimo, pode atualizar a planilha nova").

### 2026-10-06-08 · Teste · plano "vai pagar depois", pendência da compra, correção em largura cheia, build
- **O que mudou**: "Lançar plano" com Pagou agora / Vai pagar depois (compra entra com Pago? = Não, sem data nem
  forma, "(a receber)" na observação; Planos normal); `gestaoResumo` e a tela Hoje listam a compra "(compra)" sem Pago?
  na pendência de pagamento; `pacotesPorPaciente_` devolve `pago`; tag "a pagar" no paciente; tabela e painel de
  correção da Gestão em largura cheia abaixo das duas colunas; `build.js` não corta pedaço antes de linha que comece
  com `'`, `=`, `+`, `-` ou `@` (a planilha apagava o apóstrofo inicial do pedaço 9 na primeira gravação desta rodada;
  os cortes do index mudaram do pedaço 8 em diante).
- **Peças**: 27; regravadas: server.js 1–5 (linhas 4–8), index.html 5–19 (linhas 14–28; a primeira gravação pegou
  5–7 e a segunda, depois do ajuste do build, 8–19).
- **Conferência**: lido de volta, 27/27 iguais ao build; remontagens idênticas.
- **Commit**: 135de84 · **Aprovação**: Roberta, 06/10 à noite ("pode fazer os 3").

### 2026-10-06-07 · Teste · correção de lançamentos (gestão e recepção)
- **O que mudou**: função nova `corrigirLancamento` no servidor (acha a linha pelo ID; grava só Pago?, data, forma,
  quem pagou, NF, nº da NF, guia, observação; carimbo "corrigido por"; compra de plano atualiza Planos); na Gestão as
  linhas das pendências ficaram clicáveis com botão Receber · NF · Guia · Anotar e painel de correção; na tela Hoje,
  "Corrigir cobrança" no painel do paciente e no menu ⋯. Valor não se corrige pelo app (decisão da Roberta).
- **Peças**: 27 (o index passou de 19 pra 20 pedaços); regravadas: server.js 1–5 (linhas 4–8), index.html 2 e 5–19
  (linhas 11 e 14–28).
- **Conferência**: lido de volta, 27/27 iguais ao build; remontagens idênticas.
- **Commit**: 632cb0b · **Aprovação**: Roberta, 06/10 ("1. ótimo. 4. gostei também. quero que a recepção já consiga também").

### 2026-10-06-06 · Real (dados) · aba `Setembro` copiada da cópia para a real
- **O que mudou**: a aba `Setembro` importada na cópia (399 lançamentos, IDs `IMP-SET26-001`–`399`, 24 colunas) foi
  copiada inteira para a planilha real com `copySheetTo`, renomeada e movida para antes de `Outubro` (gid 373771041).
  Não é código: é dado. Com isso Setembro entra no seletor de mês da Gestão.
- **Conferência**: cabeçalho, datas e IDs relidos; 399 linhas nas duas.
- **Commit**: bcc598e · Detalhes em `MIGRACAO-REAL-2026-10-06.md`.

### 2026-10-06-05 · Real · promoção: interface revisada + Mensalistas em cards no celular
- **O que mudou**: `arquivos_real` recebeu a interface revisada (menu lateral, Hoje em tabela com painel do paciente,
  valores do dia, Imprimir no cabeçalho, Mensalistas em cards no celular). Antes disso, em `arquivos`: index.html
  pedaços 1, 2 e 16 (linhas 10, 11 e 25) com os cards.
- **Peças**: 26 (duplicatas 1 · server 6 · index 19; linhas 2–27); as 26 linhas gravadas em `arquivos_real`.
- **Conferência**: lido de volta, 26/26 iguais ao build; index e server remontados idênticos.
- **Commits**: 4bdeadd, 672a2b5 · **Aprovação**: Roberta, 06/10 à noite (escolheu cards no celular).

### 2026-10-06-04 · Teste · Pacientes, Mensalistas e Gestão conferidas contra os mockups revisados
- **O que mudou**: botões Imprimir voltaram ao cabeçalho de Mensalistas e Gestão; a tabela de Mensalistas deixou de
  alargar a página no celular.
- **Peças**: 26; regravadas: index.html 0, 1, 2, 4–9, 17, 18 (linhas 9, 10, 11, 13–18, 26, 27).
- **Conferência**: 26/26 iguais ao build; index remontado igual a `dist/index.publicado.html`.
- **Commit**: 59ed7c0.

### 2026-10-06-03 · Teste · Hoje: valores do dia pra recepção e estado da guia
- **O que mudou**: `listaDoDia` passou a devolver também Valor, Pago?, Forma, NF, Guia e Convênio da linha já
  registrada (só leitura, aprovado pela Roberta); tiles em R$ do dia e etiqueta "Guia assinada / a emitir" na tela Hoje.
- **Peças**: 26; regravadas: server.js 3–5 (linhas 6–8), index.html 1, 2 e 9–18 (linhas 10, 11 e 18–27).
- **Conferência**: 26/26 iguais ao build; index remontado idêntico.
- **Commit**: dd2520b.

### 2026-10-06-02b · Teste · tela Hoje revisada + menu lateral
- **O que mudou**: menu lateral de 220 px em todas as telas; Hoje em tabela (hora · paciente · profissional ·
  cobrança · situação · ação), tiles-filtro, busca, painel do paciente à direita (folha no celular), pendências de hoje
  e fim do dia. Nota revisada da Roberta.
- **Peças**: 26 (index virou 19 pedaços, linhas 9–27); server e duplicatas não mudaram.
- **Conferência**: todas as peças conferidas contra o build.
- **Commit**: fb4e6c9.

### 2026-10-06-02a · Teste · guia de convênio começa desmarcada
- **O que mudou**: a caixa "Guia assinada antes da sessão" começa desmarcada e zera a cada paciente (antes vinha
  marcada por padrão).
- **Peças**: regravadas index.html 4, 10, 11, 12 e 13 (linhas 13 e 19–22); LEN e soma de controle conferidos.
- **Commit**: 546ed92.

### 2026-10-06-02 · Real · planilha real no ar (primeira versão em `arquivos_real`) + carregador real
- **O que mudou**: a planilha real "Controle da Recepção 2026" recebeu a configuração da cópia (Listas, Procedimentos,
  Pacientes F/N/Q/R/S/T, Mensalistas B, aba "Alterações de cadastro"; `MIGRACAO-REAL-2026-10-06.md`); o carregador
  ganhou o canal por aba (`Code.gs` lê `arquivos`, `Code.real.gs` lê `arquivos_real`); a Roberta colou
  `dist/Code.real.gs` no Apps Script da real e implantou (URL em `appUrlReal`). `arquivos_real` recebeu a versão
  aprovada daquela noite: 23 peças (interface nova de 5 telas + Lembrete da gestão).
- **Conferência**: 23 pedaços conferidos contra o build.
- **Commits**: 4ad0272, 50496fc, b8bfd23, 1f59bd5 · **Aprovação**: Roberta, 06/10 à noite.

### 2026-10-06-01 · Teste · interface nova (5 telas) + Lembrete da gestão
- **O que mudou**: Hoje, Registrar, Pacientes, Mensalistas e Gestão portadas dos mockups da Roberta (`NOVA-INTERFACE.md`);
  aba `Lembretes` na planilha (só acrescenta linha), card na tela Hoje e campo na Gestão; dica da mensalidade lê a aba
  (sem valor fixo no código); anotação em Mensalistas leva e-mail e hora.
- **Peças**: 23: duplicatas 1 (linha 2), server.js 6 (linhas 3–8), index.html 16 (linhas 9–24).
- **Commits**: 22bb763, 486ee96, 75a7a5e.

### 2026-10-05-01 · Teste · app completo na cópia (série de publicações do dia)
- **O que mudou**, na ordem dos commits: Novo paciente com checagem de duplicatas, carregador e guia de instalação
  (429b32c); modalidades agrupadas por especialidade (baeca38, f126962); Atendimento com regras de cobrança, planos,
  mensalidade, desconto, sessão extra (76de418); Lista do dia + Agenda recorrente semanal/quinzenal, agendar no dia,
  não vem, remarcar, impressão, servidor cria aba do mês (36dcbfe, 0c5d782, 3ae71f6, 3465660, 5caaadf); Editar
  cadastro com log, confirmação da véspera, build em pedaços de 12 k (69856da); Mensalistas, Gestão e remoção de
  agendamento duplicado (2d2262c); Exportar mês salva em `Controle Financeiro/<ano>/<MM Mês_AA>/2_Atendimentos`
  (91be556); modalidades enxutas, "Plano" em vez de "Pacote" (6a24f0c, d22cf26).
- **Peças**: não registradas na época (o registro por deploy começou em 06/10). Cada publicação foi conferida por
  `=LEN()` nas células.
- **Carregador**: mudou em 05/10 pra pedir a permissão do Drive (exportação); a nova versão no Apps Script da cópia
  ficou pendente (`COMO-INSTALAR.md`, "Pendente em 05/10").

### 2026-10-04-01 · Teste · CÓPIA TESTE criada e carregador implantado
- **O que mudou**: a planilha "CÓPIA TESTE - Controle da Recepção 2026" (id `1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk`)
  recebeu o carregador `dist/Code.gs` no Apps Script; URL em `appUrlCopia`. Planilha de código
  "Recepção Nascente — código do app (não mexer)" (id `1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo`) criada com a aba
  `arquivos`.
- **Commits**: 8b96a5f, bf89070, dcc5ff3 (plano), 23153d7 (stack Apps Script), 791a72f (protótipo).
