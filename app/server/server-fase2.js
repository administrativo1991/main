/* ================= FASE 2 — mesmo escopo de server.js e server-cobranca.js (montado pelo build) =================
   Confirmações por WhatsApp (gestão, 15/10): a recepção escolhe o período (amanhã, daqui a 2 dias, a semana), vê as sessões
   agrupadas por pagador e abre o WhatsApp com a mensagem pronta. "Mensagem enviada" fica na aba própria `Mensagens WhatsApp`
   (o código antigo não lê essa aba: voltar o código não duplica nada na Agenda). "Confirmou" continua sendo a linha
   "Confirmado" da Lista do dia (API.confirmar). O texto é o oficial da clínica (app/shared/mensagens.js, o mesmo na tela);
   a gestão pode trocar em Parâmetros!msg_confirmacao. */
var ABA_MSG = 'Mensagens WhatsApp';
var HMSG = ['ID', 'Data/hora', 'Tipo', 'Pagador', 'WhatsApp', 'Paciente', 'Profissional', 'Data da sessão', 'Hora', 'Registrado por (app)'];
var CONFIRMACAO_MAX_DIAS = 14;

// número pro link do WhatsApp: só dígitos, com 55 na frente; vazio se não parece celular/fixo do Brasil
function foneWhats_(t) {
  var d = String(t || '').replace(/\D/g, '');
  if (/^55\d{10,11}$/.test(d)) return d;
  if (/^\d{10,11}$/.test(d)) return '55' + d;
  return '';
}
function foneFmt_(t) {
  var d = foneWhats_(t).slice(2); if (!d) return '';
  return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + ' ' + d.slice(3, 7) + '-' + d.slice(7) : '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
}
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
  var env = enviadas_(), cache = {}, grupos = {}, ordem = [], par = parametros_();
  var modelo = String(par.msg_confirmacao || '').trim();
  for (var i = 0; i < dias; i++) {
    var dia = montarDia_(dataMais_(de, i), cache);
    dia.itens.forEach(function (it) {
      if (it.extra || it.registro || it.naoVem) return; // pagamento do mês, já registrado, ou já avisou que não vem
      var p = idx[it.paciente] || {}, fone = foneWhats_(p.whats), deQuem = 'pagador';
      if (!fone && foneWhats_(p.respTel)) { fone = foneWhats_(p.respTel); deQuem = 'responsável'; }
      if (!fone && foneWhats_(p.telPac)) { fone = foneWhats_(p.telPac); deQuem = 'paciente'; }
      // uma mensagem por pagador (irmãos recebem uma só, com o número de quem tiver); sem pagador, por número; sem os dois, por paciente
      var chave = p.pagador ? 'p:' + Duplicatas.normalizar(p.pagador) : fone ? 'w:' + fone : 'x:' + it.paciente;
      var g = grupos[chave];
      if (!g) { g = grupos[chave] = { chave: chave, pagador: p.pagador || '', fone: '', foneFmt: '', foneDe: '', itens: [] }; ordem.push(chave); }
      if (fone && !g.fone) { g.fone = fone; g.foneFmt = foneFmt_(fone); g.foneDe = deQuem; }
      g.itens.push({ data: dia.data, diaSemana: dia.diaSemana, hora: horaTxt_(it.hora), paciente: it.paciente, profissional: it.profissional, tipo: it.tipo || '',
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

// "Abri o WhatsApp": uma linha por sessão na aba Mensagens WhatsApp (não é prova de envio; é o que a recepção fez)
API.marcarMensagemEnviada = function (d) {
  d = d || {};
  var itens = (d.itens || []).filter(function (x) { return x && x.paciente && x.profissional && parseData_(x.data); });
  if (!itens.length) return { ok: false, erros: ['Nenhuma sessão na mensagem.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_MSG, HMSG), h = cabecalhos_(s), u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_();
    itens.forEach(function (x) {
      var linha = proximaLinha_(s, h['Paciente']);
      gravarCelulas_(s, linha, h, { 'ID': novoId_('M'), 'Data/hora': agora_(), 'Tipo': 'Confirmação', 'Pagador': String(d.pagador || '').trim(), 'WhatsApp': foneFmt_(d.fone),
        'Paciente': String(x.paciente).trim(), 'Profissional': String(x.profissional).trim(), 'Data da sessão': parseData_(x.data), 'Hora': horaTxt_(x.hora), 'Registrado por (app)': carimbo });
      if (h['Data da sessão']) s.getRange(linha, h['Data da sessão']).setNumberFormat('dd/MM/yyyy');
      if (h['Hora']) s.getRange(linha, h['Hora']).setNumberFormat('@');
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
