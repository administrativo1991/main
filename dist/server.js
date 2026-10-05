/* Recepção Nascente — detecção de duplicata de paciente.
   Módulo puro (sem dependências): roda no Apps Script (servidor), no navegador (tela) e no Node (testes).
   Regras (decisão Roberta, 04 e 05/10/2026):
   - CPF igual a um existente → BLOQUEIA.
   - Nome exatamente igual → avisa (o servidor também bloqueia, porque a planilha usa o nome como chave).
   - Primeiro nome parecido (fonético ou distância de edição) E pelo menos um de:
       (a) mesma data de nascimento, (b) pagador habitual parecido, (c) >= 1 sobrenome em comum → AVISA, deixa prosseguir.
*/
(function (root) {
  var STOP = { de: 1, da: 1, do: 1, dos: 1, das: 1, e: 1, d: 1 };

  function normalizar(s) {
    return String(s == null ? '' : s)
      .replace(/[çÇ]/g, 's')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tokens(nome) {
    return normalizar(nome).split(' ').filter(function (t) { return t && !STOP[t]; });
  }
  function digitos(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }

  // Fonética simplificada para nomes em português (inspirada no BuscaBR).
  function fonetica(w) {
    w = normalizar(w);
    if (!w) return '';
    w = w.replace(/ph/g, 'f').replace(/th/g, 't')
         .replace(/lh/g, 'li').replace(/nh/g, 'ni')
         .replace(/sch|ch|sh/g, 'x')
         .replace(/c(?=[eiy])/g, 's').replace(/g(?=[eiy])/g, 'j')
         .replace(/c|q/g, 'k').replace(/ss|z|x/g, 's')
         .replace(/y/g, 'i').replace(/w/g, 'v').replace(/h/g, '')
         .replace(/(.)\1+/g, '$1');
    return w.charAt(0) + w.slice(1).replace(/[aeiou]/g, '');
  }

  function lev(a, b) {
    a = normalizar(a); b = normalizar(b);
    if (a === b) return 0;
    var m = a.length, n = b.length, i, j, prev, cur, tmp;
    if (!m) return n; if (!n) return m;
    prev = []; for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        tmp = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, tmp);
      }
      prev = cur;
    }
    return prev[n];
  }

  function primeiroNomeParecido(a, b) {
    if (!a || !b) return false;
    if (fonetica(a) === fonetica(b)) return true;
    var d = lev(a, b), L = Math.min(a.length, b.length);
    return (L >= 4 && d <= 1) || (L >= 6 && d <= 2);
  }

  function dataChave(d) {
    if (!d) return '';
    if (d instanceof Date && !isNaN(d)) {
      return ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + d.getFullYear();
    }
    var s = String(d).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return ('0' + m[1]).slice(-2) + ('0' + m[2]).slice(-2) + (m[3].length === 2 ? '20' + m[3] : m[3]);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + m[2] + m[1];
    return digitos(s);
  }

  // "Natalha da Silva / Natalia Ribeiro" → dois pagadores
  function pagadores(s) {
    return String(s == null ? '' : s).split(/\s*[\/;,]\s*|\s+ou\s+/i).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function pagadorParecido(a, b) {
    var ta = tokens(a), tb = tokens(b);
    if (!ta.length || !tb.length) return false;
    if (ta.join(' ') === tb.join(' ')) return true;
    if (!primeiroNomeParecido(ta[0], tb[0])) return false;
    var comuns = ta.slice(1).filter(function (t) { return tb.slice(1).indexOf(t) >= 0; });
    return comuns.length > 0 || (ta.length === 1 || tb.length === 1);
  }

  /** novo: {nome, cpf, nasc, pagador}; lista: [{nome, cpf, nasc, pagador, ...}]
      → {bloqueio: {paciente, motivo} | null, avisos: [{paciente, motivos:[...]}]} */
  function verificar(novo, lista) {
    var res = { bloqueio: null, avisos: [] };
    var cpfN = digitos(novo.cpf);
    var tn = tokens(novo.nome);
    var nomeN = tn.join(' ');
    var pagsN = pagadores(novo.pagador);
    (lista || []).forEach(function (p) {
      var cpfP = digitos(p.cpf);
      if (cpfN.length === 11 && cpfP === cpfN) {
        if (!res.bloqueio) res.bloqueio = { paciente: p, motivo: 'CPF já cadastrado' };
        return;
      }
      if (tn.length < 1 || tn[0].length < 3) return;
      var tp = tokens(p.nome);
      if (!tp.length) return;
      var motivos = [];
      if (nomeN === tp.join(' ')) motivos.push('nome idêntico');
      if (primeiroNomeParecido(tn[0], tp[0])) {
        if (novo.nasc && p.nasc && dataChave(novo.nasc) === dataChave(p.nasc)) motivos.push('mesma data de nascimento');
        if (pagsN.length && p.pagador) {
          var pp = pagadores(p.pagador), achou = null;
          pagsN.forEach(function (a) { pp.forEach(function (b) { if (!achou && pagadorParecido(a, b)) achou = b; }); });
          if (achou) motivos.push('pagador parecido: ' + achou);
        }
        var comuns = tn.slice(1).filter(function (t) { return tp.slice(1).indexOf(t) >= 0; });
        if (comuns.length) motivos.push('sobrenome em comum: ' + comuns.join(', '));
      }
      if (motivos.length) res.avisos.push({ paciente: p, motivos: motivos });
    });
    res.avisos.sort(function (a, b) { return b.motivos.length - a.motivos.length; });
    res.avisos = res.avisos.slice(0, 5);
    return res;
  }

  function cpfValido(cpf) {
    var d = digitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    var s = 0, i, r;
    for (i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
    r = (s * 10) % 11; if (r === 10) r = 0; if (r !== parseInt(d[9], 10)) return false;
    s = 0; for (i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
    r = (s * 10) % 11; if (r === 10) r = 0;
    return r === parseInt(d[10], 10);
  }

  var Duplicatas = { normalizar: normalizar, tokens: tokens, fonetica: fonetica, lev: lev, verificar: verificar,
                     cpfValido: cpfValido, digitos: digitos, dataChave: dataChave, pagadorParecido: pagadorParecido };
  if (typeof module !== 'undefined' && module.exports) module.exports = Duplicatas;
  root.Duplicatas = Duplicatas;
})(typeof globalThis !== 'undefined' ? globalThis : this);

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
  LISTAS: { OQUE: 'O que aconteceu', PAGO: 'Pago?', FORMA: 'Forma de pagamento', CONVENIO: 'Convênio', REGRA: 'Regra de cobrança', MODALIDADE: 'Modalidade', GESTAO: 'Gestão' }
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
    SpreadsheetApp.flush();
    return { ok: true, linha: novaLinha, nome: nome, colunasCriadas: g.criadas };
  } finally {
    lock.releaseLock();
  }
};

API;
