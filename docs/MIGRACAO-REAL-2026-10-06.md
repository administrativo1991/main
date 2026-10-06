# Passagem para a planilha real — 06/10/2026

Objetivo: deixar a planilha real "Controle da Recepção 2026" (id `1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs`)
com a mesma configuração aprovada na CÓPIA TESTE em 05/10 (decisão 7.11 do plano: modalidades enxutas,
"plano" em vez de "pacote", mensalidade fixa). A aba Outubro da real estava vazia; nenhum atendimento foi tocado.
Este arquivo não traz dados de pacientes: a fonte dos valores é sempre a própria CÓPIA TESTE.

## Feito em 06/10 (conferido depois por leitura)

| Aba da planilha real | O que mudou |
|---|---|
| `Listas` | coluna H (Modalidade) reescrita com as 12 modalidades novas, linhas 15–18 limpas; coluna I nova "Especialidade (modalidade)" |
| `Procedimentos` | linhas 2–64 reescritas iguais à cópia: variantes "– plano de N consultas", "– mensalidade fixa", "Sessão de terapia ABA – AAPI JF", compras "Plano de N consultas – especialidade (compra)"; preços iguais aos anteriores |
| `Alterações de cadastro` | aba criada com o cabeçalho do app e as 4 alterações já registradas na cópia em 05/10 (duas pacientes, informadas pela Roberta) |
| Planilha de código | aba `arquivos_real` criada como cópia de `arquivos`; a real passa a ler dela |

As abas `Planos`, `Lista do dia` e `Agenda recorrente` e as colunas novas de `Pacientes` (T–Y) e da aba do mês (U, V)
o app cria sozinho no primeiro uso.

## Concluído em 06/10 à noite (sessão em modo "Accept edits", aprovado pela Roberta)

Os quatro passos abaixo, que de tarde tinham sido barrados pela permissão da sessão em modo Auto, foram gravados
pelo assistente à noite e conferidos por releitura:

| Gravação | Resultado conferido |
|---|---|
| `Pacientes` F, N, R, S (linhas 2–528) + Q136 (convênio da edição registrada) + cabeçalho T1:Y1 + carimbos T70 e T136 | Pacientes da real idêntica à cópia nas 528 linhas; só F523 e Q523 ficam vazias de propósito; linha 529 (teste) não existe na real |
| `Mensalistas` B2:B42 | iguais à cópia (B43 vazia nas duas) |
| `Listas` A2:A6 e B6 | iguais ao combinado |
| Planilha de código: `arquivos` A1:C30 → `arquivos_real` (só valores) | 23 pedaços idênticos ao `dist/pedacos.json` |

Antes de gravar, as duas planilhas foram comparadas coluna a coluna: a real não tinha nenhuma célula preenchida que a cópia
não tivesse, então nada foi perdido. O que ficou da Roberta: instalar `dist/Code.real.gs` na real (`docs/COMO-INSTALAR.md`)
e mandar o URL. Pendência pequena, sem pressa: copiar `Mensalistas!I2:I42` da real para a cópia, porque a cópia ainda tem o
texto antigo das observações (as decisões de preço de 05/10 à noite só estão na real).

## Como foi feito (registro; os passos abaixo já não precisam ser repetidos)

Em todas as gravações, a fonte é a CÓPIA TESTE.

### 1. `Pacientes`, colunas F, N, R e S (modalidade, valor combinado, regra e observação de cobrança)

Na CÓPIA TESTE, selecionar `Pacientes!F2:F528`, copiar e colar **só valores** em `Pacientes!F2:F528` da real;
repetir para `N2:N528`, `R2:R528` e `S2:S528`. As duas planilhas têm os mesmos pacientes nas mesmas linhas até a 528.
Depois desfazer na real a linha 523 (uma paciente que foi editada na cópia sem registro em "Alterações de cadastro":
F e Q voltam a ficar vazios) e **não** copiar a linha 529 (paciente de teste que só existe na cópia).
Resultado esperado: 42 pacientes mudam (36 mensalistas e 2 cadastros corrigidos em 05/10, mais 4 que só trocam o rótulo da modalidade), 96 células.

### 2. `Mensalistas`, coluna B (Modalidade), linhas 2–43

Copiar `Mensalistas!B2:B43` da cópia e colar só valores na real. As colunas C (valor), E–H (pagamentos) e I (observação)
**não** mudam: a coluna I da real tem anotações da Roberta de 05/10 à noite que a cópia não tem.

### 3. `Listas`, colunas A e B

- A2:A6 (O que aconteceu): `Atendido` · `Desmarcou com antecedência (≥ 24h)` · `Faltou avisando em cima da hora (< 24h)` · `Faltou sem aviso` · `Cancelado pela clínica`.
- B6 (Pago?): `Pacote já pago` → `Plano já pago`.

Enquanto não mudar, o app continua funcionando: ele reconhece os dois rótulos.

### 4. Planilha de código: promover a versão aprovada para `arquivos_real`

Na planilha "Recepção Nascente — código do app (não mexer)", aba `arquivos`, selecionar `A1:C30`, copiar, ir à aba
`arquivos_real`, clicar em A1 e colar **só valores** (Ctrl+Shift+V). Isso leva a versão aprovada na cópia em 06/10 à noite
(Lembrete da gestão + guia de convênio desmarcada) para a planilha real. Em até 2 minutos o app da real recarrega sozinho.

## Links diretos (abrem na aba e no intervalo certos; úteis para conferir)

| Passo | Origem (CÓPIA TESTE) | Destino (real) |
|---|---|---|
| 1 Pacientes F | https://docs.google.com/spreadsheets/d/1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk/edit#gid=1311125793&range=F2:F528 | https://docs.google.com/spreadsheets/d/1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs/edit#gid=1311125793&range=F2:F528 |
| 1 Pacientes N | …/1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk/edit#gid=1311125793&range=N2:N528 | …/1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs/edit#gid=1311125793&range=N2:N528 |
| 1 Pacientes R | …&range=R2:R528 | …&range=R2:R528 |
| 1 Pacientes S | …&range=S2:S528 | …&range=S2:S528 |
| 1 linha 523 (limpar F e Q na real) | — | …/1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs/edit#gid=1311125793&range=F523:Q523 |
| 2 Mensalistas B | …/1u6uUDpgfwP9lfBOist41JJ7zYBQtQoJzRegTsonPiyk/edit#gid=10&range=B2:B43 | …/1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs/edit#gid=10&range=B2:B43 |
| 3 Listas A2:B6 | — (digitar) | …/1WvuEvxKvtRs14ddAa2QqhQkJywwQOZmZqU0o6QyqUqs/edit#gid=50&range=A2:B6 |
| 4 código `arquivos` → `arquivos_real` | https://docs.google.com/spreadsheets/d/1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo/edit#gid=0&range=A1:C30 | https://docs.google.com/spreadsheets/d/1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo/edit#gid=812108621&range=A1 |

## Como conferir depois

Abrir o app apontado para a real, tela Pacientes → Buscar / editar cadastro, e abrir um mensalista:
a modalidade tem que aparecer como "Mensalidade fixa" ou "Plano de 4 consultas" e a observação de cobrança preenchida.
Na tela Registrar, o aviso de mensalista (verde, amarelo ou vermelho conforme o dia) aparece para esses pacientes.
