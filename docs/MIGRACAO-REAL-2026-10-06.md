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

## Ficou para fazer à mão (gravação bloqueada pela permissão da sessão)

Três gravações na planilha real foram barradas pelo controle de permissões do assistente. Em todas, a fonte é a CÓPIA TESTE.

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

## Como conferir depois

Abrir o app apontado para a real, tela Pacientes → Buscar / editar cadastro, e abrir um mensalista:
a modalidade tem que aparecer como "Mensalidade fixa" ou "Plano de 4 consultas" e a observação de cobrança preenchida.
Na tela Registrar, o aviso de mensalista (verde, amarelo ou vermelho conforme o dia) aparece para esses pacientes.
