/* Recepção Nascente — CARREGADOR (a única coisa colada no Apps Script da planilha).
   Ele não contém o app: lê o código da planilha "Recepção Nascente — código do app" e executa.
   Assim, cada atualização do app chega sem mexer aqui. */

var CODIGO_PLANILHA_ID = '1qM7tX5neTU1kAa4JBpk1xiZQmcJOk325hx873XIRPYo';   // planilha "Recepção Nascente — código do app (não mexer)"
var CODIGO_ABA = 'arquivos';                          // colunas: arquivo | parte | conteúdo
var CACHE_SEGUNDOS = 90;                              // quanto tempo guarda o código em memória

function doGet(e) {
  var html = montarTela_();
  return HtmlService.createHtmlOutput(html)
    .setTitle('Recepção Nascente')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function api(nome, dados) {
  try {
    var API = carregarServidor_();
    if (!API[nome]) throw new Error('Função desconhecida: ' + nome);
    return JSON.stringify({ ok: true, dados: API[nome](dados || {}) });
  } catch (err) {
    return JSON.stringify({ ok: false, erro: String(err && err.message || err) });
  }
}

function limparCache() {
  var c = CacheService.getScriptCache(), chaves = [];
  ['index.html', 'server.js', 'duplicatas.js'].forEach(function (a) { for (var i = 0; i < 40; i++) chaves.push('rn:' + a + ':' + i); chaves.push('rn:' + a + ':n'); });
  c.removeAll(chaves);
  return 'cache limpo';
}

function carregarServidor_() {
  var codigo = lerArquivo_('duplicatas.js') + '\n' + lerArquivo_('server.js');
  return eval(codigo);   // server.js termina com a expressão `API`
}

function montarTela_() {
  // a tela recebe o módulo de duplicatas embutido (mesmo código do servidor)
  return lerArquivo_('index.html').replace('/*__DUPLICATAS__*/', function () { return lerArquivo_('duplicatas.js'); });
}

function lerArquivo_(arquivo) {
  var c = CacheService.getScriptCache();
  var n = c.get('rn:' + arquivo + ':n');
  if (n) {
    var partes = [], ok = true;
    for (var i = 0; i < parseInt(n, 10); i++) { var p = c.get('rn:' + arquivo + ':' + i); if (p == null) { ok = false; break; } partes.push(p); }
    if (ok) return partes.join('');
  }
  var ss = SpreadsheetApp.openById(CODIGO_PLANILHA_ID);
  var aba = ss.getSheetByName(CODIGO_ABA) || ss.getSheets()[0];
  var vals = aba.getDataRange().getValues();
  var pedacos = [];
  for (var r = 1; r < vals.length; r++) if (String(vals[r][0]) === arquivo) pedacos.push({ parte: Number(vals[r][1]) || 0, txt: String(vals[r][2] || '') });
  if (!pedacos.length) throw new Error('Arquivo "' + arquivo + '" não encontrado na planilha de código.');
  pedacos.sort(function (a, b) { return a.parte - b.parte; });
  var texto = pedacos.map(function (p) { return p.txt; }).join('');
  try {
    var tam = 90000, k = 0, obj = {};
    for (var pos = 0; pos < texto.length; pos += tam, k++) obj['rn:' + arquivo + ':' + k] = texto.slice(pos, pos + tam);
    obj['rn:' + arquivo + ':n'] = String(k);
    c.putAll(obj, CACHE_SEGUNDOS);
  } catch (e) { /* cache é só aceleração */ }
  return texto;
}
