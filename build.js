// node build.js  → monta a tela a partir de app/client/{styles.css, layout.html, telas/*.html, js/*.js, assets/*.svg}
// e gera dist/index.html (simulação local, com duplicatas embutido), dist/server.js, dist/Code.gs e dist/pedacos.json.
const fs = require('fs'), path = require('path');
const raiz = __dirname, C = p => path.join(raiz, 'app/client', p);
const ler = p => fs.readFileSync(p, 'utf8');
const dup = ler(path.join(raiz, 'app/server/duplicatas.js'));
const server = ler(path.join(raiz, 'app/server/server.js'));
const loader = ler(path.join(raiz, 'app/loader/Code.gs'));
const cfg = JSON.parse(ler(path.join(raiz, 'app/config.json')));

// logos: SVG inline. O horizontal vem com o texto branco (fundo roxo): vira currentColor pra ficar roxo no cabeçalho branco.
// Os dois arquivos usam os mesmos ids de clipPath; o símbolo ganha prefixo pra não colidir no mesmo documento.
function svgInline(arquivo, viewBox, classe, prefixo) {
  let s = ler(C('assets/' + arquivo)).replace(/<\?xml[^>]*>\s*/, '').replace(/\s+xmlns:(xlink|inkscape)="[^"]*"/g, '');
  s = s.replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" class="' + classe + '" role="img" aria-label="Clínica Nascente" focusable="false">');
  s = s.replace(/fill="#ffffff"/gi, 'fill="currentColor"');
  if (prefixo) s = s.replace(/clip_/g, prefixo + 'clip_');
  // uma tag por linha: o divisor de pedaços corta em fim de linha e nenhuma célula passa de 12.000 caracteres
  return s.replace(/\n/g, '').replace(/>\s*</g, '>\n<');
}
const logoH = svgInline('logo-h.svg', '234 423 2133 354', 'logo-h');
const simbolo = svgInline('simbolo.svg', '505 625 990 750', 'simbolo', 's');

const telas = fs.readdirSync(C('telas')).filter(f => f.endsWith('.html')).sort().map(f => ler(C('telas/' + f))).join('\n');
const js = fs.readdirSync(C('js')).filter(f => f.endsWith('.js')).sort().map(f => '/* ===== ' + f + ' ===== */\n' + ler(C('js/' + f))).join('\n');
const layout = ler(C('layout.html')).replace('<!--LOGO_H-->', logoH).replace('<!--SIMBOLO-->', simbolo).replace('<!--TELAS-->', telas);
const client = ler(C('index.tpl.html'))
  .replace('/*__STYLES__*/', () => ler(C('styles.css')))
  .replace('<!--__LAYOUT__-->', () => layout)
  .replace('/*__APP__*/', () => "(function(){\n'use strict';\n" + js + '\n})();');

// versão publicada na planilha: sem a simulação (mock só roda fora do Google) e sem indentação, pra caber em menos pedaços
const publicado = client
  .replace(/\/\*__MOCK_INICIO__\*\/[\s\S]*?\/\*__MOCK_FIM__\*\//, "function mock() { return Promise.reject(new Error('Simulação indisponível no app publicado.')); }")
  .split('\n').map(l => l.replace(/^\s+/, '')).filter(l => l !== '').join('\n');
if (!/__MOCK_FIM__/.test(client) || /var mockReg/.test(publicado)) throw new Error('remoção da simulação falhou: confira os marcadores em 00-base.js');
fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist/index.html'), client.replace('/*__DUPLICATAS__*/', () => dup));
fs.writeFileSync(path.join(raiz, 'dist/index.publicado.html'), publicado);
fs.writeFileSync(path.join(raiz, 'dist/server.js'), dup + '\n' + server);
fs.writeFileSync(path.join(raiz, 'dist/Code.gs'), loader.replace('__CODIGO_PLANILHA_ID__', cfg.codigoPlanilhaId));
// pedaços para a planilha de código: cada arquivo é dividido em células de até 12.000 caracteres,
// cortadas em fim de linha. O carregador junta as partes pelo número da coluna "parte".
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
for (const [nome, txt] of [['duplicatas.js', dup], ['server.js', server], ['index.html', publicado]]) {
  pedacos(txt).forEach((t, k) => linhas.push([nome, k, t]));
}
fs.writeFileSync(path.join(raiz, 'dist/pedacos.json'), JSON.stringify(linhas));
console.log('dist ok:', linhas.map(l => l[0] + '#' + l[1] + ' (' + l[2].length + ')').join(', '));
