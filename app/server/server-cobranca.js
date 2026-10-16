/* Recepção Nascente — servidor, parte 2 (Fase 1, 15/10/2026): cache, Cobrança por profissional, competências,
   bloco "O que fazer agora", Cobrança do mês, pagamento do mês, Faltas → Decidir.
   O build junta este arquivo ao server.js (mesmo escopo); o módulo compartilhado `Cobranca` vem com duplicatas.js. */

/* ---------- cache (CacheService, alguns minutos; uma leitura por aba por chamada) ----------
   cacheado_(chave, fn): devolve o valor guardado ou lê com fn() e guarda. invalidar_(chaves) é chamado por toda função que
   grava na aba correspondente. Objetos grandes são guardados em pedaços de 90 KB. Sem CacheService (testes), só memória. */
var MEMO_ = {};
function cache_() { try { return CacheService.getScriptCache(); } catch (e) { return null; } }
function segundosCache_() { var m = MEMO_.par ? Number(MEMO_.par.cache_minutos) : 0; return (m > 0 ? m : 5) * 60; }
function cacheGet_(k) {
  var c = cache_(); if (!c) return null;
  try { var n = c.get('rn2:' + k + ':n'); if (n == null) return null; var partes = []; for (var i = 0; i < parseInt(n, 10); i++) { var p = c.get('rn2:' + k + ':' + i); if (p == null) return null; partes.push(p); } return JSON.parse(partes.join('')); } catch (e) { return null; }
}
function cachePut_(k, obj) {
  var c = cache_(); if (!c) return;
  try { var txt = JSON.stringify(obj), tam = 90000, o = {}, i = 0; for (var pos = 0; pos < txt.length || i === 0; pos += tam, i++) o['rn2:' + k + ':' + i] = txt.slice(pos, pos + tam); o['rn2:' + k + ':n'] = String(i); c.putAll(o, segundosCache_()); } catch (e) { /* cache é só aceleração */ }
}
function cacheDel_(ks) { var c = cache_(); if (!c) return; try { var l = []; ks.forEach(function (k) { l.push('rn2:' + k + ':n'); for (var i = 0; i < 24; i++) l.push('rn2:' + k + ':' + i); }); c.removeAll(l); } catch (e) { } }
function cacheado_(k, fn) { if (MEMO_[k] !== undefined) return MEMO_[k]; var v = cacheGet_(k); if (v == null) { v = fn(); cachePut_(k, v); } MEMO_[k] = v; return v; }
// 'comp' = competências (mudam a cada gravação na aba do mês ou em Mensalistas): a chave leva uma versão que a invalidação troca
function versaoComp_() { if (MEMO_.compv === undefined) MEMO_.compv = cacheGet_('compv') || '0'; return MEMO_.compv; }
function invalidar_(ks) {
  var del = [];
  (ks || []).forEach(function (k) {
    if (k === 'comp') { MEMO_.compv = String(new Date().getTime()); cachePut_('compv', MEMO_.compv); Object.keys(MEMO_).forEach(function (m) { if (/^(comp|apl|avp):/.test(m)) delete MEMO_[m]; }); }
    else { delete MEMO_[k]; del.push(k); }
  });
  if (del.length) cacheDel_(del);
}
API.limparCache = function () { if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] }; invalidar_(['pac', 'proc', 'prof', 'listas', 'val', 'par', 'cpp', 'rep', 'mens', 'comp']); MEMO_ = {}; return { ok: true }; };

/* ---------- parâmetros, valores por sessão, cobrança por profissional ---------- */
function parametros_() {
  return cacheado_('par', function () {
    var s = planilha_().getSheetByName(CONFIG.ABA.PARAMS), out = {}; Object.keys(Cobranca.PARAMS_PADRAO).forEach(function (k) { out[k] = Cobranca.PARAMS_PADRAO[k]; });
    out.rascunho_horas = 2; out.cache_minutos = 5; out.demora_aviso_segundos = 20; out.chave_pix = '';
    if (!s || s.getLastRow() < 2) return out;
    s.getRange(2, 1, s.getLastRow() - 1, 2).getValues().forEach(function (r) { var k = String(r[0] || '').trim(); if (!k) return; var v = r[1]; out[k] = (typeof v === 'number') ? v : (String(v == null ? '' : v).trim()); if (typeof out[k] === 'string' && /^\d+([.,]\d+)?$/.test(out[k])) out[k] = numBR_(out[k]); });
    return out;
  });
}
function valoresSessao_() {
  return cacheado_('val', function () {
    var s = planilha_().getSheetByName(CONFIG.ABA.VALORES); if (!s || s.getLastRow() < 2) return [];
    return s.getRange(2, 1, s.getLastRow() - 1, 4).getValues().map(function (r) { return { especialidade: String(r[0] || '').trim(), valor: numBR_(r[1]), nome: String(r[2] || '').trim(), ativo: !/^n/i.test(String(r[3] || 'Sim')) }; }).filter(function (v) { return v.especialidade && v.valor > 0; });
  });
}
// especialidade "canônica" (a das abas Valores por sessão / Procedimentos) a partir do texto da aba Profissionais
var ESP_CHAVES_ = [['psicopedag', 'Psicopedagogia'], ['psican', 'Psicanálise'], ['psicolog', 'Psicologia'], ['pediatr', 'Pediatria'], ['gineco', 'Ginecologia e obstetrícia'], ['clínic', 'Clínica geral'], ['clinic', 'Clínica geral'], ['nutri', 'Nutrição'], ['aba', 'Terapia ABA'], ['fisio', 'Fisioterapia'], ['enferm', 'Enfermagem']];
function espCanonica_(texto) { var t = String(texto || '').toLowerCase(); for (var i = 0; i < ESP_CHAVES_.length; i++) if (t.indexOf(ESP_CHAVES_[i][0]) >= 0) return ESP_CHAVES_[i][1]; return String(texto || '').trim(); }
function espDoProf_(nome) { var p = profissionais_().filter(function (x) { return x.nome === nome; })[0]; return p ? espCanonica_(p.especialidade) : ''; }
function valorCheio_(esp) { var l = valoresSessao_().filter(function (v) { return v.ativo && v.especialidade === esp; }); if (!l.length) return null; var ch = l.filter(function (v) { return /cheio/i.test(v.nome); })[0]; return ch ? ch.valor : Math.max.apply(null, l.map(function (v) { return v.valor; })); }
function cobrancasProf_() {
  return cacheado_('cpp', function () {
    var s = planilha_().getSheetByName(CONFIG.ABA.CPP);
    return linhasComo_(s).filter(function (r) { return String(r['Paciente'] || '').trim(); }).map(function (r) { var l = Cobranca.linhaDe(r); l.linha = r._linha; return l; });
  });
}
function linhaVigente_(paciente, profissional, data) { return Cobranca.linhaVigente(cobrancasProf_(), paciente, profissional, data || new Date()); }
function feriados_() { return colunaLista_(CONFIG.LISTAS.FERIADOS).map(function (x) { return fmtData_(parseData_(x) || x); }).filter(Boolean); }

/* ---------- competências (Mensalistas + abas de mês): o estado do mês de cada paciente × profissional ----------
   Mensalistas: linha = paciente (+ coluna Profissional, criada pelo app); por competência 6 colunas no fim:
   "NOVEMBRO/2026 — sessões agendadas · valor cobrado · pago? · data · forma · NF". As colunas antigas ("OUTUBRO (…) — pago?" + "Data")
   continuam lidas (pago? Sim = mês pago). Renovações (outubro, pelo app antigo) e linhas "Mensalidade…" das abas de mês também. */
function chaveDeCab_(cab) { // "NOVEMBRO/2026 — pago?" → { chave: 'Novembro/2026', campo: 'pago?' } · "OUTUBRO (paga em…) — pago?" → antigo
  var m = String(cab || '').match(/^([A-ZÇÃÉ]+)\/(\d{4})\s+—\s+(.+)$/i); if (m) { var i = CONFIG.MESES.map(function (x) { return x.toUpperCase(); }).indexOf(m[1].toUpperCase()); if (i < 0) return null; return { chave: CONFIG.MESES[i] + '/' + m[2], campo: m[3].trim().toLowerCase(), antigo: false }; }
  var a = String(cab || '').match(/^([A-ZÇÃÉ]+)\b.*—\s*pago\?/i); if (a) { var j = CONFIG.MESES.map(function (x) { return x.toUpperCase(); }).indexOf(a[1].toUpperCase()); if (j < 0) return null; var hoje = new Date(), ano = hoje.getFullYear() - (j > hoje.getMonth() ? 1 : 0); return { chave: CONFIG.MESES[j] + '/' + ano, campo: 'pago?', antigo: true }; }
  return null;
}
function nomeColComp_(chave, campo) { var m = chave.split('/'); return m[0].toUpperCase() + '/' + m[1] + ' — ' + campo; }
function mensalistasIdx_() {
  return cacheado_('mens', function () {
    var s = planilha_().getSheetByName(CONFIG.ABA.MENSALISTAS), out = { chaves: [], linhas: [] }; if (!s || s.getLastRow() < 1) return out;
    var hdr = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), 1)).getValues()[0].map(function (x) { return String(x || '').trim(); }), cols = {}, chaves = {};
    hdr.forEach(function (h, i) { var c = chaveDeCab_(h); if (!c) return; cols[c.chave] = cols[c.chave] || {}; cols[c.chave][c.campo] = i; if (c.antigo && hdr[i + 1] && /^Data/i.test(hdr[i + 1])) cols[c.chave]['data'] = i + 1; chaves[c.chave] = 1; });
    out.chaves = Object.keys(chaves); out.cols = cols; out.hdr = hdr;
    var iProf = hdr.indexOf('Profissional'), iObs = -1; hdr.forEach(function (h, i) { if (iObs < 0 && /^Observa/i.test(h)) iObs = i; });
    if (s.getLastRow() < 2) return out;
    s.getRange(2, 1, s.getLastRow() - 1, hdr.length).getValues().forEach(function (r, i) {
      var pac = String(r[0] || '').trim(); if (!pac) return;
      var l = { linha: i + 2, paciente: pac, profissional: iProf >= 0 ? String(r[iProf] || '').trim() : '', modalidade: String(r[1] || ''), valor: numBR_(r[2]), pagador: String(r[3] || ''), obs: iObs >= 0 ? String(r[iObs] || '') : '', comp: {} };
      Object.keys(cols).forEach(function (ch) {
        var c = cols[ch], g = function (k) { return c[k] == null ? '' : r[c[k]]; }, txt = function (k) { var v = g(k); return v instanceof Date ? fmtData_(v) : String(v == null ? '' : v).trim(); };
        var pago = txt('pago?'), data = txt('data'); if (!/^\d{2}\/\d{2}\/\d{4}/.test(data)) { var md = data.match(/(\d{2}\/\d{2}\/\d{4})/); data = md ? md[1] : ''; }
        if (!pago && !txt('sessões agendadas') && !txt('valor cobrado')) return;
        l.comp[ch] = { pago: /^sim/i.test(pago) ? 'Sim' : /^parcial/i.test(pago) ? 'Parcial' : /^n[ãa]o$/i.test(pago) ? 'Não' : pago, data: data, forma: txt('forma'), nf: txt('nf'), sessoes: txt('sessões agendadas') === '' ? null : numBR_(g('sessões agendadas')), valorCobrado: txt('valor cobrado') === '' ? null : numBR_(g('valor cobrado')), recebido: null };
      });
      out.linhas.push(l);
    });
    return out;
  });
}
function competenciasExistentes_() { return mensalistasIdx_().chaves.slice(); }
function mesDaChave_(chave) { var m = String(chave || '').split('/'), i = CONFIG.MESES.indexOf(m[0]); return i < 0 ? null : new Date(parseInt(m[1], 10), i, 1, 12); }
// sessões agendadas no mês por paciente|profissional: agenda recorrente (vigência, quinzenal) − feriados + acréscimos da Lista do dia
function sessoesAgendadas_(chave, cache) {
  var ini = mesDaChave_(chave); if (!ini) return {};
  cache = cache || {}; if (!cache.agenda) cache.agenda = API.agendaFixa(); if (!cache.dia) cache.dia = linhasComo_(planilha_().getSheetByName(CONFIG.ABA.DIA));
  var fer = {}; feriados_().forEach(function (f) { fer[f] = 1; });
  var out = {}, fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 0, 12), add = function (p, f, n) { var k = p + '|' + f; out[k] = (out[k] || 0) + n; };
  for (var d = new Date(ini.getTime()); d <= fim; d.setDate(d.getDate() + 1)) {
    var chaveD = fmtData_(d), diaSemana = CONFIG.DIAS[d.getDay()]; if (fer[chaveD]) continue;
    cache.agenda.forEach(function (r) {
      if (r['Dia da semana'] !== diaSemana || String(r['Ativo'] || 'Sim') === 'Não') return;
      var c = r['Começa em'] ? parseData_(r['Começa em']) : null, t = r['Termina em'] ? parseData_(r['Termina em']) : null;
      if ((c && d < c) || (t && d > t)) return;
      if (/quinzen/i.test(String(r['Frequência'] || '')) && c) { var sem = Math.round((d - c) / (7 * 24 * 3600 * 1000)); if (sem % 2 !== 0) return; }
      if (/aplicação de teste|retorno/i.test(String(r['Tipo'] || ''))) return; // aplicação de teste e retorno não entram na conta
      add(r['Paciente'], r['Profissional'], 1);
    });
  }
  cache.dia.forEach(function (r) { var dt = parseData_(r['Data']); if (!dt || dt < ini || dt > fim || !r['Paciente']) return; var o = String(r['Origem'] || ''); if (/^(Removido|Confirmado|Não vem)/i.test(o) || fer[fmtData_(dt)] || /aplicação de teste|retorno/i.test(o + ' ' + String(r['Tipo'] || ''))) return; add(r['Paciente'], r['Profissional'], 1); });
  return out;
}
// estatísticas da aba do mês por paciente|profissional: atendidas, a receber (Posterior), cancelados pela clínica, faltas abatidas, mensalidade/antecipado já lançados
function estatMes_(chave) {
  return cacheado_('comp:' + versaoComp_() + ':' + chave, function () {
    var m = mesDaChave_(chave), out = { porPar: {}, agendadas: sessoesAgendadas_(chave) }; if (!m) return out;
    var L = linhasMes_(nomeAbaMes_(m)).linhas, ano = m.getFullYear();
    var get = function (k) { return out.porPar[k] = out.porPar[k] || { atendidas: 0, aReceber: 0, cancelados: [], faltasAbate: [], pagoMes: null, parcialMes: 0, faltas: 0 }; };
    L.forEach(function (r) {
      var dt = parseData_(r.data); if (!dt || dt.getFullYear() !== ano) return;
      var k = r.paciente + '|' + r.profissional, e = get(k), proc = r.procedimento || '';
      if (/^(Mensalidade|Antecipado|Renovação)/i.test(proc) || /\(compra\)/i.test(proc)) { // recebimento do mês lançado na aba: marca a competência (a do nome, ou a do mês da aba)
        var mm = proc.match(/^(?:Mensalidade|Antecipado) de (\S+)/i), nm = mm ? mm[1].charAt(0).toUpperCase() + mm[1].slice(1).toLowerCase() : CONFIG.MESES[m.getMonth()];
        if ((r.pago === 'Sim' || r.pago === 'Parcial') && CONFIG.MESES.indexOf(nm) >= 0) { var refAno = ano - (CONFIG.MESES.indexOf(nm) > m.getMonth() ? 1 : 0), ref = nm + '/' + refAno; out.pagos = out.pagos || {}; (out.pagos[k] = out.pagos[k] || {})[ref] = { pago: r.pago, data: r.dataPag || r.data, forma: r.forma, nf: r.nf, valor: r.valor, recebido: r.recebido }; }
        return;
      }
      if (/^Atendido/i.test(r.oque)) {
        if (!/^(Aplicação de teste|Retorno|Taxa de falta)/i.test(proc)) e.atendidas++;
        if ((r.pago === 'Não' || r.pago === 'Parcial') && !ehPerdido_(r.pago)) e.aReceber += saldo_(r);
      } else if (/^Cancelado pela cl/i.test(r.oque)) e.cancelados.push(r.data);
      else if (/^(Faltou|Desmarcou)/i.test(r.oque)) { e.faltas++; if (/^abate/i.test(r.decisao || '')) e.faltasAbate.push(r.data); }
      if (/^Taxa de falta/i.test(proc) && (r.pago === 'Não' || r.pago === 'Parcial')) e.aReceber += saldo_(r);
    });
    out.porPar = (function (pp) { Object.keys(pp).forEach(function (k) { pp[k].aReceber = Math.round(pp[k].aReceber * 100) / 100; }); return pp; })(out.porPar);
    return out;
  });
}
function renovacoesIdx_() {
  return cacheado_('ren', function () {
    var s = planilha_().getSheetByName(CONFIG.ABA.RENOVACOES), out = {}; if (!s) return out;
    linhasComo_(s).forEach(function (r) { var p = String(r['Paciente'] || '').trim(), ref = String(r['Referente a'] || '').trim(); if (!p || !ref) return; (out[p] = out[p] || {})[ref] = { pago: 'Sim', data: fmtData_(r['Data']), forma: String(r['Forma de pagamento'] || ''), nf: String(r['NF emitida?'] || '') }; });
    return out;
  });
}
// estado da competência de uma linha de cobrança (paciente × profissional) no mês "chave"
function competenciaDe_(l, chave) {
  var k = l.paciente + '|' + l.profissional, mens = mensalistasIdx_(), est = estatMes_(chave), e = est.porPar[k] || {}, c = { chave: chave, pago: '', data: '', forma: '', nf: '', sessoes: null, valorCobrado: null, abatimentos: [], recebido: 0, atendidas: e.atendidas || 0, aReceber: e.aReceber || 0, origem: '' };
  // Mensalistas: a linha do paciente × profissional; sem profissional na aba, vale pra todas as linhas do paciente
  var row = mens.linhas.filter(function (r) { return r.paciente === l.paciente && r.profissional === l.profissional; })[0] || mens.linhas.filter(function (r) { return r.paciente === l.paciente && !r.profissional; })[0];
  if (row && row.comp[chave]) { var mc = row.comp[chave]; c.pago = mc.pago; c.data = mc.data; c.forma = mc.forma; c.nf = mc.nf; c.sessoes = mc.sessoes; c.valorCobrado = mc.valorCobrado; c.origem = 'Mensalistas'; c.sessoesEditadas = mc.sessoes != null; }
  c.linhaMens = row ? row.linha : null;
  if (!c.pago) { var ren = (renovacoesIdx_()[l.paciente] || {})[chave]; if (ren) { c.pago = 'Sim'; c.data = ren.data; c.forma = ren.forma; c.nf = ren.nf; c.origem = 'Renovações'; } }
  if (!c.pago) { var pg = est.pagos && (est.pagos[k] || est.pagos[l.paciente + '|']) ; var ref = pg && pg[chave]; if (!ref) { // recebimento lançado em outra aba de mês (pago antes do mês começar)
      var ant = mesDaChave_(chave); if (ant) { var pm = new Date(ant.getFullYear(), ant.getMonth() - 1, 1, 12), ea = estatMes_(chaveMes_(pm)); ref = ea.pagos && ((ea.pagos[k] || {})[chave] || (ea.pagos[l.paciente + '|'] || {})[chave]); } }
    if (ref) { c.pago = ref.pago; c.data = ref.data; c.forma = ref.forma; c.nf = ref.nf; c.recebido = ref.recebido || 0; c.origem = 'aba do mês'; } }
  if (l.pagamento === 'Antecipado' && l.cobranca === 'Por sessão') {
    if (c.sessoes == null) c.sessoes = est.agendadas[k] || 0;
    var ant2 = mesDaChave_(chave); if (ant2) { var pm2 = new Date(ant2.getFullYear(), ant2.getMonth() - 1, 1, 12), ea2 = estatMes_(chaveMes_(pm2)), ep = ea2.porPar[k];
      if (ep) { ep.cancelados.forEach(function (d) { c.abatimentos.push({ texto: '− 1 sessão cancelada pela clínica em ' + String(d).slice(0, 5), n: 1 }); }); ep.faltasAbate.forEach(function (d) { c.abatimentos.push({ texto: '− 1 sessão: falta de ' + String(d).slice(0, 5) + ', abatida pela gestão', n: 1 }); }); } }
  }
  return c;
}
// o bloco "O que fazer agora" de um paciente × profissional numa data (Registrar, Agenda, Cobrança do mês)
function blocoPara_(paciente, profissional, data, procedimento, oque, pac) {
  var dt = data instanceof Date ? data : (parseData_(data) || new Date()), v = linhaVigente_(paciente, profissional, dt), l = v.linha, chave = chaveMes_(dt);
  var comp = l ? competenciaDe_(l, chave) : null, esp = espDoProf_(profissional), p = pac || indicePacientes_().filter(function (x) { return x.nome === paciente; })[0] || {};
  var procV = null; if (procedimento) { var pr = procedimentos_().filter(function (x) { return x.nome === procedimento; })[0]; procV = pr ? pr.valor : null; }
  var b = Cobranca.calcular({ linha: l, profissional: profissional, especialidade: esp, valorCheio: valorCheio_(esp), procedimento: procedimento, procValor: procV, oque: oque, competencia: comp, hoje: dt, params: parametros_(), pagador: p.pagador || '', avisoLinha: v.aviso, convenioPaciente: p.convenio || '' });
  b.esp = esp; return b;
}

/* ---------- bootstrap (enxuto: tudo em cache) ---------- */
API.bootstrap = function () {
  var par = parametros_();
  return {
    usuario: usuario_(), planilha: planilha_().getName(), hora: agora_(), hoje: hoje_(),
    lembrete: lembreteAtivo_(), lembretes: lembretes_().slice(-5).reverse(),
    listas: { convenios: colunaLista_(CONFIG.LISTAS.CONVENIO), oque: colunaLista_(CONFIG.LISTAS.OQUE), pago: colunaLista_(CONFIG.LISTAS.PAGO), formas: colunaLista_(CONFIG.LISTAS.FORMA),
      cobrancas: (function () { var l = colunaLista_(CONFIG.LISTAS.COB_PROF); return l.length ? l : Cobranca.COBRANCAS.slice(); })(), pagamentos: (function () { var l = colunaLista_(CONFIG.LISTAS.PAG_PROF); return l.length ? l : Cobranca.PAGAMENTOS.slice(); })(), feriados: feriados_() },
    profissionais: profissionais_().map(function (p) { p.esp = espCanonica_(p.especialidade); return p; }),
    pacientes: indicePacientes_().map(function (p) { return { linha: p.linha, nome: p.nome, cpf: p.cpf, nasc: p.nasc, pagador: p.pagador, convenio: p.convenio, ativo: p.ativo }; }),
    params: par, valores: valoresSessao_()
  };
};
API.bootstrapAtendimento = function () {
  var hoje = new Date(), chave = chaveMes_(hoje), ant = chaveMes_(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), prox = chaveMes_(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1));
  var cpp = cobrancasProf_(), comp = {};
  cpp.forEach(function (l) { if (!l.ativo || !(l.pagamento === 'Antecipado' || l.pagamento === 'Posterior' || l.cobranca === 'Mensalidade fixa')) return; var k = l.paciente + '|' + l.profissional; comp[k] = comp[k] || {}; [ant, chave, prox].forEach(function (ch) { if (!comp[k][ch]) comp[k][ch] = competenciaDe_(l, ch); }); });
  return { procedimentos: procedimentos_(), pacientes: indicePacientes_(), cobrancas: cpp, competencias: comp, aplicacoes: aplicacoes_(), avaliacoes: avaliacoesPac_(), hoje: hoje_(), chave: chave, abaMes: nomeAbaMes_(hoje), abaMesExiste: !!planilha_().getSheetByName(nomeAbaMes_(hoje)), params: parametros_(), valores: valoresSessao_() };
};

/* ---------- Registrar atendimento (Fase 1): a recepção responde "Recebeu?"; o Pago? (K) vem do bloco ---------- */
API.registrarAtendimento = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var profissional = String(d.profissional || '').trim(); if (!profissional) erros.push('Escolha o profissional.');
  var procedimento = String(d.procedimento || '').trim(); if (!procedimento) erros.push('Escolha o tipo de atendimento.');
  var data = parseData_(d.data); if (!data) erros.push('Data inválida.');
  var hora = String(d.hora || '').trim(); if (hora && !/^\d{1,2}:\d{2}$/.test(hora)) erros.push('Hora inválida (use hh:mm).');
  var oque = String(d.oque || '').trim(); if (!oque) erros.push('Informe o que aconteceu.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes. Cadastre primeiro em "+ Novo paciente".'] };
    var s = abaMes_(data), bloq = bloqueioPlanilha_([s]); if (bloq) return { ok: false, erros: [bloq] };
    if (!d.confirmouRepetido) { var rep = jaRegistrado_(s, data, paciente, profissional, hora, oque); if (rep) return { ok: false, repetido: true, erros: ['Já está gravado: ' + paciente + ' · ' + profissional + ' · ' + oque.split(' (')[0] + ' em ' + fmtData_(data) + (hora ? ' às ' + hora : '') + ' (aba ' + s.getName() + ', linha ' + rep + '). Não gravei de novo. Se for outro atendimento, confira a hora.'] }; }
    var bloco = blocoPara_(paciente, profissional, data, procedimento, oque, pac);
    var recebeu = d.recebeu != null ? String(d.recebeu).trim() : '', pago, valor = '', recebido = 0;
    if (d.recebeu == null && d.pago != null) { pago = String(d.pago).trim(); valor = d.valor === '' || d.valor == null ? '' : numBR_(d.valor); } // chamada antiga (testes / correção)
    else {
      pago = Cobranca.pagoK(bloco, recebeu);
      if (bloco.recebeu) { valor = d.valor === '' || d.valor == null ? (bloco.valor == null ? '' : bloco.valor) : numBR_(d.valor); } else valor = bloco.valor == null ? '' : bloco.valor;
    }
    if (ehPerdido_(pago)) return { ok: false, erros: ['"' + PAGO_PERDIDO + '" só pela gestão, em Pendências → Lançamentos.'] };
    // nunca grava "recebeu" sem a recepção ter respondido (o padrão do bloco só vale pra "Não")
    var viaBloco = !(d.recebeu == null && d.pago != null);
    if (viaBloco && !recebeu && (pago === 'Sim' || pago === 'Parcial')) erros.push('Responda: recebeu?');
    else if (viaBloco && (pago === 'Sim' || pago === 'Parcial') && !String(d.forma || '').trim()) erros.push('Escolha a forma de pagamento.');
    if (pago === 'Sim' && !(valor > 0)) erros.push('Recebeu = Sim exige um valor maior que zero.');
    if (pago === 'Parcial') { recebido = numBR_(d.valorRecebido); if (!(valor > 0)) erros.push('Pago parcial exige o valor da sessão.'); else if (!(recebido > 0 && recebido < valor)) erros.push('Pago parcial: o valor recebido agora tem de ser maior que zero e menor que ' + brl_(valor) + '.'); }
    var detalhe = String(d.detalhe || '').replace(/\s+/g, ' ').trim();
    if (bloco.detalheObrigatorio && !detalhe) erros.push('Escreva no Detalhe o que aconteceu (quem avisou, a que horas, como): é obrigatório em falta sem aviso e em cima da hora.');
    if (erros.length) return { ok: false, erros: erros };
    var g = garantirColunas_(s, [CONFIG.HM.LOG].concat(pago === 'Parcial' ? [CONFIG.HM.RECEBIDO] : []).concat(bloco.detalhe ? [CONFIG.HM.DETALHE, CONFIG.HM.DECISAO] : [])), h = g.h, HM = CONFIG.HM;
    var linha = proximaLinha_(s, h[HM.PACIENTE] || 3), u = usuario_(), id = novoId_('A'), pagou = pago === 'Sim' || pago === 'Parcial';
    var quem = String(d.quemPagou || '').trim(), obs = String(d.observacao || '').trim();
    if (bloco.detalhe) obs = ('Falta/desmarcação — ' + (detalhe || oque.split(' (')[0]) + (obs ? ' | ' + obs : '')).trim();
    else if (bloco.obsAuto) obs = (bloco.obsAuto + (obs ? ' | ' + obs : '')).trim();
    if (pago === 'Parcial') obs = ('Recebeu ' + brl_(recebido) + ' de ' + brl_(valor) + '; saldo ' + brl_(valor - recebido) + (obs ? ' | ' + obs : ''));
    var pares = {};
    pares[HM.DATA] = data; pares[HM.HORA] = hora; pares[HM.PACIENTE] = paciente; pares[HM.PROFISSIONAL] = profissional; pares[HM.PROCEDIMENTO] = procedimento;
    pares[HM.OQUE] = oque; pares[HM.VALOR] = valor; pares[HM.PAGO] = pago;
    pares[HM.DATA_PAG] = pagou ? (parseData_(d.dataPagamento) || data) : ''; pares[HM.FORMA] = pagou ? String(d.forma || '').trim() : '';
    if (pago === 'Parcial') pares[HM.RECEBIDO] = recebido;
    pares[HM.QUEM] = (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : '';
    pares[HM.NF] = pagou ? (String(d.nf || '').trim() || 'Não') : (bloco.nf ? String(d.nf || '').trim() : (pago ? 'Não se aplica' : '')); pares[HM.NF_N] = pagou ? String(d.nfNumero || '').trim() : '';
    pares[HM.GUIA] = bloco.guia ? (String(d.guia || '').trim() || 'Não') : String(d.guia || '').trim();
    pares[HM.OBS] = obs; pares[HM.ID] = id; pares[HM.LOG] = (u.email || 'app') + ' · ' + agora_();
    if (bloco.detalhe) { pares[HM.DETALHE] = detalhe; pares[HM.DECISAO] = ''; }
    comAuto_(pares, pac);
    gravarCelulas_(s, linha, h, pares);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
    if (h[HM.VALOR]) s.getRange(linha, h[HM.VALOR]).setNumberFormat('#,##0.00');
    if (h[HM.RECEBIDO] && pago === 'Parcial') s.getRange(linha, h[HM.RECEBIDO]).setNumberFormat('#,##0.00');
    if (d.tornarPagadorHabitual && quem && quem !== (pac.pagador || '')) {
      var spc = aba_(CONFIG.ABA.PACIENTES), hc = cabecalhos_(spc);
      [CONFIG.H.PAGADOR, CONFIG.H.PAGADOR_EXTRATO].forEach(function (k) { if (hc[k]) spc.getRange(pac.linha, hc[k]).setValue(quem); });
      if (hc[CONFIG.H.LOG]) { var cl = spc.getRange(pac.linha, hc[CONFIG.H.LOG]); cl.setValue((String(cl.getValue() || '') + ' | pagador alterado por ' + (u.email || 'app') + ' · ' + agora_()).replace(/^ \| /, '')); }
      invalidar_(['pac']);
    }
    invalidar_(['comp']);
    SpreadsheetApp.flush();
    return { ok: true, id: id, linha: linha, aba: s.getName(), pago: pago, valor: valor, bloco: { situacao: bloco.situacao, frase: bloco.frase }, pendenteDecisao: !!bloco.detalhe };
  } finally { lock.releaseLock(); }
};

// clique repetido / tela que demorou: mesmo paciente, profissional, dia, hora e "o que aconteceu" já gravados → linha (0 = não)
function jaRegistrado_(s, data, paciente, profissional, hora, oque) {
  var n = s.getLastRow(); if (n < 2) return 0;
  var h = cabecalhos_(s), HM = CONFIG.HM, cols = [HM.DATA, HM.HORA, HM.PACIENTE, HM.PROFISSIONAL, HM.OQUE, HM.PROCEDIMENTO]; if (cols.some(function (k) { return !h[k]; })) return 0;
  var vals = s.getRange(2, 1, n - 1, Math.max.apply(null, cols.map(function (k) { return h[k]; }))).getValues(), chave = fmtData_(data), hr = horaTxt_(hora);
  for (var i = vals.length - 1; i >= 0; i--) {
    var r = vals[i], g = function (k) { return r[h[k] - 1]; };
    if (String(g(HM.PACIENTE) || '').trim() !== paciente || String(g(HM.PROFISSIONAL) || '').trim() !== profissional || String(g(HM.OQUE) || '').trim() !== oque) continue;
    if (fmtData_(g(HM.DATA)) !== chave || horaTxt_(g(HM.HORA)) !== hr || ehLinhaExtra_(g(HM.PROCEDIMENTO))) continue;
    return i + 2;
  }
  return 0;
}

/* ---------- Aplicações de teste (gestão, 15/10): sem número fixo de aplicações; o app conta as já feitas ----------
   Conta as linhas "Aplicação de teste…" com O que aconteceu = Atendido, de todas as abas de mês, por paciente × profissional.
   Fica em cache junto com as competências (toda gravação na aba do mês invalida). */
function ehAplicacao_(proc) { return /^Aplicação de teste/i.test(String(proc || '').trim()); }
// linha da aba do mês que é aplicação de teste; setembro foi importado sem procedimento: ali vale a observação ("Teste da avaliação…")
function ehAplicacaoLinha_(r) { return ehAplicacao_(r.procedimento) || (!String(r.procedimento || '').trim() && /teste da avalia|aplica[çc][ãa]o de teste/i.test(r.obs || '')); }
function ymdNum_(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function aplicacoes_() {
  return cacheado_('apl:' + versaoComp_(), function () {
    var out = {};
    CONFIG.MESES.forEach(function (m) {
      if (!planilha_().getSheetByName(m)) return;
      linhasMes_(m).linhas.forEach(function (r) {
        if (!ehAplicacaoLinha_(r) || !/^Atendido/.test(r.oque)) return;
        var d = parseData_(r.data); if (!d) return;
        var k = r.paciente + '|' + String(r.profissional || '').trim(); (out[k] = out[k] || []).push(ymdNum_(d));
      });
    });
    Object.keys(out).forEach(function (k) { out[k].sort(); });
    return out;
  });
}
// sessão da avaliação feita pela psicóloga em paciente de convênio (procedimento próprio, gestão 15/10)
function ehAvaliacaoSessao_(proc) { return /^Avaliação neuropsicológica – sessão/i.test(String(proc || '').trim()); }
// avaliação de convênio por paciente (todas as profissionais): aplicações + sessões da avaliação, Atendido, convênio na linha.
// Sabin: as primeiras N (parâmetro avaliacao_pacote_sessoes, 5) são o pacote; depois, cada sessão é autorizada à parte.
function avaliacoesPac_() {
  return cacheado_('avp:' + versaoComp_(), function () {
    var out = {};
    CONFIG.MESES.forEach(function (m) {
      if (!planilha_().getSheetByName(m)) return;
      linhasMes_(m).linhas.forEach(function (r) {
        if (!(ehAplicacaoLinha_(r) || ehAvaliacaoSessao_(r.procedimento)) || !/^Atendido/.test(r.oque)) return;
        if (!String(r.convenio || '').trim() || /^Particular$/i.test(r.convenio)) return;
        var d = parseData_(r.data); if (!d) return; (out[r.paciente] = out[r.paciente] || []).push(ymdNum_(d));
      });
    });
    Object.keys(out).forEach(function (k) { out[k].sort(); });
    return out;
  });
}
function numAvaliacao_(paciente, data) { var l = avaliacoesPac_()[paciente] || [], y = ymdNum_(data); return l.filter(function (x) { return x < y; }).length + 1; }
function pacoteAvaliacao_() { var n = Number(parametros_().avaliacao_pacote_sessoes); return n > 0 ? n : 5; }
function textoAvaliacao_(n, pk) { return n <= pk ? 'sessão ' + n + ' de ' + pk + ' do pacote' : 'sessão ' + n + ' · adicional: confira a autorização do convênio (guia)'; }
// nº da aplicação nesta data = aplicações registradas antes dela + 1
function numAplicacao_(paciente, profissional, data) { var l = aplicacoes_()[paciente + '|' + profissional] || [], y = ymdNum_(data); return l.filter(function (x) { return x < y; }).length + 1; }
// Pendências → Avaliações em andamento: quem fez aplicação nos últimos 60 dias (a avaliação não tem número fixo de aplicações)
function avaliacoesEmAndamento_() {
  var hoje = ymdNum_(new Date()), lim = ymdNum_(new Date(new Date().getTime() - 60 * 864e5)), a = aplicacoes_(), out = [];
  var txt = function (y) { return ('0' + (y % 100)).slice(-2) + '/' + ('0' + Math.floor(y / 100) % 100).slice(-2) + '/' + Math.floor(y / 10000); };
  var dias = function (y) { var d = new Date(Math.floor(y / 10000), Math.floor(y / 100) % 100 - 1, y % 100, 12); return Math.round((new Date().getTime() - d.getTime()) / 864e5); };
  Object.keys(a).forEach(function (k) { var l = a[k], u = l[l.length - 1]; if (!l.length || u < lim || u > hoje) return; out.push({ paciente: k.split('|')[0], profissional: k.split('|')[1], n: l.length, primeira: txt(l[0]), ultima: txt(u), diasSemVir: dias(u) }); });
  out.sort(function (x, y) { return x.diasSemVir - y.diasSemVir || x.paciente.localeCompare(y.paciente); });
  return out;
}

/* ---------- Lista do dia com a frase "Cobrança hoje" por item ---------- */
API.listaDoDia = function (d) {
  d = d || {};
  var data = parseData_(d.data) || new Date(), r = montarDia_(data), idx = {}; indicePacientes_().forEach(function (p) { idx[p.nome] = p; });
  r.itens.forEach(function (it) {
    var p = idx[it.paciente]; if (!p) { it.cobrancaHoje = null; return; }
    if (it.extra) { it.cobrancaHoje = { situacao: 'linha-extra', cor: 'cinza', curto: it.tipo, frase: it.registro.procedimento }; return; }
    var proc = it.registro ? it.registro.procedimento : (/aplicação de teste/i.test(it.tipo || '') ? 'Aplicação de teste' : /retorno/i.test(it.tipo || '') ? 'Retorno' : '');
    var aplic = ehAplicacao_(proc);
    try { var b = blocoPara_(it.paciente, it.profissional, data, proc, it.registro ? it.registro.oque : 'Atendido', p); it.cobrancaHoje = { situacao: b.situacao, cor: b.cor, curto: b.curto, frase: b.frase, apoio: b.apoio, valor: b.valor, valorMes: b.valorMes, guia: b.guia, nf: b.nf, decidido: b.decidido, obsLinha: b.obsLinha, aviso: b.aviso, linhas: Cobranca.linhasDoPaciente(cobrancasProf_(), it.paciente, data).map(Cobranca.resumoLinha) };
      if ((aplic || ehAvaliacaoSessao_(proc)) && b.situacao === 'convenio') { var nA = numAvaliacao_(it.paciente, data), pk = pacoteAvaliacao_(); it.avaliacao = { n: nA, pacote: pk }; it.cobrancaHoje.curto = 'Avaliação ' + (b.convenio || '') + ': ' + (nA <= pk ? 'sessão ' + nA + ' de ' + pk : 'sessão ' + nA + ' · adicional'); it.cobrancaHoje.frase += ' — ' + textoAvaliacao_(nA, pk); }
      else if (aplic && b.situacao === 'sem-cobranca-tipo') { it.aplicacao = numAplicacao_(it.paciente, it.profissional, data); it.cobrancaHoje.curto = 'Aplicação nº ' + it.aplicacao + ' · sem cobrança'; it.cobrancaHoje.frase += ' (aplicação nº ' + it.aplicacao + ')'; } } catch (e) { it.cobrancaHoje = { situacao: 'erro', cor: 'cinza', curto: '—', frase: String(e && e.message || e) }; }
  });
  r.pendencias = pendenciasDe_(r.itens.map(function (it) { return it.paciente; }), data);
  if (typeof alertasDe_ === 'function') r.alertas = alertasDe_(r.itens.filter(function (it) { return !it.extra; }).map(function (it) { return it.paciente; })); // Fase 2: avisos por paciente do dia
  r.params = parametros_();
  return r;
};

/* ---------- Cobrança do mês (substitui Pacotes/Mensalistas como tela) ---------- */
API.cobrancaMes = function (d) {
  d = d || {};
  var hoje = new Date(), chave = String(d.chave || chaveMes_(hoje)).trim(); if (!mesDaChave_(chave)) return { ok: false, erros: ['Competência inválida (use Mês/Ano, ex.: Novembro/2026).'] };
  var mens = mensalistasIdx_(), idx = {}; indicePacientes_().forEach(function (p) { idx[p.nome] = p; });
  var mRef = mesDaChave_(chave), meio = new Date(mRef.getFullYear(), mRef.getMonth(), 15, 12), itens = [];
  cobrancasProf_().forEach(function (l) {
    if (!l.ativo || !(l.pagamento === 'Antecipado' || l.pagamento === 'Posterior' || l.cobranca === 'Mensalidade fixa')) return;
    if (l.desde && parseData_(l.desde) > new Date(mRef.getFullYear(), mRef.getMonth() + 1, 0, 12)) return; if (l.ate && parseData_(l.ate) < mRef) return;
    var p = idx[l.paciente]; if (p && /^n/i.test(p.ativo || 'Sim')) return;
    var c = competenciaDe_(l, chave), sit = Cobranca.situacaoCompetencia(l, c, hoje, parametros_()), v = l.cobranca === 'Mensalidade fixa' ? l.valorMensal : l.valorSessao;
    var nAb = c.abatimentos.reduce(function (a, x) { return a + (x.n || 1); }, 0), sessCobr = c.sessoes != null ? Math.max(0, c.sessoes - nAb) : null;
    var total = l.cobranca === 'Mensalidade fixa' ? l.valorMensal : (c.valorCobrado != null ? c.valorCobrado : (l.pagamento === 'Posterior' ? null : (v != null && sessCobr != null ? Math.round(v * sessCobr * 100) / 100 : null)));
    itens.push({ paciente: l.paciente, profissional: l.profissional, id: l.id, cobranca: l.cobranca, pagamento: l.pagamento, valor: v, valorMes: total, sessoes: c.sessoes, sessoesCobradas: sessCobr, abatimentos: c.abatimentos, valorCobradoEditado: c.valorCobrado != null,
      pago: c.pago, data: c.data, forma: c.forma, nf: c.nf, recebido: c.recebido, atendidas: c.atendidas, aReceber: c.aReceber, situacao: sit.sit, cor: sit.cor, situacaoTxt: sit.txt, pagador: p ? p.pagador : '', whats: p ? p.whats : '', obs: l.obs, decidido: l.decididoPor, origem: c.origem, linhaMens: c.linhaMens, rotulo: Cobranca.resumoLinha(l) });
  });
  itens.sort(function (a, b) { return a.paciente.localeCompare(b.paciente) || a.profissional.localeCompare(b.profissional); });
  var proxChave = Cobranca.proximaCompetencia(chave);
  return { ok: true, chave: chave, itens: itens, competencias: mens.chaves, colunasExistem: !!mens.cols[chave], proximaChave: proxChave, proximaExiste: !!mens.cols[proxChave], hoje: hoje_(), params: parametros_() };
};
// garante, na aba Mensalistas, a coluna Profissional e as 6 colunas da competência; devolve a linha do paciente × profissional (cria se faltar)
function linhaMensalistas_(s, l, criar) {
  var g = garantirColunas_(s, ['Profissional'].concat(CONFIG.COMP_COLS.map(function (c) { return ''; }).length ? [] : [])), h = g.h, n = s.getLastRow();
  var nomes = n >= 2 ? s.getRange(2, 1, n - 1, 1).getValues() : [], profs = n >= 2 ? s.getRange(2, h['Profissional'], n - 1, 1).getValues() : [], linha = 0, vazia = 0;
  for (var i = 0; i < nomes.length; i++) { if (String(nomes[i][0] || '').trim() !== l.paciente) continue; var pf = String(profs[i][0] || '').trim(); if (pf === l.profissional) { linha = i + 2; break; } if (!pf && !vazia) vazia = i + 2; }
  if (!linha && vazia) { linha = vazia; s.getRange(linha, h['Profissional']).setValue(l.profissional); }
  if (!linha && criar) { linha = proximaLinha_(s, 1); gravarCelulas_(s, linha, h, { 'Paciente': l.paciente, 'Modalidade': l.cobranca + (l.pagamento ? ' · ' + l.pagamento : ''), 'Valor mensal hoje (R$)': l.cobranca === 'Mensalidade fixa' ? (l.valorMensal || '') : (l.valorSessao || ''), 'Pagador habitual': (indicePacientes_().filter(function (p) { return p.nome === l.paciente; })[0] || {}).pagador || '', 'Profissional': l.profissional }); }
  return { linha: linha, h: h };
}
function colunasComp_(s, chave) { return garantirColunas_(s, CONFIG.COMP_COLS.map(function (c) { return nomeColComp_(chave, c); })).h; }
// registrar o pagamento de uma ou mais competências (adiantamento de N meses): Mensalistas + linha de recebimento na aba do mês;
// Posterior: cada sessão da competência vira Sim/data/forma (não há linha extra)
API.registrarPagamentoMes = function (d) {
  d = d || {};
  var erros = [], paciente = String(d.paciente || '').trim(), profissional = String(d.profissional || '').trim();
  if (!paciente || !profissional) erros.push('Paciente e profissional são obrigatórios.');
  var comps = (d.competencias || []).map(function (x) { return String(x).trim(); }).filter(Boolean); if (!comps.length) erros.push('Escolha a competência (mês).');
  comps.forEach(function (c) { if (!mesDaChave_(c)) erros.push('Competência inválida: ' + c); });
  var data = parseData_(d.data) || new Date(), forma = String(d.forma || '').trim(), parcial = !!d.parcial, valor = numBR_(d.valor);
  if (!(valor > 0)) erros.push('Informe o valor recebido.'); if (!forma) erros.push('Escolha a forma de pagamento.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var v = linhaVigente_(paciente, profissional, mesDaChave_(comps[0]) || data), l = v.linha; if (!l) return { ok: false, erros: ['Sem linha de cobrança pra ' + profissional + ' em ' + comps[0] + '. Cadastre em Pacientes → Cobrança por profissional.'] };
    var sm = abaMes_(data), bloq = bloqueioPlanilha_([sm]); if (bloq) return { ok: false, erros: [bloq] };
    var sMens = abaComCabecalho_(CONFIG.ABA.MENSALISTAS, ['Paciente', 'Modalidade', 'Valor mensal hoje (R$)', 'Pagador habitual', 'Observação / valor combinado']), u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_();
    var quem = String(d.quemPagou || '').trim(), pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0] || {}, feitos = [], porComp = Math.round(valor / comps.length * 100) / 100;
    comps.forEach(function (chave, i) {
      var c = competenciaDe_(l, chave), nAb = c.abatimentos.reduce(function (a, x) { return a + (x.n || 1); }, 0), sess = c.sessoes != null ? c.sessoes : null;
      var cobrado = l.cobranca === 'Mensalidade fixa' ? l.valorMensal : (c.valorCobrado != null ? c.valorCobrado : (l.valorSessao != null && sess != null ? Math.round(l.valorSessao * Math.max(0, sess - nAb) * 100) / 100 : null));
      var vComp = comps.length === 1 ? valor : (i === comps.length - 1 ? Math.round((valor - porComp * (comps.length - 1)) * 100) / 100 : porComp);
      var lm = linhaMensalistas_(sMens, l, true), hc = colunasComp_(sMens, chave), pares = {};
      pares[nomeColComp_(chave, 'pago?')] = parcial ? 'Parcial' : 'Sim'; pares[nomeColComp_(chave, 'data')] = data; pares[nomeColComp_(chave, 'forma')] = forma; pares[nomeColComp_(chave, 'NF')] = (String(d.nfNumero || '').trim() ? 'Sim · nº ' + String(d.nfNumero).trim() : (String(d.nf || '') === 'Sim' ? 'Sim' : 'Não'));
      if (!c.sessoesEditadas && sess != null && l.cobranca !== 'Mensalidade fixa') pares[nomeColComp_(chave, 'sessões agendadas')] = sess;
      if (c.valorCobrado == null && cobrado != null) pares[nomeColComp_(chave, 'valor cobrado')] = cobrado;
      gravarCelulas_(sMens, lm.linha, hc, pares); sMens.getRange(lm.linha, hc[nomeColComp_(chave, 'data')]).setNumberFormat('dd/MM/yyyy');
      if (l.pagamento === 'Posterior') { // marca cada sessão da competência (Não/Parcial → Sim)
        var m = mesDaChave_(chave), sc = planilha_().getSheetByName(nomeAbaMes_(m)); if (sc && sc.getLastRow() >= 2) { var hh = cabecalhos_(sc), HM = CONFIG.HM, vals = sc.getRange(2, 1, sc.getLastRow() - 1, sc.getLastColumn()).getValues(), n = 0;
          vals.forEach(function (r, k) { var dt = r[hh[HM.DATA] - 1]; if (!(dt instanceof Date) || dt.getFullYear() !== m.getFullYear() || String(r[hh[HM.PACIENTE] - 1] || '').trim() !== paciente || String(r[hh[HM.PROFISSIONAL] - 1] || '').trim() !== profissional) return; var pg = String(r[hh[HM.PAGO] - 1] || '').trim(); if (pg !== 'Não' && pg !== 'Parcial') return; if (!/^Atendido|^Faltou|^Taxa/i.test(String(r[hh[HM.OQUE] - 1] || '') + ' ' + String(r[hh[HM.PROCEDIMENTO] - 1] || ''))) return;
            var pp = {}; pp[HM.PAGO] = parcial ? 'Parcial' : 'Sim'; pp[HM.DATA_PAG] = data; pp[HM.FORMA] = forma; if (!parcial && hh[HM.RECEBIDO]) pp[HM.RECEBIDO] = numBR_(r[hh[HM.VALOR] - 1]); if (String(d.nf || '') === 'Sim' || String(d.nfNumero || '').trim()) { pp[HM.NF] = 'Sim'; if (String(d.nfNumero || '').trim()) pp[HM.NF_N] = String(d.nfNumero).trim(); } if (quem && quem !== (pac.pagador || '') && quem !== paciente) pp[HM.QUEM] = quem;
            if (hh[HM.LOG]) pp[HM.LOG] = (String(r[hh[HM.LOG] - 1] || '').trim() ? String(r[hh[HM.LOG] - 1]).trim() + ' | ' : '') + 'pago pela Cobrança do mês (' + chave + ') por ' + carimbo; gravarCelulas_(sc, k + 2, hh, pp); sc.getRange(k + 2, hh[HM.DATA_PAG]).setNumberFormat('dd/MM/yyyy'); n++; }); feitos.push({ chave: chave, sessoesMarcadas: n }); }
      } else { // Antecipado / Mensalidade: linha de recebimento na aba do mês do pagamento
        var gm = garantirColunas_(sm, [CONFIG.HM.LOG]), hm = gm.h, HM2 = CONFIG.HM, ln = proximaLinha_(sm, hm[HM2.PACIENTE] || 3), id = novoId_('A'), pm = {}, mesTxt = chave.split('/')[0].toLowerCase();
        pm[HM2.DATA] = data; pm[HM2.PACIENTE] = paciente; pm[HM2.PROFISSIONAL] = profissional; pm[HM2.PROCEDIMENTO] = l.cobranca === 'Mensalidade fixa' ? 'Mensalidade de ' + mesTxt : 'Antecipado de ' + mesTxt + (sess != null ? ' (' + Math.max(0, sess - nAb) + ' sessões)' : '');
        pm[HM2.OQUE] = 'Atendido'; pm[HM2.VALOR] = vComp; pm[HM2.PAGO] = parcial ? 'Parcial' : 'Sim'; pm[HM2.DATA_PAG] = data; pm[HM2.FORMA] = forma; if (parcial && (hm[HM2.RECEBIDO] || garantirColunas_(sm, [HM2.RECEBIDO]).h[HM2.RECEBIDO])) { hm = cabecalhos_(sm); pm[HM2.RECEBIDO] = vComp; pm[HM2.VALOR] = cobrado || vComp; }
        pm[HM2.QUEM] = (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : ''; pm[HM2.NF] = String(d.nf || 'Não'); pm[HM2.NF_N] = String(d.nfNumero || '').trim(); pm[HM2.GUIA] = '';
        pm[HM2.OBS] = ((l.cobranca === 'Mensalidade fixa' ? 'Mensalidade ' : 'Antecipado ') + chave + ' · ' + profissional + (comps.length > 1 ? ' · adiantamento de ' + comps.length + ' meses (' + comps.join(', ') + ')' : '') + (cobrado != null && Math.abs(cobrado - vComp) > 0.005 ? ' · cobrado ' + brl_(cobrado) + ', recebido ' + brl_(vComp) : '') + '. ' + String(d.observacao || '')).trim();
        pm[HM2.ID] = id; pm[HM2.LOG] = carimbo; comAuto_(pm, pac);
        gravarCelulas_(sm, ln, hm, pm); [HM2.DATA, HM2.DATA_PAG].forEach(function (k) { if (hm[k]) sm.getRange(ln, hm[k]).setNumberFormat('dd/MM/yyyy'); }); if (hm[HM2.VALOR]) sm.getRange(ln, hm[HM2.VALOR]).setNumberFormat('#,##0.00');
        feitos.push({ chave: chave, id: id, linha: ln, aba: sm.getName(), valor: vComp });
      }
    });
    invalidar_(['mens', 'comp']);
    SpreadsheetApp.flush();
    return { ok: true, feitos: feitos };
  } finally { lock.releaseLock(); }
};
// gestão edita o nº de sessões agendadas / valor cobrado da competência (é assim que entra no meio do mês, quinzenal sem agenda…)
API.editarSessoesCompetencia = function (d) {
  d = d || {}; var u = usuario_();
  var paciente = String(d.paciente || '').trim(), profissional = String(d.profissional || '').trim(), chave = String(d.chave || '').trim();
  if (!paciente || !profissional || !mesDaChave_(chave)) return { ok: false, erros: ['Paciente, profissional e competência são obrigatórios.'] };
  var sess = d.sessoes === '' || d.sessoes == null ? null : numBR_(d.sessoes), vc = d.valorCobrado === '' || d.valorCobrado == null ? null : numBR_(d.valorCobrado);
  if (sess != null && !(sess >= 0)) return { ok: false, erros: ['Sessões inválidas.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var l = linhaVigente_(paciente, profissional, mesDaChave_(chave)).linha; if (!l) return { ok: false, erros: ['Sem linha de cobrança pra esse profissional.'] };
    var s = abaComCabecalho_(CONFIG.ABA.MENSALISTAS, ['Paciente', 'Modalidade', 'Valor mensal hoje (R$)', 'Pagador habitual', 'Observação / valor combinado']), lm = linhaMensalistas_(s, l, true), hc = colunasComp_(s, chave), antes = competenciaDe_(l, chave), pares = {}, mud = [];
    if (sess != null) { pares[nomeColComp_(chave, 'sessões agendadas')] = sess; mud.push({ campo: 'Sessões agendadas ' + chave, de: antes.sessoes, para: sess }); }
    if (vc != null) { pares[nomeColComp_(chave, 'valor cobrado')] = vc; mud.push({ campo: 'Valor cobrado ' + chave, de: antes.valorCobrado, para: vc }); }
    else if (sess != null && l.cobranca === 'Por sessão' && l.valorSessao != null) { var nAb = antes.abatimentos.reduce(function (a, x) { return a + (x.n || 1); }, 0); pares[nomeColComp_(chave, 'valor cobrado')] = Math.round(l.valorSessao * Math.max(0, sess - nAb) * 100) / 100; }
    if (!mud.length) return { ok: false, erros: ['Nada mudou.'] };
    gravarCelulas_(s, lm.linha, hc, pares);
    var sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa), carimbo = (u.email || 'app') + ' · ' + agora_();
    mud.forEach(function (m) { gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': CONFIG.ABA.MENSALISTAS, 'ID': l.id, 'Paciente': paciente, 'Campo': m.campo + ' · ' + profissional, 'De': m.de == null ? '' : m.de, 'Para': m.para, 'Quem informou': String(d.motivo || 'gestão'), 'Registrado por (app)': carimbo }); });
    invalidar_(['mens', 'comp']); SpreadsheetApp.flush();
    return { ok: true, linha: lm.linha };
  } finally { lock.releaseLock(); }
};
// Mensalistas: cria a coluna Profissional e as 6 colunas da competência (gestão)
API.criarColunasMes = function (d) {
  d = d || {}; if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão cria colunas de mês.'] };
  var chave = String(d.chave || '').trim(); if (!chave && d.mes) { var i = CONFIG.MESES.indexOf(String(d.mes)); if (i >= 0) { var hj = new Date(); chave = CONFIG.MESES[i] + '/' + (hj.getFullYear() + (i < hj.getMonth() ? 1 : 0)); } }
  if (!mesDaChave_(chave)) return { ok: false, erros: ['Competência inválida.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(CONFIG.ABA.MENSALISTAS, ['Paciente', 'Modalidade', 'Valor mensal hoje (R$)', 'Pagador habitual', 'Observação / valor combinado']);
    if (mensalistasIdx_().cols[chave] && mensalistasIdx_().cols[chave]['pago?'] != null) return { ok: false, erros: ['As colunas de ' + chave + ' já existem.'] };
    garantirColunas_(s, ['Profissional']); colunasComp_(s, chave);
    invalidar_(['mens']); SpreadsheetApp.flush();
    logAcao_(CONFIG.ABA.MENSALISTAS, 'Criar colunas de ' + chave, '');
    return { ok: true, chave: chave, colunas: CONFIG.COMP_COLS.map(function (c) { return nomeColComp_(chave, c); }) };
  } finally { lock.releaseLock(); }
};

/* ---------- Faltas → Decidir (gestão): a recepção registra, a gestão decide ---------- */
var DECISOES_FALTA = ['não abate', 'abate no mês seguinte', 'cobrar taxa de falta', 'relevar'];
API.decidirFalta = function (d) {
  d = d || {}; var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão decide sobre faltas.'] };
  var aba = String(d.aba || '').trim(), id = String(d.id || '').trim(), decisao = String(d.decisao || '').trim().toLowerCase();
  if (CONFIG.MESES.indexOf(aba) < 0 || !id) return { ok: false, erros: ['Aba e ID do lançamento são obrigatórios.'] };
  if (DECISOES_FALTA.indexOf(decisao) < 0) return { ok: false, erros: ['Decisão inválida. Use: ' + DECISOES_FALTA.join(' · ')] };
  var s = planilha_().getSheetByName(aba); if (!s) return { ok: false, erros: ['A aba ' + aba + ' não existe.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var h = garantirColunas_(s, [CONFIG.HM.DETALHE, CONFIG.HM.DECISAO]).h, HM = CONFIG.HM, ids = s.getRange(2, h[HM.ID], Math.max(s.getLastRow() - 1, 1), 1).getValues(), linha = 0;
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === id) { linha = i + 2; break; }
    if (!linha) return { ok: false, erros: ['Não achei o lançamento ' + id + ' em ' + aba + '.'] };
    var r = s.getRange(linha, 1, 1, s.getLastColumn()).getValues()[0], g = function (k) { var c = h[HM[k]]; return c ? r[c - 1] : ''; };
    var oque = String(g('OQUE') || ''); if (!/^(Faltou|Desmarcou)/i.test(oque)) return { ok: false, erros: ['Esse lançamento não é falta nem desmarcação (' + oque + ').'] };
    var paciente = String(g('PACIENTE') || '').trim(), profissional = String(g('PROFISSIONAL') || '').trim(), dataF = g('DATA') instanceof Date ? g('DATA') : parseData_(fmtData_(g('DATA'))), carimbo = (u.email || 'app') + ' · ' + agora_(), antes = String(g('DECISAO') || '').trim();
    var pares = {}; pares[HM.DECISAO] = decisao; var obsAdd = 'Decisão da gestão: ' + decisao + (d.observacao ? ' — ' + String(d.observacao).trim() : '') + ' (' + carimbo + ')';
    pares[HM.OBS] = (String(g('OBS') || '').trim() ? String(g('OBS')).trim() + ' | ' : '') + obsAdd;
    if (h[HM.LOG]) pares[HM.LOG] = (String(g('LOG') || '').trim() ? String(g('LOG')).trim() + ' | ' : '') + 'decisão da falta por ' + carimbo;
    gravarCelulas_(s, linha, h, pares);
    var taxa = null;
    if (decisao === 'cobrar taxa de falta') {
      var l = linhaVigente_(paciente, profissional, dataF).linha, esp = espDoProf_(profissional), base = l && l.valorSessao != null ? l.valorSessao : (l && l.cobranca === 'Mensalidade fixa' ? null : valorCheio_(esp));
      var pct = Cobranca.params(parametros_()).taxa_falta_pct, valorTaxa = numBR_(d.valorTaxa) || (base != null ? Math.round(base * pct) / 100 : 0);
      if (!(valorTaxa > 0)) return { ok: false, erros: ['Não consegui calcular a taxa (sem valor por sessão na linha de cobrança): informe o valor da taxa.'] };
      var proc = procedimentos_().filter(function (p) { return /^Taxa de falta/i.test(p.nome) && (!esp || p.especialidade === esp); })[0] || procedimentos_().filter(function (p) { return /^Taxa de falta/i.test(p.nome); })[0];
      var ln = proximaLinha_(s, h[HM.PACIENTE] || 3), idT = novoId_('A'), pt = {}, pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0] || {};
      pt[HM.DATA] = dataF || new Date(); pt[HM.HORA] = ''; pt[HM.PACIENTE] = paciente; pt[HM.PROFISSIONAL] = profissional; pt[HM.PROCEDIMENTO] = proc ? proc.nome : 'Taxa de falta – psicologia'; pt[HM.OQUE] = 'Atendido';
      pt[HM.VALOR] = valorTaxa; pt[HM.PAGO] = 'Não'; pt[HM.NF] = 'Não'; pt[HM.OBS] = 'Taxa de falta (' + pct + '% de ' + brl_(base || 0) + ') pela falta de ' + fmtData_(dataF) + ' (' + id + '), decidida pela gestão em ' + agora_() + '. Cobrar no próximo atendimento.'; pt[HM.ID] = idT; pt[HM.LOG] = carimbo; comAuto_(pt, pac);
      gravarCelulas_(s, ln, h, pt); s.getRange(ln, h[HM.DATA]).setNumberFormat('dd/MM/yyyy'); if (h[HM.VALOR]) s.getRange(ln, h[HM.VALOR]).setNumberFormat('#,##0.00');
      taxa = { id: idT, linha: ln, valor: valorTaxa };
    }
    var sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa);
    gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': aba, 'ID': id, 'Paciente': paciente, 'Campo': 'Decisão da gestão (falta)', 'De': antes, 'Para': decisao + (taxa ? ' · taxa ' + brl_(taxa.valor) + ' (' + taxa.id + ')' : ''), 'Quem informou': String(d.observacao || 'gestão'), 'Registrado por (app)': carimbo });
    invalidar_(['comp']); SpreadsheetApp.flush();
    return { ok: true, id: id, decisao: decisao, taxa: taxa };
  } finally { lock.releaseLock(); }
};

/* ---------- Cobrança por profissional: cadastro (gestão e recepção incluem/editam; o log guarda quem gravou e quem decidiu) ---------- */
API.cobrancasDoPaciente = function (d) { d = d || {}; var nome = String(d.nome || '').trim(); return { ok: true, linhas: cobrancasProf_().filter(function (l) { return l.paciente === nome; }).map(function (l) { l.resumo = Cobranca.resumoLinha(l); return l; }), valores: valoresSessao_() }; };
API.salvarCobrancaProf = function (d) {
  d = d || {}; var u = usuario_();
  var erros = [], paciente = String(d.paciente || '').trim(), profissional = String(d.profissional || '').trim(), cob = Cobranca.normCobranca(d.cobranca);
  if (!paciente) erros.push('Escolha o paciente.'); if (!profissional) erros.push('Escolha o profissional.');
  if (Cobranca.COBRANCAS.indexOf(cob) < 0) erros.push('Cobrança fora da lista (' + Cobranca.COBRANCAS.join(' · ') + ').');
  var conv = String(d.convenio || '').trim(); if (cob === 'Convênio' && (!conv || /^Particular$/i.test(conv))) erros.push('Cobrança "Convênio" exige o nome do convênio.');
  if (cob === 'Convênio' && conv) { var lc = colunaLista_(CONFIG.LISTAS.CONVENIO); if (lc.length && lc.indexOf(conv) < 0) erros.push('Convênio fora da lista (aba Listas).'); }
  var vs = d.valorSessao === '' || d.valorSessao == null ? null : numBR_(d.valorSessao), vm = d.valorMensal === '' || d.valorMensal == null ? null : numBR_(d.valorMensal);
  var esp = espDoProf_(profissional), lista = valoresSessao_().filter(function (v) { return v.ativo && v.especialidade === esp; }).map(function (v) { return v.valor; });
  if (cob === 'Por sessão') { if (!(vs > 0)) erros.push('Informe o valor por sessão.'); else if (lista.length && lista.indexOf(vs) < 0 && !String(d.obs || '').trim()) erros.push('Valor fora da lista de ' + esp + ' (' + lista.join(', ') + '): escreva o motivo na observação.'); }
  if (cob === 'Mensalidade fixa' && !(vm > 0)) erros.push('Informe o valor mensal.');
  var pg = d.pagamento ? Cobranca.normPagamento(d.pagamento, cob) : Cobranca.normPagamento('', cob);
  if ((cob === 'Convênio' || cob === 'Pro bono' || cob === 'Permuta') && pg !== 'Não se aplica') pg = 'Não se aplica';
  if (cob === 'Mensalidade fixa' && pg === 'Na hora') erros.push('Mensalidade fixa paga Antecipado ou Posterior.');
  var desde = d.desde ? parseData_(d.desde) : null, ate = d.ate ? parseData_(d.ate) : null; if (d.desde && !desde) erros.push('"Vigente desde" inválida.'); if (d.ate && !ate) erros.push('"Vigente até" inválida.');
  var decididoPor = String(d.decididoPor || '').trim(); if (!decididoPor) erros.push('Informe quem decidiu o valor (Juliana · Victor · gestão…).');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (!indicePacientes_().some(function (p) { return p.nome === paciente; })) return { ok: false, erros: ['Paciente não está em Pacientes.'] };
    var s = abaComCabecalho_(CONFIG.ABA.CPP, CONFIG.HCPP), h = cabecalhos_(s), id = String(d.id || '').trim(), linha = 0, carimbo = (u.email || 'app') + ' · ' + agora_();
    if (id) { var ids = s.getRange(2, h['ID'], Math.max(s.getLastRow() - 1, 1), 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === id) { linha = i + 2; break; } if (!linha) return { ok: false, erros: ['Linha ' + id + ' não encontrada.'] }; }
    var novo = { 'Paciente': paciente, 'Profissional': profissional, 'Ativo': d.ativo === false || /^n/i.test(String(d.ativo || 'Sim')) ? 'Não' : 'Sim', 'Cobrança': cob, 'Convênio': cob === 'Convênio' ? conv : '', 'Valor por sessão (R$)': cob === 'Por sessão' ? vs : '', 'Valor mensal (R$)': cob === 'Mensalidade fixa' ? vm : '', 'Pagamento': pg, 'Vigente desde': desde || '', 'Vigente até': ate || '', 'Valor decidido por': decididoPor, 'Valor decidido em': parseData_(d.decididoEm) || new Date(), 'Observação de cobrança': String(d.obs || '').trim() };
    var sl = abaComCabecalho_(CONFIG.ABA.ALTERACOES, CONFIG.HC), hl = cabecalhos_(sl), quem = String(d.quemInformou || decididoPor), mud = [];
    if (linha) {
      var atual = s.getRange(linha, 1, 1, s.getLastColumn()).getValues()[0], pares = {};
      Object.keys(novo).forEach(function (k) { var c = h[k]; if (!c) return; var de = atual[c - 1], deTxt = de instanceof Date ? fmtData_(de) : String(de == null ? '' : de).trim(), para = novo[k] instanceof Date ? fmtData_(novo[k]) : String(novo[k] == null ? '' : novo[k]).trim(); if (k === 'Valor decidido em' && !mud.length && deTxt) return; if (deTxt === para) return; pares[k] = novo[k]; mud.push({ campo: k, de: deTxt, para: para }); });
      if (!mud.length) return { ok: true, id: id, alterados: [], aviso: 'Nada mudou.' };
      pares['Registrado por (app)'] = (String(atual[h['Registrado por (app)'] - 1] || '').trim() ? String(atual[h['Registrado por (app)'] - 1]).trim() + ' | ' : '') + 'alterado por ' + carimbo;
      gravarCelulas_(s, linha, h, pares);
    } else {
      id = novoId_('C'); linha = proximaLinha_(s, h['Paciente']); novo['ID'] = id; novo['Registrado por (app)'] = carimbo; gravarCelulas_(s, linha, h, novo);
      mud.push({ campo: 'linha nova', de: '', para: cob + (vs != null ? ' ' + brl_(vs) + '/sessão' : '') + (vm != null ? ' ' + brl_(vm) + '/mês' : '') + ' · ' + pg + (desde ? ' desde ' + fmtData_(desde) : '') + (ate ? ' até ' + fmtData_(ate) : '') + ' (' + id + ')' });
    }
    ['Vigente desde', 'Vigente até', 'Valor decidido em'].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
    mud.forEach(function (m) { gravarCelulas_(sl, proximaLinha_(sl, hl['Paciente']), hl, { 'Data/hora': agora_(), 'Paciente': paciente, 'Campo': 'Cobrança por profissional · ' + profissional + ' · ' + m.campo, 'De': m.de, 'Para': m.para, 'Quem informou': quem, 'Registrado por (app)': carimbo }); });
    invalidar_(['cpp', 'comp']); SpreadsheetApp.flush();
    return { ok: true, id: id, linha: linha, alterados: mud.map(function (m) { return m.campo; }) };
  } finally { lock.releaseLock(); }
};
// Pendências: pacientes atendidos no mês por um profissional sem linha de cobrança (cadastro incompleto)
function cadastroIncompletoMes_(atend) {
  var vistos = {}, out = [];
  (atend || []).forEach(function (r) {
    if (/^(Aplicação de teste|Retorno|Mensalidade|Antecipado|Renovação|Taxa)/i.test(r.procedimento || '') || /\(compra\)/i.test(r.procedimento || '')) return;
    var k = r.paciente + '|' + r.profissional; if (vistos[k] || !r.profissional) return;
    var dt = parseData_(r.data) || new Date(); if (linhaVigente_(r.paciente, r.profissional, dt).linha) { vistos[k] = 1; return; }
    vistos[k] = 1; out.push({ paciente: r.paciente, profissional: r.profissional, data: r.data, id: r.id, pago: r.pago, valor: r.valor, convenio: r.convenio });
  });
  return out;
}

/* ---------- tempo de cada chamada (a tela mostra pra gestão) ---------- */
Object.keys(API).forEach(function (k) {
  var f = API[k];
  API[k] = function (d) { var t = new Date().getTime(), r = f(d); if (r && typeof r === 'object' && !(r instanceof Array)) r._ms = new Date().getTime() - t; return r; };
});
