// serviços do Google falsos pros testes da IA e das guias: UrlFetchApp (resposta programada), PropertiesService, MailApp, ScriptApp,
// DriveApp (árvore de pastas em memória) e Utilities (base64, digest, formatDate)
const { fmt } = require('./planilha-falsa');
function instalar(opts) {
  opts = opts || {};
  const props = {}, mails = [], triggers = [], chamadas = [];
  global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) };
  global.MailApp = { sendEmail: (para, assunto, corpo) => { mails.push({ para, assunto, corpo }); }, getRemainingDailyQuota: () => 100 };
  global.ScriptApp = { getProjectTriggers: () => triggers.slice(), deleteTrigger: t => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); },
    newTrigger: fn => { const t = { getHandlerFunction: () => fn, hora: null }; const b = { timeBased: () => b, everyDays: () => b, atHour: h => { t.hora = h; return b; }, inTimezone: () => b, create: () => { triggers.push(t); return t; } }; return b; } };
  // resposta da API: opts.responder(body) devolve { code, json } ou um objeto (= 200)
  global.UrlFetchApp = { fetch: (url, o) => { const body = JSON.parse(o.payload); chamadas.push({ url, headers: o.headers, body }); const r = opts.responder ? opts.responder(body, chamadas.length) : { code: 200, json: { content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 100, output_tokens: 50 }, stop_reason: 'end_turn', model: body.model } }; const code = r.code || 200, json = r.json || r; return { getResponseCode: () => code, getContentText: () => typeof json === 'string' ? json : JSON.stringify(json) }; } };
  global.Utilities = { formatDate: fmt, base64Encode: b => Buffer.from(b).toString('base64'), DigestAlgorithm: { MD5: 'md5' },
    computeDigest: (alg, bytes) => { const h = require('crypto').createHash('md5').update(Buffer.from(bytes)).digest(); return Array.from(h).map(x => (x > 127 ? x - 256 : x)); } };
  return { props, mails, triggers, chamadas };
}
// Drive falso: pasta(nome, { pastas: [...], arquivos: [{ nome, mime, bytes }] })
let seq = 0;
function iter(lista) { let i = 0; return { hasNext: () => i < lista.length, next: () => lista[i++] }; }
function arquivo(nome, mime, bytes) { const id = 'f' + (++seq); const b = Buffer.from(bytes || ('conteudo de ' + nome)); return { getId: () => id, getName: () => nome, getMimeType: () => mime || 'application/pdf', getSize: () => b.length, getUrl: () => 'https://drive.google.com/file/d/' + id + '/view', getBlob: () => ({ getBytes: () => Array.from(b), getContentType: () => mime || 'application/pdf' }) }; }
function pasta(nome, filhos) { const id = 'p' + (++seq); filhos = filhos || {}; const p = { getId: () => id, getName: () => nome, getFolders: () => iter(filhos.pastas || []), getFiles: () => iter(filhos.arquivos || []), getUrl: () => 'https://drive.google.com/drive/folders/' + id }; return p; }
function instalarDrive(raiz) { const todas = {}; (function walk(p) { todas[p.getId()] = p; const it = p.getFolders(); while (it.hasNext()) walk(it.next()); })(raiz); global.DriveApp = { getFolderById: id => { if (!todas[id]) throw new Error('pasta não encontrada: ' + id); return todas[id]; }, getRootFolder: () => raiz }; return todas; }
module.exports = { instalar, arquivo, pasta, instalarDrive };
