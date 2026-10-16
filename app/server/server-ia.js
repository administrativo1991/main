/* ================= IA — infraestrutura genérica (16/10/2026) =================
   Mesmo escopo de server.js / server-cobranca.js / server-fase2.js (montado pelo build). Usada por qualquer item que fale com a
   API Claude: guias (server-guias.js), conciliação assistida e "perguntar à planilha" (próximos).
   Princípios: o modelo só propõe (quem grava é a pessoa, com um clique); a chave fica em PropertiesService
   (ANTHROPIC_API_KEY), nunca no código nem na planilha; modelo, tetos, hora do gatilho e instruções ficam na aba `IA`
   (a gestão edita); toda chamada vai pro `IA log` com tokens e custo; pausa geral e por item + teto do mês e do dia são
   conferidos ANTES de cada chamada; a API nunca derruba o app: chamarIA devolve { ok:false, motivo } e a tela decide o texto. */
var ABA_IA = 'IA', ABA_IA_LOG = 'IA log';
var HIA = ['Parâmetro', 'Valor', 'Descrição'];
var HIA_LOG = ['Data/hora', 'Item', 'Arquivos', 'Linhas', 'Modelo', 'Tokens entrada', 'Tokens saída', 'Custo (US$)', 'Quem', 'Resultado', 'Observação', 'Duração (s)'];
var IA_ITENS = { guias: 'Guias', conciliacao: 'Conciliação', perguntar: 'Perguntar' };
var IA_URL = 'https://api.anthropic.com/v1/messages', IA_VERSAO = '2023-06-01';
var IA_CHAVE_PROP = 'ANTHROPIC_API_KEY';
// carga inicial da aba IA (criada pelo app se não existir; chaves que faltarem são acrescentadas no fim, sem mexer nas existentes)
var IA_PADRAO = [
  ['ia_ativa', 'Sim', 'Geral. "Não" pausa toda chamada à IA (guias, conciliação, perguntar). O card "Uso da IA" em Pendências grava aqui (Pausar tudo / Reativar). Pausar não perde nada: as guias ficam na pasta e são lidas quando reativar.'],
  ['ia_guias', 'Sim', 'Leitura das guias de convênio da pasta do Drive (gatilho diário). "Não" pausa só este item.'],
  ['ia_conciliacao', 'Sim', 'Conciliação assistida (próximo item). "Não" pausa só este item.'],
  ['ia_perguntar', 'Sim', '"Perguntar à planilha" (próximo item). "Não" pausa só este item.'],
  ['modelo', 'claude-haiku-5-5', 'Modelo da API Claude. Haiku 5.5 = o mais barato da família com leitura de PDF/imagem (US$ 0,10 por milhão de tokens de entrada, 0,50 de saída). Mais preciso, ~10x o custo: claude-sonnet-5-5. Mudar aqui muda a próxima chamada.'],
  ['esforco', 'low', 'Quanto o modelo pensa antes de responder: low · medium · high. low basta pra ler uma guia e segura o custo.'],
  ['teto_mes_usd', 20, 'Teto de gasto no mês, em US$ (soma do IA log). Atingiu: a IA para sozinha e a tela avisa "teto do mês atingido".'],
  ['teto_dia_usd', 3, 'Teto de gasto no dia, em US$.'],
  ['aviso_pct', 80, 'Ao passar desta % do teto do mês: aviso amarelo no card e um e-mail (uma vez por mês) pro endereço abaixo.'],
  ['preco_entrada_usd_mtok', 0.1, 'Preço do modelo por milhão de tokens de ENTRADA, em US$ (tabela da Anthropic). Usado pra estimar o custo no IA log.'],
  ['preco_saida_usd_mtok', 0.5, 'Preço por milhão de tokens de SAÍDA, em US$.'],
  ['email_aviso', 'administrativo@clinicanascente.com.br', 'Quem recebe o e-mail de 80 % do teto.'],
  ['hora_gatilho', 19, 'Hora (0–23) em que o gatilho diário lê as guias novas da pasta. Mudar aqui e clicar "Instalar gatilho" no card.'],
  ['pasta_guias_id', '15tjkAjub3f5jTc1Jy8ciklaZPG0_ULsP', 'Id da pasta raiz GUIAS DE CONVÊNIOS no Drive (Drives compartilhados / Recepção). Dentro: uma pasta por convênio (CEDPLAN, SABIN SINAI) e, em cada uma, uma por mês (10 OUT 26), com subpastas por paciente.'],
  ['guias_mes_anterior_ate_dia', 5, 'Até este dia do mês o gatilho também lê a pasta do mês anterior (guias salvas atrasadas).'],
  ['guias_max_por_execucao', 25, 'Máximo de arquivos lidos por execução do gatilho (o resto fica pro dia seguinte). Cada execução tem no máximo ~5 minutos.'],
  ['instrucao_guias', 'Você lê guias de atendimento de convênio (Cedplan, Sabin Sinai) digitalizadas ou fotografadas por uma clínica de psicologia e pediatria. Extraia os dados e devolva somente o JSON pedido.\nRegras: cada página costuma ser uma guia; se uma página for continuação da anterior (mesmo número de guia, só mais datas ou assinaturas), marque continuacao_da_anterior = true. numero_guia: o número da guia ou da autorização (dígitos e hífens, sem espaços). carteirinha: o número do beneficiário na carteirinha (só dígitos). beneficiario: o nome do paciente como está na guia; se corresponder a um nome da lista de pacientes cadastrados (mesmo com abreviação, acento ou ordem diferente), devolva o nome exatamente como está na lista. datas: todas as datas de atendimento ou de sessão preenchidas na guia, no formato dd/mm/aaaa (guia com várias linhas de sessão = uma data por linha preenchida; linha em branco não conta). procedimento: a descrição do procedimento (ex.: Sessão de psicoterapia, Consulta); quantidade: o número de sessões ou procedimentos preenchidos. assinatura_visivel: true só se houver assinatura manuscrita (do paciente, do responsável ou do profissional) na guia. legibilidade: boa, parcial (algum campo em dúvida) ou ilegivel. Se o arquivo não for uma guia (comprovante, exame, foto solta, página em branco), e_guia = false e guias = []. Não invente: campo que não deu pra ler fica vazio ("" ou []). Em observacao, uma frase curta em português sobre o que viu (ex.: "guia Cedplan com 4 sessões assinadas").', 'Instrução que o modelo recebe pra ler uma guia (texto livre; a gestão pode ajustar). O JSON de resposta é fixo no código.'],
  ['instrucao_conciliacao', '', 'Instrução do item Conciliação assistida (próximo).'],
  ['instrucao_perguntar', '', 'Instrução do item Perguntar à planilha (próximo).']
];
var IA_NUMERICOS = { teto_mes_usd: 1, teto_dia_usd: 1, aviso_pct: 1, preco_entrada_usd_mtok: 1, preco_saida_usd_mtok: 1, hora_gatilho: 1, guias_mes_anterior_ate_dia: 1, guias_max_por_execucao: 1 };
var IA_EDITAVEIS_TELA = { ia_ativa: 1, ia_guias: 1, ia_conciliacao: 1, ia_perguntar: 1, hora_gatilho: 1 };

// aba IA: cria com a carga inicial se não existir; acrescenta no fim as chaves novas que faltarem (versões futuras)
function abaIA_() {
  var ss = planilha_(), s = ss.getSheetByName(ABA_IA), criadas = [];
  if (!s) { s = ss.insertSheet(ABA_IA); s.getRange(1, 1, 1, HIA.length).setValues([HIA]).setFontWeight('bold'); s.setFrozenRows(1); }
  var n = s.getLastRow(), tem = {};
  if (n >= 2) s.getRange(2, 1, n - 1, 1).getValues().forEach(function (r) { var k = String(r[0] || '').trim(); if (k) tem[k] = 1; });
  var faltam = IA_PADRAO.filter(function (p) { return !tem[p[0]]; });
  if (faltam.length) { s.getRange(Math.max(n, 1) + 1, 1, faltam.length, 3).setValues(faltam.map(function (p) { return [p[0], p[1], p[2]]; })); faltam.forEach(function (p) { criadas.push(p[0]); }); }
  return { s: s, criadas: criadas };
}
// lê a aba IA sempre fresca (é a pausa: tem de valer na chamada seguinte)
function iaConfig_() {
  var out = {}; IA_PADRAO.forEach(function (p) { out[p[0]] = p[1]; });
  var s = abaIA_().s, n = s.getLastRow();
  if (n >= 2) s.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) {
    var k = String(r[0] || '').trim(); if (!k) return; var v = r[1];
    out[k] = typeof v === 'number' ? v : String(v == null ? '' : v).trim();
    if (IA_NUMERICOS[k]) out[k] = numBR_(out[k]);
  });
  return out;
}
function simNao_(v) { return !/^n/i.test(String(v == null ? '' : v).trim() || 'Sim'); }
function iaChave_() { try { return String(PropertiesService.getScriptProperties().getProperty(IA_CHAVE_PROP) || '').trim(); } catch (e) { return ''; } }
function propIA_(k, v) { try { var p = PropertiesService.getScriptProperties(); if (v === undefined) return p.getProperty(k); if (v === null) p.deleteProperty(k); else p.setProperty(k, String(v)); } catch (e) { return null; } }
function usd_(n) { return 'US$ ' + Number(n || 0).toFixed(2).replace('.', ','); }
function mesChave_(d) { return Utilities.formatDate(d, CONFIG.TZ, 'MM/yyyy'); }

/* ---------- IA log ---------- */
function abaIALog_() { return abaComCabecalho_(ABA_IA_LOG, HIA_LOG); }
// gasto do mês e do dia (US$) somando a coluna Custo do IA log; uma leitura por chamada (MEMO_)
function gastoIA_() {
  if (MEMO_.iagasto) return MEMO_.iagasto;
  var s = planilha_().getSheetByName(ABA_IA_LOG), hoje = new Date(), hd = fmtData_(hoje), hm = mesChave_(hoje), mes = 0, dia = 0, chamadasMes = 0, chamadasDia = 0;
  if (s && s.getLastRow() >= 2) {
    var h = cabecalhos_(s), vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues();
    vals.forEach(function (r) {
      var dt = String(r[h['Data/hora'] - 1] || ''), c = numBR_(r[h['Custo (US$)'] - 1]); if (!dt) return;
      if (dt.slice(3, 10) === hm) { mes += c; chamadasMes++; }
      if (dt.slice(0, 10) === hd) { dia += c; chamadasDia++; }
    });
  }
  MEMO_.iagasto = { mes: Math.round(mes * 10000) / 10000, dia: Math.round(dia * 10000) / 10000, chamadasMes: chamadasMes, chamadasDia: chamadasDia };
  return MEMO_.iagasto;
}
function custoIA_(usage, cfg) {
  var e = Number(usage && usage.input_tokens) || 0, s = Number(usage && usage.output_tokens) || 0;
  var cr = Number(usage && usage.cache_read_input_tokens) || 0, cw = Number(usage && usage.cache_creation_input_tokens) || 0; // só pra contar; a leitura de cache custa 10 % da entrada
  return Math.round(((e + cw) * (Number(cfg.preco_entrada_usd_mtok) || 0) + cr * (Number(cfg.preco_entrada_usd_mtok) || 0) * 0.1 + s * (Number(cfg.preco_saida_usd_mtok) || 0)) / 1e6 * 1e6) / 1e6;
}
function logIA_(l) {
  try {
    var s = abaIALog_(), h = cabecalhos_(s);
    gravarCelulas_(s, proximaLinha_(s, h['Data/hora']), h, { 'Data/hora': agora_(), 'Item': l.item || '', 'Arquivos': l.arquivos || 0, 'Linhas': l.linhas || 0, 'Modelo': l.modelo || '', 'Tokens entrada': l.entrada || 0, 'Tokens saída': l.saida || 0, 'Custo (US$)': l.custo || 0, 'Quem': l.quem || '', 'Resultado': l.resultado || '', 'Observação': String(l.obs || '').slice(0, 500), 'Duração (s)': l.duracao || 0 });
    if (MEMO_.iagasto && l.custo) { MEMO_.iagasto.mes += l.custo; MEMO_.iagasto.dia += l.custo; MEMO_.iagasto.chamadasMes++; MEMO_.iagasto.chamadasDia++; }
  } catch (e) { /* o log nunca derruba a chamada */ }
}
// pausa geral, pausa do item, teto do mês e do dia: devolve { ok:false, motivo, mensagem } ou null
function iaBloqueio_(item, cfg) {
  if (!simNao_(cfg.ia_ativa)) return { ok: false, motivo: 'pausada', mensagem: 'IA pausada pela gestão' };
  if (item && IA_ITENS[item] && !simNao_(cfg['ia_' + item])) return { ok: false, motivo: 'pausada_item', mensagem: 'IA pausada pela gestão (' + IA_ITENS[item] + ')' };
  var g = gastoIA_(), tm = Number(cfg.teto_mes_usd) || 0, td = Number(cfg.teto_dia_usd) || 0;
  if (tm > 0 && g.mes >= tm) return { ok: false, motivo: 'teto_mes', mensagem: 'IA pausada: teto do mês atingido (' + usd_(g.mes) + ' de ' + usd_(tm) + ')' };
  if (td > 0 && g.dia >= td) return { ok: false, motivo: 'teto_dia', mensagem: 'IA pausada: teto do dia atingido (' + usd_(g.dia) + ' de ' + usd_(td) + ')' };
  return null;
}
// 80 % do teto do mês: um e-mail por mês (marca em PropertiesService)
function avisoTetoIA_(cfg) {
  try {
    var g = gastoIA_(), tm = Number(cfg.teto_mes_usd) || 0, pct = Number(cfg.aviso_pct) || 80; if (!(tm > 0) || g.mes < tm * pct / 100) return;
    var marca = 'ia_aviso_' + mesChave_(new Date()).replace('/', '-'); if (propIA_(marca)) return;
    var para = String(cfg.email_aviso || '').trim(); if (!para) return;
    MailApp.sendEmail(para, 'Recepção Nascente: uso da IA em ' + Math.round(g.mes / tm * 100) + '% do teto do mês', 'O app já gastou ' + usd_(g.mes) + ' de ' + usd_(tm) + ' com a API Claude neste mês (' + g.chamadasMes + ' chamadas). Ao atingir o teto a IA para sozinha. Pra pausar antes ou mudar o teto: tela Pendências, card "Uso da IA este mês", ou a aba IA da planilha.');
    propIA_(marca, agora_());
  } catch (e) { /* aviso é só aviso */ }
}

/* ---------- chamarIA(item, payload) ----------
   payload: { texto, instrucao (opcional; padrão = instrucao_<item> da aba IA), documentos: [{ nome, bytes|blob, mime }],
             schema (JSON Schema da resposta; com ele `dados` volta como objeto), maxTokens, arquivos, linhas, quem, observacao }
   devolve  { ok:true, dados, usage:{ entrada, saida }, custo, modelo } ou { ok:false, motivo, mensagem }
   motivos: pausada · pausada_item · teto_mes · teto_dia · sem_chave · erro_api · recusa · json_invalido */
function chamarIA(item, payload) {
  payload = payload || {};
  var t0 = new Date().getTime(), cfg = iaConfig_(), quem = payload.quem || (usuario_().email || 'gatilho');
  var bloq = iaBloqueio_(item, cfg); if (bloq) return bloq;
  var chave = iaChave_(); if (!chave) return { ok: false, motivo: 'sem_chave', mensagem: 'Chave da API não configurada (Apps Script → Configurações do projeto → Propriedades do script → ' + IA_CHAVE_PROP + ').' };
  var content = [];
  (payload.documentos || []).forEach(function (doc) {
    var bytes = doc.bytes || (doc.blob && doc.blob.getBytes()), mime = String(doc.mime || (doc.blob && doc.blob.getContentType()) || 'application/pdf').toLowerCase();
    if (!bytes) return;
    var b64 = Utilities.base64Encode(bytes);
    if (/^image\//.test(mime)) content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } });
    else content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 }, title: String(doc.nome || 'documento').slice(0, 200) });
  });
  content.push({ type: 'text', text: String(payload.texto || '') });
  var body = { model: String(cfg.modelo || 'claude-haiku-5-5'), max_tokens: payload.maxTokens || 4000, messages: [{ role: 'user', content: content }] };
  var instr = payload.instrucao != null ? payload.instrucao : cfg['instrucao_' + item]; if (instr) body.system = String(instr);
  var oc = {}; if (cfg.esforco) oc.effort = String(cfg.esforco); if (payload.schema) oc.format = { type: 'json_schema', schema: payload.schema };
  if (Object.keys(oc).length) body.output_config = oc;
  var base = { item: item, arquivos: payload.arquivos || (payload.documentos || []).length, linhas: payload.linhas || 0, modelo: body.model, quem: quem, obs: payload.observacao || '' };
  var dur = function () { return Math.round((new Date().getTime() - t0) / 100) / 10; };
  var code, txt;
  try {
    var resp = UrlFetchApp.fetch(IA_URL, { method: 'post', contentType: 'application/json', headers: { 'x-api-key': chave, 'anthropic-version': IA_VERSAO }, payload: JSON.stringify(body), muteHttpExceptions: true });
    code = resp.getResponseCode(); txt = resp.getContentText();
  } catch (e) {
    logIA_(Object.assign({}, base, { resultado: 'erro', obs: 'sem resposta: ' + (e && e.message || e), duracao: dur() }));
    return { ok: false, motivo: 'erro_api', mensagem: 'Não consegui falar com a API (' + (e && e.message || e) + ').' };
  }
  var j = null; try { j = JSON.parse(txt); } catch (e2) { j = null; }
  if (code !== 200 || !j || j.type === 'error') {
    var em = (j && j.error && j.error.message) || String(txt || '').slice(0, 200);
    logIA_(Object.assign({}, base, { resultado: 'erro ' + code, obs: em, duracao: dur() }));
    return { ok: false, motivo: 'erro_api', mensagem: 'A API respondeu ' + code + ': ' + em, codigo: code };
  }
  var usage = j.usage || {}, custo = custoIA_(usage, cfg), saida = { entrada: Number(usage.input_tokens) || 0, saida: Number(usage.output_tokens) || 0 };
  var comum = Object.assign({}, base, { modelo: j.model || body.model, entrada: saida.entrada, saida: saida.saida, custo: custo, duracao: dur() });
  if (j.stop_reason === 'refusal') { logIA_(Object.assign({}, comum, { resultado: 'recusa' })); avisoTetoIA_(cfg); return { ok: false, motivo: 'recusa', mensagem: 'O modelo recusou ler este arquivo.', usage: saida, custo: custo }; }
  var texto = (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  var dados = texto;
  if (payload.schema) {
    try { dados = JSON.parse(texto); } catch (e3) { logIA_(Object.assign({}, comum, { resultado: 'json inválido', obs: (base.obs ? base.obs + ' · ' : '') + texto.slice(0, 200) })); return { ok: false, motivo: 'json_invalido', mensagem: 'A resposta não veio no formato esperado' + (j.stop_reason === 'max_tokens' ? ' (resposta cortada)' : '') + '.', usage: saida, custo: custo, texto: texto }; }
  }
  logIA_(Object.assign({}, comum, { resultado: 'ok' }));
  avisoTetoIA_(cfg);
  return { ok: true, dados: dados, usage: saida, custo: custo, modelo: j.model || body.model, parou: j.stop_reason || '' };
}

/* ---------- estado, pausa, gatilho (tela Pendências, card "Uso da IA este mês") ---------- */
var GATILHO_FN = 'gatilhoDiarioIA';
function gatilhoIA_() {
  try { var t = ScriptApp.getProjectTriggers().filter(function (x) { return x.getHandlerFunction() === GATILHO_FN; }); return { instalado: t.length > 0, n: t.length }; } catch (e) { return { instalado: false, n: 0, erro: String(e && e.message || e) }; }
}
API.iaEstado = function () {
  var cfg = iaConfig_(), g = gastoIA_(), gest = usuario_().perfil === 'gestao', tm = Number(cfg.teto_mes_usd) || 0, td = Number(cfg.teto_dia_usd) || 0;
  var bloq = iaBloqueio_('', cfg), itens = {}; Object.keys(IA_ITENS).forEach(function (k) { itens[k] = simNao_(cfg['ia_' + k]); });
  var ultima = null; try { ultima = JSON.parse(propIA_('ia_guias_ultima') || 'null'); } catch (e) { ultima = null; }
  return { ok: true, ativa: simNao_(cfg.ia_ativa), itens: itens, gastoMes: g.mes, gastoDia: g.dia, chamadasMes: g.chamadasMes, tetoMes: tm, tetoDia: td, pct: tm > 0 ? Math.round(g.mes / tm * 100) : 0, avisoPct: Number(cfg.aviso_pct) || 80,
    pausada: bloq ? bloq.motivo : '', mensagem: bloq ? bloq.mensagem : '', modelo: cfg.modelo, horaGatilho: Number(cfg.hora_gatilho) || 19, gatilho: gest ? gatilhoIA_() : null, temChave: gest ? !!iaChave_() : null, ultimaGuias: ultima, gestao: gest };
};
// grava um parâmetro da aba IA (só os que a tela expõe: ia_ativa, ia_<item>, hora_gatilho); registro no IA log
API.iaDefinir = function (d) {
  d = d || {}; var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] };
  var k = String(d.chave || '').trim(), v = d.valor; if (!IA_EDITAVEIS_TELA[k]) return { ok: false, erros: ['Parâmetro não editável pela tela: ' + k] };
  if (k === 'hora_gatilho') { v = parseInt(v, 10); if (!(v >= 0 && v <= 23)) return { ok: false, erros: ['Hora inválida (0–23).'] }; } else v = simNao_(v) ? 'Sim' : 'Não';
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaIA_().s, n = s.getLastRow(), linha = 0;
    if (n >= 2) s.getRange(2, 1, n - 1, 1).getValues().forEach(function (r, i) { if (!linha && String(r[0] || '').trim() === k) linha = i + 2; });
    if (!linha) return { ok: false, erros: ['Parâmetro ' + k + ' não está na aba IA.'] };
    var antes = s.getRange(linha, 2).getValue(); s.getRange(linha, 2).setValue(v);
    SpreadsheetApp.flush();
    logIA_({ item: 'config', modelo: '', quem: u.email, resultado: k + ': ' + antes + ' → ' + v, obs: d.motivo || '' });
    return { ok: true, chave: k, valor: v, estado: API.iaEstado() };
  } finally { lock.releaseLock(); }
};
API.iaPausar = function (d) { d = d || {}; return API.iaDefinir({ chave: 'ia_ativa', valor: d.ativa === false || /^n/i.test(String(d.ativa || '')) ? 'Não' : 'Sim', motivo: d.ativa === false ? 'Pausar tudo (tela)' : 'Reativar (tela)' }); };
// (re)cria o gatilho diário na hora da aba IA; o nome da função tem de existir no carregador (Code.gs)
API.iaInstalarGatilho = function () {
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] };
  var cfg = iaConfig_(), h = Number(cfg.hora_gatilho); if (!(h >= 0 && h <= 23)) h = 19;
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === GATILHO_FN) ScriptApp.deleteTrigger(t); });
    ScriptApp.newTrigger(GATILHO_FN).timeBased().everyDays(1).atHour(h).inTimezone(CONFIG.TZ).create();
  } catch (e) { return { ok: false, erros: ['Não consegui criar o gatilho: ' + (e && e.message || e) + '. O carregador (Code.gs) precisa ser a versão com gatilhoDiarioIA e a permissão de gatilhos autorizada.'] }; }
  logIA_({ item: 'config', quem: usuario_().email, resultado: 'gatilho diário às ' + h + 'h' });
  return { ok: true, hora: h, gatilho: gatilhoIA_() };
};
// chamado pelo carregador no gatilho diário (sem usuário logado): cada item registra aqui o que deve rodar
var ROTINAS_IA_ = [];
API.gatilhoDiarioIA = function () {
  var out = [];
  ROTINAS_IA_.forEach(function (fn) { try { out.push(fn()); } catch (e) { out.push({ ok: false, erro: String(e && e.message || e) }); } });
  return { ok: true, rotinas: out };
};
