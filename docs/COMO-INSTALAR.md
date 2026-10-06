# Recepção Nascente — como instalar (5 minutos, uma vez só)

O app mora dentro da planilha. Você vai colar um texto curto (o "carregador") no editor de scripts da planilha e publicar. Depois disso, as atualizações chegam sozinhas: o carregador lê o app da planilha **"Recepção Nascente — código do app (não mexer)"**, que fica na pasta Gestão do Drive.

Faça primeiro na **cópia de teste**. Quando aprovar, repita os mesmos passos na planilha real.

São dois carregadores quase iguais, gerados pelo `node build.js`:

| Planilha | Arquivo a colar | Lê o código da aba |
|---|---|---|
| CÓPIA TESTE | `dist/Code.gs` | `arquivos` (versão de teste) |
| Controle da Recepção 2026 (real) | `dist/Code.real.gs` | `arquivos_real` (versão em uso) |

Assim uma atualização vai primeiro para a cópia; só depois de aprovada ela é copiada para `arquivos_real` e a recepção a recebe.

## Passo a passo

1. Abra a planilha (a cópia de teste: "CÓPIA TESTE - Controle da Recepção 2026").
2. No menu de cima, clique em **Extensões → Apps Script**. Abre uma aba nova com um editor e um arquivo chamado `Código.gs`.
3. Apague tudo que estiver em `Código.gs` e **cole o conteúdo do arquivo `dist/Code.gs`** (eu te mando o texto pronto por mensagem). Salve com **Ctrl+S** (ou o ícone de disquete).
4. Clique no botão azul **Implantar** (canto superior direito) → **Nova implantação**.
5. Na janelinha, clique na engrenagem ao lado de "Selecionar tipo" e escolha **App da Web**.
6. Preencha:
   - Descrição: `Recepção Nascente`
   - Executar como: **Eu** (administrativo@clinicanascente.com.br)
   - Quem pode acessar: **Qualquer pessoa em clinicanascente.com.br**
7. Clique em **Implantar**. O Google vai pedir autorização: clique em **Autorizar acesso**, escolha a conta `administrativo@`, e em **Permitir**.
   - Se aparecer uma tela dizendo "O Google não verificou este app": clique em **Avançado** e depois em **Acessar Recepção Nascente (não seguro)**. É normal para scripts internos da própria empresa.
8. Vai aparecer um **URL do app da Web** (começa com `https://script.google.com/a/macros/clinicanascente.com.br/s/...`). Clique em **Copiar** e me mande.
9. Abra esse link. Deve aparecer a tela "Novo paciente" com o nome da planilha. Pronto.

## Para a recepção usar

Guias de uso: `docs/README-RECEPCAO.md` (recepção) e `docs/README-GESTAO.md` (gestão).

Mande o link para `atendimento@clinicanascente.com.br` e peça para salvar como atalho (no Chrome: menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app; no celular: "Adicionar à tela inicial"). Só abre logado com e-mail da clínica.

## Quando eu atualizar o app

Nada a fazer. Em até 2 minutos a tela nova aparece sozinha (basta recarregar a página). Se eu precisar mudar o próprio carregador (raro), aviso e você repete o passo 3 e depois **Implantar → Gerenciar implantações → ✎ → Versão: Nova versão → Implantar**.

**Pendente em 05/10:** o carregador mudou uma vez, pra pedir a permissão do Drive (a exportação da Gestão agora salva na pasta do Controle Financeiro). Cole o `dist/Code.gs` novo no `Código.gs`, salve, publique a nova versão como acima e, ao abrir o app, autorize de novo quando o Google pedir (vai aparecer o Drive na lista de permissões). Até fazer isso, exportar funciona, mas o arquivo fica na raiz do Meu Drive.

## Se der algum erro

Copie a mensagem que apareceu na tela (ou um print) e me mande. Nada do que você digitou se perde: o rascunho fica guardado no computador até gravar.

## Planilha real (06/10/2026)

Repita os passos 1 a 9 **na planilha "Controle da Recepção 2026"**, colando o conteúdo de **`dist/Code.real.gs`** no passo 3
(não o `dist/Code.gs`). O URL que sair é o endereço definitivo da recepção: me mande para eu registrar em `app/config.json`
(`appUrlReal`) e aqui. Antes de liberar para a recepção, faça as três gravações manuais listadas em
`docs/MIGRACAO-REAL-2026-10-06.md` (Pacientes, Mensalistas coluna B, Listas colunas A e B).

## Endereço atual (cópia de teste, implantado em 04/10/2026; app completo publicado em 05/10: Novo paciente, Atendimento, Lista do dia, Editar cadastro, Mensalistas e Gestão)

`https://script.google.com/a/macros/clinicanascente.com.br/s/AKfycbzsUF7rqLabRtUQAeahEOo4cjdGd_7lLxk1vPl9EMsdjl52lTkbaWui69Ve_pdIHRNe/exec`

Não crie outra "Nova implantação": isso gera outro endereço. Para atualizar o carregador, use Implantar → Gerenciar implantações → lápis → Nova versão.
