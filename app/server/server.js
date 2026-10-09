/* Recepção Nascente — servidor (Google Apps Script, runtime V8).
   Este arquivo é carregado pelo app/loader/Code.gs a partir do Drive e avaliado em tempo de execução,
   por isso define tudo dentro de `API` e termina com a expressão `API`.
   Toda gravação é append de linha ou update de célula específica. Nunca reescreve aba. Nunca apaga linha.
   As colunas são localizadas pelo CABEÇALHO, nunca pela letra. */

var CONFIG = {
  TZ: 'America/Sao_Paulo',
  PASTA_FINANCEIRO: '1TVCErWCv4bn0ed66T5eZSvcATPIoxboc', // Drive: Clínica Nascente/Controle Financeiro (as exportações vão em <ano>/<MM Mês_AA>/2_Atendimentos)
  GESTAO: ['administrativo@clinicanascente.com.br'],
  ABA: { PACIENTES: 'Pacientes', LISTAS: 'Listas', PROFISSIONAIS: 'Profissionais', PROCEDIMENTOS: 'Procedimentos', MENSALISTAS: 'Mensalistas', PACOTES: 'Planos', AGENDA: 'Agenda recorrente', DIA: 'Lista do dia', ALTERACOES: 'Alterações de cadastro', RENOVACOES: 'Renovações', LEMBRETES: 'Lembretes', ALT_LANC: 'Alterações de lançamento' },
  DIAS: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  HA: ['ID', 'Paciente', 'Profissional', 'Dia da semana', 'Hora', 'Frequência', 'Começa em', 'Termina em', 'Ativo', 'Observação', 'Registrado por (app)'],
  HD: ['ID', 'Data', 'Hora', 'Paciente', 'Profissional', 'Origem', 'Observação', 'Registrado por (app)'],
  HC: ['Data/hora', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)'],
  HL: ['Data/hora', 'Lembrete', 'Válido até', 'Quem escreveu', 'Registrado por (app)'],
  MESES: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  VIRADA: '2026-11-01', // a partir daqui a mensalidade é antecipada (vence dia 10, tolerância 15)
  // cabeçalhos da aba do mês (os existentes são lidos como estão; U e V são criados no fim se faltarem)
  HM: { DATA: 'Data', HORA: 'Hora', PACIENTE: 'Paciente', PROFISSIONAL: 'Profissional', PROCEDIMENTO: 'Procedimento', OQUE: 'O que aconteceu', VALOR: 'Valor (R$)', PAGO: 'Pago?', DATA_PAG: 'Data do pagamento', FORMA: 'Forma de pagamento', QUEM: 'Quem pagou (só se foi outra pessoa)', NF: 'NF emitida?', NF_N: 'Nº da NF', GUIA: 'Guia assinada? (convênio)', OBS: 'Observação', ID: 'ID', LOG: 'Registrado por (app)', PACOTE: 'Plano (ID)', RECEBIDO: 'Valor recebido (R$)', SESSOES: 'Sessões do pacote' },
  // Renovação do pacote (gestão, 07-08/10): uma linha por pagamento antecipado; é o que o Financeiro concilia
  HR: ['ID', 'Data', 'Paciente', 'Sessões', 'Valor (R$)', 'Forma de pagamento', 'Quem pagou', 'NF emitida?', 'Nº da NF', 'Válido até', 'Observação', 'Registrado por (app)', 'Referente a'],
  // validade das sessões de cada renovação, em meses, pelo tamanho do pacote (a confirmar com Bruna e Juliana)
  VALIDADE_PACOTE: { 4: 2, 12: 6 }, VALIDADE_PADRAO: 2,
  // gestão, 09/10: pacotes de 4 e 12 sessões (valor fixo, automático) e mensalidades (valor fixo do mês)
  PACOTES: { 'Pacote 4 sessões': { sessoes: 4, valor: 400 }, 'Pacote 12 sessões': { sessoes: 12, valor: 900 } },
  MENSALIDADE_SOCIAL: 200,
  HL_LANC: ['Data/hora', 'Aba', 'ID', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)'],
  HP: ['ID', 'Paciente', 'Modalidade', 'Nº de sessões', 'Valor (R$)', 'Data da compra', 'Válido até', 'Pago?', 'Forma de pagamento', 'Quem pagou', 'NF emitida?', 'Nº da NF', 'Sessões usadas', 'Última sessão', 'Status', 'Registrado por (app)', 'Observação'],
  // Cabeçalhos de Pacientes (os existentes são lidos como estão; os novos são criados no fim da aba se faltarem)
  H: {
    NOME: 'Nome', CPF: 'CPF', NASC: 'Data de nascimento', ATIVO: 'Ativo', MODALIDADE: 'Cobrança',
    // texto livre antigo ("Antes: Plano de 4 consultas…"): só a gestão consulta; a recepção não vê
    VALOR_COMB: 'Histórico de cobrança (antigo)',
    PAGADOR: 'Pagador habitual (responsável financeiro)', PAGADOR_EXTRATO: 'Nome do pagador como aparece no extrato',
    CONVENIO: 'Convênio', REGRA: 'Regra de cobrança',
    OBS_COBRANCA: 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)',
    // novas (criadas pelo app, sempre no fim)
    LOG: 'Registrado por (app)', WHATS: 'WhatsApp do pagador', TEL_PAC: 'Telefone do paciente', CARTEIRINHA: 'Nº da carteirinha',
    INDICACAO: 'Quem indicou', PRIMEIRA: 'Data da 1ª consulta', PROF_REF: 'Profissional de referência',
    // responsável legal (quem traz; pode ser diferente de quem paga) e CPF do pagador (gestão, 07/10)
    PAGADOR_CPF: 'CPF do pagador', RESP: 'Responsável (nome)', RESP_PAR: 'Parentesco do responsável', RESP_TEL: 'Telefone do responsável', RESP_CPF: 'CPF do responsável',
    // Cobrança + Pagamento (gestão, 07-08/10)
    VALOR_NUM: 'Valor combinado (R$)', PCT_N: 'Sessões por pacote', PCT_V: 'Valor do pacote (R$)', PAGAMENTO: 'Pagamento'
  },
  LISTAS: { OQUE: 'O que aconteceu', PAGO: 'Pago?', FORMA: 'Forma de pagamento', CONVENIO: 'Convênio', REGRA: 'Regra de cobrança', MODALIDADE: 'Cobrança', PAGAMENTO: 'Pagamento', MODALIDADE_ESP: 'Especialidade (modalidade)', GESTAO: 'Gestão' }
};
var COLS_NOVAS_PACIENTES = ['LOG', 'WHATS', 'TEL_PAC', 'CARTEIRINHA', 'INDICACAO', 'PRIMEIRA', 'PROF_REF', 'PAGADOR_CPF', 'RESP', 'RESP_PAR', 'RESP_TEL', 'RESP_CPF', 'VALOR_NUM', 'PCT_N', 'PCT_V', 'PAGAMENTO'];
// nomes antigos das colunas (antes da migração de 08/10): lidos como se fossem os novos
var ALIAS_COLUNAS = { 'Cobrança': 'Modalidade', 'Histórico de cobrança (antigo)': 'Valor combinado / observação de modalidade' };

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
  Object.keys(ALIAS_COLUNAS).forEach(function (novo) { if (m[novo] == null && m[ALIAS_COLUNAS[novo]] != null) m[novo] = m[ALIAS_COLUNAS[novo]]; });
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
      cPag = col('PAGADOR'), cConv = col('CONVENIO'), cRegra = col('REGRA'), cObs = col('OBS_COBRANCA'), cVal = col('VALOR_COMB'),
      cResp = col('RESP'), cTel = col('TEL_PAC'), cRespPar = col('RESP_PAR'), cRespTel = col('RESP_TEL'),
      cVN = col('VALOR_NUM'), cPN = col('PCT_N'), cPV = col('PCT_V'), cPg = col('PAGAMENTO');
  var numOu = function (r, c) { if (c < 0) return null; var v = r[c]; if (v === '' || v == null) return null; var n = numBR_(v); return isNaN(n) ? null : n; };
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
      valorCombinado: cVal >= 0 ? String(r[cVal] || '').trim() : '',
      valorNum: numOu(r, cVN), pctN: numOu(r, cPN), pctV: numOu(r, cPV), pagamento: cPg >= 0 ? pagNorm_(r[cPg]) : '',
      telPac: cTel >= 0 ? String(r[cTel] || '').trim() : '', resp: cResp >= 0 ? String(r[cResp] || '').trim() : '', respPar: cRespPar >= 0 ? String(r[cRespPar] || '').trim() : '', respTel: cRespTel >= 0 ? String(r[cRespTel] || '').trim() : ''
    });
  });
  return out;
}
// Profissionais: A = nome, B = especialidade; o expediente (horário por dia da semana + duração da sessão) fica em colunas
// criadas no fim pela tela Agenda → "Horário dos profissionais". Formato da célula: "08:00-12:00, 13:00-19:00" (vazio = não atende)
var EXPEDIENTE = { DIAS: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], DURACAO: 'Duração da sessão (min)', LOG: 'Horário alterado por (app)' };
function colExpediente_(dia) { return 'Horário ' + dia.toLowerCase(); }
function profissionais_() {
  var s = aba_(CONFIG.ABA.PROFISSIONAIS), n = s.getLastRow();
  if (n < 2) return [];
  var h = cabecalhos_(s), vals = s.getRange(2, 1, n - 1, s.getLastColumn()).getValues();
  var txt = function (r, nome) { var c = h[nome]; return c ? String(r[c - 1] == null ? '' : r[c - 1]).trim() : ''; };
  return vals.map(function (r) {
    var horarios = {}; EXPEDIENTE.DIAS.forEach(function (d) { horarios[d] = txt(r, colExpediente_(d)); });
    var dur = parseInt(txt(r, EXPEDIENTE.DURACAO), 10);
    return { nome: String(r[0] || '').trim(), especialidade: String(r[1] || '').trim(), horarios: horarios, duracao: dur > 0 ? dur : null };
  }).filter(function (p) { return p.nome; });
}
// "08:00-12:00, 13:00-19:00" → [[480,720],[780,1140]]; aceita "8h-12h", "08:00 às 12:00", travessão; null se inválido
function faixasHorario_(t) {
  t = String(t || '').trim(); if (!t) return [];
  var out = [], ok = true;
  t.split(/[,;]+/).forEach(function (parte) {
    parte = parte.trim(); if (!parte) return;
    var m = parte.match(/^(\d{1,2})(?:[:h](\d{2}))?h?\s*(?:-|–|—|a|às|as|até)\s*(\d{1,2})(?:[:h](\d{2}))?h?$/i);
    if (!m) { ok = false; return; }
    var a = +m[1] * 60 + +(m[2] || 0), b = +m[3] * 60 + +(m[4] || 0);
    if (+m[1] > 23 || +m[3] > 24 || +(m[2] || 0) > 59 || +(m[4] || 0) > 59 || b <= a) { ok = false; return; }
    out.push([a, b]);
  });
  if (!ok) return null;
  out.sort(function (x, y) { return x[0] - y[0]; });
  for (var i = 1; i < out.length; i++) if (out[i][0] < out[i - 1][1]) return null; // faixas sobrepostas
  return out;
}
function faixasTxt_(f) { var hm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }; return f.map(function (x) { return hm(x[0]) + '-' + hm(x[1]); }).join(', '); }
// Grava o expediente de uma profissional (recepção e gestão). Só escreve nas colunas de expediente da linha dela.
API.salvarExpediente = function (d) {
  d = d || {};
  var nome = String(d.profissional || '').trim(), erros = [], horarios = {};
  if (!nome) erros.push('Escolha o profissional.');
  EXPEDIENTE.DIAS.forEach(function (dia) { var f = faixasHorario_((d.horarios || {})[dia]); if (f === null) erros.push(dia + ': horário inválido. Use o formato 08:00-12:00, 13:00-19:00.'); else horarios[dia] = faixasTxt_(f); });
  var dur = String(d.duracao == null ? '' : d.duracao).trim(), durN = parseInt(dur, 10);
  if (dur && !(durN >= 10 && durN <= 240)) erros.push('Duração da sessão: informe os minutos (entre 10 e 240).');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = aba_(CONFIG.ABA.PROFISSIONAIS), n = s.getLastRow(), linha = 0;
    var nomes = n >= 2 ? s.getRange(2, 1, n - 1, 1).getValues() : [];
    for (var i = 0; i < nomes.length; i++) if (String(nomes[i][0] || '').trim() === nome) { linha = i + 2; break; }
    if (!linha) return { ok: false, erros: ['Profissional não está na aba Profissionais.'] };
    var g = garantirColunas_(s, EXPEDIENTE.DIAS.map(colExpediente_).concat([EXPEDIENTE.DURACAO, EXPEDIENTE.LOG])), h = g.h, u = usuario_(), pares = {};
    EXPEDIENTE.DIAS.forEach(function (dia) { pares[colExpediente_(dia)] = horarios[dia]; s.getRange(linha, h[colExpediente_(dia)]).setNumberFormat('@'); });
    pares[EXPEDIENTE.DURACAO] = dur ? durN : '';
    pares[EXPEDIENTE.LOG] = (u.email || 'app') + ' · ' + agora_();
    gravarCelulas_(s, linha, h, pares);
    SpreadsheetApp.flush();
    return { ok: true, linha: linha, colunasCriadas: g.criadas, profissionais: profissionais_() };
  } finally { lock.releaseLock(); }
};

API.ping = function () { return { ok: true, hora: agora_(), usuario: usuario_(), planilha: planilha_().getName() }; };

API.bootstrap = function () {
  return {
    usuario: usuario_(),
    planilha: planilha_().getName(),
    hora: agora_(),
    lembrete: lembreteAtivo_(),
    lembretes: lembretes_().slice(-5).reverse(),
    listas: {
      modalidades: colunaLista_(CONFIG.LISTAS.MODALIDADE),
      modalidadesEsp: modalidadesComEsp_(),
      convenios: colunaLista_(CONFIG.LISTAS.CONVENIO),
      regras: colunaLista_(CONFIG.LISTAS.REGRA),
      pagamentos: (function () { var l = colunaLista_(CONFIG.LISTAS.PAGAMENTO).map(pagNorm_); return l.length ? l : PAGAMENTOS; })(),
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

/* ---------- Cobrança + Pagamento (gestão, 07-09/10) ---------- */
var PAGAMENTOS = ['Na sessão', 'No início do mês', 'No mês seguinte', 'Não se aplica'];
// gestão, 09/10: "Antecipado" virou "No início do mês" e "Posterior" virou "No mês seguinte" (os nomes antigos são lidos como os novos)
// Pago? = "Perdido / glosa" (gestão, 10/10): valor dado como perdido (glosa, guia não autorizada, calote). Fica fora de a receber,
// pendências, guias e receita; o Valor fica como referência do que se perdeu. Só a gestão marca ou desmarca, sempre com o motivo.
var PAGO_PERDIDO = 'Perdido / glosa';
function ehPerdido_(p) { return /^Perdido/i.test(String(p || '').trim()); }
function pagNorm_(v) { v = String(v || '').trim(); return v === 'Antecipado' ? 'No início do mês' : v === 'Posterior' ? 'No mês seguinte' : v; }
var PAGAMENTO_SUGERIDO = { 'Tabela': 'Na sessão', 'Por sessão (combinado)': 'Na sessão', 'Pacote 4 sessões': 'No início do mês', 'Pacote 12 sessões': 'No início do mês',
  'Mensalidade social': 'No início do mês', 'Mensalidade especial': 'No início do mês', 'Convênio': 'No mês seguinte', 'Pro bono': 'Não se aplica', 'Permuta': 'Não se aplica' };
// pacote = sessões disponíveis (renovação soma, sessão que gasta tira 1); "Pacote de sessões" é o nome antigo (08/10)
function ehPacoteCob_(c) { return /^Pacote (\d+ sessões|de sessões)$/.test(String(c || '')); }
// mensalidade = valor fixo do mês, independe do nº de sessões; a sessão fica "incluída na mensalidade"
function ehMensalidadeCob_(c) { return /^Mensalidade (social|especial)$/.test(String(c || '')); }
function valorMensalidade_(p) { return p.modalidade === 'Mensalidade social' ? CONFIG.MENSALIDADE_SOCIAL : (p.valorNum || 0); }
function chaveMes_(d) { return CONFIG.MESES[d.getMonth()] + '/' + d.getFullYear(); }
// valida e normaliza os campos de cobrança (valores numéricos; pacote 4/12 com nº fixo e valor padrão; social R$ 200/mês)
function camposCobranca_(c, erros) {
  var cob = String(c.modalidade || '').trim(), num = function (v) { if (v === '' || v == null) return ''; var n = numBR_(v); return isNaN(n) ? NaN : n; };
  var out = { modalidade: cob };
  if (c.valorNum != null) out.valorNum = num(c.valorNum);
  if (c.pctN != null) out.pctN = num(c.pctN);
  if (c.pctV != null) out.pctV = num(c.pctV);
  var pad = CONFIG.PACOTES[cob];
  if (pad) { out.pctN = pad.sessoes; out.pctV = pad.valor; } // valor automático (gestão, 09/10), como a mensalidade social
  if (cob === 'Mensalidade social') { out.valorNum = CONFIG.MENSALIDADE_SOCIAL; out.pctN = ''; out.pctV = ''; }
  if (cob === 'Mensalidade especial') { out.pctN = ''; out.pctV = ''; } // valor do mês em branco = a definir
  // Por sessão (combinado) com valor em branco = "valor a definir" (gestão, 08/10): o Registrar pede o valor à mão
  ['valorNum', 'pctN', 'pctV'].forEach(function (k) { if (typeof out[k] === 'number' && isNaN(out[k])) erros.push('Número inválido em ' + k + '.'); });
  var pg = c.pagamento != null ? pagNorm_(c.pagamento) : null;
  if (pg) { if (PAGAMENTOS.indexOf(pg) < 0) erros.push('Pagamento fora da lista.'); out.pagamento = pg; }
  else if (pg === '' || c.pagamento == null) { if (cob && PAGAMENTO_SUGERIDO[cob] && c.pagamento !== undefined) out.pagamento = PAGAMENTO_SUGERIDO[cob]; }
  return out;
}

/* ---------- Novo paciente ---------- */
// CPF do pagador e do responsável: opcionais; se preenchidos, têm de ser válidos. Gravados formatados (000.000.000-00)
function cpfFmt_(v) { var c = Duplicatas.digitos(v); return c ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''; }
function errosCpfsExtras_(d) {
  var e = [];
  if (Duplicatas.digitos(d.pagadorCpf) && !Duplicatas.cpfValido(Duplicatas.digitos(d.pagadorCpf))) e.push('CPF do pagador inválido. Confira os 11 dígitos.');
  if (Duplicatas.digitos(d.respCpf) && !Duplicatas.cpfValido(Duplicatas.digitos(d.respCpf))) e.push('CPF do responsável inválido. Confira os 11 dígitos.');
  return e;
}
API.criarPaciente = function (d) {
  d = d || {};
  var erros = [];
  var nome = String(d.nome || '').replace(/\s+/g, ' ').trim();
  if (Duplicatas.tokens(nome).length < 2) erros.push('Informe o nome completo (nome e sobrenome).');
  // CPF e nascimento são opcionais (gestão, 08/10: há pacientes no ControleOdonto sem eles); se vierem, têm de ser válidos.
  // Faltando, o app avisa a recepção pra completar depois (Editar cadastro).
  var cpf = Duplicatas.digitos(d.cpf);
  if (cpf && !Duplicatas.cpfValido(cpf)) erros.push('CPF inválido. Confira os 11 dígitos (ou deixe em branco e complete depois).');
  var nasc = String(d.nasc || '').trim() ? parseData_(d.nasc) : '';
  if (nasc === null) erros.push('Data de nascimento inválida (use dd/mm/aaaa, ou deixe em branco e complete depois).');
  else if (nasc && nasc > new Date()) erros.push('Data de nascimento no futuro.');
  var modalidades = colunaLista_(CONFIG.LISTAS.MODALIDADE);
  var modalidade = String(d.modalidade || '').trim();
  if (modalidade && modalidades.length && modalidades.indexOf(modalidade) < 0) erros.push('Cobrança fora da lista.'); // em branco = Tabela, com aviso pra completar
  var convenios = colunaLista_(CONFIG.LISTAS.CONVENIO);
  var convenio = String(d.convenio || 'Particular').trim();
  if (convenios.length && convenios.indexOf(convenio) < 0) erros.push('Convênio fora da lista.');
  if (modalidade === 'Convênio' && convenio === 'Particular') erros.push('Cobrança "Convênio" exige escolher o convênio.');
  var cobr = camposCobranca_({ modalidade: modalidade, valorNum: d.valorNum, pctN: d.pctN, pctV: d.pctV, pagamento: d.pagamento || '' }, erros);
  var primeira = d.primeiraConsulta ? parseData_(d.primeiraConsulta) : null;
  if (d.primeiraConsulta && !primeira) erros.push('Data da 1ª consulta inválida.');
  erros = erros.concat(errosCpfsExtras_(d));
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
    put('CPF', cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '');
    put('NASC', nasc);
    put('ATIVO', 'Sim');
    put('MODALIDADE', modalidade);
    put('VALOR_NUM', cobr.valorNum == null ? '' : cobr.valorNum); put('PCT_N', cobr.pctN == null ? '' : cobr.pctN); put('PCT_V', cobr.pctV == null ? '' : cobr.pctV);
    put('PAGAMENTO', modalidade ? (cobr.pagamento || PAGAMENTO_SUGERIDO[modalidade] || 'Na sessão') : 'Na sessão');
    put('PAGADOR', pagador);
    put('PAGADOR_EXTRATO', pagador);
    put('CONVENIO', convenio);
    put('WHATS', String(d.whatsapp || '').trim());
    put('TEL_PAC', String(d.telPaciente || '').trim());
    put('CARTEIRINHA', String(d.carteirinha || '').trim());
    put('INDICACAO', String(d.indicacao || '').trim());
    put('PRIMEIRA', primeira || '');
    put('PROF_REF', String(d.profissional || '').trim());
    put('PAGADOR_CPF', cpfFmt_(d.pagadorCpf));
    put('RESP', String(d.respNome || '').replace(/\s+/g, ' ').trim());
    put('RESP_PAR', String(d.respPar || '').trim());
    put('RESP_TEL', String(d.respTel || '').trim());
    put('RESP_CPF', cpfFmt_(d.respCpf));
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
function dataMaisMeses_(d, meses) { var x = new Date(d.getTime()); x.setMonth(x.getMonth() + meses); return x; }
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
    var v = pares[nome], cel = sheet.getRange(linha, c);
    // Lista do dia / Agenda recorrente: a hora fica texto (sem o formato antes, a planilha converte "08:00" em horário e o app lia "30/12/1899")
    if (typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v) && (sheet.getName() === CONFIG.ABA.DIA || sheet.getName() === CONFIG.ABA.AGENDA)) cel.setNumberFormat('@');
    cel.setValue(v);
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
      usadas: Number(g(r, 'Sessões usadas')) || 0, ultima: fmtData_(g(r, 'Última sessão')), status: st || 'ativo', pago: String(g(r, 'Pago?') || '').trim() };
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
  return { procedimentos: procedimentos_(), pacotes: pacotesPorPaciente_(), pacotesSessoes: pacotesEstado_(new Date()), mensalistas: m.lista, mensalistasInfo: { coluna: m.coluna, modeloNovo: m.modeloNovo, mes: m.mes },
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
  if (ehPerdido_(pago) && usuario_().perfil !== 'gestao') erros.push('Só a gestão marca "' + PAGO_PERDIDO + '".');
  else if (ehPerdido_(pago) && !String(d.observacao || '').trim()) erros.push('"' + PAGO_PERDIDO + '": escreva o motivo na observação.');
  var recebido = pago === 'Parcial' ? numBR_(d.valorRecebido) : 0;
  if (pago === 'Parcial' && !(valor > 0)) erros.push('Pago parcial exige o valor total da sessão.');
  else if (pago === 'Parcial' && !(recebido > 0 && recebido < valor)) erros.push('Pago parcial: o valor recebido agora tem de ser maior que zero e menor que o valor da sessão.');
  if (erros.length) return { ok: false, erros: erros };

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var indice = indicePacientes_(), pac = indice.filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes. Cadastre primeiro em "Novo paciente".'] };
    var s = abaMes_(data), g = garantirColunas_(s, [CONFIG.HM.LOG, CONFIG.HM.PACOTE].concat(pago === 'Parcial' ? [CONFIG.HM.RECEBIDO] : [])), h = g.h, HM = CONFIG.HM;
    var linha = proximaLinha_(s, h[HM.PACIENTE] || 3);
    var u = usuario_(), id = novoId_('A'), pagou = pago === 'Sim' || pago === 'Parcial';
    var quem = String(d.quemPagou || '').trim();
    var obs = String(d.observacao || '').trim();
    var pares = {};
    pares[HM.DATA] = data; pares[HM.HORA] = hora; pares[HM.PACIENTE] = paciente; pares[HM.PROFISSIONAL] = profissional; pares[HM.PROCEDIMENTO] = procedimento;
    pares[HM.OQUE] = oque; pares[HM.VALOR] = valor === '' ? '' : valor; pares[HM.PAGO] = pago;
    pares[HM.DATA_PAG] = pagou ? (parseData_(d.dataPagamento) || data) : '';
    pares[HM.FORMA] = pagou ? String(d.forma || '').trim() : '';
    if (pago === 'Parcial') { pares[HM.RECEBIDO] = recebido; obs = ('Recebido ' + brl_(recebido) + ' em ' + fmtData_(pares[HM.DATA_PAG]) + ' (' + pares[HM.FORMA] + ')' + (d.nfNumero ? ' · NF ' + String(d.nfNumero).trim() : '') + '; em aberto ' + brl_(valor - recebido) + (obs ? ' | ' + obs : '')); }
    pares[HM.QUEM] = (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : '';
    pares[HM.NF] = String(d.nf || '').trim(); pares[HM.NF_N] = String(d.nfNumero || '').trim(); pares[HM.GUIA] = String(d.guia || '').trim();
    pares[HM.OBS] = obs; pares[HM.ID] = id; pares[HM.LOG] = (u.email || 'app') + ' · ' + agora_(); pares[HM.PACOTE] = String(d.pacoteId || '');
    // pacote de sessões: decide se gasta sessão (regra em consumoPacote_); no Antecipado grava −1/0 em "Sessões do pacote"
    var consumo = null;
    if (ehPacoteCob_(pac.modalidade) && !d.cobrarAvulsa) {
      if (!h[HM.SESSOES]) h = garantirColunas_(s, [HM.SESSOES]).h;
      var nFA = 0, vv = s.getLastRow() >= 2 ? s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues() : [];
      vv.forEach(function (r) { if (String(r[h[HM.PACIENTE] - 1] || '').trim() === paciente && h[HM.OBS] && String(r[h[HM.OBS] - 1] || '').indexOf(MARCA_FALTA_AVISADA) >= 0) nFA++; });
      consumo = consumoPacote_(oque, procedimento, !!d.mesmaSemana, nFA);
      if (consumo.nota) pares[HM.OBS] = (consumo.nota + (pares[HM.OBS] ? ' | ' + pares[HM.OBS] : ''));
      if ((pac.pagamento || 'No início do mês') === 'No início do mês') pares[HM.SESSOES] = consumo.delta;
    }
    gravarCelulas_(s, linha, h, pares);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
    if (h[HM.VALOR]) s.getRange(linha, h[HM.VALOR]).setNumberFormat('#,##0.00');
    if (h[HM.RECEBIDO] && pago === 'Parcial') s.getRange(linha, h[HM.RECEBIDO]).setNumberFormat('#,##0.00');

    // plano: consome consulta (Atendido ou falta sem aviso / em cima da hora), salvo sessão extra
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
    var dispo = null; if (consumo && (pac.pagamento || 'No início do mês') === 'No início do mês') { SpreadsheetApp.flush(); dispo = (pacotesEstado_(data)[paciente] || {}).disponiveis; }
    return { ok: true, id: id, linha: linha, aba: s.getName(), pacote: pk, consumo: consumo, disponiveis: dispo };
  } finally { lock.releaseLock(); }
};

// Corrigir um lançamento já gravado na aba do mês (gestão e recepção; aprovado pela Roberta em 06/10).
// Acha a linha pelo ID e só mexe nas colunas de cobrança preenchidas pela recepção: Pago?, Data do pagamento, Forma,
// Quem pagou, NF emitida?, Nº da NF, Guia assinada? e Observação (só acrescenta). Nunca toca em Valor, nas colunas
// automáticas (F, G, H, N) nem apaga nada; o carimbo da correção vai somado em "Registrado por (app)".
// Se a linha for a compra de um plano (Observação "Compra do plano P-…"), a aba Planos recebe o mesmo Pago?/Forma/NF.
API.corrigirLancamento = function (d) {
  d = d || {};
  var aba = String(d.aba || '').trim(), id = String(d.id || '').trim(), c = d.campos || {};
  if (CONFIG.MESES.indexOf(aba) < 0) return { ok: false, erros: ['Aba do mês inválida.'] };
  if (!id) return { ok: false, erros: ['Lançamento sem ID: corrija direto na planilha.'] };
  var s = planilha_().getSheetByName(aba); if (!s) return { ok: false, erros: ['A aba "' + aba + '" não existe.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var h = cabecalhos_(s), HM = CONFIG.HM;
    if (!h[HM.ID]) return { ok: false, erros: ['A aba "' + aba + '" não tem a coluna ID.'] };
    var ids = s.getRange(2, h[HM.ID], Math.max(s.getLastRow() - 1, 1), 1).getValues(), linha = 0;
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === id) { linha = i + 2; break; }
    if (!linha) return { ok: false, erros: ['Não achei o lançamento ' + id + ' na aba ' + aba + '.'] };
    var r = s.getRange(linha, 1, 1, s.getLastColumn()).getValues()[0];
    var g = function (k) { var col = h[HM[k]]; return col ? r[col - 1] : ''; }, txt = function (k) { return String(g(k) || '').trim(); };
    var paciente = txt('PACIENTE'), valorAtual = numBR_(g('VALOR')), recebidoAtual = numBR_(g('RECEBIDO')), pagoAtual = txt('PAGO');
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0] || {};
    var u = usuario_(), erros = [], novos = {}, rotulos = [], amplos = [];
    var quer = function (k) { return Object.prototype.hasOwnProperty.call(c, k); };
    // perdido / glosa: só a gestão marca, desmarca ou recebe numa linha perdida
    if (u.perfil !== 'gestao' && (ehPerdido_(c.pago) || (ehPerdido_(pagoAtual) && (quer('pago') || quer('recebidoAgora'))))) return { ok: false, erros: ['Só a gestão marca ou desmarca "' + PAGO_PERDIDO + '".'] };
    var motivoPerdido = String(c.motivoPerdido || '').trim();
    if (ehPerdido_(c.pago) && !ehPerdido_(pagoAtual) && !motivoPerdido) return { ok: false, erros: ['"' + PAGO_PERDIDO + '": informe o motivo (ex.: guia não autorizada pelo convênio).'] };
    var atualDe = function (k) { return k === 'DATA_PAG' || k === 'DATA' ? fmtData_(g(k)) : k === 'HORA' ? horaTxt_(g(k)) : (k === 'VALOR' || k === 'RECEBIDO') ? (g(k) === '' ? '' : String(numBR_(g(k)))) : txt(k); };
    var mudar = function (k, v, rotulo) { if (!h[HM[k]] && k !== 'RECEBIDO') return; var atual = atualDe(k); var nv = v instanceof Date ? fmtData_(v) : String(v == null ? '' : v).trim(); if (nv === atual) return; novos[k] = v instanceof Date ? v : (typeof v === 'number' ? v : nv); rotulos.push(rotulo); return { de: atual, para: nv }; };
    var amplo = function (k, v, rotulo) { var m = mudar(k, v, rotulo); if (m) amplos.push({ campo: rotulo, de: m.de, para: m.para }); };
    // correção ampla (recepção e gestão; gestão 07/10): dados da sessão e valores, sempre com "quem informou" e registro em "Alterações de lançamento"
    if (quer('data')) { var dt = parseData_(c.data); if (!dt) erros.push('Data da sessão inválida.'); else if (nomeAbaMes_(dt) !== aba) erros.push('A data nova é de outro mês: lance a sessão no mês certo (Registrar) e marque esta como "Cancelado pela clínica".'); else amplo('DATA', dt, 'Data'); }
    if (quer('hora')) { var hr = horaTxt_(c.hora); if (hr && !/^\d{2}:\d{2}$/.test(hr)) erros.push('Hora inválida (hh:mm).'); else amplo('HORA', hr, 'Hora'); }
    if (quer('paciente')) { var np = String(c.paciente || '').trim(); if (!indicePacientes_().some(function (p) { return p.nome === np; })) erros.push('Paciente novo não está em Pacientes.'); else amplo('PACIENTE', np, 'Paciente'); }
    if (quer('profissional')) amplo('PROFISSIONAL', String(c.profissional || '').trim(), 'Profissional');
    if (quer('procedimento')) amplo('PROCEDIMENTO', String(c.procedimento || '').trim(), 'Procedimento');
    if (quer('oque')) amplo('OQUE', String(c.oque || '').trim(), 'O que aconteceu');
    var valorNovo = valorAtual;
    if (quer('valor')) { var vn = c.valor === '' ? '' : numBR_(c.valor); if (vn !== '' && !(vn >= 0)) erros.push('Valor inválido.'); else { amplo('VALOR', vn, 'Valor'); valorNovo = vn === '' ? 0 : vn; if (pagoAtual === 'Sim' && h[HM.RECEBIDO] && g('RECEBIDO') !== '' && !quer('valorRecebido')) mudar('RECEBIDO', valorNovo, 'Valor recebido'); } }
    if (quer('valorRecebido')) { var vr = c.valorRecebido === '' ? '' : numBR_(c.valorRecebido); amplo('RECEBIDO', vr, 'Valor recebido'); recebidoAtual = vr === '' ? 0 : vr; }
    if (amplos.length && !String(c.quemInformou || '').trim()) erros.push('Mudou dados da sessão ou valores: informe quem passou a informação / o motivo.');
    var histPag = '';
    if (quer('recebidoAgora')) {
      // recebimento (total ou parcial): soma ao que já entrou; completa = "Sim", senão "Parcial" e o resto continua em aberto
      var agora = numBR_(c.recebidoAgora), base = pagoAtual === 'Parcial' ? recebidoAtual : 0, total = Math.round((base + agora) * 100) / 100;
      if (!(agora > 0)) erros.push('Informe o valor recebido agora.');
      else if (!(valorNovo > 0)) erros.push('A linha não tem valor da sessão: corrija o valor antes de receber.');
      else if (total > valorNovo + 0.001) erros.push('O recebido (' + brl_(total) + ') passa do valor da sessão (' + brl_(valorNovo) + '). Se o valor está errado, corrija o valor.');
      else {
        var completo = total >= valorNovo - 0.001, dpg = parseData_(c.dataPagamento) || new Date();
        mudar('PAGO', completo ? 'Sim' : 'Parcial', 'Pago?');
        if (completo) { if (pagoAtual === 'Parcial' || h[HM.RECEBIDO]) { if (h[HM.RECEBIDO]) mudar('RECEBIDO', valorNovo, 'Valor recebido'); } }
        else mudar('RECEBIDO', total, 'Valor recebido');
        mudar('DATA_PAG', dpg, 'Data do pagamento');
        if (quer('forma')) mudar('FORMA', String(c.forma || ''), 'Forma');
        var nfNum = String(c.nfNumero || '').trim(), nfAnt = txt('NF_N');
        if (nfNum && nfAnt && nfAnt.indexOf(nfNum) < 0 && (pagoAtual === 'Parcial')) nfNum = nfAnt + ', ' + nfNum; // NF por pagamento (gestão, 07/10)
        if (quer('nfNumero') && nfNum) mudar('NF_N', nfNum, 'Nº da NF');
        if (quer('nf')) mudar('NF', String(c.nf || ''), 'NF emitida?');
        histPag = 'Recebido ' + brl_(agora) + ' em ' + fmtData_(dpg) + ' (' + String(c.forma || '') + ')' + (String(c.nfNumero || '').trim() ? ' · NF ' + String(c.nfNumero).trim() : '') + (completo ? '; quitado' : '; em aberto ' + brl_(valorNovo - total));
      }
    } else if (quer('pago')) {
      var pago = String(c.pago || '').trim();
      if (pago === 'Sim' && !(valorNovo > 0)) erros.push('Pago? = Sim exige um valor maior que zero na linha.');
      if (pago === 'Parcial' && !(recebidoAtual > 0 && recebidoAtual < valorNovo)) erros.push('Pago? = Parcial exige "Valor recebido" maior que zero e menor que o valor.');
      mudar('PAGO', pago, 'Pago?');
      if (pago === 'Sim' || pago === 'Parcial') {
        var dp = parseData_(c.dataPagamento) || (fmtData_(g('DATA_PAG')) ? null : new Date());
        if (dp) mudar('DATA_PAG', dp, 'Data do pagamento');
        if (quer('forma')) mudar('FORMA', String(c.forma || ''), 'Forma');
      } else { mudar('DATA_PAG', '', 'Data do pagamento'); mudar('FORMA', '', 'Forma'); }
      if (quer('nf')) mudar('NF', String(c.nf || ''), 'NF emitida?');
      if (quer('nfNumero')) mudar('NF_N', String(c.nfNumero || ''), 'Nº da NF');
    } else {
      if (quer('forma')) mudar('FORMA', String(c.forma || ''), 'Forma');
      if (quer('nf')) mudar('NF', String(c.nf || ''), 'NF emitida?');
      if (quer('nfNumero')) mudar('NF_N', String(c.nfNumero || ''), 'Nº da NF');
    }
    if (quer('quemPagou')) { var quem = String(c.quemPagou || '').trim(); mudar('QUEM', (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : '', 'Quem pagou'); }
    if (quer('guia')) mudar('GUIA', String(c.guia || ''), 'Guia assinada?');
    var obsNova = [histPag, ehPerdido_(novos.PAGO) && motivoPerdido ? 'PERDIDO / glosa: ' + motivoPerdido : '', String(c.observacao || '').trim(), amplos.length ? 'corrigido: ' + amplos.map(function (m) { return m.campo + ' ' + (m.de || '(vazio)') + ' → ' + (m.para || '(vazio)'); }).join('; ') + ' (informou: ' + String(c.quemInformou || '').trim() + ')' : ''].filter(Boolean).join(' · ');
    if (obsNova) { novos.OBS = (txt('OBS') ? txt('OBS') + ' | ' : '') + obsNova; if (rotulos.indexOf('Observação') < 0) rotulos.push('Observação'); }
    if (erros.length) return { ok: false, erros: erros };
    if (!rotulos.length) return { ok: false, erros: ['Nada mudou: os campos já estavam assim.'] };
    if (novos.RECEBIDO != null && !h[HM.RECEBIDO]) h = garantirColunas_(s, [HM.RECEBIDO]).h;
    var pares = {}; Object.keys(novos).forEach(function (k) { pares[HM[k]] = novos[k]; });
    var carimbo = (u.email || 'app') + ' · ' + agora_();
    if (h[HM.LOG]) pares[HM.LOG] = (txt('LOG') ? txt('LOG') + ' | ' : '') + 'corrigido por ' + carimbo + ' (' + rotulos.join(', ') + ')';
    gravarCelulas_(s, linha, h, pares);
    ['DATA_PAG', 'DATA'].forEach(function (k) { if (novos[k] instanceof Date && h[HM[k]]) s.getRange(linha, h[HM[k]]).setNumberFormat('dd/MM/yyyy'); });
    ['VALOR', 'RECEBIDO'].forEach(function (k) { if (novos[k] != null && h[HM[k]]) s.getRange(linha, h[HM[k]]).setNumberFormat('#,##0.00'); });
    if (novos.HORA != null && h[HM.HORA]) s.getRange(linha, h[HM.HORA]).setNumberFormat('@');
    if (amplos.length) {
      var sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa);
      amplos.forEach(function (m) { gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': aba, 'ID': id, 'Paciente': paciente, 'Campo': m.campo, 'De': m.de, 'Para': m.para, 'Quem informou': String(c.quemInformou || '').trim(), 'Registrado por (app)': carimbo }); });
    }
    // compra de plano: a aba Planos acompanha a cobrança
    var planoId = txt('PACOTE'), plano = null;
    if (planoId && /^Compra do plano/i.test(txt('OBS'))) {
      var sp = planilha_().getSheetByName(CONFIG.ABA.PACOTES);
      if (sp && sp.getLastRow() >= 2) {
        var hp = cabecalhos_(sp), pids = sp.getRange(2, hp['ID'], sp.getLastRow() - 1, 1).getValues();
        for (var j = 0; j < pids.length; j++) if (String(pids[j][0]).trim() === planoId) {
          var lp = j + 2, pp = {}, mapa = { PAGO: 'Pago?', FORMA: 'Forma de pagamento', NF: 'NF emitida?', NF_N: 'Nº da NF' };
          Object.keys(mapa).forEach(function (k) { if (novos[k] != null && hp[mapa[k]]) pp[mapa[k]] = novos[k]; });
          if (novos.QUEM != null && hp['Quem pagou']) pp['Quem pagou'] = novos.QUEM || (pac.pagador || paciente);
          if (Object.keys(pp).length) {
            if (hp['Registrado por (app)']) pp['Registrado por (app)'] = (String(sp.getRange(lp, hp['Registrado por (app)']).getValue() || '') + ' | corrigido por ' + carimbo).replace(/^ \| /, '');
            gravarCelulas_(sp, lp, hp, pp); plano = { id: planoId, linha: lp };
          }
          break;
        }
      }
    }
    // sessão de plano: mudar "O que aconteceu" devolve ou consome a consulta em Planos (mesma regra do registrar)
    var consome = function (o) { return /^(Atendido|Faltou)/.test(String(o || '')); };
    if (planoId && novos.OQUE != null && !/^(Compra do plano|Sessão extra liberada)/i.test(txt('OBS')) && consome(txt('OQUE')) !== consome(novos.OQUE)) {
      var sp2 = planilha_().getSheetByName(CONFIG.ABA.PACOTES);
      if (sp2 && sp2.getLastRow() >= 2) {
        var hp2 = cabecalhos_(sp2), pids2 = sp2.getRange(2, hp2['ID'], sp2.getLastRow() - 1, 1).getValues();
        for (var k2 = 0; k2 < pids2.length; k2++) if (String(pids2[k2][0]).trim() === planoId) {
          var lp2 = k2 + 2, n2 = Number(sp2.getRange(lp2, hp2['Nº de sessões']).getValue()) || 0;
          var us2 = Math.max(0, (Number(sp2.getRange(lp2, hp2['Sessões usadas']).getValue()) || 0) + (consome(novos.OQUE) ? 1 : -1));
          var st2 = String(sp2.getRange(lp2, hp2['Status']).getValue() || '').trim(), pp2 = { 'Sessões usadas': us2 };
          if (n2 > 0 && us2 >= n2) pp2['Status'] = 'encerrado'; else if (st2 === 'encerrado') pp2['Status'] = 'ativo';
          if (hp2['Registrado por (app)']) pp2['Registrado por (app)'] = (String(sp2.getRange(lp2, hp2['Registrado por (app)']).getValue() || '') + ' | ' + (consome(novos.OQUE) ? 'consulta consumida' : 'consulta devolvida') + ' (' + id + ') por ' + carimbo).replace(/^ \| /, '');
          gravarCelulas_(sp2, lp2, hp2, pp2); plano = { id: planoId, linha: lp2, usadas: us2, n: n2 };
          break;
        }
      }
    }
    SpreadsheetApp.flush();
    var depois = {}; Object.keys(novos).forEach(function (k) { depois[k] = novos[k] instanceof Date ? fmtData_(novos[k]) : novos[k]; });
    return { ok: true, id: id, aba: aba, linha: linha, alterados: rotulos, novos: depois, plano: plano };
  } finally { lock.releaseLock(); }
};

API.lancarPacote = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var n = parseInt(d.sessoes, 10); if (!n || n < 1) erros.push('Número de sessões inválido.');
  var valor = Number(String(d.valor || '').replace(/\./g, '').replace(',', '.')); if (isNaN(valor) || valor < 0) erros.push('Valor inválido.');
  var data = parseData_(d.data) || new Date();
  // validade do plano (Roberta 05/10): 4 consultas = 2 meses, 12 consultas = 6 meses; 6 consultas = 3 meses
  var validadeMeses = parseInt(d.validadeMeses, 10) || (n >= 12 ? 6 : (n >= 6 ? 3 : 2));
  var validade = dataMaisMeses_(data, validadeMeses);
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes.'] };
    var sp = abaPacotes_(), hp = cabecalhos_(sp), u = usuario_(), id = novoId_('P');
    // encerra plano ativo anterior do mesmo paciente
    if (sp.getLastRow() >= 2) {
      var vals = sp.getRange(2, 1, sp.getLastRow() - 1, sp.getLastColumn()).getValues();
      vals.forEach(function (r, i) { if (String(r[hp['Paciente'] - 1]) === paciente && String(r[hp['Status'] - 1] || 'ativo') === 'ativo') sp.getRange(i + 2, hp['Status']).setValue('encerrado'); });
    }
    var linha = proximaLinha_(sp, hp['Paciente']);
    var pares = { 'ID': id, 'Paciente': paciente, 'Modalidade': String(d.modalidade || pac.modalidade || ''), 'Nº de sessões': n, 'Valor (R$)': valor,
      'Data da compra': data, 'Válido até': validade, 'Pago?': String(d.pago || 'Sim'), 'Forma de pagamento': String(d.forma || ''),
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
    var pagoPlano = String(d.pago || 'Sim') === 'Sim'; // "vai pagar depois" (Roberta 06/10): data e forma ficam em branco até a correção da linha
    pm[HM.DATA_PAG] = pagoPlano ? data : ''; pm[HM.FORMA] = pagoPlano ? String(d.forma || '') : ''; pm[HM.QUEM] = (d.quemPagou && d.quemPagou !== (pac.pagador || '') && d.quemPagou !== paciente) ? String(d.quemPagou) : '';
    pm[HM.NF] = String(d.nf || ''); pm[HM.NF_N] = String(d.nfNumero || ''); pm[HM.OBS] = ('Compra do plano ' + id + (pagoPlano ? '' : ' (a receber)') + '. ' + String(d.observacao || '')).trim();
    pm[HM.ID] = idA; pm[HM.LOG] = (u.email || 'app') + ' · ' + agora_(); pm[HM.PACOTE] = id;
    gravarCelulas_(sm, lm, hm, pm);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (hm[k]) sm.getRange(lm, hm[k]).setNumberFormat('dd/MM/yyyy'); });
    if (hm[HM.VALOR]) sm.getRange(lm, hm[HM.VALOR]).setNumberFormat('#,##0.00');
    SpreadsheetApp.flush();
    return { ok: true, id: id, validade: fmtData_(validade), linhaRecebimento: lm, aba: sm.getName() };
  } finally { lock.releaseLock(); }
};

/* ---------- Pagamento antecipado (gestão, 07/10): no dia em que a pessoa paga, lança as N sessões já pagas, uma por data da agenda ---------- */
// próximas sessões do paciente pela agenda (recorrente + acréscimos do dia), a partir de "de"; ignora "Não vem" e dias que já têm lançamento
API.proximasSessoes = function (d) {
  d = d || {};
  var paciente = String(d.paciente || '').trim(), prof = String(d.profissional || '').trim(), n = Math.min(parseInt(d.n, 10) || 4, 24);
  var de = parseData_(d.de) || new Date(), cache = {}, out = [];
  for (var i = 0; i < 120 && out.length < n; i++) {
    var dia = dataMais_(de, i), r;
    try { r = montarDia_(dia, cache); } catch (e) { continue; }
    r.itens.forEach(function (it) {
      if (out.length >= n || it.paciente !== paciente || (prof && it.profissional !== prof) || it.naoVem || it.registro) return;
      out.push({ data: r.data, hora: horaTxt_(it.hora), profissional: it.profissional });
    });
  }
  return { ok: true, sessoes: out };
};
API.lancarAntecipado = function (d) {
  d = d || {};
  var erros = [], HM = CONFIG.HM;
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var procedimento = String(d.procedimento || '').trim(); if (!procedimento) erros.push('Escolha o procedimento.');
  var valor = numBR_(d.valorSessao); if (!(valor > 0)) erros.push('Informe o valor por sessão.');
  var dpg = parseData_(d.dataPagamento); if (!dpg) erros.push('Data do pagamento inválida.');
  var forma = String(d.forma || '').trim(); if (!forma) erros.push('Escolha a forma de pagamento.');
  var sessoes = (d.sessoes || []).map(function (x) { return { data: parseData_(x.data), dataTxt: String(x.data || ''), hora: String(x.hora || '').trim(), profissional: String(x.profissional || d.profissional || '').trim() }; });
  if (!sessoes.length) erros.push('Informe as datas das sessões.');
  sessoes.forEach(function (x, i) {
    if (!x.data) erros.push('Sessão ' + (i + 1) + ': data inválida (' + x.dataTxt + ').');
    if (x.hora && !/^\d{1,2}:\d{2}$/.test(x.hora)) erros.push('Sessão ' + (i + 1) + ': hora inválida (hh:mm).');
    if (!x.profissional) erros.push('Sessão ' + (i + 1) + ': sem profissional.');
  });
  if (erros.length) return { ok: false, erros: erros };
  var faltam = {}; sessoes.forEach(function (x) { var nm = nomeAbaMes_(x.data); if (!planilha_().getSheetByName(nm)) faltam[nm] = 1; });
  if (Object.keys(faltam).length) return { ok: false, erros: ['A aba ' + Object.keys(faltam).join(', ') + ' ainda não existe. Crie em Pendências → Criar aba do mês, ou lance só as datas deste mês.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes.'] };
    // não lança duas vezes o mesmo dia/profissional
    var cache = {}, dup = sessoes.filter(function (x) { var r = montarDia_(x.data, cache); return r.itens.some(function (it) { return it.paciente === paciente && it.profissional === x.profissional && it.registro; }); });
    if (dup.length) return { ok: false, erros: ['Já há lançamento de ' + paciente + ' em ' + dup.map(function (x) { return fmtData_(x.data); }).join(', ') + '. Tire essas datas da lista.'] };
    var u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_(), total = Math.round(valor * sessoes.length * 100) / 100, quem = String(d.quemPagou || '').trim(), ids = [];
    var obsBase = 'Pagamento antecipado de ' + sessoes.length + ' sessões (' + brl_(total) + ') em ' + fmtData_(dpg) + (d.nfNumero ? ' · NF ' + String(d.nfNumero).trim() : '') + (d.observacao ? ' · ' + String(d.observacao).trim() : '');
    sessoes.forEach(function (x, i) {
      var s = abaMes_(x.data), h = garantirColunas_(s, [HM.LOG]).h, linha = proximaLinha_(s, h[HM.PACIENTE] || 3), id = novoId_('A'), pr = {};
      pr[HM.DATA] = x.data; pr[HM.HORA] = x.hora; pr[HM.PACIENTE] = paciente; pr[HM.PROFISSIONAL] = x.profissional; pr[HM.PROCEDIMENTO] = procedimento;
      pr[HM.OQUE] = 'Atendido'; pr[HM.VALOR] = valor; pr[HM.PAGO] = 'Sim'; pr[HM.DATA_PAG] = dpg; pr[HM.FORMA] = forma;
      pr[HM.QUEM] = (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : '';
      pr[HM.NF] = String(d.nf || 'Não'); pr[HM.NF_N] = String(d.nfNumero || '').trim();
      pr[HM.OBS] = obsBase + ' · sessão ' + (i + 1) + ' de ' + sessoes.length + ' (lançada antes de acontecer: se faltar, corrija)'; pr[HM.ID] = id; pr[HM.LOG] = carimbo;
      gravarCelulas_(s, linha, h, pr);
      [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
      if (h[HM.VALOR]) s.getRange(linha, h[HM.VALOR]).setNumberFormat('#,##0.00');
      ids.push({ id: id, aba: s.getName(), linha: linha, data: fmtData_(x.data) });
    });
    SpreadsheetApp.flush();
    return { ok: true, total: total, lancadas: ids };
  } finally { lock.releaseLock(); }
};

/* ---------- Pacotes de sessões (gestão, 07-08/10) ----------
   Pacote + Pagamento Antecipado: a renovação soma "Sessões por pacote" às sessões disponíveis; cada atendimento que gasta tira 1.
   Pacote + Posterior: cada sessão que gasta é lançada com o valor do pacote ÷ sessões, não paga, e entra nas pendências.
   O que gasta: Atendido · Faltou sem aviso · a partir da 2ª "falta avisando em cima da hora" do mês (a 1ª não gasta; remarcada
   na mesma semana nunca gasta). Não gasta: desmarcou com antecedência · cancelado pela clínica · aplicação de teste · retorno.
   As sessões disponíveis são a soma da coluna "Sessões do pacote" nas abas de mês (+N na renovação, −1 no que gasta). */
var MARCA_FALTA_AVISADA = '1ª falta avisada do mês (não gasta sessão)';
function consumoPacote_(oque, procedimento, mesmaSemana, faltasAvisadasMes) {
  oque = String(oque || ''); procedimento = String(procedimento || '');
  if (/^(Aplicação de teste|Retorno|Renovação)/i.test(procedimento)) return { delta: 0, nota: '' };
  if (/^Atendido/.test(oque) || /sem aviso/i.test(oque)) return { delta: -1, nota: '' };
  if (/em cima da hora/i.test(oque)) {
    if (mesmaSemana) return { delta: 0, nota: 'Remarcada na mesma semana (não gasta sessão)' };
    if (faltasAvisadasMes >= 1) return { delta: -1, nota: '2ª falta avisada do mês (gasta sessão)' };
    return { delta: 0, nota: MARCA_FALTA_AVISADA };
  }
  return { delta: 0, nota: '' }; // desmarcou com antecedência, cancelado pela clínica
}
// estado dos pacotes: sessões disponíveis, última renovação e validade, faltas avisadas e sessões no mês de "ref"
function pacotesEstado_(ref) {
  ref = ref || new Date();
  var out = {}, nmRef = nomeAbaMes_(ref), HM = CONFIG.HM;
  var get = function (n) { return out[n] = out[n] || { disponiveis: 0, ultima: '', ultimaSessoes: 0, validade: '', faltasAvisadasMes: 0, sessoesMes: 0, aPagarMes: 0, renovouMes: false, mesesPagos: {} }; };
  CONFIG.MESES.forEach(function (nm) {
    var sm = planilha_().getSheetByName(nm); if (!sm || sm.getLastRow() < 2) return;
    var h = cabecalhos_(sm), cS = h[HM.SESSOES], vals = sm.getRange(2, 1, sm.getLastRow() - 1, sm.getLastColumn()).getValues();
    vals.forEach(function (r) {
      var pac = String(r[h[HM.PACIENTE] - 1] || '').trim(); if (!pac) return;
      var v = cS ? r[cS - 1] : ''; if (v !== '' && v != null && !isNaN(Number(v))) get(pac).disponiveis += Number(v);
      // mensalidade paga lançada na aba do mês ("Mensalidade – psicologia" antiga ou "Mensalidade de <mês>" do app): marca o mês como pago
      var procM = String(r[h[HM.PROCEDIMENTO] - 1] || ''), pagoM = String(r[h[HM.PAGO] - 1] || '').trim();
      if (/^Mensalidade/i.test(procM) && (pagoM === 'Sim' || pagoM === 'Parcial')) {
        var mm = procM.match(/^Mensalidade de (\S+)/i), nmM = mm ? mm[1].charAt(0).toUpperCase() + mm[1].slice(1).toLowerCase() : nm, iM = CONFIG.MESES.indexOf(nmM);
        var dM = r[h[HM.DATA] - 1] instanceof Date ? r[h[HM.DATA] - 1] : parseData_(fmtData_(r[h[HM.DATA] - 1]));
        if (iM >= 0 && dM) get(pac).mesesPagos[nmM + '/' + (dM.getFullYear() - (iM > dM.getMonth() ? 1 : 0))] = true;
      }
      if (nm !== nmRef) return;
      var oque = String(r[h[HM.OQUE] - 1] || ''), obs = h[HM.OBS] ? String(r[h[HM.OBS] - 1] || '') : '', proc = String(r[h[HM.PROCEDIMENTO] - 1] || '');
      if (obs.indexOf(MARCA_FALTA_AVISADA) >= 0) get(pac).faltasAvisadasMes++;
      if (/^Atendido/.test(oque) && !/^(Mensalidade|Renovação|Aplicação de teste|Retorno)|\(compra\)/i.test(proc)) get(pac).sessoesMes++;
      var pago = String(r[h[HM.PAGO] - 1] || '').trim();
      if ((pago === 'Não' || pago === 'Parcial') && /^Atendido|sem aviso|em cima da hora/i.test(oque)) get(pac).aPagarMes += numBR_(r[h[HM.VALOR] - 1]) - (pago === 'Parcial' && h[HM.RECEBIDO] ? numBR_(r[h[HM.RECEBIDO] - 1]) : 0);
    });
  });
  var sr = planilha_().getSheetByName(CONFIG.ABA.RENOVACOES);
  if (sr && sr.getLastRow() >= 2) linhasComo_(sr).forEach(function (r) {
    var pac = String(r['Paciente'] || '').trim(); if (!pac) return;
    var dt = r['Data'] instanceof Date ? r['Data'] : parseData_(fmtData_(r['Data'])); if (!dt) return;
    var e = get(pac), atual = parseData_(e.ultima);
    if (!atual || dt >= atual) { e.ultima = fmtData_(dt); e.ultimaSessoes = Number(r['Sessões']) || 0; e.validade = fmtData_(r['Válido até']); }
    if (nomeAbaMes_(dt) === nmRef && dt.getFullYear() === ref.getFullYear()) e.renovouMes = true;
    var refm = String(r['Referente a'] || '').trim(); if (refm) e.mesesPagos[refm] = true; // mensalidade: mês pago
  });
  var ant = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  Object.keys(out).forEach(function (n) { out[n].mesPago = !!out[n].mesesPagos[chaveMes_(ref)]; out[n].mesAnteriorPago = !!out[n].mesesPagos[chaveMes_(ant)]; out[n].mesRef = chaveMes_(ref); });
  var hojeK = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd');
  Object.keys(out).forEach(function (n) { var v = parseData_(out[n].validade); out[n].vencido = !!(v && Utilities.formatDate(v, CONFIG.TZ, 'yyyyMMdd') < hojeK && out[n].disponiveis > 0); });
  return out;
}
// Renovação do pacote: linha na aba Renovações (Financeiro concilia) + linha de recebimento na aba do mês com "Sessões do pacote" = +N
API.renovarPacote = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var valor = numBR_(d.valor); if (!(valor > 0)) erros.push('Informe o valor recebido.');
  var data = parseData_(d.data) || new Date();
  var forma = String(d.forma || '').trim(); if (!forma) erros.push('Escolha a forma de pagamento.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0];
    if (!pac) return { ok: false, erros: ['Paciente não está em Pacientes.'] };
    // mensalidade (gestão, 09/10): pagamento do mês, sem sessões; "Referente a" diz qual mês ficou pago
    var mensal = ehMensalidadeCob_(pac.modalidade), n = mensal ? 0 : parseInt(d.sessoes, 10);
    if (!mensal && !(n > 0)) return { ok: false, erros: ['Informe quantas sessões entram nesta renovação.'] };
    var referente = mensal ? (String(d.referente || '').trim() || chaveMes_(data)) : '';
    var meses = CONFIG.VALIDADE_PACOTE[pac.pctN || n] || CONFIG.VALIDADE_PADRAO, validade = mensal ? '' : dataMaisMeses_(data, meses);
    var u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_(), id = novoId_('R'), quem = String(d.quemPagou || '').trim();
    var sr = abaComCabecalho_(CONFIG.ABA.RENOVACOES, CONFIG.HR), hr = garantirColunas_(sr, ['Referente a']).h, lr = proximaLinha_(sr, hr['Paciente']);
    gravarCelulas_(sr, lr, hr, { 'ID': id, 'Data': data, 'Paciente': paciente, 'Sessões': n, 'Valor (R$)': valor, 'Forma de pagamento': forma, 'Quem pagou': quem || pac.pagador || paciente,
      'NF emitida?': String(d.nf || 'Não'), 'Nº da NF': String(d.nfNumero || '').trim(), 'Válido até': validade, 'Observação': String(d.observacao || '').trim(), 'Registrado por (app)': carimbo, 'Referente a': referente });
    ['Data', 'Válido até'].forEach(function (k) { if (hr[k]) sr.getRange(lr, hr[k]).setNumberFormat('dd/MM/yyyy'); });
    var HM = CONFIG.HM, sm = abaMes_(data), hm = garantirColunas_(sm, [HM.LOG, HM.SESSOES]).h, lm = proximaLinha_(sm, hm[HM.PACIENTE] || 3), pm = {};
    pm[HM.DATA] = data; pm[HM.PACIENTE] = paciente; pm[HM.PROFISSIONAL] = String(d.profissional || pac.profRef || '');
    pm[HM.PROCEDIMENTO] = mensal ? 'Mensalidade de ' + referente.split('/')[0].toLowerCase() : 'Renovação do pacote (' + n + ' sessões)'; pm[HM.OQUE] = 'Atendido'; pm[HM.VALOR] = valor; pm[HM.PAGO] = 'Sim';
    pm[HM.DATA_PAG] = data; pm[HM.FORMA] = forma; pm[HM.QUEM] = (quem && quem !== (pac.pagador || '') && quem !== paciente) ? quem : '';
    pm[HM.NF] = String(d.nf || 'Não'); pm[HM.NF_N] = String(d.nfNumero || '').trim(); if (!mensal) pm[HM.SESSOES] = n;
    pm[HM.OBS] = (mensal ? 'Mensalidade ' + referente + ' (' + id + '). ' : 'Renovação ' + id + ': +' + n + ' sessões, válidas até ' + fmtData_(validade) + '. ') + String(d.observacao || '');
    pm[HM.OBS] = pm[HM.OBS].trim(); pm[HM.ID] = novoId_('A'); pm[HM.LOG] = carimbo;
    gravarCelulas_(sm, lm, hm, pm);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (hm[k]) sm.getRange(lm, hm[k]).setNumberFormat('dd/MM/yyyy'); });
    if (hm[HM.VALOR]) sm.getRange(lm, hm[HM.VALOR]).setNumberFormat('#,##0.00');
    SpreadsheetApp.flush();
    var est = pacotesEstado_(new Date())[paciente] || {};
    return { ok: true, id: id, aba: sm.getName(), linha: lm, validade: validade ? fmtData_(validade) : '', disponiveis: est.disponiveis, referente: referente, mesPago: est.mesPago };
  } finally { lock.releaseLock(); }
};
// Painel dos pacotes e mensalidades (substitui a tela Mensalistas)
API.pacotesPainel = function () {
  var est = pacotesEstado_(new Date()), dia = Number(Utilities.formatDate(new Date(), CONFIG.TZ, 'd'));
  var vazio = { disponiveis: 0, ultima: '', validade: '', sessoesMes: 0, aPagarMes: 0, renovouMes: false, vencido: false, mesPago: false, mesAnteriorPago: false };
  var itens = indicePacientes_().filter(function (p) { return (ehPacoteCob_(p.modalidade) || ehMensalidadeCob_(p.modalidade)) && !/^N/i.test(p.ativo || 'Sim'); }).map(function (p) {
    var e = est[p.nome] || vazio, mensal = ehMensalidadeCob_(p.modalidade), pg = p.pagamento || 'No início do mês', sit;
    var pad = CONFIG.PACOTES[p.modalidade] || {}, n = mensal ? 0 : (pad.sessoes || p.pctN || 0), v = mensal ? valorMensalidade_(p) : (pad.valor || p.pctV || 0);
    if (mensal) sit = e.mesPago ? 'mês pago' : pg === 'No início do mês' ? (dia >= 16 ? 'mensalidade atrasada' : dia >= 11 ? 'venceu dia 10' : 'vence dia 10') : 'a pagar no fim do mês';
    else if (pg === 'No início do mês') sit = e.vencido ? 'vencido' : e.disponiveis <= 0 ? 'esgotado' : e.disponiveis === 1 ? 'renovar' : (!e.renovouMes && dia > 10 ? 'renovação do mês em aberto' : 'ok');
    else sit = e.aPagarMes > 0 ? 'a pagar no mês' : 'ok';
    return { paciente: p.nome, cobranca: p.modalidade, mensal: mensal, sessoes: n, valor: v, pagamento: pg, disponiveis: e.disponiveis, ultima: e.ultima, validade: e.validade,
      sessoesMes: e.sessoesMes, aPagarMes: Math.round((e.aPagarMes || 0) * 100) / 100, mesPago: !!e.mesPago, mesAnteriorPago: !!e.mesAnteriorPago, situacao: sit, pagador: p.pagador };
  });
  itens.sort(function (a, b) { return a.paciente.localeCompare(b.paciente); });
  return { ok: true, itens: itens, dia: dia, mesRef: chaveMes_(new Date()) };
};
// Virada de novembro (gestão): propõe as trocas no cadastro; a gestão revê e aplica as marcadas
var VIRADA_EXCLUIR = ['Naimara Paula Sa da Silva']; // gestão 08/10: continua por sessão
API.viradaPropostas = function () {
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] };
  var out = [];
  indicePacientes_().forEach(function (p) {
    if (VIRADA_EXCLUIR.indexOf(p.nome) >= 0) return;
    var hist = String(p.valorCombinado || '');
    // ex-planos ficam em Por sessão (combinado) (gestão, 09/10)
    if ((ehPacoteCob_(p.modalidade) || ehMensalidadeCob_(p.modalidade)) && p.pagamento === 'No mês seguinte')
      out.push({ nome: p.nome, de: p.modalidade + ' · No mês seguinte', para: p.modalidade + ' · No início do mês', campos: { pagamento: 'No início do mês' } });
    else if (p.modalidade === 'Pro bono' && /a partir de 01\/11: social/i.test(p.obsCobranca + ' ' + hist))
      out.push({ nome: p.nome, de: 'Pro bono', para: 'Mensalidade social · R$ ' + CONFIG.MENSALIDADE_SOCIAL + ' · No início do mês', campos: { modalidade: 'Mensalidade social', pagamento: 'No início do mês', regra: '' } });
  });
  return { ok: true, itens: out };
};
API.aplicarAlteracoesLote = function (d) {
  d = d || {};
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] };
  var feitos = [], erros = [];
  (d.itens || []).forEach(function (it) {
    var r = API.atualizarCadastro({ nome: it.nome, quemInformou: String(d.quemInformou || 'Gestão (virada de novembro)'), campos: it.campos || {} });
    if (r.ok) feitos.push(it.nome); else erros.push(it.nome + ': ' + (r.erros || []).join(' '));
  });
  return { ok: !erros.length || feitos.length > 0, feitos: feitos, erros: erros };
};

/* ---------- Lembrete pra recepção (aba Lembretes: só acrescenta linha; vale o último; os antigos ficam como histórico) ---------- */
function lembretes_() {
  var s = planilha_().getSheetByName(CONFIG.ABA.LEMBRETES);
  return linhasComo_(s).filter(function (r) { return String(r['Data/hora'] || '').trim(); }).map(function (r) {
    return { linha: r._linha, data: String(r['Data/hora'] || ''), texto: String(r['Lembrete'] || '').trim(), validoAte: fmtData_(r['Válido até']), quem: String(r['Quem escreveu'] || '') };
  });
}
// o lembrete ativo é a última linha, se tiver texto e não tiver vencido ("Válido até" em branco = sem prazo)
function lembreteAtivo_() {
  var l = lembretes_(); if (!l.length) return null;
  var u = l[l.length - 1]; if (!u.texto) return null;
  if (u.validoAte) { var d = parseData_(u.validoAte); if (d && Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd') < Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd')) return null; }
  return u;
}
// Gestão escreve (ou encerra) o lembrete: sempre uma linha nova; encerrar = linha com texto em branco
API.salvarLembrete = function (d) {
  var u = usuario_();
  if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão escreve o lembrete.'] };
  var texto = String(d.texto || '').trim(), ate = String(d.validoAte || '').trim(), encerrar = !!d.encerrar;
  if (!texto && !encerrar) return { ok: false, erros: ['Escreva o lembrete.'] };
  if (ate && !parseData_(ate)) return { ok: false, erros: ['"Válido até" inválido: use dd/mm/aaaa.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(CONFIG.ABA.LEMBRETES, CONFIG.HL), h = cabecalhos_(s), linha = proximaLinha_(s, h['Data/hora']);
    gravarCelulas_(s, linha, h, { 'Data/hora': agora_(), 'Lembrete': encerrar ? '' : texto, 'Válido até': encerrar ? '' : ate, 'Quem escreveu': u.email || 'gestão', 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_() });
    SpreadsheetApp.flush();
    return { ok: true, linha: linha, lembrete: lembreteAtivo_(), lembretes: lembretes_().slice(-5).reverse() };
  } finally { lock.releaseLock(); }
};

/* ---------- Lista do dia / Agenda fixa ---------- */
function abaComCabecalho_(nome, cab) {
  var ss = planilha_(), s = ss.getSheetByName(nome);
  if (!s) { s = ss.insertSheet(nome); s.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold'); s.setFrozenRows(1); }
  return s;
}
// hora guardada como horário de verdade (a planilha converte "08:00" sozinha) chega como Date de 30/12/1899: é hora, não data
function ehSoHora_(v) { return v instanceof Date && !isNaN(v) && v.getFullYear() < 1901; }
function tzPlanilha_() { try { return planilha_().getSpreadsheetTimeZone() || CONFIG.TZ; } catch (e) { return CONFIG.TZ; } }
function linhasComo_(s) {
  if (!s || s.getLastRow() < 2) return [];
  var h = cabecalhos_(s), vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues(), out = [], tz = tzPlanilha_();
  vals.forEach(function (r, i) { var o = { _linha: i + 2 }; Object.keys(h).forEach(function (k) { var v = r[h[k] - 1]; o[k] = ehSoHora_(v) ? Utilities.formatDate(v, tz, 'HH:mm') : (v instanceof Date) ? fmtData_(v) : (v == null ? '' : v); }); out.push(o); });
  return out;
}
function horaTxt_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, ehSoHora_(v) ? tzPlanilha_() : CONFIG.TZ, 'HH:mm');
  var t = String(v == null ? '' : v).trim(); var m = t.match(/^(\d{1,2})[:h](\d{2})/); return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : t;
}
// valor da planilha: número, ou texto "1.234,56" / "100,00" (linhas importadas)
function numBR_(v) { if (typeof v === 'number') return v; var t = String(v == null ? '' : v).replace(/[R$\s]/g, ''); if (!t) return 0; if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isNaN(n) ? 0 : n; }
function brl_(n) { return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ','); }
// em aberto de uma linha: Parcial = valor − recebido; Não / em branco = valor
function saldo_(r) { return r.pago === 'Parcial' ? Math.max(0, Math.round((r.valor - r.recebido) * 100) / 100) : r.valor; }
API.agendaFixa = function () {
  return linhasComo_(planilha_().getSheetByName(CONFIG.ABA.AGENDA)).filter(function (r) { return r['Paciente']; }).map(function (r) { r['Hora'] = horaTxt_(r['Hora']); return r; });
};
API.salvarAgendaFixa = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var profissional = String(d.profissional || '').trim(); if (!profissional) erros.push('Escolha o profissional.');
  var dia = String(d.diaSemana || '').trim(); if (CONFIG.DIAS.indexOf(dia) < 0) erros.push('Dia da semana inválido.');
  var hora = horaTxt_(d.hora); if (!/^\d{2}:\d{2}$/.test(hora)) erros.push('Hora inválida (hh:mm).');
  var comeca = d.comecaEm ? parseData_(d.comecaEm) : null; if (d.comecaEm && !comeca) erros.push('Data "começa em" inválida.');
  var termina = d.terminaEm ? parseData_(d.terminaEm) : null; if (d.terminaEm && !termina) erros.push('Data "termina em" inválida.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (!indicePacientes_().some(function (p) { return p.nome === paciente; })) return { ok: false, erros: ['Paciente não está em Pacientes.'] };
    var s = abaComCabecalho_(CONFIG.ABA.AGENDA, CONFIG.HA), h = cabecalhos_(s), u = usuario_(), id = String(d.id || '').trim(), linha = 0;
    if (id) { var ids = s.getRange(2, h['ID'], Math.max(s.getLastRow() - 1, 1), 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { linha = i + 2; break; } }
    if (linha && d.encerrarAnterior) { // mudança "a partir de hoje": a linha antiga termina ontem e nasce uma nova
      var ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
      if (h['Termina em']) s.getRange(linha, h['Termina em']).setValue(ontem).setNumberFormat('dd/MM/yyyy');
      if (h['Registrado por (app)']) s.getRange(linha, h['Registrado por (app)']).setValue((u.email || 'app') + ' · ' + agora_() + ' · encerrado por troca de horário');
      linha = 0; if (!comeca) comeca = new Date();
    }
    if (!linha) { id = novoId_('F'); linha = proximaLinha_(s, h['Paciente']); }
    var freq = /quinzen/i.test(String(d.frequencia || '')) ? 'Quinzenal' : 'Semanal';
    if (freq === 'Quinzenal' && !comeca) comeca = new Date(); // a quinzena conta a partir de "começa em"
    var pares = { 'ID': id, 'Paciente': paciente, 'Profissional': profissional, 'Dia da semana': dia, 'Hora': hora, 'Frequência': freq, 'Começa em': comeca || '', 'Termina em': termina || '',
      'Ativo': d.ativo === false || d.ativo === 'Não' ? 'Não' : 'Sim', 'Observação': String(d.observacao || '').trim(), 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_() };
    gravarCelulas_(s, linha, h, pares);
    ['Começa em', 'Termina em'].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
    if (h['Hora']) s.getRange(linha, h['Hora']).setNumberFormat('@');
    SpreadsheetApp.flush();
    return { ok: true, id: id, linha: linha };
  } finally { lock.releaseLock(); }
};
API.acrescentarAoDia = function (d) {
  d = d || {};
  var erros = [];
  var data = parseData_(d.data); if (!data) erros.push('Data inválida.');
  var hora = horaTxt_(d.hora); if (hora && !/^\d{2}:\d{2}$/.test(hora)) erros.push('Hora inválida (hh:mm).');
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var profissional = String(d.profissional || '').trim(); if (!profissional) erros.push('Escolha o profissional.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(CONFIG.ABA.DIA, CONFIG.HD), h = cabecalhos_(s), u = usuario_(), origem = String(d.origem || 'Avulso');
    // clique duplo no "Agendar": a mesma pessoa, no mesmo dia, hora e profissional, não entra duas vezes
    var chave = fmtData_(data), igual = linhasComo_(s).filter(function (r) { return r['Data'] === chave && r['Paciente'] === paciente && r['Profissional'] === profissional && horaTxt_(r['Hora']) === hora && String(r['Origem'] || '') === origem; })[0];
    if (igual) return { ok: true, id: igual['ID'], duplicado: true };
    var id = novoId_('D'), linha = proximaLinha_(s, h['Paciente']);
    gravarCelulas_(s, linha, h, { 'ID': id, 'Data': data, 'Hora': hora, 'Paciente': paciente, 'Profissional': profissional, 'Origem': origem, 'Observação': String(d.observacao || '').trim(), 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_() });
    if (h['Data']) s.getRange(linha, h['Data']).setNumberFormat('dd/MM/yyyy');
    if (h['Hora']) s.getRange(linha, h['Hora']).setNumberFormat('@');
    SpreadsheetApp.flush();
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
};
// Monta o dia: agenda fixa do dia da semana (vigente) + acréscimos do dia + o que já foi registrado na aba do mês
// cache (opcional) guarda as abas já lidas, pra semana da Agenda ler cada aba uma vez só
function montarDia_(data, cache) {
  cache = cache || {};
  if (!cache.agenda) cache.agenda = API.agendaFixa();
  if (!cache.dia) cache.dia = linhasComo_(planilha_().getSheetByName(CONFIG.ABA.DIA));
  if (!cache.mes) cache.mes = {};
  var chave = fmtData_(data), diaSemana = CONFIG.DIAS[data.getDay()];
  var itens = [], vistos = {};
  cache.agenda.forEach(function (r) {
    if (r['Dia da semana'] !== diaSemana || String(r['Ativo'] || 'Sim') === 'Não') return;
    var c = r['Começa em'] ? parseData_(r['Começa em']) : null, t = r['Termina em'] ? parseData_(r['Termina em']) : null;
    if ((c && data < c) || (t && data > t)) return;
    if (/quinzen/i.test(String(r['Frequência'] || '')) && c) { // quinzenal: só nas semanas pares contadas a partir de "começa em"
      var semanas = Math.round((data - c) / (7 * 24 * 3600 * 1000)); if (semanas % 2 !== 0) return;
    }
    itens.push({ hora: r['Hora'], paciente: r['Paciente'], profissional: r['Profissional'], origem: /quinzen/i.test(String(r['Frequência'] || '')) ? 'Quinzenal' : 'Semanal', agendaId: r['ID'], obs: r['Observação'] || '' });
  });
  cache.dia.forEach(function (r) {
    if (r['Data'] !== chave || !r['Paciente']) return;
    var origem = String(r['Origem'] || 'Avulso');
    if (/^Removido/i.test(origem)) return; // agendamento removido pela recepção (duplicado, engano): a linha fica, mas sai da lista
    if (/^Confirmado/i.test(origem)) { // confirmação da véspera: marca o item, não cria outro
      var alvoC = itens.filter(function (it) { return it.paciente === r['Paciente'] && it.profissional === r['Profissional']; })[0];
      var quem = String(r['Registrado por (app)'] || '').split(' · ');
      if (alvoC) alvoC.confirmado = { por: quem[0] || '', quando: quem[1] || '' };
      else itens.push({ hora: horaTxt_(r['Hora']), paciente: r['Paciente'], profissional: r['Profissional'], origem: 'Semanal', confirmado: { por: quem[0] || '', quando: quem[1] || '' }, listaId: r['ID'], obs: r['Observação'] || '' });
      return;
    }
    if (/^Não vem/i.test(origem)) { // ausência avisada / remarcação: marca o item fixo, não cria outro
      var alvo = itens.filter(function (it) { return it.paciente === r['Paciente'] && it.profissional === r['Profissional']; })[0];
      if (alvo) { alvo.naoVem = origem; alvo.obs = (alvo.obs ? alvo.obs + ' · ' : '') + (r['Observação'] || ''); }
      else itens.push({ hora: horaTxt_(r['Hora']), paciente: r['Paciente'], profissional: r['Profissional'], origem: 'Semanal', naoVem: origem, listaId: r['ID'], obs: r['Observação'] || '' });
      return;
    }
    itens.push({ hora: horaTxt_(r['Hora']), paciente: r['Paciente'], profissional: r['Profissional'], origem: origem, listaId: r['ID'], obs: r['Observação'] || '' });
  });
  // registros do dia na aba do mês
  var reg = {}, nm = nomeAbaMes_(data);
  if (!cache.mes[nm]) { var sm0 = planilha_().getSheetByName(nm); cache.mes[nm] = { existe: !!sm0, h: sm0 ? cabecalhos_(sm0) : {}, vals: sm0 && sm0.getLastRow() >= 2 ? sm0.getRange(2, 1, sm0.getLastRow() - 1, sm0.getLastColumn()).getValues() : [] }; }
  var cm = cache.mes[nm];
  if (cm.vals.length) {
    var h = cm.h, HM = CONFIG.HM, vals = cm.vals;
    vals.forEach(function (r) {
      var dt = r[h[HM.DATA] - 1]; if (fmtData_(dt) !== chave) return;
      var pac = String(r[h[HM.PACIENTE] - 1] || '').trim(); if (!pac) return;
      var k = pac + '|' + String(r[h[HM.PROFISSIONAL] - 1] || '').trim();
      var g = function (nome) { var c = h[HM[nome]] || h[nome]; return c ? r[c - 1] : ''; };
      // só leitura: a tela Hoje mostra o que já foi gravado na linha (valor, Pago?, NF, guia) pra fechar o dia sem abrir a planilha
      reg[k] = { oque: String(g('OQUE') || ''), id: String(g('ID') || ''), procedimento: String(g('PROCEDIMENTO') || ''), hora: horaTxt_(g('HORA')),
        valor: numBR_(g('VALOR')), recebido: numBR_(g('RECEBIDO')), pago: String(g('PAGO') || '').trim(), forma: String(g('FORMA') || ''), nf: String(g('NF') || '').trim(), guia: String(g('GUIA') || '').trim(), convenio: String(g('Convênio (auto)') || '').trim() };
      if (!reg[pac]) reg[pac] = reg[k];
    });
  }
  itens.forEach(function (it) { it.registro = reg[it.paciente + '|' + it.profissional] || null; });
  // registrados hoje que não estavam na lista (encaixes feitos direto no Atendimento)
  Object.keys(reg).forEach(function (k) {
    if (k.indexOf('|') < 0) return; var pac = k.split('|')[0], prof = k.split('|')[1];
    if (!itens.some(function (it) { return it.paciente === pac && it.profissional === prof; })) itens.push({ hora: reg[k].hora || '', paciente: pac, profissional: prof, origem: 'Registrado', registro: reg[k] });
  });
  itens.sort(function (a, b) { return (a.profissional + a.hora).localeCompare(b.profissional + b.hora); });
  return { data: chave, diaSemana: diaSemana, itens: itens, abaMes: nomeAbaMes_(data), abaMesExiste: cm.existe };
}
API.listaDoDia = function (d) {
  d = d || {};
  var data = parseData_(d.data) || new Date(), r = montarDia_(data);
  r.pendencias = pendenciasDe_(r.itens.map(function (it) { return it.paciente; }), data);
  return r;
};
// Pendências de sessões anteriores (mês do dia e o anterior), pra recepção ver quando o paciente chega (gestão, 07/10):
// particular atendido sem "Pago?" (mesma regra da Gestão: plano, mensalidade e convênio não entram) e convênio sem guia assinada.
// Falta sem aviso não entra (decisão da gestão). Só linhas de antes do dia mostrado; as do próprio dia já aparecem no registro.
function pendenciasDe_(nomes, data) {
  var quer = {}; nomes.forEach(function (n) { quer[n] = 1; });
  var out = {}, hojeChave = Utilities.formatDate(data, CONFIG.TZ, 'yyyyMMdd');
  var ant = new Date(data.getFullYear(), data.getMonth() - 1, 1);
  [nomeAbaMes_(ant), nomeAbaMes_(data)].forEach(function (aba) {
    linhasMes_(aba).linhas.forEach(function (r) {
      if (!quer[r.paciente] || !/^Atendido/.test(r.oque)) return;
      var dt = parseData_(r.data); if (!dt || Utilities.formatDate(dt, CONFIG.TZ, 'yyyyMMdd') >= hojeChave) return;
      var particular = !r.convenio || /^Particular$/i.test(r.convenio), tipo = null;
      if (ehPerdido_(r.pago)) return;
      if (particular && (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial') && (!/^Mensalidade|pacote|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento))) tipo = 'pag';
      else if ((!particular || /^Convênio/i.test(r.pago)) && r.guia !== 'Sim') tipo = 'guia';
      if (!tipo) return;
      (out[r.paciente] = out[r.paciente] || []).push({ tipo: tipo, aba: aba, id: r.id, linha: r.linha, data: r.data, hora: r.hora, profissional: r.profissional, procedimento: r.procedimento, oque: r.oque,
        valor: r.valor, recebido: r.recebido, saldo: saldo_(r), pago: r.pago, forma: r.forma, dataPag: r.dataPag, quem: r.quem, nf: r.nf, nfN: r.nfN, guia: r.guia, convenio: r.convenio });
    });
  });
  return out;
}
// Agenda (visão semana): os 7 dias da semana da data (segunda a domingo), opcionalmente de uma profissional só
API.agendaSemana = function (d) {
  d = d || {};
  var base = parseData_(d.data) || new Date(), seg = dataMais_(base, -((base.getDay() + 6) % 7)), prof = String(d.profissional || '').trim(), cache = {}, dias = [];
  for (var i = 0; i < 7; i++) {
    var r = montarDia_(dataMais_(seg, i), cache);
    dias.push({ data: r.data, diaSemana: r.diaSemana, itens: prof ? r.itens.filter(function (it) { return it.profissional === prof; }) : r.itens });
  }
  return { inicio: fmtData_(seg), profissional: prof, dias: dias };
};
// Remarcar uma sessão: ausência no dia original + acréscimo no novo dia (o horário fixo não muda)
API.remarcar = function (d) {
  d = d || {};
  var de = parseData_(d.de), para = parseData_(d.para);
  if (!de || !para) return { ok: false, erros: ['Datas inválidas.'] };
  var paciente = String(d.paciente || '').trim(), profissional = String(d.profissional || '').trim();
  if (!paciente || !profissional) return { ok: false, erros: ['Paciente e profissional são obrigatórios.'] };
  var r1 = API.acrescentarAoDia({ data: fmtData_(de), hora: d.horaDe || '', paciente: paciente, profissional: profissional, origem: 'Não vem · remarcado para ' + fmtData_(para), observacao: d.observacao || '' });
  if (!r1.ok) return r1;
  var r2 = API.acrescentarAoDia({ data: fmtData_(para), hora: d.horaPara || d.horaDe || '', paciente: paciente, profissional: profissional, origem: 'Remarcação de ' + fmtData_(de), observacao: d.observacao || '' });
  return r2.ok ? { ok: true, ids: [r1.id, r2.id] } : r2;
};
// Remover um agendamento avulso (duplicado, engano): a linha não é apagada, a Origem vira "Removido · motivo"
API.removerDoDia = function (d) {
  d = d || {};
  var id = String(d.id || '').trim(); if (!id) return { ok: false, erros: ['Agendamento sem ID.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = planilha_().getSheetByName(CONFIG.ABA.DIA); if (!s) return { ok: false, erros: ['Aba Lista do dia não existe.'] };
    var h = cabecalhos_(s), ids = s.getRange(2, h['ID'], Math.max(s.getLastRow() - 1, 1), 1).getValues(), linha = 0;
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { linha = i + 2; break; }
    if (!linha) return { ok: false, erros: ['Agendamento não encontrado.'] };
    var origem = String(s.getRange(linha, h['Origem']).getValue() || '');
    if (/^Removido/i.test(origem)) return { ok: true, id: id };
    var u = usuario_(), motivo = String(d.motivo || 'removido').trim();
    s.getRange(linha, h['Origem']).setValue('Removido · ' + motivo);
    if (h['Observação']) { var o = s.getRange(linha, h['Observação']); o.setValue((String(o.getValue() || '') + ' | era "' + origem + '"; removido por ' + (u.email || 'app') + ' · ' + agora_()).replace(/^ \| /, '')); }
    SpreadsheetApp.flush();
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
};
// Confirmação da véspera: uma linha em "Lista do dia" com Origem "Confirmado" (quem confirmou fica em "Registrado por (app)")
API.confirmar = function (d) {
  d = d || {};
  return API.acrescentarAoDia({ data: d.data, hora: d.hora || '', paciente: d.paciente, profissional: d.profissional, origem: 'Confirmado', observacao: d.observacao || '' });
};

/* ---------- Editar cadastro (recepção e gestão; toda alteração vai pro log) ---------- */
var CAMPOS_CADASTRO = { modalidade: 'MODALIDADE', convenio: 'CONVENIO', carteirinha: 'CARTEIRINHA', regra: 'REGRA', valorCombinado: 'VALOR_COMB', valorNum: 'VALOR_NUM', pctN: 'PCT_N', pctV: 'PCT_V', pagamento: 'PAGAMENTO', obsCobranca: 'OBS_COBRANCA', pagador: 'PAGADOR', whats: 'WHATS', telPac: 'TEL_PAC', profRef: 'PROF_REF',
  pagadorCpf: 'PAGADOR_CPF', respNome: 'RESP', respPar: 'RESP_PAR', respTel: 'RESP_TEL', respCpf: 'RESP_CPF' };
function linhaPaciente_(nome) {
  var alvo = Duplicatas.normalizar(String(nome || ''));
  return indicePacientes_().filter(function (p) { return Duplicatas.normalizar(p.nome) === alvo; })[0] || null;
}
API.lerCadastro = function (d) {
  d = d || {};
  var p = linhaPaciente_(d.nome);
  if (!p) return { ok: false, erros: ['Paciente não encontrado em Pacientes.'] };
  var s = aba_(CONFIG.ABA.PACIENTES), h = cabecalhos_(s), H = CONFIG.H;
  var r = s.getRange(p.linha, 1, 1, s.getLastColumn()).getValues()[0];
  var val = function (k) { var c = h[H[k]]; if (!c) return ''; var v = r[c - 1]; return (v instanceof Date) ? fmtData_(v) : String(v == null ? '' : v).trim(); };
  var campos = {}; Object.keys(CAMPOS_CADASTRO).forEach(function (k) { campos[k] = val(CAMPOS_CADASTRO[k]); });
  return { ok: true, linha: p.linha, nome: p.nome, nasc: val('NASC'), cpfFinal: Duplicatas.digitos(val('CPF')).slice(-4), ativo: val('ATIVO'), indicacao: val('INDICACAO'), primeira: val('PRIMEIRA'), campos: campos };
};
API.atualizarCadastro = function (d) {
  d = d || {}; var campos = d.campos || {}, erros = [];
  var quem = String(d.quemInformou || '').replace(/\s+/g, ' ').trim();
  if (!quem) erros.push('Informe quem passou a informação (ex.: Juliana no grupo Tratamentos, a própria mãe).');
  var lista = function (cab) { try { return colunaLista_(cab); } catch (e) { return []; } };
  var mods = lista(CONFIG.LISTAS.MODALIDADE), convs = lista(CONFIG.LISTAS.CONVENIO), regras = lista(CONFIG.LISTAS.REGRA);
  if (campos.modalidade != null && campos.modalidade !== '' && mods.length && mods.indexOf(campos.modalidade) < 0) erros.push('Modalidade fora da lista.');
  if (campos.convenio != null && campos.convenio !== '' && convs.length && convs.indexOf(campos.convenio) < 0) erros.push('Convênio fora da lista.');
  if (campos.regra != null && campos.regra !== '' && regras.length && regras.indexOf(campos.regra) < 0) erros.push('Regra de cobrança fora da lista.');
  if (campos.modalidade === 'Convênio' && (!campos.convenio || campos.convenio === 'Particular')) erros.push('Cobrança "Convênio" exige escolher o convênio.');
  if (campos.modalidade != null) { var cb = camposCobranca_(campos, erros); ['valorNum', 'pctN', 'pctV', 'pagamento'].forEach(function (k) { if (cb[k] !== undefined) campos[k] = cb[k]; }); }
  else if (campos.pagamento != null && campos.pagamento !== '' && PAGAMENTOS.indexOf(String(campos.pagamento)) < 0) erros.push('Pagamento fora da lista.');
  erros = erros.concat(errosCpfsExtras_(campos));
  if (campos.pagadorCpf != null) campos.pagadorCpf = cpfFmt_(campos.pagadorCpf);
  if (campos.respCpf != null) campos.respCpf = cpfFmt_(campos.respCpf);
  // completar CPF e nascimento que faltavam (recepção); trocar um valor já preenchido só a gestão
  var cpfNovo = campos.cpf != null ? Duplicatas.digitos(campos.cpf) : '', nascNovo = campos.nasc != null && String(campos.nasc).trim() ? parseData_(campos.nasc) : '';
  if (cpfNovo && !Duplicatas.cpfValido(cpfNovo)) erros.push('CPF inválido. Confira os 11 dígitos.');
  if (nascNovo === null) erros.push('Data de nascimento inválida (use dd/mm/aaaa).'); else if (nascNovo && nascNovo > new Date()) erros.push('Data de nascimento no futuro.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var p = linhaPaciente_(d.nome);
    if (!p) return { ok: false, erros: ['Paciente não encontrado em Pacientes.'] };
    var g = garantirColunasPacientes_(), s = aba_(CONFIG.ABA.PACIENTES), h = g.h, H = CONFIG.H, u = usuario_();
    var atual = s.getRange(p.linha, 1, 1, s.getLastColumn()).getValues()[0];
    var mudancas = [];
    if (cpfNovo && h[H.CPF]) {
      var cpfAtual = Duplicatas.digitos(atual[h[H.CPF] - 1]);
      if (cpfAtual !== cpfNovo) {
        if (cpfAtual && u.perfil !== 'gestao') return { ok: false, erros: ['O CPF já está preenchido: só a gestão corrige.'] };
        var outro = indicePacientes_().filter(function (x) { return x.linha !== p.linha && Duplicatas.digitos(x.cpf) === cpfNovo; })[0];
        if (outro) return { ok: false, erros: ['CPF já cadastrado: ' + outro.nome + '.'] };
        s.getRange(p.linha, h[H.CPF]).setValue(cpfFmt_(cpfNovo));
        mudancas.push({ campo: H.CPF, de: cpfAtual ? '···' + cpfAtual.slice(-4) : '', para: '···' + cpfNovo.slice(-4) });
      }
    }
    if (nascNovo && h[H.NASC]) {
      var nascAtual = fmtData_(atual[h[H.NASC] - 1]);
      if (nascAtual !== fmtData_(nascNovo)) {
        if (nascAtual && u.perfil !== 'gestao') return { ok: false, erros: ['A data de nascimento já está preenchida: só a gestão corrige.'] };
        s.getRange(p.linha, h[H.NASC]).setValue(nascNovo).setNumberFormat('dd/MM/yyyy');
        mudancas.push({ campo: H.NASC, de: nascAtual, para: fmtData_(nascNovo) });
      }
    }
    Object.keys(CAMPOS_CADASTRO).forEach(function (k) {
      if (!(k in campos) || campos[k] == null) return; // só grava o que a tela mandou
      var c = h[H[CAMPOS_CADASTRO[k]]]; if (!c) return;
      var de = atual[c - 1], deTxt = (de instanceof Date) ? fmtData_(de) : String(de == null ? '' : de).trim();
      var para = String(campos[k]).replace(/\s+/g, ' ').trim();
      if (para === deTxt) return;
      s.getRange(p.linha, c).setValue(typeof campos[k] === 'number' ? campos[k] : para);
      if (k === 'pagador' && h[H.PAGADOR_EXTRATO]) s.getRange(p.linha, h[H.PAGADOR_EXTRATO]).setValue(para);
      mudancas.push({ campo: H[CAMPOS_CADASTRO[k]], de: deTxt, para: para });
    });
    if (!mudancas.length) return { ok: true, alterados: [], aviso: 'Nada mudou.' };
    var carimbo = (u.email || 'app') + ' · ' + agora_();
    if (h[H.LOG]) { var cl = s.getRange(p.linha, h[H.LOG]); cl.setValue((String(cl.getValue() || '') + ' | cadastro alterado por ' + carimbo + ' (' + mudancas.map(function (m) { return m.campo.split(' (')[0]; }).join(', ') + '; informou: ' + quem + ')').replace(/^ \| /, '')); }
    var sl = abaComCabecalho_(CONFIG.ABA.ALTERACOES, CONFIG.HC), hl = cabecalhos_(sl);
    mudancas.forEach(function (m) {
      var linha = proximaLinha_(sl, hl['Paciente']);
      gravarCelulas_(sl, linha, hl, { 'Data/hora': agora_(), 'Paciente': p.nome, 'Campo': m.campo, 'De': m.de, 'Para': m.para, 'Quem informou': quem, 'Registrado por (app)': carimbo });
    });
    SpreadsheetApp.flush();
    return { ok: true, alterados: mudancas.map(function (m) { return m.campo; }), colunasCriadas: g.criadas };
  } finally { lock.releaseLock(); }
};
/* ---------- Mensalistas ---------- */
// Colunas "<MÊS> … — pago?" da aba Mensalistas, na ordem da planilha
function colunasMensalistas_(hdr) {
  var out = [];
  hdr.forEach(function (x, i) { if (/pago\?/i.test(x)) out.push({ nome: x, idx: i, mes: (x.toUpperCase().match(/^[A-ZÇ]+/) || [''])[0] }); });
  return out;
}
function sessoesNoMes_(data) {
  var sm = planilha_().getSheetByName(nomeAbaMes_(data)), out = {};
  if (!sm || sm.getLastRow() < 2) return out;
  var h = cabecalhos_(sm), HM = CONFIG.HM, vals = sm.getRange(2, 1, sm.getLastRow() - 1, sm.getLastColumn()).getValues();
  vals.forEach(function (r) {
    var pac = String(r[h[HM.PACIENTE] - 1] || '').trim(); if (!pac) return;
    if (!/^Atendido/.test(String(r[h[HM.OQUE] - 1] || ''))) return;
    if (/^(Mensalidade|Renovação)|\(compra\)/.test(String(r[h[HM.PROCEDIMENTO] - 1] || ''))) return; // recebimentos não contam como sessão
    out[pac] = (out[pac] || 0) + 1;
  });
  return out;
}
API.mensalistasPainel = function (d) {
  d = d || {};
  var s = planilha_().getSheetByName(CONFIG.ABA.MENSALISTAS);
  if (!s || s.getLastRow() < 2) return { itens: [], colunas: [], coluna: '', modeloNovo: false };
  var hdr = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(function (x) { return String(x || '').trim(); });
  var cols = colunasMensalistas_(hdr), ref = mensalistas_();
  // abre no mês atual (Roberta, 06/10); a faixa avisa se o mês anterior ainda tem pendência
  var hj = new Date(), mesAtual = CONFIG.MESES[hj.getMonth()].toUpperCase(), mesAnt = CONFIG.MESES[(hj.getMonth() + 11) % 12].toUpperCase();
  var colAtual = cols.filter(function (x) { return x.mes === mesAtual; })[0], colAnt = cols.filter(function (x) { return x.mes === mesAnt; })[0];
  var coluna = String(d.coluna || (colAtual ? colAtual.nome : '') || ref.coluna || (cols.length ? cols[cols.length - 1].nome : '')).trim();
  var c = cols.filter(function (x) { return x.nome === coluna; })[0];
  var cObs = -1; hdr.forEach(function (x, i) { if (cObs < 0 && /^Observa/i.test(x)) cObs = i; });
  var sess = sessoesNoMes_(new Date());
  var vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues(), itens = [];
  vals.forEach(function (r, i) {
    var pac = String(r[0] || '').trim(); if (!pac) return;
    var pagoV = c ? r[c.idx] : '', dataV = c ? r[c.idx + 1] : '';
    itens.push({ linha: i + 2, paciente: pac, modalidade: String(r[1] || ''), valor: Number(String(r[2] || '').replace(',', '.')) || 0, pagador: String(r[3] || ''),
      pago: String(pagoV == null ? '' : pagoV).trim(), dataPago: (dataV instanceof Date) ? fmtData_(dataV) : String(dataV == null ? '' : dataV).trim(),
      obs: cObs >= 0 ? String(r[cObs] || '') : '', sessoes: sess[pac] || 0 });
  });
  var anterior = null;
  if (colAnt) anterior = { coluna: colAnt.nome, mes: colAnt.mes, pendentes: vals.filter(function (r) { return String(r[0] || '').trim() && !/^sim/i.test(String(r[colAnt.idx] == null ? '' : r[colAnt.idx]).trim()); }).length };
  return { itens: itens, colunas: cols.map(function (x) { return x.nome; }), coluna: coluna, mes: c ? c.mes : '', anterior: anterior, modeloNovo: ref.modeloNovo, abaMes: nomeAbaMes_(new Date()), hoje: hoje_() };
};
API.registrarMensalidade = function (d) {
  d = d || {};
  var erros = [];
  var paciente = String(d.paciente || '').trim(); if (!paciente) erros.push('Escolha o paciente.');
  var coluna = String(d.coluna || '').trim(); if (!coluna) erros.push('Escolha o mês da mensalidade.');
  var data = parseData_(d.data); if (!data) erros.push('Data do pagamento inválida.');
  var valor = Number(String(d.valor || '').replace(/\./g, '').replace(',', '.')); if (isNaN(valor) || valor <= 0) erros.push('Valor inválido.');
  var forma = String(d.forma || '').trim(); if (!forma) erros.push('Informe a forma de pagamento.');
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = aba_(CONFIG.ABA.MENSALISTAS), hdr = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(function (x) { return String(x || '').trim(); });
    var col = colunasMensalistas_(hdr).filter(function (x) { return x.nome === coluna; })[0];
    if (!col) return { ok: false, erros: ['Coluna "' + coluna + '" não existe em Mensalistas.'] };
    var nomes = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues(), linha = 0;
    for (var i = 0; i < nomes.length; i++) if (String(nomes[i][0] || '').trim() === paciente) { linha = i + 2; break; }
    if (!linha) return { ok: false, erros: ['Paciente não está na aba Mensalistas.'] };
    var u = usuario_(), carimbo = (u.email || 'app') + ' · ' + agora_();
    var anterior = String(s.getRange(linha, col.idx + 2).getValue() || '').trim();
    var nota = fmtData_(data) + ' — R$ ' + valor.toFixed(2).replace('.', ',') + ' ' + forma + (d.quemPagou ? ' (' + String(d.quemPagou).trim() + ')' : '') + (d.nfNumero ? ' · NF ' + String(d.nfNumero).trim() : (String(d.nf || '') === 'Sim' ? ' · NF emitida' : '')) + (d.sessaoExtra ? ' · com 5ª sessão' : '') + ' · ' + carimbo;
    if (anterior && !/^\d{2}\/\d{2}/.test(anterior)) nota = nota + ' | antes: ' + anterior; // não perde a anotação da gestão
    s.getRange(linha, col.idx + 1).setValue('Sim');
    s.getRange(linha, col.idx + 2).setValue(nota);
    // linha de recebimento na aba do mês do pagamento
    var pac = indicePacientes_().filter(function (p) { return p.nome === paciente; })[0] || {};
    var sm = abaMes_(data), gm = garantirColunas_(sm, [CONFIG.HM.LOG, CONFIG.HM.PACOTE]), hm = gm.h, HM = CONFIG.HM;
    var lm = proximaLinha_(sm, hm[HM.PACIENTE] || 3), id = novoId_('A');
    var proc = procedimentos_().filter(function (p) { return /^Mensalidade/i.test(p.nome); })[0];
    var pm = {};
    pm[HM.DATA] = data; pm[HM.HORA] = String(d.hora || ''); pm[HM.PACIENTE] = paciente; pm[HM.PROFISSIONAL] = String(d.profissional || '');
    pm[HM.PROCEDIMENTO] = proc ? proc.nome : 'Mensalidade – psicologia'; pm[HM.OQUE] = 'Atendido'; pm[HM.VALOR] = valor; pm[HM.PAGO] = 'Sim';
    pm[HM.DATA_PAG] = data; pm[HM.FORMA] = forma; pm[HM.QUEM] = (d.quemPagou && d.quemPagou !== (pac.pagador || '') && d.quemPagou !== paciente) ? String(d.quemPagou) : '';
    pm[HM.NF] = String(d.nf || ''); pm[HM.NF_N] = String(d.nfNumero || '');
    pm[HM.OBS] = ('Mensalidade ' + (col.mes ? col.mes.toLowerCase() : coluna) + (d.sessaoExtra ? ' (com 5ª sessão)' : '') + '. ' + String(d.observacao || '')).trim();
    pm[HM.ID] = id; pm[HM.LOG] = carimbo;
    gravarCelulas_(sm, lm, hm, pm);
    [HM.DATA, HM.DATA_PAG].forEach(function (k) { if (hm[k]) sm.getRange(lm, hm[k]).setNumberFormat('dd/MM/yyyy'); });
    if (hm[HM.VALOR]) sm.getRange(lm, hm[HM.VALOR]).setNumberFormat('#,##0.00');
    SpreadsheetApp.flush();
    return { ok: true, id: id, linha: lm, aba: sm.getName(), nota: nota };
  } finally { lock.releaseLock(); }
};
// Gestão: cria o par de colunas "<MÊS> — pago?" / "Data" no fim da aba Mensalistas
API.criarColunasMes = function (d) {
  d = d || {};
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão cria colunas de mês.'] };
  var mes = String(d.mes || '').trim(); if (CONFIG.MESES.indexOf(mes) < 0) return { ok: false, erros: ['Mês inválido.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = aba_(CONFIG.ABA.MENSALISTAS), hdr = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(function (x) { return String(x || '').trim(); });
    var nome = mes.toUpperCase() + ' — pago?';
    if (colunasMensalistas_(hdr).some(function (c) { return c.mes === mes.toUpperCase(); })) return { ok: false, erros: ['Já existe coluna de ' + mes + ' em Mensalistas.'] };
    var prox = s.getLastColumn() + 1;
    if (prox + 1 > s.getMaxColumns()) s.insertColumnsAfter(s.getMaxColumns(), 2);
    s.getRange(1, prox, 1, 2).setValues([[nome, 'Data']]).setFontWeight('bold');
    SpreadsheetApp.flush();
    return { ok: true, coluna: nome };
  } finally { lock.releaseLock(); }
};

/* ---------- Gestão ---------- */
function linhasMes_(nome) {
  var sm = planilha_().getSheetByName(nome);
  if (!sm || sm.getLastRow() < 2) return { existe: !!sm, linhas: [] };
  var h = cabecalhos_(sm), HM = CONFIG.HM, vals = sm.getRange(2, 1, sm.getLastRow() - 1, sm.getLastColumn()).getValues(), out = [];
  var g = function (r, k) { var c = h[HM[k]] || h[k]; return c ? r[c - 1] : ''; };
  vals.forEach(function (r, i) {
    var pac = String(g(r, 'PACIENTE') || '').trim(); if (!pac) return;
    out.push({ linha: i + 2, data: fmtData_(g(r, 'DATA')), hora: horaTxt_(g(r, 'HORA')), paciente: pac, profissional: String(g(r, 'PROFISSIONAL') || ''), procedimento: String(g(r, 'PROCEDIMENTO') || ''),
      convenio: String(g(r, 'Convênio (auto)') || ''), oque: String(g(r, 'OQUE') || ''), valor: numBR_(g(r, 'VALOR')), recebido: numBR_(g(r, 'RECEBIDO')), pago: String(g(r, 'PAGO') || '').trim(), dataPag: fmtData_(g(r, 'DATA_PAG')),
      forma: String(g(r, 'FORMA') || ''), quem: String(g(r, 'QUEM') || ''), nf: String(g(r, 'NF') || '').trim(), nfN: String(g(r, 'NF_N') || ''), guia: String(g(r, 'GUIA') || '').trim(), obs: String(g(r, 'OBS') || ''), id: String(g(r, 'ID') || ''), log: String(g(r, 'LOG') || '') });
  });
  return { existe: true, linhas: out };
}
// Lançamentos (tela Pendências): linhas de um mês, ou de todos os meses existentes quando busca um paciente
API.lancamentos = function (d) {
  d = d || {};
  var q = Duplicatas.normalizar(String(d.paciente || '')), mes = String(d.mes || '').trim(), abas = [];
  if (mes && mes !== 'todos') { if (CONFIG.MESES.indexOf(mes) < 0) return { ok: false, erros: ['Mês inválido.'] }; abas = [mes]; }
  else { if (!q) return { ok: false, erros: ['Escolha o mês ou digite o paciente.'] }; abas = CONFIG.MESES.filter(function (x) { return !!planilha_().getSheetByName(x); }); }
  var out = [];
  abas.forEach(function (aba) { linhasMes_(aba).linhas.forEach(function (r) { if (q && Duplicatas.normalizar(r.paciente).indexOf(q) < 0) return; r.aba = aba; r.saldo = saldo_(r); out.push(r); }); });
  return { ok: true, linhas: out.slice(-400), total: out.length };
};
API.gestaoResumo = function (d) {
  d = d || {};
  // recepção também vê (gestão, 07/10: a tela virou "Pendências"); exportar e virada do mês continuam só da gestão
  var mes = String(d.mes || nomeAbaMes_(new Date())).trim();
  var m = linhasMes_(mes), L = m.linhas;
  L.forEach(function (r) { r.saldo = saldo_(r); });
  var particular = function (r) { return !r.convenio || /^Particular$/i.test(r.convenio); };
  var atend = L.filter(function (r) { return /^Atendido/.test(r.oque); });
  var out = {
    ok: true, mes: mes, abaExiste: m.existe, total: L.length, atendidos: atend.length,
    recebido: atend.reduce(function (a, r) { return a + (r.pago === 'Sim' ? r.valor : r.pago === 'Parcial' ? r.recebido : 0); }, 0),
    // compra de plano "a receber" (lançada com Pago? = Não) entra aqui; sessões de plano/mensalidade/convênio não (aprovado pela Roberta em 06/10)
    pagamentoPendente: atend.filter(function (r) { return particular(r) && (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial') && (!/^Mensalidade|pacote|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento)); }),
    nfPendente: atend.filter(function (r) { return (r.pago === 'Sim' || r.pago === 'Parcial') && r.nf !== 'Sim' && r.nf !== 'Não se aplica'; }),
    semGuia: L.filter(function (r) { return (!particular(r) || /^Convênio/i.test(r.pago)) && r.guia !== 'Sim' && /^Atendido/.test(r.oque) && !ehPerdido_(r.pago); }),
    faltas: L.filter(function (r) { return /sem aviso|em cima da hora/i.test(r.oque) && particular(r) && !/Pacote|Plano/i.test(r.pago) && !ehPerdido_(r.pago); }),
    // relatório "Perdidos e glosas" (só gestão): o Valor é a referência do que se perdeu
    perdidos: usuario_().perfil === 'gestao' ? L.filter(function (r) { return ehPerdido_(r.pago); }) : [],
    descontos: L.filter(function (r) { return /^Desconto:/i.test(r.obs); }),
    extras: L.filter(function (r) { return /^Sessão extra liberada/i.test(r.obs); }),
    pagadorDiferente: atend.filter(function (r) { return r.quem; }),
    alteracoes: []
  };
  var sl = planilha_().getSheetByName(CONFIG.ABA.ALTERACOES);
  if (sl && sl.getLastRow() >= 2) {
    var idx = CONFIG.MESES.indexOf(mes), mm = ('0' + (idx + 1)).slice(-2);
    linhasComo_(sl).forEach(function (r) { var dt = String(r['Data/hora'] || ''); if (dt.slice(3, 5) === mm) out.alteracoes.push({ quando: dt, paciente: r['Paciente'], campo: r['Campo'], de: r['De'], para: r['Para'], quem: r['Quem informou'], por: r['Registrado por (app)'] }); });
  }
  out.mesesExistentes = CONFIG.MESES.filter(function (x) { return !!planilha_().getSheetByName(x); });
  var sM = planilha_().getSheetByName(CONFIG.ABA.MENSALISTAS);
  out.colunasMensalistas = sM ? colunasMensalistas_(sM.getRange(1, 1, 1, sM.getLastColumn()).getValues()[0].map(function (x) { return String(x || '').trim(); })).map(function (c) { return c.mes; }) : [];
  return out;
};
/* ---------- Repasse (só gestão, 10/10) ----------
   As regras ficam na aba "Regras de repasse" e a gestão muda na tela Repasse (ou direto na aba). Nada é fixo no código.
   Uma regra = profissional (ou "Todos") + convênio ("Particular", o nome do convênio ou "Qualquer") + procedimento (trecho, opcional) → %.
   Vale a regra mais específica: procedimento (exceção) > profissional > convênio; empate fica com a de baixo. "Ativa = Não" desliga sem apagar.
   "Valor da sessão (convênio)" é a base quando a linha do convênio está sem valor (R$ 0 na aba do mês). */
var HR_REPASSE = ['Ativa', 'Profissional', 'Convênio', 'Procedimento (contém)', '% repasse', 'Valor da sessão (convênio) (R$)', 'Observação', 'Alterado por (app)'];
var ABA_REPASSE = 'Regras de repasse';
function semAcento_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function regrasRepasse_() {
  var s = planilha_().getSheetByName(ABA_REPASSE);
  return linhasComo_(s).map(function (r) {
    var bruto = String(r['% repasse'] == null ? '' : r['% repasse']).trim(), pct = bruto === '' ? null : numBR_(bruto.replace('%', ''));
    if (typeof r['% repasse'] === 'number' && r['% repasse'] > 0 && r['% repasse'] <= 1) pct = r['% repasse'] * 100; // célula em formato %
    return { linha: r._linha, ativa: !/^n/i.test(String(r['Ativa'] || 'Sim')), profissional: String(r['Profissional'] || '').trim(), convenio: String(r['Convênio'] || '').trim(),
      procedimento: String(r['Procedimento (contém)'] || '').trim(), pct: pct, valorRef: numBR_(r['Valor da sessão (convênio) (R$)']), obs: String(r['Observação'] || '').trim() };
  }).filter(function (g) { return g.profissional || g.convenio; });
}
function convenioDaLinha_(l) { var c = String(l.convenio || '').trim(); if (c && !/^Particular$/i.test(c)) return c; return /^Convênio/i.test(l.pago) ? (c || 'Convênio (sem nome)') : 'Particular'; }
// soValor: procura só o "valor da sessão (convênio)" (regra pode não ter %)
function regraPara_(regras, prof, conv, proc, soValor) {
  var melhor = null, nota = -1, P = semAcento_(prof), C = semAcento_(conv), PR = semAcento_(proc);
  regras.forEach(function (g) {
    if (!g.ativa || (soValor ? !(g.valorRef > 0) : g.pct == null)) return;
    var gp = semAcento_(g.profissional), gc = semAcento_(g.convenio), gpr = semAcento_(g.procedimento), n = 0;
    if (gp && gp !== 'todos') { if (gp !== P) return; n += 4; }
    if (gc && gc !== 'qualquer') { if (gc !== C) return; n += 2; }
    if (gpr) { if (PR.indexOf(gpr) < 0) return; n += 8; } // exceção por procedimento (ex.: avaliação neuro 0%) ganha de tudo
    if (n >= nota) { nota = n; melhor = g; }
  });
  return melhor;
}
// uma linha da aba do mês → base e repasse. "pago" = o que já entrou (ou o convênio já faturado); "previsto" = inclui o que está em aberto
function repasseLinha_(l, regras) {
  var conv = convenioDaLinha_(l), g = regraPara_(regras, l.profissional, conv, l.procedimento), pct = g ? g.pct : null, gv = regraPara_(regras, l.profissional, conv, l.procedimento, true);
  var sit, basePago = 0, basePrev = 0, v = Number(l.valor) || 0;
  if (ehPerdido_(l.pago)) sit = 'perdido';
  else if (/^Não se aplica/i.test(l.pago)) sit = 'sem cobrança';
  else if (/^(Pacote|Plano|Incluída|Mensalista)/i.test(l.pago) && !v) sit = 'incluída no pacote/mensalidade';
  else if (/^Convênio/i.test(l.pago) || (conv !== 'Particular' && !l.pago)) { basePrev = v || (gv ? gv.valorRef : 0); sit = 'convênio a receber'; }
  else if (l.pago === 'Sim') { basePago = basePrev = v; sit = 'pago'; }
  else if (l.pago === 'Parcial') { basePago = Number(l.recebido) || 0; basePrev = v; sit = 'pago em parte'; }
  else if (v) { basePrev = v; sit = 'em aberto'; }
  else sit = 'sem valor';
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  return { id: l.id, linha: l.linha, data: l.data, paciente: l.paciente, profissional: l.profissional || '(sem profissional)', procedimento: l.procedimento, oque: l.oque, convenio: conv,
    valor: v, pago: l.pago, situacao: sit, pct: pct, regra: g ? g.linha : null, basePago: r2(basePago), basePrev: r2(basePrev),
    repassePago: pct == null ? 0 : r2(basePago * pct / 100), repassePrev: pct == null ? 0 : r2(basePrev * pct / 100), semRegra: pct == null && (basePago > 0 || basePrev > 0) };
}
API.repasseMes = function (d) {
  d = d || {};
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão vê o repasse.'] };
  var mes = String(d.mes || nomeAbaMes_(new Date())).trim(), m = linhasMes_(mes), regras = regrasRepasse_();
  var linhas = m.linhas.filter(function (l) { return /^Atendido/.test(l.oque) || (Number(l.valor) > 0 && !/^Cancelado/i.test(l.oque)); }).map(function (l) { return repasseLinha_(l, regras); });
  var por = {};
  linhas.forEach(function (x) {
    var p = por[x.profissional] = por[x.profissional] || { profissional: x.profissional, sessoes: 0, basePago: 0, repassePago: 0, basePrev: 0, repassePrev: 0, semRegra: 0, perdido: 0, porConvenio: {} };
    if (/^Atendido/.test(x.oque)) p.sessoes++;
    p.basePago += x.basePago; p.repassePago += x.repassePago; p.basePrev += x.basePrev; p.repassePrev += x.repassePrev;
    if (x.semRegra) p.semRegra++; if (x.situacao === 'perdido') p.perdido += x.valor;
    var c = p.porConvenio[x.convenio] = p.porConvenio[x.convenio] || { convenio: x.convenio, pct: x.pct, sessoes: 0, basePrev: 0, repassePrev: 0, repassePago: 0 };
    if (/^Atendido/.test(x.oque)) c.sessoes++; c.basePrev += x.basePrev; c.repassePrev += x.repassePrev; c.repassePago += x.repassePago; if (c.pct !== x.pct) c.pct = c.pct == null ? x.pct : 'vários';
  });
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var lista = Object.keys(por).sort().map(function (k) { var p = por[k]; ['basePago', 'repassePago', 'basePrev', 'repassePrev', 'perdido'].forEach(function (f) { p[f] = r2(p[f]); });
    p.porConvenio = Object.keys(p.porConvenio).sort().map(function (c) { var o = p.porConvenio[c]; o.basePrev = r2(o.basePrev); o.repassePrev = r2(o.repassePrev); o.repassePago = r2(o.repassePago); return o; }); return p; });
  return { ok: true, mes: mes, abaExiste: m.existe, regras: regras, linhas: linhas, porProfissional: lista, semRegra: linhas.filter(function (x) { return x.semRegra; }).length,
    atualizado: agora_() };
};
// grava as regras: só as linhas que mudaram (célula a célula) e as novas no fim; nunca apaga (desligar = Ativa "Não")
API.salvarRegrasRepasse = function (d) {
  d = d || {};
  var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão muda as regras de repasse.'] };
  var regras = d.regras || [], erros = [];
  regras.forEach(function (g, i) {
    var pct = numBR_(String(g.pct == null ? '' : g.pct).replace('%', ''));
    if (!String(g.profissional || '').trim()) erros.push('Regra ' + (i + 1) + ': escolha o profissional (ou "Todos").');
    var semPct = String(g.pct == null ? '' : g.pct).trim() === '';
    if (semPct && !(numBR_(g.valorRef) > 0)) erros.push('Regra ' + (i + 1) + ': informe o % de repasse (ou só o valor da sessão do convênio).');
    else if (!semPct && !(pct >= 0 && pct <= 100)) erros.push('Regra ' + (i + 1) + ': % de repasse entre 0 e 100.');
  });
  if (erros.length) return { ok: false, erros: erros };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = abaComCabecalho_(ABA_REPASSE, HR_REPASSE), h = cabecalhos_(s), atuais = {}, carimbo = (u.email || 'app') + ' · ' + agora_(), mud = 0;
    regrasRepasse_().forEach(function (g) { atuais[g.linha] = g; });
    regras.forEach(function (g) {
      var novo = { 'Ativa': g.ativa === false ? 'Não' : 'Sim', 'Profissional': String(g.profissional || '').trim(), 'Convênio': String(g.convenio || '').trim() || 'Qualquer',
        'Procedimento (contém)': String(g.procedimento || '').trim(), '% repasse': String(g.pct == null ? '' : g.pct).trim() === '' ? '' : numBR_(String(g.pct).replace('%', '')), 'Valor da sessão (convênio) (R$)': numBR_(g.valorRef) > 0 ? numBR_(g.valorRef) : '', 'Observação': String(g.obs || '').trim() };
      var a = g.linha ? atuais[g.linha] : null, pares = {};
      if (a) {
        var antes = { 'Ativa': a.ativa ? 'Sim' : 'Não', 'Profissional': a.profissional, 'Convênio': a.convenio || 'Qualquer', 'Procedimento (contém)': a.procedimento, '% repasse': a.pct == null ? '' : a.pct, 'Valor da sessão (convênio) (R$)': a.valorRef || '', 'Observação': a.obs };
        Object.keys(novo).forEach(function (k) { if (String(novo[k]) !== String(antes[k])) pares[k] = novo[k]; });
        if (!Object.keys(pares).length) return;
        pares['Alterado por (app)'] = carimbo; gravarCelulas_(s, a.linha, h, pares); mud++;
      } else { novo['Alterado por (app)'] = carimbo; gravarCelulas_(s, proximaLinha_(s, h['Profissional']), h, novo); mud++; }
    });
    SpreadsheetApp.flush();
    return { ok: true, alteradas: mud, regras: regrasRepasse_() };
  } finally { lock.releaseLock(); }
};
// Pasta "Controle Financeiro/<ano>/<MM Mês_AA>/2_Atendimentos" no Drive (decisão Roberta 05/10). Cria o mês no padrão "10 Out_26" só se não existir.
function pastaAtendimentos_(mesIdx, ano) {
  var raiz = DriveApp.getFolderById(CONFIG.PASTA_FINANCEIRO), criadas = [];
  var pAno = subpasta_(raiz, String(ano), criadas);
  var pref = ('0' + (mesIdx + 1)).slice(-2) + ' ', it = pAno.getFolders(), pMes = null;
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf(pref) === 0) { pMes = f; break; } }
  if (!pMes) { pMes = pAno.createFolder(pref + CONFIG.MESES[mesIdx].slice(0, 3) + '_' + String(ano).slice(-2)); criadas.push(pMes.getName()); }
  var pAt = subpasta_(pMes, '2_Atendimentos', criadas);
  return { pasta: pAt, caminho: 'Controle Financeiro/' + ano + '/' + pMes.getName() + '/2_Atendimentos', criadas: criadas };
}
function subpasta_(pai, nome, criadas) { var it = pai.getFoldersByName(nome); if (it.hasNext()) return it.next(); var f = pai.createFolder(nome); criadas.push(nome); return f; }
// Exporta a aba do mês (só valores) para a planilha "MMM AA - Recepção atendimentos (app)" na pasta de atendimentos do mês;
// se já existir, sobrescreve (é uma cópia, a fonte continua sendo a aba). Devolve o link direto pro .xlsx.
API.exportarMes = function (d) {
  d = d || {};
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão exporta.'] };
  var mes = String(d.mes || nomeAbaMes_(new Date())).trim(), sm = planilha_().getSheetByName(mes), mesIdx = CONFIG.MESES.indexOf(mes);
  if (!sm || mesIdx < 0) return { ok: false, erros: ['A aba "' + mes + '" não existe.'] };
  var hoje = new Date(), ano = hoje.getFullYear() - (mesIdx > hoje.getMonth() ? 1 : 0);
  var n = Math.max(sm.getLastRow(), 1), c = Math.max(sm.getLastColumn(), 1);
  var vals = sm.getRange(1, 1, n, c).getValues(), fmts = sm.getRange(1, 1, n, c).getNumberFormats();
  var nome = mes.slice(0, 3).toUpperCase() + ' ' + String(ano).slice(-2) + ' - Recepção atendimentos (app)';
  var destino = null, aviso = '', ss = null;
  try {
    destino = pastaAtendimentos_(mesIdx, ano);
    var ex = destino.pasta.getFilesByName(nome);
    while (ex.hasNext()) { var f = ex.next(); if (f.getMimeType() === MimeType.GOOGLE_SHEETS) { ss = SpreadsheetApp.openById(f.getId()); break; } }
  } catch (e) { destino = null; aviso = 'Não consegui usar a pasta do Drive (' + (e && e.message || e) + '). O arquivo ficou na raiz do Meu Drive.'; }
  if (!ss) {
    ss = SpreadsheetApp.create(nome);
    if (destino) { try { DriveApp.getFileById(ss.getId()).moveTo(destino.pasta); } catch (e2) { destino = null; aviso = 'Criei o arquivo, mas não consegui movê-lo pra pasta (' + (e2 && e2.message || e2) + '). Ficou na raiz do Meu Drive.'; } }
  }
  var aba = ss.getSheets()[0];
  aba.clear();
  if (aba.getName() !== mes) aba.setName(mes);
  aba.getRange(1, 1, n, c).setValues(vals).setNumberFormats(fmts);
  aba.getRange(1, 1, 1, c).setFontWeight('bold'); aba.setFrozenRows(1);
  SpreadsheetApp.flush();
  return { ok: true, nome: nome, url: ss.getUrl(), xlsx: 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', linhas: n - 1, pasta: destino ? destino.caminho : '', criadas: destino ? destino.criadas : [], aviso: aviso, atualizado: agora_() };
};
// Gestão: cria a aba de um mês copiando a estrutura (cabeçalho, fórmulas automáticas, validações) da aba-modelo
API.criarAbaMes = function (d) {
  d = d || {};
  if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão cria a aba do mês.'] };
  var nome = String(d.nome || '').trim(); if (CONFIG.MESES.indexOf(nome) < 0) return { ok: false, erros: ['Nome do mês inválido.'] };
  var ss = planilha_(); if (ss.getSheetByName(nome)) return { ok: false, erros: ['A aba "' + nome + '" já existe.'] };
  var modelo = null; CONFIG.MESES.slice().reverse().forEach(function (m) { if (!modelo && ss.getSheetByName(m)) modelo = ss.getSheetByName(m); });
  if (!modelo) return { ok: false, erros: ['Não achei nenhuma aba de mês pra servir de modelo.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var nova = modelo.copyTo(ss).setName(nome);
    var h = cabecalhos_(nova), max = nova.getMaxRows();
    // limpa os dados, preservando as colunas automáticas (fórmulas em F:H e N)
    var auto = {}; ['Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'Pagador habitual (auto)'].forEach(function (k) { if (h[k]) auto[h[k]] = true; });
    var ini = 0; for (var c = 1; c <= nova.getLastColumn() + 1; c++) {
      var ehAuto = auto[c] || c > nova.getLastColumn();
      if (!ehAuto && !ini) ini = c;
      if (ehAuto && ini) { nova.getRange(2, ini, max - 1, c - ini).clearContent(); ini = 0; }
    }
    ss.setActiveSheet(nova); ss.moveActiveSheet(CONFIG.MESES.indexOf(nome) < CONFIG.MESES.indexOf(modelo.getName()) ? modelo.getIndex() : modelo.getIndex() + 1);
    SpreadsheetApp.flush();
    return { ok: true, aba: nome, modelo: modelo.getName() };
  } finally { lock.releaseLock(); }
};

API;
