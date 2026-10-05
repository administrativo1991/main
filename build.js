// node build.js  → gera dist/index.html, dist/server.js e dist/Code.gs (carregador com o id da planilha de código)
const fs = require('fs'), path = require('path');
const raiz = __dirname;
const dup = fs.readFileSync(path.join(raiz, 'app/server/duplicatas.js'), 'utf8');
const server = fs.readFileSync(path.join(raiz, 'app/server/server.js'), 'utf8');
const client = fs.readFileSync(path.join(raiz, 'app/client/index.html'), 'utf8');
const loader = fs.readFileSync(path.join(raiz, 'app/loader/Code.gs'), 'utf8');
const cfg = JSON.parse(fs.readFileSync(path.join(raiz, 'app/config.json'), 'utf8'));
fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist/index.html'), client.replace('/*__DUPLICATAS__*/', () => dup));
fs.writeFileSync(path.join(raiz, 'dist/server.js'), dup + '\n' + server);
fs.writeFileSync(path.join(raiz, 'dist/Code.gs'), loader.replace('__CODIGO_PLANILHA_ID__', cfg.codigoPlanilhaId));
// pedaços para a planilha de código: cada arquivo é dividido em células de até 12.000 caracteres,
// cortadas em fim de linha. O carregador junta as partes pelo número da coluna "parte".
// Células pequenas = cada atualização reescreve só o pedaço que mudou.
const TAM = 12000, linhas = [];
function pedacos(txt) {
  const partes = []; let atual = '';
  const ls = txt.split('\n');
  ls.forEach((l, i) => {
    const peca = l + (i < ls.length - 1 ? '\n' : '');
    if (atual && atual.length + peca.length > TAM) { partes.push(atual); atual = ''; }
    atual += peca;
  });
  if (atual) partes.push(atual);
  return partes;
}
// na planilha de código ficam os 3 arquivos-fonte separados; o carregador monta (index + duplicatas, duplicatas + server)
for (const [nome, txt] of [['duplicatas.js', dup], ['server.js', server], ['index.html', client]]) {
  pedacos(txt).forEach((t, k) => linhas.push([nome, k, t]));
}
fs.writeFileSync(path.join(raiz, 'dist/pedacos.json'), JSON.stringify(linhas));
console.log('dist ok:', linhas.map(l => l[0] + '#' + l[1] + ' (' + l[2].length + ')').join(', '));
