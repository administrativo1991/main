// node tests/servidor-ia.test.js — infraestrutura de IA contra a planilha falsa: aba IA criada com a carga inicial, chamarIA
// (sem chave, pausa geral e por item, teto do dia/mês, requisição montada com documento + JSON schema, log com tokens e custo,
// erro da API, recusa, JSON inválido), aviso de 80 % por e-mail uma vez por mês, iaDefinir/iaPausar (só gestão), gatilho.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const fakes = require('./fakes-google');
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date; // 16/10/2026
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)'];
const ss = planilha({ Pacientes: [HP], Listas: [['O que aconteceu', 'Pago?', 'Forma de pagamento', 'Sim/Não', 'Guia assinada?', 'Convênio', 'Regra de cobrança', 'Cobrança', 'Especialidade (modalidade)', 'Pagamento', 'Cobrança (por profissional)', 'Pagamento (por profissional)', 'Feriados', 'Gestão'], ['Atendido', 'Sim', 'Pix', '', '', 'Particular', '', '', '', '', '', '', '', 'gestao@clinicanascente.com.br'], ['', '', '', '', '', 'Cedplan']], 'Parâmetros': [['Parâmetro', 'Valor', 'Descrição']] });
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
let email = 'gestao@clinicanascente.com.br';
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
let resposta = null;
const F = fakes.instalar({ responder: body => resposta ? resposta(body) : null });
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
const lerIA = () => { const s = ss.getSheetByName('IA'), o = {}; s.getRange(2, 1, s.getLastRow() - 1, 2).getValues().forEach(r => { if (r[0]) o[r[0]] = r[1]; }); return o; };
const setIA = (k, v) => { const s = ss.getSheetByName('IA'); const vals = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues(); vals.forEach((r, i) => { if (r[0] === k) s.getRange(i + 2, 2).setValue(v); }); };
const logs = () => { const s = ss.getSheetByName('IA log'); if (!s || s.getLastRow() < 2) return []; const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; return s.getRange(2, 1, s.getLastRow() - 1, h.length).getValues().map(r => { const o = {}; h.forEach((k, i) => { o[k] = r[i]; }); return o; }); };

// 1. estado cria a aba IA com a carga inicial; sem chave
let e = ok(API.iaEstado(), 'estado');
assert.ok(ss.getSheetByName('IA'), 'aba IA criada'); const cfg = lerIA();
assert.strictEqual(cfg.modelo, 'claude-sonnet-5-5'); assert.strictEqual(cfg.teto_mes_usd, 10); assert.ok(/conciliar o extrato/.test(cfg.instrucao_conciliacao), 'instrução da conciliação na carga inicial'); assert.strictEqual(cfg.teto_dia_usd, 3); assert.strictEqual(cfg.ia_ativa, 'Sim'); assert.ok(String(cfg.instrucao_guias).length > 100);
assert.strictEqual(e.ativa, true); assert.strictEqual(e.temChave, false); assert.strictEqual(e.gastoMes, 0); assert.strictEqual(e.pausada, '');
let r; assert.strictEqual(typeof API.gatilhoDiarioIA, 'function');
// chamarIA é função interna do servidor: pra testá-la direto, o servidor é avaliado de novo com uma ponte no API
const SRC = require('./carregar-servidor')() + '\nAPI.__chamar = function (item, p) { return chamarIA(item, p); }; API;';
const API2 = (0, eval)(SRC);
r = API2.__chamar('guias', { texto: 'oi', arquivos: 1 });
assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, 'sem_chave'); assert.strictEqual(F.chamadas.length, 0);

// 2. com chave: requisição montada (modelo, system da aba, documento base64, texto, json_schema, effort), resposta em JSON, log com custo
F.props.ANTHROPIC_API_KEY = 'sk-teste';
resposta = () => ({ content: [{ type: 'text', text: JSON.stringify({ a: 1 }) }], usage: { input_tokens: 1000, output_tokens: 200 }, stop_reason: 'end_turn', model: 'claude-haiku-5-5' });
r = API2.__chamar('guias', { texto: 'leia', documentos: [{ nome: 'g.pdf', bytes: Array.from(Buffer.from('%PDF-1.4 teste')), mime: 'application/pdf' }], schema: { type: 'object' }, arquivos: 1, linhas: 7, observacao: 'g.pdf' });
ok(r, 'chamada'); assert.deepStrictEqual(r.dados, { a: 1 }); assert.strictEqual(r.usage.entrada, 1000); assert.strictEqual(r.usage.saida, 200);
assert.strictEqual(r.custo, Math.round((1000 * 0.1 + 200 * 0.5) / 1e6 * 1e6) / 1e6, 'custo = tokens × preço do modelo que respondeu (Haiku)'); // 0.0002
const c1 = F.chamadas[0]; assert.strictEqual(c1.headers['x-api-key'], 'sk-teste'); assert.strictEqual(c1.body.model, 'claude-sonnet-5-5'); assert.strictEqual(c1.body.fallbacks, 'default', 'Sonnet: fallback de recusa'); assert.strictEqual(c1.headers['anthropic-beta'], 'server-side-fallback-2026-07-01'); assert.ok(/guias de atendimento/.test(c1.body.system));
assert.strictEqual(c1.body.messages[0].content[0].type, 'document'); assert.strictEqual(c1.body.messages[0].content[0].source.media_type, 'application/pdf'); assert.strictEqual(c1.body.messages[0].content[0].source.data, Buffer.from('%PDF-1.4 teste').toString('base64'));
assert.strictEqual(c1.body.messages[0].content[1].text, 'leia'); assert.strictEqual(c1.body.output_config.format.type, 'json_schema'); assert.strictEqual(c1.body.output_config.effort, 'low'); assert.ok(!c1.body.thinking, 'sem parâmetro thinking (Haiku 5.5 decide sozinho)');
let L = logs(); assert.strictEqual(L.length, 1); assert.strictEqual(L[0]['Item'], 'guias'); assert.strictEqual(L[0]['Tokens entrada'], 1000); assert.strictEqual(L[0]['Tokens saída'], 200); assert.strictEqual(L[0]['Custo (US$)'], 0.0002); assert.strictEqual(L[0]['Quem'], email); assert.strictEqual(L[0]['Resultado'], 'ok'); assert.strictEqual(L[0]['Linhas'], 7);
e = ok(API2.iaEstado(), 'estado 2'); assert.strictEqual(e.gastoMes, 0.0002); assert.strictEqual(e.gastoDia, 0.0002); assert.strictEqual(e.chamadasMes, 1);

// 2b. preço por modelo: Sonnet pela tabela do código; modelo fora da tabela pelas células da aba; Haiku sem fallback
resposta = () => ({ content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 1000, output_tokens: 200 }, stop_reason: 'end_turn', model: 'claude-sonnet-5-5' });
r = ok(API2.__chamar('guias', { texto: 'x', schema: { type: 'object' } }), 'sonnet'); assert.strictEqual(r.custo, 0.004, '1000 × 2 + 200 × 10 por milhão');
resposta = () => ({ content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 1000, output_tokens: 200 }, stop_reason: 'end_turn', model: 'claude-futuro-9' });
r = ok(API2.__chamar('guias', { texto: 'x', schema: { type: 'object' } }), 'modelo novo'); assert.strictEqual(r.custo, 0.004, 'células preco_* (2 e 10)');
setIA('modelo', 'claude-haiku-5-5'); r = ok(API2.__chamar('guias', { texto: 'x' }), 'haiku'); assert.ok(!F.chamadas[F.chamadas.length - 1].body.fallbacks && !F.chamadas[F.chamadas.length - 1].headers['anthropic-beta'], 'Haiku sem fallback'); setIA('modelo', 'claude-sonnet-5-5');
// conta sem o beta de fallback: 400 citando fallback → refaz sem o parâmetro
resposta = body => body.fallbacks ? { code: 400, json: { type: 'error', error: { type: 'invalid_request_error', message: 'fallbacks: beta not enabled' } } } : ({ content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn' });
const nAntes = F.chamadas.length; r = ok(API2.__chamar('guias', { texto: 'x' }), 'sem beta'); assert.strictEqual(F.chamadas.length, nAntes + 2); assert.ok(!F.chamadas[nAntes + 1].body.fallbacks);
// a chamada de teste do Haiku na fila acima entra no log; as do bloco 4 contam a partir daqui
const LOG_ANTES = logs().length;

// 3. imagem vira bloco image; sem schema devolve texto
resposta = () => ({ content: [{ type: 'text', text: 'texto livre' }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn' });
r = ok(API2.__chamar('perguntar', { texto: 'q', documentos: [{ nome: 'f.jpg', bytes: [1, 2, 3], mime: 'image/jpeg' }] }), 'imagem');
const cImg = F.chamadas[F.chamadas.length - 1]; assert.strictEqual(r.dados, 'texto livre'); assert.strictEqual(cImg.body.messages[0].content[0].type, 'image'); assert.strictEqual(cImg.body.messages[0].content[0].source.media_type, 'image/jpeg'); assert.ok(!cImg.body.system, 'instrucao_perguntar vazia → sem system');

// 4. erro da API, recusa e JSON inválido: ok:false com motivo, log registrado, app segue
resposta = () => ({ code: 529, json: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } });
r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, 'erro_api'); assert.ok(/529/.test(r.mensagem));
resposta = () => ({ content: [], usage: { input_tokens: 10, output_tokens: 0 }, stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber' } });
r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, 'recusa');
resposta = () => ({ content: [{ type: 'text', text: '{"a":' }], usage: { input_tokens: 10, output_tokens: 3000 }, stop_reason: 'max_tokens' });
r = API2.__chamar('guias', { texto: 'x', schema: { type: 'object' } }); assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, 'json_invalido'); assert.ok(/cortada/.test(r.mensagem));
L = logs(); assert.deepStrictEqual(L.slice(LOG_ANTES + 1).map(x => x['Resultado']), ['erro 529', 'recusa', 'json inválido']);
const fetchOriginal = global.UrlFetchApp.fetch; global.UrlFetchApp.fetch = () => { throw new Error('DNS error'); };
r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, 'erro_api'); assert.ok(/DNS/.test(r.mensagem));
global.UrlFetchApp.fetch = fetchOriginal; F.chamadas.length = 0;

// 5. pausa geral e por item pela aba IA; iaDefinir só gestão; iaPausar grava e registra no log
resposta = () => ({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn' });
setIA('ia_ativa', 'Não'); r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.motivo, 'pausada'); assert.strictEqual(r.mensagem, 'IA pausada pela gestão');
e = API2.iaEstado(); assert.strictEqual(e.ativa, false); assert.strictEqual(e.pausada, 'pausada');
setIA('ia_ativa', 'Sim'); setIA('ia_guias', 'Não'); r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.motivo, 'pausada_item'); assert.ok(/Guias/.test(r.mensagem));
r = ok(API2.__chamar('perguntar', { texto: 'x' }), 'outro item segue'); setIA('ia_guias', 'Sim');
email = 'recepcao@clinicanascente.com.br'; r = API2.iaPausar({ ativa: false }); assert.strictEqual(r.ok, false); email = 'gestao@clinicanascente.com.br';
r = ok(API2.iaPausar({ ativa: false }), 'pausar'); assert.strictEqual(lerIA().ia_ativa, 'Não'); assert.strictEqual(r.estado.ativa, false);
r = ok(API2.iaPausar({ ativa: true }), 'reativar'); assert.strictEqual(lerIA().ia_ativa, 'Sim');
r = ok(API2.iaDefinir({ chave: 'hora_gatilho', valor: '20' }), 'hora'); assert.strictEqual(lerIA().hora_gatilho, 20);
r = API2.iaDefinir({ chave: 'modelo', valor: 'x' }); assert.strictEqual(r.ok, false, 'modelo não se edita pela tela');
L = logs(); assert.ok(L.some(x => x['Item'] === 'config' && /ia_ativa: Sim → Não/.test(x['Resultado'])), 'pausa registrada no log');

// 6. teto do dia e do mês (soma do IA log) + aviso de 80 % por e-mail, uma vez por mês
const gastoAtual = API2.iaEstado().gastoMes;
setIA('teto_dia_usd', 0.0001); r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.motivo, 'teto_dia'); assert.ok(/teto do dia/.test(r.mensagem)); setIA('teto_dia_usd', 3);
setIA('teto_mes_usd', 0.0001); r = API2.__chamar('guias', { texto: 'x' }); assert.strictEqual(r.motivo, 'teto_mes'); assert.ok(/teto do mês atingido \(US\$ /.test(r.mensagem));
e = API2.iaEstado(); assert.strictEqual(e.pausada, 'teto_mes'); assert.ok(e.pct >= 100);
setIA('teto_mes_usd', gastoAtual * 1.2); // uma chamada passa dos 80 %
assert.strictEqual(F.mails.length, 0);
r = ok(API2.__chamar('guias', { texto: 'x' }), 'chamada 80%'); assert.strictEqual(F.mails.length, 1); assert.strictEqual(F.mails[0].para, 'administrativo@clinicanascente.com.br'); assert.ok(/% do teto do mês/.test(F.mails[0].assunto));
r = ok(API2.__chamar('guias', { texto: 'x' }), 'de novo'); assert.strictEqual(F.mails.length, 1, 'um e-mail por mês'); assert.ok(F.props['ia_aviso_10-2026']);
setIA('teto_mes_usd', 20);
// planilha que já tinha a aba IA com instrucao_conciliacao vazia (a real, em 16/10): a carga nova preenche a célula uma vez
setIA('instrucao_conciliacao', ''); API2.iaEstado(); assert.ok(/conciliar o extrato/.test(lerIA().instrucao_conciliacao)); assert.strictEqual(lerIA().instrucao_perguntar, '', 'vazia sem padrão continua vazia');
// teto pela tela (só gestão, de 1 a 500, registrado no log)
email = 'recepcao@clinicanascente.com.br'; assert.strictEqual(API2.iaDefinir({ chave: 'teto_mes_usd', valor: 50 }).ok, false); email = 'gestao@clinicanascente.com.br';
assert.strictEqual(API2.iaDefinir({ chave: 'teto_mes_usd', valor: '0' }).ok, false); assert.strictEqual(API2.iaDefinir({ chave: 'teto_mes_usd', valor: 'abc' }).ok, false);
r = ok(API2.iaDefinir({ chave: 'teto_mes_usd', valor: '15,5' }), 'teto 15,5'); assert.strictEqual(lerIA().teto_mes_usd, 15.5); assert.strictEqual(r.estado.tetoMes, 15.5);
assert.ok(/teto_mes_usd: 20 → 15.5/.test(logs().pop()['Resultado']));

// 7. gatilho: instalar (só gestão) cria um gatilho na hora da aba; instalar de novo troca sem duplicar
r = ok(API2.iaInstalarGatilho(), 'gatilho'); assert.strictEqual(r.hora, 20); assert.strictEqual(F.triggers.length, 1); assert.strictEqual(F.triggers[0].getHandlerFunction(), 'gatilhoDiarioIA');
r = ok(API2.iaInstalarGatilho(), 'gatilho 2'); assert.strictEqual(F.triggers.length, 1);
e = API2.iaEstado(); assert.strictEqual(e.gatilho.instalado, true); assert.strictEqual(e.horaGatilho, 20);
r = ok(API2.gatilhoDiarioIA({}), 'gatilho roda'); assert.strictEqual(r.rotinas.length, 1, 'a rotina das guias está registrada');
console.log('servidor-ia: ok (' + logs().length + ' linhas no IA log)');
