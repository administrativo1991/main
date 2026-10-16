/* ================= FASE 2 — mesmo escopo de server.js e server-cobranca.js (montado pelo build) =================
   Confirmações por WhatsApp (gestão, 15/10): a recepção escolhe o período (amanhã, daqui a 2 dias, a semana), vê as sessões
   agrupadas por pagador e abre o WhatsApp com a mensagem pronta. "Mensagem enviada" fica na aba própria `Mensagens WhatsApp`
   (o código antigo não lê essa aba: voltar o código não duplica nada na Agenda). "Confirmou" continua sendo a linha
   "Confirmado" da Lista do dia (API.confirmar). O texto é o oficial da clínica (app/shared/mensagens.js, o mesmo na tela);
   a gestão pode trocar em Parâmetros!msg_confirmacao. */
var ABA_MSG = 'Mensagens WhatsApp';
var HMSG = ['ID', 'Data/hora', 'Tipo', 'Pagador', 'WhatsApp', 'Paciente', 'Profissional', 'Data da sessão', 'Hora', 'Registrado por (app)', 'Competência', 'Valor (R$)'];
var TIPOS_MSG = ['Confirmação', 'Cobrança mensalidade', 'Cobrança consultas'];
var CONFIRMACAO_MAX_DIAS = 14;

// telefone: as regras ficam em app/shared/mensagens.js (as mesmas da tela)
function foneWhats_(t) { return Mensagens.fone(t); }
function foneFmt_(t) { return Mensagens.foneFmt(t); }
function enviadas_() {
  var s = planilha_().getSheetByName(ABA_MSG), out = {};
  linhasComo_(s).forEach(function (r) {
    if (!/^Confirmação/i.test(String(r['Tipo'] || ''))) return;
    var quem = String(r['Registrado por (app)'] || '').split(' · ');
    out[r['Data da sessão'] + '|' + r['Paciente'] + '|' + r['Profissional']] = { por: quem[0] || '', quando: quem[1] || String(r['Data/hora'] || '') };
  });
  return out;
}

API.confirmacoes = function (d) {
  d = d || {};
  var de = parseData_(d.de) || parseData_(fmtData_(dataMais_(new Date(), 1))), ate = parseData_(d.ate) || de; // padrão: amanhã
  if (ate < de) { var t = de; de = ate; ate = t; }
  var dias = Math.round((ate - de) / (24 * 3600 * 1000)) + 1;
  if (dias > CONFIRMACAO_MAX_DIAS) return { ok: false, erros: ['Escolha no máximo ' + CONFIRMACAO_MAX_DIAS + ' dias.'] };
  var idx = {}; indicePacientes_().forEach(function (p) { idx[p.nome] = p; });
  var env = enviadas_(), cache = {}, grupos = {}, ordem = [], par = parametros_(), nomeMsg = {};
  profissionais_().forEach(function (p) { if (p.nomeMsg) nomeMsg[p.nome] = p.nomeMsg; }); // coluna "Nome na mensagem" (Profissionais)
  var modelo = String(par.msg_confirmacao || '').trim();
  for (var i = 0; i < dias; i++) {
    var dia = montarDia_(dataMais_(de, i), cache);
    dia.itens.forEach(function (it) {
      if (it.extra || it.registro || it.naoVem) return; // pagamento do mês, já registrado, ou já avisou que não vem
      var p = idx[it.paciente] || {}, fp = Mensagens.foneDoPaciente(p), fone = fp.fone, deQuem = fp.de; // só celular serve pro WhatsApp
      // uma mensagem por pagador (irmãos recebem uma só, com o número de quem tiver); sem pagador, por número; sem os dois, por paciente
      var chave = p.pagador ? 'p:' + Duplicatas.normalizar(p.pagador) : fone ? 'w:' + fone : 'x:' + it.paciente;
      var g = grupos[chave];
      if (!g) { g = grupos[chave] = { chave: chave, pagador: p.pagador || '', fone: '', foneFmt: '', foneDe: '', itens: [] }; ordem.push(chave); }
      if (fone && !g.fone) { g.fone = fone; g.foneFmt = foneFmt_(fone); g.foneDe = deQuem; }
      g.itens.push({ data: dia.data, diaSemana: dia.diaSemana, hora: horaTxt_(it.hora), paciente: it.paciente, profissional: it.profissional, profMsg: nomeMsg[it.profissional] || it.profissional, tipo: it.tipo || '',
        confirmado: it.confirmado || null, enviado: env[dia.data + '|' + it.paciente + '|' + it.profissional] || null, cadastrado: !!idx[it.paciente] });
    });
  }
  var lista = ordem.map(function (k) {
    var g = grupos[k];
    g.pacientes = g.itens.map(function (x) { return x.paciente; }).filter(function (x, j, a) { return a.indexOf(x) === j; });
    g.aConfirmar = g.itens.filter(function (x) { return !x.confirmado; }).length;
    var faltam = g.itens.filter(function (x) { return !x.confirmado; });
    g.mensagem = Mensagens.confirmacao(modelo, g.pagador, faltam.length ? faltam : g.itens); // a tela refaz com o filtro de profissional
    return g;
  });
  // primeiro quem ainda falta confirmar; dentro disso, pela primeira sessão
  lista.sort(function (a, b) { return (b.aConfirmar ? 1 : 0) - (a.aConfirmar ? 1 : 0) || (ymdNum_(parseData_(a.itens[0].data)) - ymdNum_(parseData_(b.itens[0].data))) || String(a.itens[0].hora).localeCompare(String(b.itens[0].hora)); });
  return { ok: true, de: fmtData_(de), ate: fmtData_(ate), grupos: lista, modelo: modelo, total: lista.reduce(function (n, g) { return n + g.itens.length; }, 0) };
};

// "Abri o WhatsApp": uma linha por sessão (confirmação) ou por paciente × profissional (cobrança, com competência e valor)
// na aba Mensagens WhatsApp. Não é prova de envio; é o que a recepção fez.
API.marcarMensagemEnviada = function (d) {
  d = d || {};
  var tipo = String(d.tipo || 'Confirmação'); if (TIPOS_MSG.indexOf(tipo) < 0) return { ok: false, erros: ['Tipo de mensagem inválido.'] };
  var confirmacao = tipo === 'Confirmação', chave = String(d.competencia || '').trim();
  if (!confirmacao && !mesDaChave_(chave)) return { ok: false, erros: ['Cobrança sem competência (Mês/Ano).'] };
  var itens = (d.itens || []).filter(function (x) { return x && x.paciente && x.profissional && (!confirmacao || parseData_(x.data)); });
  if (!itens.length) return { ok: false, erros: ['Nenhuma sessão na mensagem.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_MSG, HMSG), h = garantirColunas_(s, HMSG).h, u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_(); // aba criada no 11 ganha as colunas novas no fim
    itens.forEach(function (x) {
      var linha = proximaLinha_(s, h['Paciente']);
      gravarCelulas_(s, linha, h, { 'ID': novoId_('M'), 'Data/hora': agora_(), 'Tipo': tipo, 'Pagador': String(d.pagador || '').trim(), 'WhatsApp': foneFmt_(d.fone),
        'Paciente': String(x.paciente).trim(), 'Profissional': String(x.profissional).trim(), 'Data da sessão': confirmacao ? parseData_(x.data) : '', 'Hora': confirmacao ? horaTxt_(x.hora) : '',
        'Competência': confirmacao ? '' : chave, 'Valor (R$)': confirmacao ? '' : (numBR_(x.valor) || ''), 'Registrado por (app)': carimbo });
      if (confirmacao && h['Data da sessão']) s.getRange(linha, h['Data da sessão']).setNumberFormat('dd/MM/yyyy');
      if (h['Hora']) s.getRange(linha, h['Hora']).setNumberFormat('@');
      if (h['Competência']) s.getRange(linha, h['Competência']).setNumberFormat('@');
    });
    SpreadsheetApp.flush(); if (!confirmacao) renovarAlertas_(); // "cobrado no WhatsApp" muda os alertas
    return { ok: true, n: itens.length, por: u.email || '', quando: agora_() };
  } finally { lock.releaseLock(); }
};

// WhatsApp digitado na tela de confirmações: vai pro cadastro (WhatsApp do pagador), com log em Alterações de cadastro
API.salvarWhats = function (d) {
  d = d || {};
  var fone = foneWhats_(d.whats); if (!fone) return { ok: false, erros: ['WhatsApp inválido: DDD + número, ex.: (32) 9 9999-9999.'] };
  // irmãos com o mesmo pagador: o número vai pro cadastro de cada um
  var pacs = (d.pacientes || [d.paciente]).map(function (x) { return String(x || '').trim(); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  if (!pacs.length) return { ok: false, erros: ['Paciente não informado.'] };
  var erros = [], salvos = [];
  pacs.forEach(function (nome) {
    var r = API.atualizarCadastro({ nome: nome, campos: { whats: foneFmt_(fone) }, quemInformou: String(d.quemInformou || '').trim() || 'recepção (tela Confirmações)' });
    if (r && r.ok) salvos.push(nome); else erros.push(nome + ': ' + ((r && r.erros) || ['não gravou']).join(' '));
  });
  return erros.length && !salvos.length ? { ok: false, erros: erros } : { ok: true, salvos: salvos, avisos: erros, fone: fone, foneFmt: foneFmt_(fone) };
};

/* ---------- Cobrança no WhatsApp (gestão, 15/10): a tela Cobrança do mês ganha o número e a última cobrança mandada ---------- */
function cobrancasEnviadas_() {
  var out = {};
  linhasComo_(planilha_().getSheetByName(ABA_MSG)).forEach(function (r) {
    if (!/^Cobrança/i.test(String(r['Tipo'] || ''))) return;
    var quem = String(r['Registrado por (app)'] || '').split(' · ');
    out[r['Paciente'] + '|' + r['Profissional'] + '|' + r['Competência']] = { por: quem[0] || '', quando: quem[1] || String(r['Data/hora'] || ''), valor: numBR_(r['Valor (R$)']) };
  });
  return out;
}
var cobrancaMesFase1_ = API.cobrancaMes;
API.cobrancaMes = function (d) {
  var r = cobrancaMesFase1_(d); if (!r || !r.ok) return r;
  var idx = {}; indicePacientes_().forEach(function (p) { idx[p.nome] = p; });
  var env = cobrancasEnviadas_(), par = r.params || parametros_();
  r.itens.forEach(function (it) {
    var f = Mensagens.foneDoPaciente(idx[it.paciente]); it.fone = f.fone; it.foneFmt = f.foneFmt; it.foneDe = f.de;
    it.cobrado = env[it.paciente + '|' + it.profissional + '|' + r.chave] || null;
  });
  r.modelos = { mensalidade: String(par.msg_cobranca_mensalidade || '').trim(), consultas: String(par.msg_cobranca_consultas || '').trim() };
  return r;
};

/* ---------- Lançar o dia em lote (Fase 2, 15/10): Meu dia → "Lançar o dia" ----------
   Cada linha passa pelo mesmo registrarAtendimento do Registrar (mesma validação, mesmo Pago?, mesma trava de repetido).
   Uma chamada só pra tela; o resultado vem linha a linha (as que deram erro não impedem as outras). */
API.registrarLote = function (d) {
  d = d || {}; var itens = (d.itens || []).slice(0, 80);
  if (!itens.length) return { ok: false, erros: ['Nenhum lançamento marcado.'] };
  var resultados = itens.map(function (x) {
    try { var r = API.registrarAtendimento(x) || {}; return { ok: r.ok !== false, erros: r.erros || [], repetido: !!r.repetido, aba: r.aba, linha: r.linha, pago: r.pago, valor: r.valor, pendenteDecisao: !!r.pendenteDecisao }; }
    catch (e) { return { ok: false, erros: [String(e && e.message || e)] }; }
  });
  var n = resultados.filter(function (r) { return r.ok; }).length;
  return { ok: true, gravados: n, falharam: resultados.length - n, resultados: resultados };
};

/* ---------- Ficha do paciente (Fase 2, 16/10): tudo de um paciente numa tela, só leitura ----------
   Cadastro (contatos) · cobrança por profissional (vigentes e encerradas) · horários fixos · próximos 14 dias ·
   em aberto (a receber, guias, NF) · mensalidade/antecipado (mês anterior, atual, próximo) · sessões (abas de mês, mais
   recentes primeiro) · mensagens de WhatsApp · alterações de cadastro. Os alertas do paciente saem daqui (item 6). */
API.fichaPaciente = function (d) {
  d = d || {};
  var p = linhaPaciente_(d.nome); if (!p) return { ok: false, erros: ['Paciente não encontrado em Pacientes.'] };
  var nome = p.nome, hoje = new Date(), hojeN = ymdNum_(hoje);
  var f = Mensagens.foneDoPaciente(p);
  // cobrança por profissional: todas as linhas do paciente; "vigente" = a que vale hoje pra aquele profissional
  var cpp = cobrancasProf_().filter(function (l) { return l.paciente === nome; });
  var vig = {}; Cobranca.linhasDoPaciente(cobrancasProf_(), nome, hoje).forEach(function (l) { vig[l.id] = 1; });
  var cobrancas = cpp.map(function (l) { return { id: l.id, profissional: l.profissional, resumo: Cobranca.resumoLinha(l), vigente: !!vig[l.id], ativo: l.ativo, desde: l.desde || '', ate: l.ate || '', obs: l.obs || '', decidido: l.decididoPor || '' }; });
  // horários fixos ativos e ainda valendo
  var fixos = API.agendaFixa().filter(function (r) { if (r['Paciente'] !== nome || String(r['Ativo'] || 'Sim') === 'Não') return false; var t = r['Termina em'] ? parseData_(r['Termina em']) : null; return !t || t >= hoje; })
    .map(function (r) { return { dia: r['Dia da semana'], hora: horaTxt_(r['Hora']), profissional: r['Profissional'], frequencia: r['Frequência'] || 'Semanal', tipo: String(r['Tipo'] || ''), obs: r['Observação'] || '' }; });
  // próximos 14 dias (agenda montada como na Agenda: fixos + agendamentos − não vem)
  var cache = {}, proximos = [];
  for (var i = 0; i < 14; i++) {
    var dia = montarDia_(dataMais_(hoje, i), cache);
    dia.itens.forEach(function (it) { if (it.paciente !== nome || it.extra) return; proximos.push({ data: dia.data, diaSemana: dia.diaSemana, hora: horaTxt_(it.hora), profissional: it.profissional, tipo: it.tipo || '', naoVem: it.naoVem || '', confirmado: !!it.confirmado, registrado: it.registro ? it.registro.oque : '' }); });
  }
  // sessões das abas de mês
  var sessoes = [];
  CONFIG.MESES.forEach(function (m) { linhasMes_(m).linhas.forEach(function (r) { if (r.paciente !== nome) return; r.aba = m; r.saldo = saldo_(r); sessoes.push(r); }); });
  var dn = function (r) { var x = parseData_(r.data); return x ? ymdNum_(x) : 0; };
  sessoes.sort(function (a, b) { return dn(b) - dn(a) || String(b.hora).localeCompare(String(a.hora)); });
  // em aberto: mesma regra das pendências da Agenda (particular atendido sem pagar; convênio sem guia) + NF a emitir
  var aberto = [], emDiaP = parcEmDia_();
  sessoes.forEach(function (r) {
    if (!/^Atendido/.test(r.oque) || ehPerdido_(r.pago)) return;
    var particular = !r.convenio || /^Particular$/i.test(r.convenio);
    if (particular && emDiaP[r.parc] && r.saldo > 0 && (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial')) aberto.push({ tipo: 'acordo', r: r }); // dívida num parcelamento em dia
    else if (particular && (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial') && (!/^Mensalidade|pacote|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento)) && r.saldo > 0) aberto.push({ tipo: 'receber', r: r });
    else if ((!particular || /^Convênio/i.test(r.pago)) && r.guia !== 'Sim') aberto.push({ tipo: 'guia', r: r });
    if ((r.pago === 'Sim' || r.pago === 'Parcial') && r.nf !== 'Sim' && r.valor > 0) aberto.push({ tipo: 'nf', r: r });
  });
  // mensalidade/antecipado: competências do mês anterior, atual e próximo
  var chaves = [-1, 0, 1].map(function (k) { return chaveMes_(new Date(hoje.getFullYear(), hoje.getMonth() + k, 1, 12)); }), mensal = [];
  cpp.filter(function (l) { return vig[l.id] && (l.pagamento === 'Antecipado' || l.pagamento === 'Posterior' || l.cobranca === 'Mensalidade fixa'); }).forEach(function (l) {
    chaves.forEach(function (ch) { try { var c = competenciaDe_(l, ch), s = Cobranca.situacaoCompetencia(l, c, hoje, parametros_()); mensal.push({ profissional: l.profissional, chave: ch, pago: c.pago, data: c.data, forma: c.forma, situacao: s.sit, cor: s.cor, texto: s.txt, aReceber: c.aReceber }); } catch (e) { } });
  });
  var msgs = linhasComo_(planilha_().getSheetByName(ABA_MSG)).filter(function (r) { return r['Paciente'] === nome; }).reverse().slice(0, 15)
    .map(function (r) { return { quando: String(r['Data/hora'] || ''), tipo: r['Tipo'], profissional: r['Profissional'], sessao: r['Data da sessão'] || '', competencia: r['Competência'] || '', valor: numBR_(r['Valor (R$)']) || null, por: String(r['Registrado por (app)'] || '').split(' · ')[0] }; });
  var alts = linhasComo_(planilha_().getSheetByName(CONFIG.ABA.ALTERACOES)).filter(function (r) { return r['Paciente'] === nome; }).reverse().slice(0, 10)
    .map(function (r) { return { quando: String(r['Data/hora'] || ''), campo: r['Campo'], de: String(r['De'] || ''), para: String(r['Para'] || ''), quem: r['Quem informou'] || '' }; });
  var ult = sessoes.filter(function (r) { return /^Atendido/.test(r.oque) && dn(r) <= hojeN; })[0];
  return { ok: true, paciente: { nome: nome, nasc: p.nasc, ativo: p.ativo, convenio: p.convenio, pagador: p.pagador, obsCobranca: p.obsCobranca, resp: p.resp, respPar: p.respPar, whats: p.whats, respTel: p.respTel, telPac: p.telPac, fone: f.fone, foneFmt: f.foneFmt, foneDe: f.de, fixoFmt: f.fixoFmt, cpfFinal: Duplicatas.digitos(p.cpf).slice(-4) },
    cobrancas: cobrancas, fixos: fixos, proximos: proximos, aberto: aberto, mensal: mensal, sessoes: sessoes.slice(0, 80), totalSessoes: sessoes.length, ultimaVez: ult ? { data: ult.data, profissional: ult.profissional } : null, mensagens: msgs, alteracoes: alts, parcelamentos: API.parcelamentos({ paciente: nome }).acordos, alertas: alertasDe_([nome])[nome] || [] };
};

/* ---------- Conciliação (Fase 2, 16/10; só gestão) ----------
   Extrato do banco (OFX do PagBank) e vendas da maquininha (CSV "detalhado" do PagBank) entram em abas próprias, uma linha
   por entrada (o código do banco evita duplicar quando o mesmo arquivo é enviado de novo). O app cruza com o que foi lançado
   como recebido nas abas de mês (Pix e cartão; dinheiro fica no Fechar o dia) e sugere as ligações; a gestão confirma.
   Confirmar grava: na aba do extrato/vendas a Situação e o "Ligado a"; na aba do mês, a coluna nova "Conciliado" (no fim). */
var ABA_EXT = 'Extrato bancário', ABA_CART = 'Vendas no cartão', COL_CONC = 'Conciliado';
// "Sugestão IA" (17/10): o que a conciliação assistida sugeriu (JSON); só sugestão, quem grava Situação/Ligado a é o Confirmar
var HEXT = ['ID do banco', 'Data', 'Valor (R$)', 'Tipo', 'Quem pagou', 'Descrição', 'Situação', 'Ligado a', 'Observação', 'Importado em', 'Registrado por (app)', 'Sugestão IA'];
var HCART = ['Código da transação', 'Data', 'Forma', 'Parcelas', 'Bandeira', 'Valor bruto (R$)', 'Taxa (R$)', 'Valor líquido (R$)', 'Liberação', 'Comprador', 'Situação', 'Ligado a', 'Depósito (ID do banco)', 'Observação', 'Importado em', 'Registrado por (app)', 'Sugestão IA'];
// situações que a gestão escolhe para uma entrada do banco que não é de lançamento do app
var SIT_EXT = ['conciliado', 'convênio (fatura)', 'mensalidade anotada em Mensalistas', 'mês anterior ao app', 'aluguel de sala', 'não é paciente', 'sem lançamento no app', 'pendente'];
function soGestao_() { return usuario_().perfil === 'gestao' ? null : { ok: false, erros: ['Só a gestão.'] }; }
function tipoExt_(memo) { var m = String(memo || ''); return /^QR Code Pix recebido/i.test(m) ? 'Pix (QR Code)' : /^Pix recebido/i.test(m) ? 'Pix' : /^Vendas/i.test(m) ? 'Cartão (vendas)' : /^Rendimento/i.test(m) ? 'Rendimento' : /^Devolu/i.test(m) ? 'Devolução' : 'Outro'; }
// OFX (SGML ou XML): cada <STMTTRN> até o fechamento ou o próximo
function lerOFX_(t) {
  return String(t || '').split(/<STMTTRN>/i).slice(1).map(function (b) {
    b = b.split(/<\/STMTTRN>/i)[0];
    var g = function (k) { var m = b.match(new RegExp('<' + k + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
    var d = g('DTPOSTED'), memo = g('MEMO') || g('NAME');
    return { id: g('FITID'), data: d.length >= 8 ? d.slice(6, 8) + '/' + d.slice(4, 6) + '/' + d.slice(0, 4) : '', valor: Number(String(g('TRNAMT')).replace(',', '.')), memo: memo };
  }).filter(function (x) { return x.id && x.data && x.valor > 0; }); // só entradas
}
// CSV ";" com cabeçalho (aspas opcionais)
function lerCSV_(t) {
  var linhas = String(t || '').replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
  var campos = function (l) { var out = [], cur = '', q = false; for (var i = 0; i < l.length; i++) { var c = l.charAt(i); if (c === '"') { if (q && l.charAt(i + 1) === '"') { cur += '"'; i++; } else q = !q; } else if (c === ';' && !q) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out.map(function (x) { return x.trim(); }); };
  if (!linhas.length) return []; var h = campos(linhas[0]);
  return linhas.slice(1).map(function (l) { var v = campos(l), o = {}; h.forEach(function (k, i) { o[k] = v[i] || ''; }); return o; });
}
function gravarLinhas_(s, h, linhaIni, objs) {
  var n = s.getLastColumn(), vals = objs.map(function (o) { var r = []; for (var c = 0; c < n; c++) r.push(''); Object.keys(o).forEach(function (k) { if (h[k]) r[h[k] - 1] = o[k]; }); return r; });
  if (vals.length) s.getRange(linhaIni, 1, vals.length, n).setValues(vals);
}
API.importarExtrato = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var tx = lerOFX_(d.texto); if (!tx.length) return { ok: false, erros: ['Não achei entradas nesse arquivo. É o OFX do banco?'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_EXT, HEXT), h = garantirColunas_(s, HEXT).h, ja = {}, u = usuario_(), quando = agora_();
    linhasComo_(s).forEach(function (r) { ja[String(r['ID do banco'])] = 1; });
    var novos = tx.filter(function (x) { return !ja[x.id]; }).map(function (x) {
      var tipo = tipoExt_(x.memo);
      return { 'ID do banco': x.id, 'Data': parseData_(x.data), 'Valor (R$)': x.valor, 'Tipo': tipo, 'Quem pagou': (String(x.memo).split(' - ').slice(1).join(' - ') || '').trim(), 'Descrição': x.memo,
        'Situação': tipo === 'Rendimento' ? 'não é paciente' : 'pendente', 'Importado em': quando, 'Registrado por (app)': (u.email || 'app') + ' · ' + quando };
    });
    var ini = proximaLinha_(s, h['ID do banco']); gravarLinhas_(s, h, ini, novos);
    if (novos.length && h['Data']) s.getRange(ini, h['Data'], novos.length, 1).setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();
    return { ok: true, lidos: tx.length, novos: novos.length, jaTinha: tx.length - novos.length };
  } finally { lock.releaseLock(); }
};
API.importarVendasCartao = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var vs = lerCSV_(d.texto).filter(function (r) { return r['Código da Transação'] && /^Aprovad/i.test(r['Status'] || 'Aprovada'); });
  if (!vs.length) return { ok: false, erros: ['Não achei vendas nesse arquivo. É o CSV "detalhado" do PagBank?'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_CART, HCART), h = garantirColunas_(s, HCART).h, ja = {}, u = usuario_(), quando = agora_();
    linhasComo_(s).forEach(function (r) { ja[String(r['Código da transação'])] = 1; });
    var novos = vs.filter(function (r) { return !ja[r['Código da Transação']]; }).map(function (r) {
      return { 'Código da transação': r['Código da Transação'], 'Data': parseData_(String(r['Data da Transação']).slice(0, 10)), 'Forma': r['Forma de Pagamento'], 'Parcelas': r['Parcela'], 'Bandeira': r['Bandeira'],
        'Valor bruto (R$)': numBR_(r['Valor Bruto']), 'Taxa (R$)': numBR_(r['Valor Taxa']), 'Valor líquido (R$)': numBR_(r['Valor Líquido']), 'Liberação': parseData_(String(r['Data prevista de liberação']).slice(0, 10)),
        'Comprador': r['Nome Comprador'] || '', 'Situação': 'pendente', 'Importado em': quando, 'Registrado por (app)': (u.email || 'app') + ' · ' + quando };
    });
    var ini = proximaLinha_(s, h['Código da transação']); gravarLinhas_(s, h, ini, novos);
    ['Data', 'Liberação'].forEach(function (k) { if (novos.length && h[k]) s.getRange(ini, h[k], novos.length, 1).setNumberFormat('dd/MM/yyyy'); });
    SpreadsheetApp.flush();
    return { ok: true, lidos: vs.length, novos: novos.length, jaTinha: vs.length - novos.length };
  } finally { lock.releaseLock(); }
};
var STOP_NOMES_ = { de: 1, da: 1, do: 1, dos: 1, das: 1, e: 1 };
function tokensNome_(s) { return Duplicatas.normalizar(String(s || '')).split(/\s+/).filter(function (x) { return x && !STOP_NOMES_[x]; }); }
// parecido de nomes: fração dos tokens do nome menor que aparecem no outro (0 a 1)
function notaNome_(a, nomes) {
  var ta = tokensNome_(a); if (!ta.length) return 0; var best = 0;
  nomes.forEach(function (b) { var tb = tokensNome_(b); if (!tb.length) return; var comum = ta.filter(function (x) { return tb.indexOf(x) >= 0; }).length; best = Math.max(best, comum / Math.min(ta.length, tb.length)); });
  return best;
}
function diasEntre_(a, b) { return Math.round((ymdDate_(a) - ymdDate_(b)) / 864e5); }
function ymdDate_(s) { var d = s instanceof Date ? s : parseData_(s); return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null; }
// recebimentos lançados (Pix e cartão) de todas as abas de mês, com a data do pagamento; `todas` (opcional) = linhasMes_ já lidas, por aba
function recebimentosApp_(todas) {
  var idx = {}; indicePacientes_().forEach(function (p) { idx[p.nome] = p; }); var out = [];
  CONFIG.MESES.forEach(function (m) {
    var s = planilha_().getSheetByName(m); if (!s) return; var h = cabecalhos_(s), cc = h[COL_CONC];
    var concs = cc && s.getLastRow() >= 2 ? s.getRange(2, cc, s.getLastRow() - 1, 1).getValues() : [];
    ((todas && todas[m]) || linhasMes_(m)).linhas.forEach(function (r) {
      if (!(r.pago === 'Sim' || r.pago === 'Parcial')) return;
      var total = r.pago === 'Parcial' ? r.recebido : r.valor; if (!(total > 0)) return;
      // cada recebimento anotado na Observação ("Recebido R$ 50,00 em 20/10/2026 (Pix)", correção e parcelas) é uma entrada
      // separada; o que sobra é o primeiro pagamento, na data da sessão
      var pays = [], m2, re = /Recebido R\$ ([\d.,]+) em (\d{2}\/\d{2}\/\d{4}) \(([^)]*)\)/g;
      while ((m2 = re.exec(r.obs || ''))) pays.push({ valor: numBR_(m2[1]), dataPag: m2[2], forma: m2[3] });
      var soma = pays.reduce(function (a, x) { return a + x.valor; }, 0), itens = [];
      if (!pays.length) itens.push({ valor: total, dataPag: r.dataPag || r.data, forma: String(r.forma || '') });
      else { if (total - soma > 0.01) itens.push({ valor: Math.round((total - soma) * 100) / 100, dataPag: r.data, forma: String(r.forma || '') }); itens = itens.concat(pays); }
      var cel = cc ? String((concs[r.linha - 2] || [''])[0] || '') : '', jaConc = (cel.match(/(^|\| )(PagBank|Cartão) /g) || []).length; // quantos recebimentos da linha já foram conciliados
      var p = idx[r.paciente] || {};
      itens.forEach(function (it, k) {
        if (!/pix|cart/i.test(it.forma)) return;
        out.push({ aba: m, linha: r.linha, chave: m + '!' + r.linha + '#' + k, id: r.id, paciente: r.paciente, profissional: r.profissional, data: r.data, dataPag: it.dataPag, valor: Math.round(it.valor * 100) / 100, forma: it.forma,
          cartao: /cart/i.test(it.forma), nomes: [r.paciente, r.quem, p.pagador, p.pagadorExtrato].filter(function (x) { return x; }), conciliado: k < jaConc ? cel : '' });
      });
    });
  });
  return out;
}
function recResumo_(r) { return { aba: r.aba, linha: r.linha, id: r.id, paciente: r.paciente, profissional: r.profissional, data: r.data, dataPag: r.dataPag, valor: r.valor, forma: r.forma }; }
// primeiro dia do primeiro mês com lançamento no app (as abas de mês não têm ano no nome: vale a menor data lançada)
function inicioApp_(todas) {
  var min = null; Object.keys(todas).forEach(function (m) { todas[m].linhas.forEach(function (r) { var x = ymdDate_(r.data); if (x && (!min || x < min)) min = x; }); });
  return min ? new Date(min.getFullYear(), min.getMonth(), 1) : null;
}
API.conciliacao = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var c = conciliacaoCalc_(String(d.chave || chaveMes_(new Date()))); if (!c.ok) return c;
  iaConciliacaoAnexar_(c); // sugestões da IA guardadas, conferidas de novo (server-conciliacao-ia.js)
  return c.resp;
};
// o cálculo da conciliação do mês, separado pra conciliação assistida reaproveitar os candidatos (recs livres, linhas lidas)
function conciliacaoCalc_(chave) {
  var ini = mesDaChave_(chave); if (!ini) return { ok: false, erros: ['Mês inválido.'] };
  var fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 0, 12), noMes = function (s) { var x = ymdDate_(s); return x && x >= ymdDate_(ini) && x <= ymdDate_(fim); };
  var ext = linhasComo_(planilha_().getSheetByName(ABA_EXT)).filter(function (r) { return r['ID do banco']; }).map(function (r) { return { id: String(r['ID do banco']), data: r['Data'], valor: numBR_(r['Valor (R$)']), tipo: r['Tipo'], quem: r['Quem pagou'], desc: r['Descrição'], situacao: String(r['Situação'] || 'pendente'), ligado: r['Ligado a'] || '', obs: r['Observação'] || '', sugIA: r['Sugestão IA'] || '' }; });
  var vendas = linhasComo_(planilha_().getSheetByName(ABA_CART)).filter(function (r) { return r['Código da transação']; }).map(function (r) { return { id: String(r['Código da transação']), data: r['Data'], forma: r['Forma'], parcelas: r['Parcelas'], bandeira: r['Bandeira'], bruto: numBR_(r['Valor bruto (R$)']), taxa: numBR_(r['Taxa (R$)']), liquido: numBR_(r['Valor líquido (R$)']), liberacao: r['Liberação'], comprador: r['Comprador'] || '', situacao: String(r['Situação'] || 'pendente'), ligado: r['Ligado a'] || '', deposito: r['Depósito (ID do banco)'] || '', obs: r['Observação'] || '', sugIA: r['Sugestão IA'] || '' }; });
  var todas = {}; CONFIG.MESES.forEach(function (m) { if (planilha_().getSheetByName(m)) todas[m] = linhasMes_(m); });
  var recs = recebimentosApp_(todas), usados = {}, usadosExt = {}, sug = [], inicio = inicioApp_(todas);
  var livre = function (r) { return !r.conciliado && !usados[r.chave]; }, usa = function (r) { usados[r.chave] = 1; };
  var extMes = ext.filter(function (e) { return noMes(e.data); }), pend = extMes.filter(function (e) { return e.situacao === 'pendente'; });
  // quem pagou é convênio (aba Listas) ou profissional da clínica: sugere a situação; só casa com lançamento se o nome conferir
  var convs = []; try { convs = colunaLista_(CONFIG.LISTAS.CONVENIO).filter(function (c) { return c && !/^Particular$/i.test(c); }); } catch (e0) { }
  var profs = profissionais_().map(function (p) { return String(p.nome).replace(/^Dra?\.\s+/, ''); });
  pend.forEach(function (e) {
    if (!/^Pix/.test(e.tipo)) return; var tq = tokensNome_(e.quem), tem = function (n) { var t = tokensNome_(n).filter(function (x) { return x.length >= 3; }); return t.length && t.every(function (x) { return tq.indexOf(x) >= 0; }); };
    if (convs.some(tem)) e.sugestao = 'convênio (fatura)';
    else if (profs.some(function (p) { return tokensNome_(p).length >= 2 && tem(p); })) e.sugestao = 'aluguel de sala';
  });
  // regras fixas (17/10): resgate de aplicação e transferência da própria clínica não são paciente; antes do 1º mês do app, "mês anterior ao app"
  pend.forEach(function (e) {
    if (e.sugestao) return;
    if (/^(Renda Fixa|Resgate)|resgate (total )?de cdb/i.test(String(e.desc || '')) || /cl[ií]nica nascente/i.test(Duplicatas.normalizar(e.quem || '') + ' ' + String(e.quem || ''))) { e.sugestao = 'não é paciente'; e.fixa = true; }
    else if (inicio && ymdDate_(e.data) && ymdDate_(e.data) < inicio) { e.sugestao = 'mês anterior ao app'; e.fixa = true; }
  });
  // decisão anterior da gestão pro mesmo pagador (17/10): se todas as entradas já resolvidas dele tiveram a mesma situação fixa
  // (aluguel de sala, não é paciente, convênio), sugere a mesma — sem IA, e sem entrar no "Confirmar sugestões fixas"
  var hist = historicoPagadores_(ext, todas);
  pend.forEach(function (e) {
    if (e.sugestao || !/^Pix/.test(e.tipo)) return; var h = hist[chavePagador_(e.quem)]; if (!h) return;
    var sits = Object.keys(h.sit); if (sits.length === 1 && /^(aluguel de sala|não é paciente|convênio \(fatura\))$/.test(sits[0]) && !h.pacientes.length) { e.sugestao = sits[0]; e.historico = h.sit[sits[0]]; }
  });
  // 1) Pix: um lançamento, mesmo valor, data de -3 a +3 dias; nome confere = "forte"
  pend.filter(function (e) { return /^Pix/.test(e.tipo); }).forEach(function (e) {
    var c = recs.filter(function (r) { return livre(r) && !r.cartao && Math.abs(r.valor - e.valor) < 0.01 && Math.abs(diasEntre_(r.dataPag, e.data)) <= 3; })
      .map(function (r) { return { r: r, nota: notaNome_(e.quem, r.nomes), dd: Math.abs(diasEntre_(r.dataPag, e.data)) }; }).sort(function (a, b) { return b.nota - a.nota || a.dd - b.dd; })[0];
    if (!c || (e.sugestao && c.nota < 0.5)) return; usa(c.r); usadosExt[e.id] = 1; delete e.sugestao; // convênio/profissional só casa se o nome confere
    sug.push({ tipo: 'pix', forca: c.nota >= 0.5 ? 'forte' : 'confira', aviso: c.nota >= 0.5 ? '' : 'nome diferente: ' + e.quem + ' pagando por ' + c.r.paciente, ext: e, recs: [recResumo_(c.r)] });
  });
  // 2) Pix pagando 2 a 4 lançamentos do mesmo pagador (nome confere), de 7 dias antes a 3 depois
  pend.filter(function (e) { return /^Pix/.test(e.tipo) && !usadosExt[e.id]; }).forEach(function (e) {
    var c = recs.filter(function (r) { return livre(r) && !r.cartao && notaNome_(e.quem, r.nomes) >= 0.5 && diasEntre_(r.dataPag, e.data) <= 3 && diasEntre_(r.dataPag, e.data) >= -7; }).slice(0, 12), achou = null;
    (function busca(i, esc, soma) { if (achou) return; if (esc.length >= 2 && Math.abs(soma - e.valor) < 0.01) { achou = esc.slice(); return; } if (esc.length >= 4 || soma > e.valor + 0.01) return; for (var j = i; j < c.length; j++) { esc.push(c[j]); busca(j + 1, esc, soma + c[j].valor); esc.pop(); } })(0, [], 0);
    if (!achou) return; achou.forEach(usa); usadosExt[e.id] = 1; delete e.sugestao;
    sug.push({ tipo: 'varios', forca: 'confira', aviso: achou.length + ' lançamentos num Pix só', ext: e, recs: achou.map(recResumo_) });
  });
  // 3) cartão: venda (CSV) × lançamento em cartão no mesmo dia; venda até 10% maior = acréscimo na maquininha
  var depUsado = {};
  vendas.filter(function (v) { return noMes(v.data); }).forEach(function (v) {
    var dep = ext.filter(function (e) { return e.tipo === 'Cartão (vendas)' && !depUsado[e.id] && Math.abs(e.valor - v.liquido) < 0.01 && Math.abs(diasEntre_(e.data, v.liberacao || v.data)) <= 2; })[0];
    if (dep) depUsado[dep.id] = 1; v.depositoSug = dep ? { id: dep.id, data: dep.data, valor: dep.valor, situacao: dep.situacao } : null;
    if (v.situacao !== 'pendente') return;
    var c = recs.filter(function (r) { return livre(r) && r.cartao && diasEntre_(r.dataPag, v.data) === 0 && v.bruto >= r.valor - 0.01 && v.bruto <= r.valor * 1.1 + 0.01; })
      .sort(function (a, b) { return Math.abs(a.valor - v.bruto) - Math.abs(b.valor - v.bruto); })[0];
    if (!c) return; usa(c);
    var dif = Math.round((v.bruto - c.valor) * 100) / 100;
    sug.push({ tipo: 'cartao', forca: dif ? 'confira' : 'forte', aviso: dif ? 'R$ ' + Mensagens.valorBR(dif) + ' a mais na maquininha (acréscimo?)' : '', venda: v, recs: [recResumo_(c)] });
  });
  var semLanc = pend.filter(function (e) { return !usadosExt[e.id] && !(e.tipo === 'Cartão (vendas)' && depUsado[e.id]); }); // depósito de cartão sem venda no CSV também aparece
  var vendasSemLanc = vendas.filter(function (v) { return noMes(v.data) && v.situacao === 'pendente' && !sug.some(function (s) { return s.venda && s.venda.id === v.id; }); });
  var semBanco = recs.filter(function (r) { return livre(r) && noMes(r.dataPag); }).map(recResumo_);
  var soma = function (l, f) { return Math.round(l.reduce(function (a, x) { return a + (f(x) || 0); }, 0) * 100) / 100; };
  var vm = vendas.filter(function (v) { return noMes(v.data); });
  var resp = { ok: true, chave: chave, sugestoes: sug, semLancamento: semLanc, vendasSemLancamento: vendasSemLanc, semBanco: semBanco, resolvidos: extMes.filter(function (e) { return e.situacao !== 'pendente'; }), vendas: vm, situacoes: SIT_EXT, inicioApp: inicio ? fmtData_(inicio) : '',
    resumo: { entradas: extMes.length, valorEntradas: soma(extMes, function (e) { return e.valor; }), resolvidas: extMes.length - pend.length, pendentes: pend.length, valorSemLanc: soma(semLanc, function (e) { return e.valor; }), valorSemBanco: soma(semBanco, function (r) { return r.valor; }), taxasCartao: soma(vm, function (v) { return v.taxa; }), temExtrato: ext.length > 0, temVendas: vendas.length > 0 } };
  // a resposta leva a sugestão da IA já conferida (x.ia, em iaConciliacaoAnexar_), não o JSON cru da coluna
  var sugIA = {}; ext.forEach(function (e) { if (e.sugIA) sugIA['ext:' + e.id] = e.sugIA; delete e.sugIA; }); vendas.forEach(function (v) { if (v.sugIA) sugIA['venda:' + v.id] = v.sugIA; delete v.sugIA; });
  return { ok: true, resp: resp, ini: ini, fim: fim, recs: recs, livre: livre, todas: todas, inicio: inicio, sugIA: sugIA, hist: hist };
}
// confirma ligações e classificações: [{ tipo: 'ext'|'venda', id, situacao, recs: [{aba, linha, id}], obs, deposito }]
API.conciliar = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var itens = (d.itens || []).slice(0, 200); if (!itens.length) return { ok: false, erros: ['Nada marcado.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_(), erros = [], feitos = 0;
    var sE = abaComCabecalho_(ABA_EXT, HEXT), hE = garantirColunas_(sE, HEXT).h, sC = abaComCabecalho_(ABA_CART, HCART), hC = garantirColunas_(sC, HCART).h;
    var linhaDe = function (s, h, col, id) { if (s.getLastRow() < 2) return 0; var ids = s.getRange(2, h[col], s.getLastRow() - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2; return 0; };
    var abas = {};
    itens.forEach(function (it) {
      var venda = it.tipo === 'venda', s = venda ? sC : sE, h = venda ? hC : hE, li = linhaDe(s, h, venda ? 'Código da transação' : 'ID do banco', it.id);
      if (!li) { erros.push('Não achei ' + (venda ? 'a venda ' : 'a entrada ') + it.id); return; }
      var recs = it.recs || [], sit = recs.length ? 'conciliado' : String(it.situacao || ''); if (SIT_EXT.indexOf(sit) < 0) { erros.push('Situação inválida: ' + sit); return; }
      if (!recs.length && sit === 'conciliado') { erros.push('Conciliado precisa de um lançamento.'); return; }
      var lig = [], ok = true, valorBanco = numBR_(s.getRange(li, h[venda ? 'Valor bruto (R$)' : 'Valor (R$)']).getValue()), dataBanco = fmtData_(s.getRange(li, h['Data']).getValue());
      recs.forEach(function (r) {
        var sm = planilha_().getSheetByName(r.aba); if (!sm) { erros.push('Aba ' + r.aba + ' não existe.'); ok = false; return; }
        if (!abas[r.aba]) abas[r.aba] = { s: sm, h: garantirColunas_(sm, [COL_CONC]).h };
        var hm = abas[r.aba].h, idCol = hm[CONFIG.HM.ID] || hm['ID'];
        if (idCol && r.id && String(sm.getRange(r.linha, idCol).getValue()) !== String(r.id)) { erros.push(r.aba + ' linha ' + r.linha + ': o lançamento mudou de lugar; recarregue.'); ok = false; return; }
        var cel = sm.getRange(r.linha, hm[COL_CONC]), antes = String(cel.getValue() || '').trim(); // linha com mais de um recebimento (parcial, parcelas): acumula
        cel.setValue((antes ? antes + ' | ' : '') + (venda ? 'Cartão ' : 'PagBank ') + dataBanco + ' · R$ ' + Mensagens.valorBR(valorBanco) + ' · ' + String(it.id).slice(0, 8) + ' · ' + carimbo);
        lig.push(r.aba + '!' + r.linha + (r.id ? ' (' + r.id + ')' : ''));
      });
      if (!ok) return;
      var par = { 'Situação': sit, 'Ligado a': lig.join(' + '), 'Registrado por (app)': carimbo };
      if (it.obs != null && String(it.obs).trim()) par['Observação'] = String(it.obs).trim();
      gravarCelulas_(s, li, h, par);
      if (venda && it.deposito) { var ld = linhaDe(sE, hE, 'ID do banco', it.deposito); if (ld) { gravarCelulas_(sC, li, hC, { 'Depósito (ID do banco)': it.deposito }); gravarCelulas_(sE, ld, hE, { 'Situação': 'conciliado', 'Ligado a': 'Venda no cartão ' + String(it.id).slice(0, 8), 'Registrado por (app)': carimbo }); } }
      feitos++;
    });
    SpreadsheetApp.flush();
    return { ok: true, feitos: feitos, erros: erros };
  } finally { lock.releaseLock(); }
};

/* ================= A RECEBER E PERDAS (Fase 2, 16/10; só gestão) =================
   "Em aberto" junta o a receber de TODAS as abas de mês (mesma regra de Pendências: emAberto_) com a idade de cada linha;
   a gestão marca várias de uma vez como "Perdido / glosa" (pela mesma correção da Fase 1, com motivo e carimbo).
   "Perdas do ano" soma as linhas perdidas de todas as abas por mês, motivo, convênio e profissional. */
var MOTIVOS_PERDA = ['glosa do convênio', 'guia não autorizada', 'paciente não pagou', 'paciente desistiu', 'relevado pela gestão'];
function abasDeMes_() { return CONFIG.MESES.filter(function (m) { return !!planilha_().getSheetByName(m); }); }
function motivoPerda_(obs) { var m = String(obs || '').match(/PERDIDO \/ glosa:\s*([^|]+)/i); return m ? m[1].trim() : ''; }
API.aReceber = function () {
  var neg = soGestao_(); if (neg) return neg;
  var hoje = ymdDate_(new Date()), idx = {}, linhas = [], emDia = parcEmDia_();
  indicePacientes_().forEach(function (p) { idx[p.nome] = p; });
  abasDeMes_().forEach(function (aba) {
    linhasMes_(aba).linhas.forEach(function (r) {
      if (!emAberto_(r) || emDia[r.parc]) return; var saldo = saldo_(r); if (!(saldo > 0)) return;
      var d = ymdDate_(r.data), dias = d ? Math.round((hoje - d) / 864e5) : 0, p = idx[r.paciente] || {};
      linhas.push({ aba: aba, linha: r.linha, id: r.id, data: r.data, paciente: r.paciente, pagador: p.pagador || '', profissional: r.profissional, procedimento: r.procedimento,
        valor: r.valor, saldo: saldo, pago: r.pago || '(vazio)', dias: dias, faixa: dias <= 30 ? 'ate30' : dias <= 60 ? 'ate60' : 'mais60', obs: r.obs, parc: r.parc });
    });
  });
  linhas.sort(function (a, b) { return b.dias - a.dias || (a.paciente < b.paciente ? -1 : 1); });
  var soma = function (f) { return Math.round(linhas.filter(f).reduce(function (a, x) { return a + x.saldo; }, 0) * 100) / 100; };
  // parcelas vencidas de serviço parcelado (não têm linha na aba do mês até serem pagas)
  var vencidas = []; acordos_().forEach(function (a) { if (a.situacao !== 'ativo' || a.tipo !== 'avaliacao') return; a.parcelas.forEach(function (q) { if (q.atrasada) vencidas.push({ id: a.id, paciente: a.paciente, pagador: a.pagador, descricao: a.descricao, n: q.n, de: a.n, venc: q.venc, valor: Math.round((q.valor - q.pago) * 100) / 100, dias: Math.round((hoje - ymdDate_(q.venc)) / 864e5) }); }); });
  return { ok: true, linhas: linhas, parcelasVencidas: vencidas, motivos: MOTIVOS_PERDA, total: soma(function () { return true; }),
    faixas: { ate30: soma(function (x) { return x.faixa === 'ate30'; }), ate60: soma(function (x) { return x.faixa === 'ate60'; }), mais60: soma(function (x) { return x.faixa === 'mais60'; }) } };
};
// várias linhas como "Perdido / glosa" de uma vez: [{ aba, id }] + motivo
API.darComoPerdido = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var motivo = String(d.motivo || '').trim(), itens = (d.itens || []).slice(0, 100);
  if (!motivo) return { ok: false, erros: ['Escreva o motivo da perda.'] };
  if (!itens.length) return { ok: false, erros: ['Nada marcado.'] };
  var feitos = 0, erros = [];
  itens.forEach(function (it) {
    var r = API.corrigirLancamento({ aba: it.aba, id: it.id, campos: { pago: PAGO_PERDIDO, motivoPerdido: motivo } });
    if (r && r.ok) feitos++; else erros.push((it.paciente ? it.paciente + ' ' : '') + (it.data || it.id) + ': ' + ((r && r.erros) || ['erro']).join(' '));
  });
  return { ok: true, feitos: feitos, erros: erros };
};
API.perdasAno = function () {
  var neg = soGestao_(); if (neg) return neg;
  var linhas = [], meses = [], grupo = function (o, k, v) { var g = o[k] = o[k] || { nome: k, n: 0, valor: 0 }; g.n++; g.valor = Math.round((g.valor + v) * 100) / 100; };
  var porMotivo = {}, porConv = {}, porProf = {};
  abasDeMes_().forEach(function (aba) {
    var L = linhasMes_(aba).linhas, atendido = 0, perdido = 0, n = 0;
    L.forEach(function (r) {
      if (/^Atendido/.test(r.oque)) atendido += r.valor || 0;
      if (!ehPerdido_(r.pago)) return;
      var mot = motivoPerda_(r.obs) || 'sem motivo escrito', conv = r.convenio || 'Particular', v = r.valor || 0;
      n++; perdido += v; grupo(porMotivo, mot, v); grupo(porConv, conv, v); grupo(porProf, r.profissional || '—', v);
      linhas.push({ aba: aba, id: r.id, data: r.data, paciente: r.paciente, profissional: r.profissional, procedimento: r.procedimento, convenio: conv, valor: v, motivo: mot });
    });
    meses.push({ mes: aba, atendido: Math.round(atendido * 100) / 100, perdido: Math.round(perdido * 100) / 100, n: n });
  });
  var lista = function (o) { return Object.keys(o).map(function (k) { return o[k]; }).sort(function (a, b) { return b.valor - a.valor; }); };
  var tot = meses.reduce(function (a, m) { a.atendido += m.atendido; a.perdido += m.perdido; a.n += m.n; return a; }, { atendido: 0, perdido: 0, n: 0 });
  return { ok: true, meses: meses, porMotivo: lista(porMotivo), porConvenio: lista(porConv), porProfissional: lista(porProf), linhas: linhas,
    total: { atendido: Math.round(tot.atendido * 100) / 100, perdido: Math.round(tot.perdido * 100) / 100, n: tot.n } };
};

/* ================= PARCELAMENTOS (Fase 2, 16/10; gestão e recepção) =================
   Decisões da gestão (16/10): (1) serviço parcelado (ex.: avaliação neuropsicológica): o acordo guarda o total e os vencimentos;
   cada pagamento vira um lançamento no mês em que o dinheiro entrou ("… · parcela 2/3"), como a gestão já fazia à mão;
   (2) dívida renegociada: as linhas em aberto ficam ligadas ao acordo (coluna "Parcelamento (ID)" no fim da aba do mês) e cada
   pagamento é abatido nelas, da mais antiga para a mais nova (Parcial até quitar), sem linha nova; enquanto o acordo está em
   dia elas saem do a receber, e voltam se atrasar; (3) gestão e recepção criam e recebem. Nada é apagado: cancelar só muda a
   Situação. Abas criadas pelo app: "Parcelamentos" (um acordo por linha) e "Pagamentos de parcelas" (um pagamento por linha). */
var ABA_PARC = 'Parcelamentos', ABA_PPAG = 'Pagamentos de parcelas', COL_PARC = 'Parcelamento (ID)';
var HPARC = ['ID', 'Data do acordo', 'Paciente', 'Pagador', 'Tipo', 'Descrição', 'Procedimento', 'Profissional', 'Valor total (R$)', 'Nº de parcelas', 'Vencimentos', 'Lançamentos ligados', 'Situação', 'Observação', 'Registrado por (app)'];
var HPPAG = ['ID do parcelamento', 'Data do pagamento', 'Valor (R$)', 'Forma', 'Nº da NF', 'Parcelas', 'Lançamento', 'Registrado por (app)'];
var TIPOS_PARC = { avaliacao: 'Serviço parcelado', divida: 'Dívida renegociada' };
function tipoParc_(t) { return /^D[íi]vida/i.test(String(t || '')) || t === 'divida' ? 'divida' : 'avaliacao'; }
function vencTxt_(l) { return l.map(function (q) { return q.venc + ' ' + brl_(q.valor); }).join('; '); }
function lerVenc_(t) { var out = []; String(t || '').replace(/(\d{2}\/\d{2}\/\d{4})\s*R?\$?\s*([\d.,]+)/g, function (m, d, v) { out.push({ venc: d, valor: numBR_(v) }); }); return out; }
// vencimentos mensais no mesmo dia (último dia do mês quando não existe); parcelas iguais, a última leva os centavos
function montarVenc_(total, n, primeiro) {
  var cents = Math.round(total * 100), base = Math.floor(cents / n), out = [], d0 = parseData_(primeiro);
  for (var i = 0; i < n; i++) {
    var y = d0.getFullYear(), m = d0.getMonth() + i, ult = new Date(y, m + 1, 0).getDate(), d = new Date(y, m, Math.min(d0.getDate(), ult), 12);
    out.push({ venc: fmtData_(d), valor: (i === n - 1 ? cents - base * (n - 1) : base) / 100 });
  }
  return out;
}
// estado de um acordo a partir dos pagamentos: cada pagamento cobre as parcelas em ordem
function estadoAcordo_(a, pagos) {
  var hoje = ymdDate_(new Date()), resto = pagos.reduce(function (s, p) { return s + p.valor; }, 0), pago = Math.round(resto * 100) / 100;
  a.pagamentos = pagos; a.pago = pago; a.saldo = Math.max(0, Math.round((a.total - pago) * 100) / 100);
  a.parcelas = a.venc.map(function (q, i) {
    var cobre = Math.min(q.valor, Math.max(0, resto)); resto = Math.round((resto - cobre) * 100) / 100;
    var sit = cobre >= q.valor - 0.005 ? 'paga' : cobre > 0 ? 'parcial' : 'aberta';
    return { n: i + 1, venc: q.venc, valor: q.valor, pago: Math.round(cobre * 100) / 100, situacao: sit, atrasada: sit !== 'paga' && ymdDate_(q.venc) < hoje };
  });
  a.atrasado = a.situacao === 'ativo' && a.parcelas.some(function (q) { return q.atrasada; });
  a.proxima = a.situacao === 'ativo' ? a.parcelas.filter(function (q) { return q.situacao !== 'paga'; })[0] || null : null;
  return a;
}
function acordos_() {
  var pagos = {}; linhasComo_(planilha_().getSheetByName(ABA_PPAG)).forEach(function (r) { var id = String(r['ID do parcelamento'] || ''); if (!id) return; (pagos[id] = pagos[id] || []).push({ data: fmtData_(r['Data do pagamento']), valor: numBR_(r['Valor (R$)']), forma: r['Forma'] || '', nf: String(r['Nº da NF'] || ''), parcelas: r['Parcelas'] || '', lancamento: r['Lançamento'] || '' }); });
  return linhasComo_(planilha_().getSheetByName(ABA_PARC)).filter(function (r) { return r['ID']; }).map(function (r) {
    var a = { id: String(r['ID']), data: fmtData_(r['Data do acordo']), paciente: r['Paciente'], pagador: r['Pagador'] || '', tipo: tipoParc_(r['Tipo']), tipoTxt: r['Tipo'], descricao: r['Descrição'] || '', procedimento: r['Procedimento'] || '', profissional: r['Profissional'] || '',
      total: numBR_(r['Valor total (R$)']), n: parseInt(r['Nº de parcelas'], 10) || 0, venc: lerVenc_(r['Vencimentos']), linhas: String(r['Lançamentos ligados'] || '').split(/;\s*/).filter(Boolean).map(function (x) { var m = x.split('!'); return { aba: m[0], id: m[1] }; }),
      situacao: String(r['Situação'] || 'ativo').trim(), obs: r['Observação'] || '' };
    return estadoAcordo_(a, pagos[a.id] || []);
  });
}
// IDs de acordo ativo e em dia: as linhas ligadas a eles saem do a receber
function parcEmDia_() { var o = {}; try { acordos_().forEach(function (a) { if (a.situacao === 'ativo' && !a.atrasado) o[a.id] = 1; }); } catch (e) { } return o; }
API.parcelamentos = function (d) {
  d = d || {}; var q = Duplicatas.normalizar(String(d.paciente || ''));
  var l = acordos_().filter(function (a) { return q ? Duplicatas.normalizar(a.paciente) === q : (d.todos || a.situacao === 'ativo'); });
  return { ok: true, acordos: l, tipos: TIPOS_PARC };
};
API.criarParcelamento = function (d) {
  d = d || {}; var erros = [], tipo = d.tipo === 'divida' ? 'divida' : 'avaliacao';
  var pac = indicePacientes_().filter(function (p) { return p.nome === String(d.paciente || '').trim(); })[0]; if (!pac) erros.push('Escolha o paciente.');
  var n = parseInt(d.parcelas, 10); if (!(n >= 1 && n <= 24)) erros.push('Número de parcelas: de 1 a 24.');
  var primeiro = parseData_(d.primeiroVencimento); if (!primeiro) erros.push('Primeiro vencimento inválido.');
  var total = 0, ligadas = [], descricao = String(d.descricao || '').trim(), procedimento = String(d.procedimento || '').trim(), profissional = String(d.profissional || '').trim();
  if (tipo === 'avaliacao') {
    total = numBR_(d.total); if (!(total > 0)) erros.push('Valor total maior que zero.');
    if (!procedimento) erros.push('Escolha o procedimento (sai em cada parcela paga).'); if (!profissional) erros.push('Escolha o profissional.');
    if (!descricao) descricao = procedimento;
  } else if (pac) {
    var emDia = parcEmDia_(), ativos = {}; acordos_().forEach(function (a) { if (a.situacao === 'ativo') ativos[a.id] = 1; });
    (d.linhas || []).forEach(function (x) {
      var r = linhasMes_(x.aba).linhas.filter(function (y) { return y.id && y.id === String(x.id); })[0];
      if (!r) { erros.push('Não achei o lançamento ' + x.id + ' em ' + x.aba + '.'); return; }
      if (r.paciente !== pac.nome) { erros.push(r.data + ': é de outro paciente.'); return; }
      if (!emAberto_(r) || !(saldo_(r) > 0)) { erros.push(r.data + ': não está em aberto.'); return; }
      if (r.parc && ativos[r.parc]) { erros.push(r.data + ': já está no parcelamento ' + r.parc + '.'); return; }
      ligadas.push({ aba: x.aba, id: r.id, linha: r.linha, data: r.data, saldo: saldo_(r) });
    });
    if (!ligadas.length && !erros.length) erros.push('Marque as sessões em aberto que entram no acordo.');
    total = Math.round(ligadas.reduce(function (s, x) { return s + x.saldo; }, 0) * 100) / 100;
    if (!descricao) descricao = 'Acordo de ' + ligadas.length + (ligadas.length === 1 ? ' sessão' : ' sessões') + ' em aberto (' + ligadas.map(function (x) { return x.data.slice(0, 5); }).join(', ') + ')';
  }
  if (erros.length) return { ok: false, erros: erros };
  var venc = montarVenc_(total, n, fmtData_(primeiro));
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_PARC, HPARC), h = garantirColunas_(s, HPARC).h, u = usuario_(), id = novoId_('P');
    gravarCelulas_(s, proximaLinha_(s, h['ID']), h, { 'ID': id, 'Data do acordo': hoje_(), 'Paciente': pac.nome, 'Pagador': pac.pagador || '', 'Tipo': TIPOS_PARC[tipo], 'Descrição': descricao, 'Procedimento': procedimento, 'Profissional': profissional,
      'Valor total (R$)': total, 'Nº de parcelas': n, 'Vencimentos': vencTxt_(venc), 'Lançamentos ligados': ligadas.map(function (x) { return x.aba + '!' + x.id; }).join('; '), 'Situação': 'ativo', 'Observação': String(d.obs || '').trim(), 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_() });
    var porAba = {}; ligadas.forEach(function (x) { (porAba[x.aba] = porAba[x.aba] || []).push(x); });
    Object.keys(porAba).forEach(function (aba) { var sm = planilha_().getSheetByName(aba), hm = garantirColunas_(sm, [COL_PARC]).h; porAba[aba].forEach(function (x) { sm.getRange(x.linha, hm[COL_PARC]).setValue(id); }); });
    invalidar_(['comp']); SpreadsheetApp.flush();
    return { ok: true, id: id, total: total, vencimentos: venc };
  } finally { lock.releaseLock(); }
};
// pagamento de parcela: serviço parcelado → lançamento novo no mês do pagamento; dívida → abate nas linhas ligadas, da mais antiga
API.pagarParcela = function (d) {
  d = d || {}; var a = acordos_().filter(function (x) { return x.id === String(d.id || ''); })[0];
  if (!a) return { ok: false, erros: ['Parcelamento não encontrado.'] };
  if (a.situacao !== 'ativo') return { ok: false, erros: ['Este parcelamento está ' + a.situacao + '.'] };
  var valor = numBR_(d.valor), data = parseData_(d.data) || new Date(), forma = String(d.forma || '').trim();
  if (!(valor > 0)) return { ok: false, erros: ['Informe o valor recebido.'] };
  if (valor > a.saldo + 0.005) return { ok: false, erros: ['O valor passa do saldo do acordo (' + brl_(a.saldo) + ').'] };
  if (!forma) return { ok: false, erros: ['Escolha a forma de pagamento.'] };
  // quais parcelas este pagamento cobre (pra escrever "parcela 2/3" ou "parcelas 2–3/3")
  var antes = a.pago, cobre = a.parcelas.filter(function (q) { var ini = a.venc.slice(0, q.n - 1).reduce(function (s, x) { return s + x.valor; }, 0); return ini < antes + valor - 0.005 && ini + q.valor > antes + 0.005; }).map(function (q) { return q.n; });
  var rot = (cobre.length > 1 ? 'parcelas ' + cobre[0] + '–' + cobre[cobre.length - 1] : 'parcela ' + (cobre[0] || a.n)) + '/' + a.n, lanc = [], erros = [];
  if (a.tipo === 'avaliacao') {
    var r = API.registrarAtendimento({ paciente: a.paciente, profissional: a.profissional, procedimento: a.procedimento, data: fmtData_(data), hora: '', oque: 'Atendido', pago: 'Sim', valor: valor, forma: forma, dataPagamento: fmtData_(data),
      nf: String(d.nfNumero || '').trim() ? 'Sim' : 'Não', nfNumero: String(d.nfNumero || '').trim(), quemPagou: String(d.quemPagou || '').trim(), confirmouRepetido: true,
      observacao: a.descricao + ' · ' + rot + ' do parcelamento ' + a.id + ' (total ' + brl_(a.total) + ')' });
    if (!r.ok) return r;
    var sm = planilha_().getSheetByName(r.aba), hm = garantirColunas_(sm, [COL_PARC]).h; sm.getRange(r.linha, hm[COL_PARC]).setValue(a.id);
    lanc.push(r.aba + '!' + r.id);
  } else {
    var resto = valor;
    a.linhas.map(function (x) { var l = linhasMes_(x.aba).linhas.filter(function (y) { return y.id === x.id; })[0]; return l ? { aba: x.aba, id: x.id, l: l } : null; }).filter(Boolean)
      .sort(function (x, y) { return ymdDate_(x.l.data) - ymdDate_(y.l.data); })
      .forEach(function (x) {
        if (resto < 0.005 || !(saldo_(x.l) > 0) || !/^(Não|Parcial|)$/.test(x.l.pago)) return;
        var v = Math.min(resto, saldo_(x.l)), rc = API.corrigirLancamento({ aba: x.aba, id: x.id, campos: { recebidoAgora: v, dataPagamento: fmtData_(data), forma: forma, nfNumero: String(d.nfNumero || '').trim(), observacao: rot + ' do parcelamento ' + a.id } });
        if (rc.ok) { resto = Math.round((resto - v) * 100) / 100; lanc.push(x.aba + '!' + x.id); } else erros.push(x.l.data + ': ' + rc.erros.join(' '));
      });
    if (resto > 0.005) { valor = Math.round((valor - resto) * 100) / 100; if (!(valor > 0)) return { ok: false, erros: ['Não consegui abater nas sessões do acordo.'].concat(erros) }; erros.push('Só ' + brl_(valor) + ' cabiam nas sessões do acordo; o resto não foi registrado.'); }
  }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_PPAG, HPPAG), h = garantirColunas_(s, HPPAG).h, u = usuario_(), li = proximaLinha_(s, h['ID do parcelamento']);
    gravarCelulas_(s, li, h, { 'ID do parcelamento': a.id, 'Data do pagamento': data, 'Valor (R$)': valor, 'Forma': forma, 'Nº da NF': String(d.nfNumero || '').trim(), 'Parcelas': rot, 'Lançamento': lanc.join('; '), 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_() });
    s.getRange(li, h['Data do pagamento']).setNumberFormat('dd/MM/yyyy');
    var quitou = a.saldo - valor < 0.005;
    if (quitou) { var sp = planilha_().getSheetByName(ABA_PARC), hp = cabecalhos_(sp), lp = linhasComo_(sp).filter(function (x) { return String(x['ID']) === a.id; })[0]; if (lp) gravarCelulas_(sp, lp._linha, hp, { 'Situação': 'quitado' }); }
    invalidar_(['comp']); SpreadsheetApp.flush();
    return { ok: true, id: a.id, parcelas: rot, lancamentos: lanc, quitado: quitou, erros: erros };
  } finally { lock.releaseLock(); }
};
API.cancelarParcelamento = function (d) {
  d = d || {}; var motivo = String(d.motivo || '').trim(); if (!motivo) return { ok: false, erros: ['Escreva o motivo do cancelamento.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = planilha_().getSheetByName(ABA_PARC); if (!s) return { ok: false, erros: ['Parcelamento não encontrado.'] };
    var h = cabecalhos_(s), r = linhasComo_(s).filter(function (x) { return String(x['ID']) === String(d.id || ''); })[0], u = usuario_();
    if (!r) return { ok: false, erros: ['Parcelamento não encontrado.'] };
    if (String(r['Situação'] || 'ativo') !== 'ativo') return { ok: false, erros: ['Este parcelamento já está ' + r['Situação'] + '.'] };
    gravarCelulas_(s, r._linha, h, { 'Situação': 'cancelado', 'Observação': (r['Observação'] ? r['Observação'] + ' | ' : '') + 'Cancelado: ' + motivo + ' (' + (u.email || 'app') + ' · ' + agora_() + ')' });
    invalidar_(['comp']); SpreadsheetApp.flush();
    return { ok: true };
  } finally { lock.releaseLock(); }
};

/* ================= ALERTAS (Fase 2, 16/10) =================
   Avisos dentro da Ficha (todos do paciente) e da Agenda (pacientes do dia); sem tela própria. Escolhidos pela gestão (16/10):
   cobrança: cobrado no WhatsApp há 5 dias ou mais e ainda em aberto · mês atrasado e ainda não cobrado · parcela vencida ·
   dívida com mais de 30 dias; atendimento: 2+ faltas sem aviso / em cima da hora em 60 dias · horário fixo ativo sem
   atendimento há 21 dias ou mais · sem celular no cadastro · avaliação sem aplicação há 14 dias ou mais.
   A conta de todos os pacientes fica em cache por dia; muda a cada gravação na aba do mês ("comp") e a cada mensagem enviada. */
var ALERTA_COBRADO_DIAS = 5, ALERTA_DIVIDA_DIAS = 30, ALERTA_FALTAS_DIAS = 60, ALERTA_FALTAS_N = 2, ALERTA_PAROU_DIAS = 21, ALERTA_AVAL_DIAS = 14;
function versaoAlr_() { if (MEMO_.alrv === undefined) MEMO_.alrv = cacheGet_('alrv') || '0'; return MEMO_.alrv; }
function renovarAlertas_() { MEMO_.alrv = String(new Date().getTime()); cachePut_('alrv', MEMO_.alrv); Object.keys(MEMO_).forEach(function (m) { if (/^alr:/.test(m)) delete MEMO_[m]; }); }
function alertasBase_() {
  return cacheado_('alr:' + versaoComp_() + ':' + versaoAlr_() + ':' + hoje_(), function () {
    var hoje = ymdDate_(new Date()), dias = function (s) { var d = ymdDate_(s); return d ? Math.round((hoje - d) / 864e5) : 0; }, out = {};
    var add = function (nome, a) { (out[nome] = out[nome] || []).push(a); };
    var emDia = parcEmDia_(), porPac = {};
    abasDeMes_().forEach(function (aba) { linhasMes_(aba).linhas.forEach(function (r) { r.aba = aba; (porPac[r.paciente] = porPac[r.paciente] || []).push(r); }); });
    Object.keys(porPac).forEach(function (nome) {
      var L = porPac[nome];
      // dívida antiga: sessões em aberto há mais de 30 dias (fora de parcelamento em dia)
      var div = L.filter(function (r) { return emAberto_(r) && !emDia[r.parc] && saldo_(r) > 0 && dias(r.data) > ALERTA_DIVIDA_DIAS; });
      if (div.length) {
        var tot = Math.round(div.reduce(function (s, r) { return s + saldo_(r); }, 0) * 100) / 100, velha = div.slice().sort(function (a, b) { return ymdDate_(a.data) - ymdDate_(b.data); })[0], dv = dias(velha.data);
        add(nome, { tipo: 'divida', cor: dv > 60 ? 'vermelha' : 'laranja', texto: 'Deve ' + brl_(tot) + ' de ' + div.length + (div.length === 1 ? ' sessão' : ' sessões') + ' sem pagamento, a mais antiga de ' + velha.data.slice(0, 5) + ' (' + dv + ' dias)', acao: 'ficha' });
      }
      // faltas repetidas
      var f = L.filter(function (r) { return /^Faltou (sem aviso|avisando em cima)/i.test(r.oque) && dias(r.data) >= 0 && dias(r.data) <= ALERTA_FALTAS_DIAS; }).sort(function (a, b) { return ymdDate_(a.data) - ymdDate_(b.data); });
      if (f.length >= ALERTA_FALTAS_N) add(nome, { tipo: 'faltas', cor: 'laranja', texto: f.length + ' faltas sem aviso ou em cima da hora em ' + ALERTA_FALTAS_DIAS + ' dias (' + f.map(function (r) { return r.data.slice(0, 5); }).join(', ') + ')', acao: 'ficha' });
    });
    // horário fixo ativo sem atendimento há 21 dias ou mais (por profissional)
    var ultimo = {}; Object.keys(porPac).forEach(function (nome) { porPac[nome].forEach(function (r) { if (!/^Atendido/.test(r.oque) || dias(r.data) < 0) return; var k = nome + '|' + r.profissional, d = ymdDate_(r.data); if (d && (!ultimo[k] || d > ultimo[k].d)) ultimo[k] = { d: d, data: r.data }; }); });
    var vistos = {};
    API.agendaFixa().forEach(function (r) {
      if (String(r['Ativo'] || 'Sim') === 'Não') return; var t = r['Termina em'] ? parseData_(r['Termina em']) : null; if (t && t < hoje) return;
      var c = r['Começa em'] ? ymdDate_(r['Começa em']) : null; if (c && Math.round((hoje - c) / 864e5) < ALERTA_PAROU_DIAS) return;
      var nome = r['Paciente'], k = nome + '|' + r['Profissional']; if (vistos[k]) return; vistos[k] = 1;
      var u = ultimo[k], d = u ? Math.round((hoje - u.d) / 864e5) : null;
      if (u && d < ALERTA_PAROU_DIAS) return;
      add(nome, { tipo: 'parou', cor: 'amarela', texto: 'Horário fixo de ' + String(r['Dia da semana'] || '').toLowerCase() + ' ' + horaTxt_(r['Hora']) + ' com ' + r['Profissional'] + (u ? ', mas a última sessão atendida foi em ' + u.data.slice(0, 5) + ' (' + d + ' dias)' : ', mas nenhuma sessão atendida nas abas de mês') + ': confirme se continua ou encerre o horário', acao: 'agenda' });
    });
    // cobrança no WhatsApp × competência ainda em aberto
    var msgs = {}; linhasComo_(planilha_().getSheetByName(ABA_MSG)).forEach(function (m) { if (!/^Cobran/.test(m['Tipo'] || '')) return; var k = m['Paciente'] + '|' + (m['Competência'] || ''), d = parseData_(String(m['Data/hora'] || '').slice(0, 10)); if (d && (!msgs[k] || d > msgs[k])) msgs[k] = d; });
    var hojeD = new Date(), chaves = [chaveMes_(new Date(hojeD.getFullYear(), hojeD.getMonth() - 1, 1, 12)), chaveMes_(hojeD)];
    cobrancasProf_().forEach(function (l) {
      if (!l.ativo || !(l.pagamento === 'Antecipado' || l.pagamento === 'Posterior' || l.cobranca === 'Mensalidade fixa')) return;
      chaves.forEach(function (ch) {
        var ini = mesDaChave_(ch); if (l.desde && parseData_(l.desde) > new Date(ini.getFullYear(), ini.getMonth() + 1, 0, 12)) return; if (l.ate && parseData_(l.ate) < ini) return;
        var c, s; try { c = competenciaDe_(l, ch); s = Cobranca.situacaoCompetencia(l, c, hojeD, parametros_()); } catch (e) { return; }
        if (/^Sim/i.test(c.pago || '') || s.sit === 'futura' || s.sit === 'em dia') return;
        var mesTxt = ch.split('/')[0], quando = msgs[l.paciente + '|' + ch];
        if (quando) { var dq = Math.round((hoje - ymdDate_(quando)) / 864e5); if (dq >= ALERTA_COBRADO_DIAS) add(l.paciente, { tipo: 'cobrado', cor: 'laranja', texto: 'Cobrado no WhatsApp em ' + fmtData_(quando).slice(0, 5) + ' (há ' + dq + ' dias) e ' + mesTxt.toLowerCase() + ' com ' + l.profissional + ' ainda não foi pago', acao: 'cobranca' }); }
        else if (s.sit === 'atrasada') add(l.paciente, { tipo: 'atrasado', cor: 'vermelha', texto: mesTxt + ' com ' + l.profissional + ' atrasado e ainda não cobrado no WhatsApp', acao: 'cobranca' });
      });
    });
    // parcela vencida
    acordos_().forEach(function (a) { if (a.situacao !== 'ativo') return; a.parcelas.filter(function (q) { return q.atrasada; }).forEach(function (q) { add(a.paciente, { tipo: 'parcela', cor: 'vermelha', texto: 'Parcela ' + q.n + '/' + a.n + ' de ' + a.descricao + ' venceu em ' + q.venc.slice(0, 5) + ': falta ' + brl_(q.valor - q.pago), acao: 'ficha' }); }); });
    // avaliação parada
    avaliacoesEmAndamento_().forEach(function (x) { if (x.diasSemVir >= ALERTA_AVAL_DIAS) add(x.paciente, { tipo: 'avaliacao', cor: 'lilas', texto: 'Avaliação com ' + x.profissional + ' parada: ' + x.n + (x.n === 1 ? ' aplicação' : ' aplicações') + ', a última em ' + x.ultima.slice(0, 5) + ' (' + x.diasSemVir + ' dias). Confira com a profissional', acao: 'ficha' }); });
    return out;
  });
}
var ORDEM_ALERTA = { vermelha: 0, laranja: 1, amarela: 2, lilas: 3, cinza: 4 };
// alertas de uma lista de pacientes: { nome: [ { tipo, cor, texto, acao } ] }; "sem celular" é calculado na hora (cadastro)
function alertasDe_(nomes) {
  var base = {}, out = {}, idx = {}; try { base = alertasBase_(); } catch (e) { base = {}; }
  indicePacientes_().forEach(function (p) { idx[p.nome] = p; });
  (nomes || []).forEach(function (nome) {
    if (out[nome]) return; var l = (base[nome] || []).slice(), p = idx[nome];
    if (p && !/^n/i.test(p.ativo || 'Sim') && !Mensagens.foneDoPaciente(p).fone) l.push({ tipo: 'whats', cor: 'cinza', texto: 'Sem celular no cadastro: a confirmação e a cobrança no WhatsApp não saem. Peça o número', acao: 'pacientes' });
    l.sort(function (a, b) { return ORDEM_ALERTA[a.cor] - ORDEM_ALERTA[b.cor]; });
    if (l.length) out[nome] = l;
  });
  return out;
}
API.alertas = function (d) { d = d || {}; return { ok: true, alertas: alertasDe_([].concat(d.pacientes || (d.paciente ? [d.paciente] : []))) }; };
