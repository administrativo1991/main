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
    SpreadsheetApp.flush();
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
  var aberto = [];
  sessoes.forEach(function (r) {
    if (!/^Atendido/.test(r.oque) || ehPerdido_(r.pago)) return;
    var particular = !r.convenio || /^Particular$/i.test(r.convenio);
    if (particular && (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial') && (!/^Mensalidade|pacote|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento)) && r.saldo > 0) aberto.push({ tipo: 'receber', r: r });
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
    cobrancas: cobrancas, fixos: fixos, proximos: proximos, aberto: aberto, mensal: mensal, sessoes: sessoes.slice(0, 80), totalSessoes: sessoes.length, ultimaVez: ult ? { data: ult.data, profissional: ult.profissional } : null, mensagens: msgs, alteracoes: alts };
};
