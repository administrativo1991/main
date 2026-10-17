/* ================= EVOLUÇÃO / SAÚDE FINANCEIRA (Fase 2, 17/10; só gestão) =================
   Duas abas que a gestão alimenta e o app só lê:
   - "Evolução mensal": uma linha por mês fechado (números do fechamento: receita por origem, plantões, repasses, despesa por grupo,
     resultado, patrimônio, acumulador). Jan–Set/26 vieram dos fechamentos 02–10; a cada fechamento entra uma linha nova.
   - "Histórico de atendimentos": um atendimento por linha dos meses ANTES do app (exports do ControleOdonto, Jan–Ago/26).
   Atendimentos, pacientes únicos, novos, frequência e retenção saem do histórico + das abas de mês do app (mês com aba no app
   usa só o app). Paciente = nome normalizado (o histórico foi gravado com o nome do cadastro). Linhas de pagamento (Mensalidade de…,
   Pagamento de…, compra de plano, taxa de falta) não são atendimento (ehLinhaExtra_). */
var ABA_EVO = 'Evolução mensal', ABA_HIST = 'Histórico de atendimentos';
var HEVO = ['Mês', 'Particular', 'Cedplan', 'Sabin', 'Aluguel de sala', 'Outras receitas', 'Plantões Santa Casa', 'Plantões Unimed', 'Repasses (total)', 'Repasses dos plantões',
  'Pessoal', 'Materiais e Insumos', 'Administrativo', 'Marketing', 'Infraestrutura', 'Medicina do Trabalho', 'Taxas e licenças', 'Tributos', 'Outros', 'Recuperações',
  'Despesa total', 'Resultado', 'Patrimônio no fim do mês', 'Acumulador tributário', 'Sessões fora do sistema', 'Fonte', 'Conferido', 'Observação'];
var HHIST = ['Data', 'Paciente', 'Profissional', 'Convênio', 'Fonte'];
var EVO_GRUPOS = ['Pessoal', 'Materiais e Insumos', 'Administrativo', 'Marketing', 'Infraestrutura', 'Medicina do Trabalho', 'Taxas e licenças', 'Tributos', 'Outros', 'Recuperações'];
var EVO_REPASSE_PLANTAO = 0.82, EVO_TRIBUTO = 0.18; // regra dos fechamentos (BIG_PICTURE): Victor fica com 82% do plantão; carga adotada de 18% sobre a receita própria
var EVO_ROT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function evoChave_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2);
  var t = String(v == null ? '' : v).trim(), m = t.match(/^(\d{1,2})\/(\d{4})$/) || t.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return ''; var a = m[1].length === 4 ? [m[1], m[2]] : [m[2], m[1]];
  return a[0] + '-' + ('0' + Number(a[1])).slice(-2);
}
function evoRotulo_(k) { return EVO_ROT[Number(k.slice(5)) - 1] + '/' + k.slice(2, 4); }
function evoR_(n) { return Math.round(n * 100) / 100; }
function evoConv_(c) { c = String(c || ''); return /ced/i.test(c) ? 'Cedplan' : /sabin/i.test(c) ? 'Sabin' : !c || /^part/i.test(c) ? 'Particular' : 'Outros convênios'; }
// linhas da aba "Evolução mensal" com os números derivados (receita própria, repasses próprios, cobertura…)
function evoFinanceiro_() {
  var s = planilha_().getSheetByName(ABA_EVO), out = {};
  if (!s || s.getLastRow() < 2) return out;
  var h = cabecalhos_(s), vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues();
  var g = function (r, k) { return h[k] ? r[h[k] - 1] : ''; }, n = function (r, k) { return numBR_(g(r, k)); }, vazio = function (r, k) { return String(g(r, k) == null ? '' : g(r, k)).trim() === ''; };
  vals.forEach(function (r) {
    var k = evoChave_(g(r, 'Mês')); if (!k) return;
    var origem = { particular: n(r, 'Particular'), cedplan: n(r, 'Cedplan'), sabin: n(r, 'Sabin'), aluguel: n(r, 'Aluguel de sala') };
    var propria = evoR_(origem.particular + origem.cedplan + origem.sabin + origem.aluguel), outras = n(r, 'Outras receitas');
    var sc = n(r, 'Plantões Santa Casa'), un = n(r, 'Plantões Unimed'), plantoes = evoR_(sc + un);
    var repTot = n(r, 'Repasses (total)'), repPl = vazio(r, 'Repasses dos plantões') ? evoR_(plantoes * EVO_REPASSE_PLANTAO) : n(r, 'Repasses dos plantões');
    var grupos = {}; EVO_GRUPOS.forEach(function (gr) { grupos[gr] = n(r, gr); });
    var somaG = evoR_(EVO_GRUPOS.reduce(function (a, gr) { return a + grupos[gr]; }, 0));
    var despesa = vazio(r, 'Despesa total') ? somaG : n(r, 'Despesa total');
    var resultado = vazio(r, 'Resultado') ? evoR_(propria + outras + plantoes - repTot - despesa) : n(r, 'Resultado');
    var repProp = evoR_(repTot - repPl), margem = evoR_(propria - repProp - EVO_TRIBUTO * propria);
    // pessoal líquido: a recuperação do plano de saúde da Juliana (reembolso) abate do Pessoal, como no fechamento
    var pessoal = evoR_(grupos['Pessoal'] + grupos['Recuperações']);
    out[k] = { origem: origem, propria: propria, outras: outras, santaCasa: sc, unimed: un, plantoes: plantoes, repassesTotal: repTot, repassesPlantoes: repPl,
      plantaoLiquido: evoR_(plantoes - repPl), repassesProprios: repProp, grupos: grupos, despesa: despesa, conferenciaGrupos: evoR_(somaG - despesa),
      resultado: resultado, resultadoProprio: evoR_(propria - repProp - despesa), margemLiquida: margem, cobertura: despesa ? evoR_(margem / despesa * 100) : null,
      pessoal: pessoal, pessoalPct: propria ? evoR_(pessoal / propria * 100) : null, patrimonio: vazio(r, 'Patrimônio no fim do mês') ? null : n(r, 'Patrimônio no fim do mês'),
      acumulador: vazio(r, 'Acumulador tributário') ? null : n(r, 'Acumulador tributário'), foraDoSistema: n(r, 'Sessões fora do sistema'),
      fonte: String(g(r, 'Fonte') || ''), conferido: String(g(r, 'Conferido') || ''), obs: String(g(r, 'Observação') || '') };
  });
  return out;
}
// atendimentos: [{ data: Date, mes: 'aaaa-mm', p: chave do paciente, prof, conv, fonte }] — histórico só nos meses sem aba no app
function evoAtendimentos_() {
  var app = [], mesesApp = {}, hist = [];
  abasDeMes_().forEach(function (aba) {
    linhasMes_(aba).linhas.forEach(function (r) {
      if (!/^Atendido/.test(r.oque) || ehLinhaExtra_(r.procedimento)) return;
      var d = ymdDate_(r.data); if (!d) return; var k = evoChave_(d); mesesApp[k] = 1;
      app.push({ data: d, mes: k, p: Duplicatas.normalizar(r.paciente), prof: r.profissional, conv: evoConv_(r.convenio), fonte: 'app' });
    });
  });
  var s = planilha_().getSheetByName(ABA_HIST);
  if (s && s.getLastRow() >= 2) {
    var h = cabecalhos_(s), vals = s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues();
    vals.forEach(function (r) {
      var d = ymdDate_(r[(h['Data'] || 1) - 1]), pac = String(r[(h['Paciente'] || 2) - 1] || '').trim(); if (!d || !pac) return;
      var k = evoChave_(d); if (mesesApp[k]) return;
      hist.push({ data: d, mes: k, p: Duplicatas.normalizar(pac), prof: h['Profissional'] ? String(r[h['Profissional'] - 1] || '') : '', conv: evoConv_(h['Convênio'] ? r[h['Convênio'] - 1] : ''), fonte: String(h['Fonte'] ? r[h['Fonte'] - 1] || 'ControleOdonto' : 'ControleOdonto') });
    });
  }
  return hist.concat(app).sort(function (a, b) { return a.data - b.data; });
}
// por mês: atendimentos, pacientes únicos, novos (1º atendimento desde o início dos dados), frequência e "voltou em até N dias"
// (dos pacientes atendidos no mês, quantos tiveram outro atendimento até N dias depois do último do mês; só quando a janela já fechou)
function evoMetricas_(at, hoje) {
  var porPac = {}, primeiro = {}, meses = {};
  at.forEach(function (a) { (porPac[a.p] = porPac[a.p] || []).push(a.data.getTime()); if (!primeiro[a.p]) primeiro[a.p] = a.mes; (meses[a.mes] = meses[a.mes] || []).push(a); });
  var out = {};
  Object.keys(meses).forEach(function (k) {
    var L = meses[k], pac = {}, conv = {}, prof = {}, fontes = {};
    L.forEach(function (a) { pac[a.p] = Math.max(pac[a.p] || 0, a.data.getTime()); conv[a.conv] = (conv[a.conv] || 0) + 1; if (a.prof) prof[a.prof] = (prof[a.prof] || 0) + 1; fontes[a.fonte] = 1; });
    var ps = Object.keys(pac), fimMes = new Date(Number(k.slice(0, 4)), Number(k.slice(5)), 0).getTime();
    var volta = function (dias) {
      if (fimMes + dias * 864e5 > hoje.getTime()) return null; // janela ainda aberta: em apuração
      var ok = ps.filter(function (p) { var u = pac[p], lim = u + dias * 864e5; return porPac[p].some(function (t) { return t > u && t <= lim; }); }).length;
      return { n: ok, de: ps.length, pct: ps.length ? evoR_(ok / ps.length * 100) : null };
    };
    out[k] = { atendimentos: L.length, pacientes: ps.length, novos: ps.filter(function (p) { return primeiro[p] === k; }).length, frequencia: ps.length ? evoR_(L.length / ps.length) : null,
      volta90: volta(90), volta120: volta(120), porConvenio: conv, porProfissional: prof, fonte: Object.keys(fontes).join(' + '), parcial: fimMes >= ymdDate_(hoje).getTime() };
  });
  return out;
}
API.evolucao = function () {
  var neg = soGestao_(); if (neg) return neg;
  var hoje = new Date(), fin = evoFinanceiro_(), met = evoMetricas_(evoAtendimentos_(), hoje);
  var chaves = Object.keys(fin).concat(Object.keys(met)).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort();
  var meses = chaves.map(function (k) {
    var f = fin[k] || null, m = met[k] || null;
    // sessões que não estão em nenhuma fonte de atendimento (ex.: Sabin de agosto, só no relatório de guias) somam no total do mês
    if (m && f && f.foraDoSistema) m.atendimentosComFora = m.atendimentos + f.foraDoSistema;
    return { chave: k, rotulo: evoRotulo_(k), fin: f, at: m };
  });
  return { ok: true, meses: meses, regras: { repassePlantao: EVO_REPASSE_PLANTAO * 100, tributo: EVO_TRIBUTO * 100 }, temAbaEvolucao: !!planilha_().getSheetByName(ABA_EVO), temHistorico: !!planilha_().getSheetByName(ABA_HIST) };
};
