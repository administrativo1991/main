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
// pedaços para a planilha de código (células de até 45.000 caracteres)
const TAM = 45000, linhas = [];
// na planilha de código ficam os 3 arquivos-fonte separados; o carregador monta (index + duplicatas, duplicatas + server)
for (const [nome, txt] of [['duplicatas.js', dup], ['server.js', server], ['index.html', client]]) {
  for (let i = 0, k = 0; i < txt.length; i += TAM, k++) linhas.push([nome, k, txt.slice(i, i + TAM)]);
}
fs.writeFileSync(path.join(raiz, 'dist/pedacos.json'), JSON.stringify(linhas));
console.log('dist ok:', linhas.map(l => l[0] + '#' + l[1] + ' (' + l[2].length + ')').join(', '));
