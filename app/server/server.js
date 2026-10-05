/* Recepção Nascente — servidor (Google Apps Script, runtime V8).
   Este arquivo é carregado pelo app/loader/Code.gs a partir do Drive e avaliado em tempo de execução,
   por isso define tudo dentro de `API` e termina com a expressão `API`.
   Toda gravação é append de linha ou update de célula específica. Nunca reescreve aba. Nunca apaga linha.
   As colunas são localizadas pelo CABEÇALHO, nunca pela letra. */

var CONFIG = {
  TZ: 'America/Sao_Paulo',
  GESTAO: ['administrativo@clinicanascente.com.br'],
  ABA: { PACIENTES: 'Pacientes', LISTAS: 'Listas', PROFISSIONAIS: 'Profissionais', PROCEDIMENTOS: 'Procedimentos', MENSALISTAS: 'Mensalistas', PACOTES: 'Pacotes' },
  MESES: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  VIRADA: '2026-11-01', // a partir daqui a mensalidade é antecipada (vence dia 10, tolerância 15)
  // cabeçalhos da aba do mês (os existentes são lidos como estão; U e V são criados no fim se faltarem)
  HM: { DATA: 'Data', HORA: 'Hora', PACIENTE: 'Paciente', PROFISSIONAL: 'Profissional', PROCEDIMENTO: 'Procedimento', OQUE: 'O que aconteceu', VALOR: 'Valor (R$)', PAGO: 'Pago?', DATA_PAG: 'Data do pagamento', FORMA: 'Forma de pagamento', QUEM: 'Quem pagou (só se foi outra pessoa)', NF: 'NF emitida?', NF_N: 'Nº da NF', GUIA: 'Guia assinada? (convênio)', OBS: 'Observação', ID: 'ID', LOG: 'Registrado por (app)', PACOTE: 'Pacote (ID)' },
  HP: ['ID', 'Paciente', 'Modalidade', 'Nº de sessões', 'Valor (R$)', 'Data da compra', 'Válido até', 'Pago?', 'Forma de pagamento', 'Quem pagou', 'NF emitida?', 'Nº da NF', 'Sessões usadas', 'Última sessão', 'Status', 'Registrado por (app)', 'Observação'],
  // Cabeçalhos de Pacientes (os existentes são lidos como estão; os novos são criados no fim da aba se faltarem)
  H: {
    NOME: 'Nome', CPF: 'CPF', NASC: 'Data de nascimento', ATIVO: 'Ativo', MODALIDADE: 'Modalidade',
    VALOR_COMB: 'Valor combinado / observação de modalidade',
    PAGADOR: 'Pagador habitual (responsável financeiro)', PAGADOR_EXTRATO: 'Nome do pagador como aparece no extrato',
    CONVENIO: 'Convênio', REGRA: 'Regra de cobrança',
    OBS_COBRANCA: 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)',
    // novas (criadas pelo app, sempre no fim)
    LOG: 'Registrado por (app)', WHATS: 'WhatsApp do pagador', CARTEIRINHA: 'Nº da carteirinha',
    INDICACAO: 'Quem indicou', PRIMEIRA: 'Data da 1ª consulta', PROF_REF: 'Profissional de referência'
  },
  LISTAS: { OQUE: 'O que aconteceu', PAGO: 'Pago?', FORMA: 'Forma de pagamento', CONVENIO: 'Convênio', REGRA: 'Regra de cobrança', MODALIDADE: 'Modalidade', MODALIDADE_ESP: 'Especialidade (modalidade)', GESTAO: 'Gestão' }
};
var COLS_NOVAS_PACIENTES = ['LOG', 'WHATS', 'CARTEIRINHA', 'INDICACAO', 'PRIMEIRA', 'PROF_REF'];

var API = {};

/* ---------- utilidades ---------- */
function planilha_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function aba_(nome) {
  var s = planilha_().getSheetByName(nome);
  if (!s) throw new Error('A aba "' + nome + '" não existe na planilha.');
  return s;
}
function agora_() { return Utilities.formatDate(new Date(), CONFIG.TZ, 'dd/MM/yyyy HH:mm'); }
function usuario_() {
  var email = '';
  try { email = (Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) { email = ''; }
  return { email: email, perfil: CONFIG.GESTAO.indexOf(email) >= 0 || emailsGestao_().indexOf(email) >= 0 ? 'gestao' : 'recepcao' };
}
function emailsGestao_() {
  try { return colunaLista_(CONFIG.LISTAS.GESTAO).map(function (e) { return String(e).toLowerCase(); }); } catch (e) { return []; }
}
function cabecalhos_(sheet) {
  var ultima = Math.max(sheet.getLastColumn(), 1);
  var vals = sheet.getRange(1, 1, 1, ultima).getValues()[0];
  var m = {};
  vals.forEach(function (h, i) { h = String(h || '').trim(); if (h && m[h] == null) m[h] = i + 1; });
  return m;
}
function fmtData_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, CONFIG.TZ, 'dd/MM/yyyy');
  return v == null ? '' : String(v).trim();
}
function parseData_(s) {
  var m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  var d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), 12, 0, 0);
  if (d.getDate() !== parseInt(m[1], 10) || d.getMonth() !== parseInt(m[2], 10) - 1) return null;
  return d;
}
function colunaLista_(cabecalho) {
  var s = aba_(CONFIG.ABA.LISTAS), h = cabecalhos_(s), c = h[cabecalho];
  if (!c) return [];
  var n = s.getLastRow();
  if (n < 2) return [];
  return s.getRange(2, c, n - 1, 1).getValues().map(function (r) { return String(r[0] || '').trim(); }).filter(Boolean);
}
// Modalidades com a especialidade da coluna ao lado (Listas, "Especialidade (modalidade)"); vazio = o app agrupa pelo nome
function modalidadesComEsp_() {
  var s = aba_(CONFIG.ABA.LISTAS), h = cabecalhos_(s), c = h[CONFIG.LISTAS.MODALIDADE], ce = h[CONFIG.LISTAS.MODALIDADE_ESP];
  if (!c) return [];
  var n = s.getLastRow();
  if (n < 2) return [];
  var mods = s.getRange(2, c, n - 1, 1).getValues();
  var esps = ce ? s.getRange(2, ce, n - 1, 1).getValues() : [];
  var out = [];
  mods.forEach(function (r, i) { var m = String(r[0] || '').trim(); if (m) out.push({ nome: m, esp: ce ? String((esps[i] || [''])[0] || '').trim() : '' }); });
  return out;
}
function garantirColunasPacientes_() {
  var s = aba_(CONFIG.ABA.PACIENTES), h = cabecalhos_(s), prox = s.getLastColumn() + 1, criadas = [];
  COLS_NOVAS_PACIENTES.forEach(function (k) {
    var nome = CONFIG.H[k];
    if (!h[nome]) {
      if (prox > s.getMaxColumns()) s.insertColumnsAfter(s.getMaxColumns(), 1);
      s.getRange(1, prox).setValue(nome).setFontWeight('bold');
      h[nome] = prox; prox++; criadas.push(nome);
    }
  });
  return { h: h, criadas: criadas };
}

/* ---------- leitura ---------- */
function indicePacientes_() {
  var s = aba_(CONFIG.ABA.PACIENTES), h = cabecalhos_(s), n = s.getLastRow();
  if (n < 2) return [];
  var vals = s.getRange(2, 1, n - 1, s.getLastColumn()).getValues();
  var H = CONFIG.H, col = function (k) { return h[H[k]] ? h[H[k]] - 1 : -1; };
  var cNome = col('NOME'), cCpf = col('CPF'), cNasc = col('NASC'), cAtivo = col('ATIVO'), cMod = col('MODALIDADE'),
      cPag = col('PAGADOR'), cConv = col('CONVENIO'), cRegra = col('REGRA'), cObs = col('OBS_COBRANCA'), cVal = col('VALOR_COMB');
  var out = [];
  vals.forEach(function (r, i) {
    var nome = String(r[cNome] || '').trim();
    if (!nome) return;
    out.push({
      linha: i + 2, nome: nome,
      cpf: cCpf >= 0 ? String(r[cCpf] || '').trim() : '',
      nasc: cNasc >= 0 ? fmtData_(r[cNasc]) : '',
      ativo: cAtivo >= 0 ? String(r[cAtivo] || '').trim() : '',
      modalidade: cMod >= 0 ? String(r[cMod] || '').trim() : '',
      pagador: cPag >= 0 ? String(r[cPag] || '').trim() : '',
      convenio: cConv >= 0 ? String(r[cConv] || '').trim() : '',
      regra: cRegra >= 0 ? String(r[cRegra] || '').trim() : '',
      obsCobranca: cObs >= 0 ? String(r[cObs] || '').trim() : '',
      valorCombinado: cVal >= 0 ? String(r[cVal] || '').trim() : ''
    });
  });
  return out;
}
function profissionais_() {
  var s = aba_(CONFIG.ABA.PROFISSIONAIS), n = s.getLastRow();
  if (n < 2) return [];
  return s.getRange(2, 1, n - 1, 2).getValues()
    .map(function (r) { return { nome: String(r[0] || '').trim(), especialidade: String(r[1] || '').trim() }; })
    .filter(function (p) { return p.nome; });
}

API.ping = function () { return { ok: true, hora: agora_(), usuario: usuario_(), planilha: planilha_().getName() }; };

API.bootstrap = function () {
  return {
    usuario: usuario_(),
    planilha: planilha_().getName(),
    hora: agora_(),
    listas: {
      modalidades: colunaLista_(CONFIG.LISTAS.MODALIDADE),
      modalidadesEsp: modalidadesComEsp_(),
      convenios: colunaLista_(CONFIG.LISTAS.CONVENIO),
      regras: colunaLista_(CONFIG.LISTAS.REGRA),
      oque: colunaLista_(CONFIG.LISTAS.OQUE),
      pago: colunaLista_(CONFIG.LISTAS.PAGO),
      formas: colunaLista_(CONFIG.LISTAS.FORMA)
    },
    profissionais: profissionais_(),
    pacientes: indicePacientes_().map(function (p) {
      // o índice que vai pra tela não leva CPF completo: só os dígitos finais, pra conferência
      return { linha: p.linha, nome: p.nome, cpf: p.cpf, nasc: p.nasc, pagador: p.pagador, modalidade: p.modalidade, convenio: p.convenio, ativo: p.ativo };
    })
  };
};

/* ---------- Novo paciente ---------- */
API.criarPaciente = function (d) {
  d = d || {};
  var erros = [];
  var nome = String(d.nome || '').replace(/\s+/g, ' ').trim();
  if (Duplicatas.tokens(nome).length < 2) erros.push('Informe o nome completo (nome e sobrenome).');
  var cpf = Duplicatas.digitos(d.cpf);
  if (!Duplicatas.cpfValido(cpf)) erros.push('CPF inválido. Confira os 11 dígitos.');
  var nasc = parseData_(d.nasc);
  if (!nasc) erros.push('Data de nascimento inválida (use dd/mm/aaaa).');
  else if (nasc > new Date()) erros.push('Data de nascimento no futuro.');
  var modalidades = colunaLista_(CONFIG.LISTAS.MODALIDADE);
  var modalidade = String(d.modalidade || '').trim();
  if (modalidades.length && modalidades.indexOf(modalidade) < 0) erros.push('Modalidade fora da lista.');
  var convenios = colunaLista_(CONFIG.LISTAS.CONVENIO);
  var convenio = String(d.convenio || 'Particular').trim();
  if (convenios.length && convenios.indexOf(convenio) < 0) erros.push('Convênio fora da lista.');
  if (modalidade === 'Convênio' && convenio === 'Particular') erros.push('Modalidade "Convênio" exige escolher o convênio.');
  var primeira = d.primeiraConsulta ? parseData_(d.primeiraConsulta) : null;
  if (d.primeiraConsulta && !primeira) erros.push('Data da 1ª consulta inválida.');
  if (erros.length) return { ok: false, erros: erros };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var indice = indicePacientes_();
    var dup = Duplicatas.verificar({ nome: nome, cpf: cpf, nasc: fmtData_(nasc), pagador: d.pagador }, indice);
    if (dup.bloqueio) return { ok: false, erros: ['CPF já cadastrado: ' + dup.bloqueio.paciente.nome + ' (nasc. ' + dup.bloqueio.paciente.nasc + ').'] };
    var mesmoNome = indice.filter(function (p) { return Duplicatas.normalizar(p.nome) === Duplicatas.normalizar(nome); });
    if (mesmoNome.length) return { ok: false, erros: ['Já existe um paciente com exatamente este nome (' + mesmoNome[0].nome + ', nasc. ' + mesmoNome[0].nasc + '). A planilha usa o nome como chave: se for outra pessoa, acrescente o nome do meio ou o sobrenome completo.'] };
    if (!d.confirmouDuplicata && dup.avisos.length) {
      return { ok: false, precisaConfirmar: true, avisos: dup.avisos.map(function (a) { return { nome: a.paciente.nome, nasc: a.paciente.nasc, pagador: a.paciente.pagador, modalidade: a.paciente.modalidade, motivos: a.motivos }; }) };
    }

    var g = garantirColunasPacientes_();
    var s = aba_(CONFIG.ABA.PACIENTES), h = g.h, H = CONFIG.H;
    var linha = [], ultimaCol = s.getLastColumn();
    for (var i = 0; i < ultimaCol; i++) linha.push('');
    var put = function (k, v) { var c = h[H[k]]; if (c) linha[c - 1] = v; };
    var u = usuario_();
    var pagador = String(d.pagador || '').replace(/\s+/g, ' ').trim();
    put('NOME', nome);
    put('CPF', cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
    put('NASC', nasc);
    put('ATIVO', 'Sim');
    put('MODALIDADE', modalidade);
    put('PAGADOR', pagador);
    put('PAGADOR_EXTRATO', pagador);
    put('CONVENIO', convenio);
    put('WHATS', String(d.whatsapp || '').trim());
    put('CARTEIRINHA', String(d.carteirinha || '').trim());
    put('INDICACAO', String(d.indicacao || '').trim());
    put('PRIMEIRA', primeira || '');
    put('PROF_REF', String(d.profissional || '').trim());
    put('LOG', (u.email || 'app') + ' · ' + agora_() + (d.confirmouDuplicata ? ' · confirmou que não é duplicata' : ''));
    s.appendRow(linha);
    var novaLinha = s.getLastRow();
    ['NASC', 'PRIMEIRA'].forEach(function (k) { var c = h[H[k]]; if (c) s.getRange(novaLinha, c).setNumberFormat('dd/MM/yyyy'); });
    SpreadsheetApp.flush();
    return { ok: true, linha: novaLinha, nome: nome, colunasCriadas: g.criadas };
  } finally {
    lock.releaseLock();
  }
};

/* ---------- Atendimento ---------- */
function novoId_(prefixo) {
  var t = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd-HHmmss');
  var r = Math.floor(Math.random() * 46656).toString(36); while (r.length < 3) r = '0' + r;
  return (prefixo || 'A') + '-' + t + '-' + r;
}
function hoje_() { return Utilities.formatDate(new Date(), CONFIG.TZ, 'dd/MM/yyyy'); }
function dataMais_(d, dias) { var x = new Date(d.getTime()); x.setDate(x.getDate() + dias); return x; }
function nomeAbaMes_(d) { return CONFIG.MESES[d.getMonth()]; }
function abaMes_(d) {
  var nome = nomeAbaMes_(d), s = planilha_().getSheetByName(nome);
  if (!s) throw new Error('A aba "' + nome + '" ainda não existe na planilha. Peça à gestão para criar a aba do mês (Gestão → Criar aba de ' + nome + ').');
  return s;
}
function garantirColunas_(sheet, nomes) {
  var h = cabecalhos_(sheet), prox = sheet.getLastColumn() + 1, criadas = [];
  nomes.forEach(function (nome) {
    if (!h[nome]) {
      if (prox > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
      sheet.getRange(1, prox).setValue(nome).setFontWeight('bold');
      h[nome] = prox; prox++; criadas.push(nome);
    }
  });
  return { h: h, criadas: criadas };
}
// Primeira linha vazia pela coluna Paciente (não usar appendRow: as ARRAYFORMULA de F:H e N ocupam a aba inteira)
function proximaLinha_(sheet, colChave) {
  var max = sheet.getMaxRows();
  var vals = sheet.getRange(2, colChave, max - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0] || '') === '') return i + 2;
  sheet.insertRowsAfter(max, 50);
  return max + 1;
}
// Grava só as colunas informadas (nunca encosta nas automáticas)
function gravarCelulas_(sheet, linha, h, pares) {
  Object.keys(pares).forEach(function (nome) {
    var c = h[nome]; if (!c) return;
    sheet.getRange(linha, c).setValue(pares[nome]);
  });
}
function abaPacotes_() {
  var ss = planilha_(), s = ss.getSheetByName(CONFIG.ABA.PACOTES);
  if (!s) {
    s = ss.insertSheet(CONFIG.ABA.PACOTES);
    s.getRange(1, 1, 1, CONFIG.HP.length).setValues([CONFIG.HP]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}
function pacotesPorPaciente_() {
  var s = planilha_().getSheetByName(CONFIG.ABA.PACOTES);
  if (!s || s.getLastRow() < 2) return {};
  var h = cabecalhos_(s), vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues();
  var g = function (r, nome) { var c = h[nome]; return c ? r[c - 1] : ''; };
  var out = {};
  vals.forEach(function (r, i) {
    var pac = String(g(r, 'Paciente') || '').trim(); if (!pac) return;
    var st = String(g(r, 'Status') || '').trim();
    var item = { linha: i + 2, id: String(g(r, 'ID') || ''), modalidade: String(g(r, 'Modalidade') || ''), n: Number(g(r, 'Nº de sessões')) || 0,
      valor: Number(g(r, 'Valor (R$)')) || 0, compra: fmtData_(g(r, 'Data da compra')), validade: fmtData_(g(r, 'Válido até')),
      usadas: Number(g(r, 'Sessões usadas')) || 0, ultima: fmtData_(g(r, 'Última sessão')), status: st || 'ativo' };
    if (!out[pac] || item.status === 'ativo') out[pac] = item; // o ativo mais recente
  });
  return out;
}
function mensalistas_() {
  var s = planilha_().getSheetByName(CONFIG.ABA.MENSALISTAS);
  if (!s || s.getLastRow() < 2) return { lista: {}, coluna: '' };
  var hdr = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(function (x) { return String(x || '').trim(); });
  var hoje = new Date(), novo = Utilities.formatDate(hoje, CONFIG.TZ, 'yyyy-MM-dd') >= CONFIG.VIRADA;
  // antes da virada, o mês a conferir é o anterior (paga no mês seguinte); depois, o próprio mês (antecipado)
  var ref = new Date(hoje.getFullYear(), hoje.getMonth() - (novo ? 0 : 1), 1);
  var mesNome = CONFIG.MESES[ref.getMonth()].toUpperCase();
  var cPago = -1; hdr.forEach(function (x, i) { if (cPago < 0 && x.toUpperCase().indexOf(mesNome) === 0 && /pago/i.test(x)) cPago = i; });
  var vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues();
  var out = {};
  vals.forEach(function (r, i) {
    var pac = String(r[0] || '').trim(); if (!pac) return;
    out[pac] = { linha: i + 2, modalidade: String(r[1] || ''), valor: Number(r[2]) || 0, pagador: String(r[3] || ''),
      mes: mesNome, pago: cPago >= 0 ? String(r[cPago] || '').trim() : '', dataPago: cPago >= 0 ? fmtData_(r[cPago + 1]) : '', modeloNovo: novo };
  });
  return { lista: out, coluna: cPago >= 0 ? hdr[cPago] : '', modeloNovo: novo, mes: mesNome };
}
function procedimentos_() {
  var s = planilha_().getSheetByName(CONFIG.ABA.PROCEDIMENTOS);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 4).getValues().map(function (r) {
    var v = r[2]; if (typeof v === 'string') v = parseFloat(v.replace(/\./g, '').replace(',', '.'));
    return { nome: String(r[0] || '').trim(), especialidade: String(r[1] || '').trim(), valor: (v === '' || v == null || isNaN(v)) ? null : Number(v), obs: String(r[3] || '').trim() };
  }).filter(function (p) { return p.nome; });
}

API.bootstrapAtendimento = function () {
  var m = mensalistas_();
  return { procedimentos: procedimentos_(), pacotes: pacotesPorPaciente_(), mensalistas: m.lista, mensalistasInfo: { coluna: m.coluna, modeloNovo: m.modeloNovo, mes: m.mes },
    pacientes: indicePacientes_(), hoje: hoje_(), abaMes: nomeAbaMes_(new Date()), abaMesExiste: !!planilha_().getSheetByName(nomeAbaMes_(new Date())) };
};

API.registrarAtendimento = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var profissional = String(d.profissional || '').trim(); if (!profissional) erros.push('Escolha o profissional.');
  var procedimento = String(d.procedimento || '').trim(); if (!procedimento) erros.push('Escolha o procedimento.');
  var data = parseData_(d.data); if (!data) erros.push('Data inválida.');
  var hora = String(d.hora || '').trim(); if (hora && !/^\d{1,2}:\d{2}$/.test(hora)) erros.push('Hora inválida (use hh:mm).');
  var oque = String(d.oque || '').trim(); if (!oque) erros.push('Informe o que aconteceu.');
  var pago = String(d.pago || '').trim();
  var valor = d.valor === '' || d.valor == null ? '' : Number(String(d.valor).replace(/\./g, '').replace(',', '.'));
  if (valor !== '' && isNaN(valor)) erros.push('Valor inválido.');
  if (pago === 'Sim' && (valor === '' || valor <= 0)) erros.push('Pago? = Sim exige um valor maior que zero.');
  if (erros.length) return { ok: false, erros: erros };

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var indice = indicePacientes_(), pac = indice.filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes. Cadastre primeiro em "Novo paciente".'] };
    var s = abaMes_(data), g = garantirColunas_(s, [CONFIG.HM.LOG, CONFIG.HM.PACOTE]), h = g.h, HM = CONFIG.HM;
    var linha = proximaLinha_(s, h[HM.PACIENTE] || 3);
    var u = usuario_(), id = novoId_('A');
    var quem = String(d.quemPagou || '').trim();
    var obs = String(d.observacao || '').trim();
    var pares = {};
    pares[HM.DATA] = data; pares[HM.HORA] = hora; pares[HM.PACIENTE] = paciente; pares[HM.PROFISSIONAL] = profissional; pares[HM.PROCEDIMENTO] = procedimento;
    pares[HM.OQUE] = oque; pares[HM.VALOR] = valor === '' ? '' : valor; pares[HM.PAGO] = pago;
    pares[HM.DATA_PAG] = pago === 'Sim' ? (parseData_(d.dataPagamento) || data) : '';
    pares[HM.FORMA] = pago === 'Sim' ? String(d.forma || '').trim() : '';
    pares[HM.QUEM] = (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : '';
    pares[HM.NF] = String(d.nf || '').trim(); pares[HM.NF_N] = String(d.nfNumero || '').trim(); pares[HM.GUIA] = String(d.guia || '').trim();
    pares[HM.OBS] = obs; pares[HM.ID] = id; pares[HM.LOG] = (u.email || 'app') + ' · ' + agora_(); pares[HM.PACOTE] = String(d.pacoteId || '');
    gravarCelulas_(s, linha, h, pares);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
    if (h[HM.VALOR]) s.getRange(linha, h[HM.VALOR]).setNumberFormat('#,##0.00');

    // pacote: consome sessão (Atendido ou falta sem aviso / em cima da hora), salvo sessão extra
    var pk = null;
    if (d.pacoteId && !d.sessaoExtra && /^(Atendido|Faltou)/.test(oque)) {
      var sp = planilha_().getSheetByName(CONFIG.ABA.PACOTES);
      if (sp) {
        var hp = cabecalhos_(sp), ids = sp.getRange(2, hp['ID'], Math.max(sp.getLastRow() - 1, 1), 1).getValues();
        for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(d.pacoteId)) {
          var r = i + 2, usadas = (Number(sp.getRange(r, hp['Sessões usadas']).getValue()) || 0) + 1, n = Number(sp.getRange(r, hp['Nº de sessões']).getValue()) || 0;
          sp.getRange(r, hp['Sessões usadas']).setValue(usadas);
          sp.getRange(r, hp['Última sessão']).setValue(data).setNumberFormat('dd/MM/yyyy');
          if (usadas >= n && n > 0) sp.getRange(r, hp['Status']).setValue('encerrado');
          pk = { usadas: usadas, n: n };
          break;
        }
      }
    }
    // pagador novo confirmado → cadastro
    if (d.tornarPagadorHabitual && quem && quem !== (pac.pagador || '')) {
      var spc = aba_(CONFIG.ABA.PACIENTES), hc = cabecalhos_(spc);
      [CONFIG.H.PAGADOR, CONFIG.H.PAGADOR_EXTRATO].forEach(function (k) { if (hc[k]) spc.getRange(pac.linha, hc[k]).setValue(quem); });
      if (hc[CONFIG.H.LOG]) { var cl = spc.getRange(pac.linha, hc[CONFIG.H.LOG]); cl.setValue((String(cl.getValue() || '') + ' | pagador alterado por ' + (u.email || 'app') + ' · ' + agora_()).replace(/^ \| /, '')); }
    }
    SpreadsheetApp.flush();
    return { ok: true, id: id, linha: linha, aba: s.getName(), pacote: pk };
  } finally { lock.releaseLock(); }
};

API.lancarPacote = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var n = parseInt(d.sessoes, 10); if (!n || n < 1) erros.push('Número de sessões inválido.');
  var valor = Number(String(d.valor || '').replace(/\./g, '').replace(',', '.')); if (isNaN(valor) || valor < 0) erros.push('Valor inválido.');
  var data = parseData_(d.data) || new Date();
  var validadeDias = parseInt(d.validadeDias, 10) || (n >= 12 ? 168 : 56); // 24 ou 8 semanas
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes.'] };
    var sp = abaPacotes_(), hp = cabecalhos_(sp), u = usuario_(), id = novoId_('P');
    // encerra pacote ativo anterior do mesmo paciente
    if (sp.getLastRow() >= 2) {
      var vals = sp.getRange(2, 1, sp.getLastRow() - 1, sp.getLastColumn()).getValues();
      vals.forEach(function (r, i) { if (String(r[hp['Paciente'] - 1]) === paciente && String(r[hp['Status'] - 1] || 'ativo') === 'ativo') sp.getRange(i + 2, hp['Status']).setValue('encerrado'); });
    }
    var linha = proximaLinha_(sp, hp['Paciente']);
    var pares = { 'ID': id, 'Paciente': paciente, 'Modalidade': String(d.modalidade || pac.modalidade || ''), 'Nº de sessões': n, 'Valor (R$)': valor,
      'Data da compra': data, 'Válido até': dataMais_(data, validadeDias), 'Pago?': String(d.pago || 'Sim'), 'Forma de pagamento': String(d.forma || ''),
      'Quem pagou': String(d.quemPagou || pac.pagador || paciente), 'NF emitida?': String(d.nf || ''), 'Nº da NF': String(d.nfNumero || ''),
      'Sessões usadas': 0, 'Última sessão': '', 'Status': 'ativo', 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_(), 'Observação': String(d.observacao || '') };
    gravarCelulas_(sp, linha, hp, pares);
    ['Data da compra', 'Válido até'].forEach(function (k) { sp.getRange(linha, hp[k]).setNumberFormat('dd/MM/yyyy'); });
    // linha de recebimento na aba do mês
    var sm = abaMes_(data), gm = garantirColunas_(sm, [CONFIG.HM.LOG, CONFIG.HM.PACOTE]), hm = gm.h, HM = CONFIG.HM;
    var lm = proximaLinha_(sm, hm[HM.PACIENTE] || 3), idA = novoId_('A');
    var pm = {};
    pm[HM.DATA] = data; pm[HM.HORA] = String(d.hora || ''); pm[HM.PACIENTE] = paciente; pm[HM.PROFISSIONAL] = String(d.profissional || '');
    pm[HM.PROCEDIMENTO] = String(d.procedimentoCompra || ''); pm[HM.OQUE] = 'Atendido'; pm[HM.VALOR] = valor; pm[HM.PAGO] = String(d.pago || 'Sim');
    pm[HM.DATA_PAG] = data; pm[HM.FORMA] = String(d.forma || ''); pm[HM.QUEM] = (d.quemPagou && d.quemPagou !== (pac.pagador || '') && d.quemPagou !== paciente) ? String(d.quemPagou) : '';
    pm[HM.NF] = String(d.nf || ''); pm[HM.NF_N] = String(d.nfNumero || ''); pm[HM.OBS] = ('Compra do pacote ' + id + '. ' + String(d.observacao || '')).trim();
    pm[HM.ID] = idA; pm[HM.LOG] = (u.email || 'app') + ' · ' + agora_(); pm[HM.PACOTE] = id;
    gravarCelulas_(sm, lm, hm, pm);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (hm[k]) sm.getRange(lm, hm[k]).setNumberFormat('dd/MM/yyyy'); });
    if (hm[HM.VALOR]) sm.getRange(lm, hm[HM.VALOR]).setNumberFormat('#,##0.00');
    SpreadsheetApp.flush();
    return { ok: true, id: id, validade: fmtData_(dataMais_(data, validadeDias)), linhaRecebimento: lm, aba: sm.getName() };
  } finally { lock.releaseLock(); }
};

API;
