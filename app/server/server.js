/* Recepção Nascente — servidor (Google Apps Script, runtime V8).
   Este arquivo é carregado pelo app/loader/Code.gs a partir do Drive e avaliado em tempo de execução,
   por isso define tudo dentro de `API` e termina com a expressão `API`.
   Toda gravação é append de linha ou update de célula específica. Nunca reescreve aba. Nunca apaga linha.
   As colunas são localizadas pelo CABEÇALHO, nunca pela letra. */

var CONFIG = {
  TZ: 'America/Sao_Paulo',
  GESTAO: ['administrativo@clinicanascente.com.br'],
  ABA: { PACIENTES: 'Pacientes', LISTAS: 'Listas', PROFISSIONAIS: 'Profissionais', PROCEDIMENTOS: 'Procedimentos', MENSALISTAS: 'Mensalistas' },
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

API;
