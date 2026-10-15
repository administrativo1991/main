/* Recepção Nascente — COBRANÇA (módulo compartilhado: servidor e tela usam o mesmo código).
   Decide, a partir da linha de "Cobrança por profissional" do paciente × profissional e do estado da competência do mês,
   o que a recepção faz agora: a frase do bloco "O que fazer agora", a cor, se pergunta "Recebeu?", o que vai em
   Valor (J) e Pago? (K), e a frase curta da Agenda. É a única fonte das frases (Registrar, Agenda, Cobrança do mês, POP).
   Não lê planilha nem DOM: recebe tudo pronto e devolve um objeto. Sem dependências. Testes: tests/cobranca.test.js. */
var Cobranca = (function () {
  var COBRANCAS = ['Por sessão', 'Mensalidade fixa', 'Convênio', 'Pro bono', 'Permuta'];
  var PAGAMENTOS = ['Na hora', 'Antecipado', 'Posterior', 'Não se aplica'];
  var PAGO = { SIM: 'Sim', NAO: 'Não', PARCIAL: 'Parcial', CONVENIO: 'Convênio (fatura)', NA: 'Não se aplica (pro bono / permuta)', INCLUIDA: 'Incluída na mensalidade' };
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var PARAMS_PADRAO = { vencimento_dia: 10, tolerancia_dia: 15, taxa_falta_pct: 50 };

  function num(v) { if (typeof v === 'number') return isNaN(v) ? null : v; var t = String(v == null ? '' : v).replace(/[R$\s]/g, ''); if (!t) return null; if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isNaN(n) ? null : n; }
  function brl(n) { n = Number(n) || 0; var s = n.toFixed(2).replace('.', ','); return 'R$ ' + (s.slice(-3) === ',00' ? s.slice(0, -3) : s); }
  function brlCheio(n) { return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ','); }
  function dataObj(s) { if (s instanceof Date) return isNaN(s) ? null : s; var m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1], 12) : null; }
  function dataTxt(d) { d = dataObj(d); return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() : ''; }
  function ymd(d) { d = dataObj(d); return d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : 0; }
  function mesAbrev(d) { d = dataObj(d); return d ? MESES[d.getMonth()].slice(0, 3).toLowerCase() + '.' : ''; }
  function mesNome(d) { d = dataObj(d); return d ? MESES[d.getMonth()].toLowerCase() : ''; }
  function chaveMes(d) { d = dataObj(d); return d ? MESES[d.getMonth()] + '/' + d.getFullYear() : ''; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function params(p) { var o = {}; Object.keys(PARAMS_PADRAO).forEach(function (k) { var v = p && num(p[k]); o[k] = v != null ? v : PARAMS_PADRAO[k]; }); return o; }

  // nomes antigos da aba Pacientes e do cadastro anterior lidos como os novos
  function normCobranca(c) {
    c = String(c || '').trim();
    if (COBRANCAS.indexOf(c) >= 0) return c;
    if (/^Mensalidade|^Social|^Pacote social|^Mensal \(valor especial\)/i.test(c)) return 'Mensalidade fixa';
    if (/^Por sessão|^Tabela|^Pacote|^Plano|^Pagamento (posterior|antecipado)/i.test(c)) return 'Por sessão';
    if (/^Conv[êe]nio/i.test(c)) return 'Convênio';
    if (/^Pro bono/i.test(c)) return 'Pro bono';
    if (/^Permuta/i.test(c)) return 'Permuta';
    return c;
  }
  function normPagamento(p, cobranca) {
    p = String(p || '').trim();
    if (PAGAMENTOS.indexOf(p) >= 0) return p;
    if (/^Na sessão/i.test(p)) return 'Na hora';
    if (/^No início|^Antecipado/i.test(p)) return 'Antecipado';
    if (/^No mês seguinte|^Posterior|^Fim do mês/i.test(p)) return 'Posterior';
    var c = normCobranca(cobranca);
    if (c === 'Mensalidade fixa') return 'Antecipado';
    if (c === 'Convênio' || c === 'Pro bono' || c === 'Permuta') return 'Não se aplica';
    return 'Na hora';
  }
  // rótulos que a recepção vê (item 1 do pedido: vocabulário único)
  function rotuloPagamento(p) { return { 'Na hora': 'Na hora', 'Antecipado': 'Antecipado (até dia 10)', 'Posterior': 'Fim do mês', 'Não se aplica': '' }[normPagamento(p)] || p; }

  // normaliza uma linha de "Cobrança por profissional" (campos pelos cabeçalhos da aba)
  function linhaDe(r) {
    if (!r) return null;
    var cob = normCobranca(r.cobranca || r['Cobrança']);
    return { id: r.id || r['ID'] || '', paciente: r.paciente || r['Paciente'] || '', profissional: r.profissional || r['Profissional'] || '',
      ativo: !/^n/i.test(String(r.ativo != null ? r.ativo : (r['Ativo'] != null ? r['Ativo'] : 'Sim')) || 'Sim'),
      cobranca: cob, convenio: r.convenio || r['Convênio'] || '',
      valorSessao: num(r.valorSessao != null ? r.valorSessao : r['Valor por sessão (R$)']), valorMensal: num(r.valorMensal != null ? r.valorMensal : r['Valor mensal (R$)']),
      pagamento: normPagamento(r.pagamento || r['Pagamento'], cob),
      desde: dataTxt(r.desde || r['Vigente desde']), ate: dataTxt(r.ate || r['Vigente até']),
      decididoPor: r.decididoPor || r['Valor decidido por'] || '', decididoEm: dataTxt(r.decididoEm || r['Valor decidido em']),
      obs: r.obs || r['Observação de cobrança'] || '', linha: r.linha || r._linha || null };
  }
  // linha vigente do paciente pro profissional na data: ativa, dentro da vigência; mais de uma → a mais recente (e avisa)
  function linhaVigente(linhas, paciente, profissional, data) {
    var d = ymd(data || new Date()), cands = (linhas || []).map(linhaDe).filter(function (l) {
      if (!l || !l.ativo || l.paciente !== paciente || l.profissional !== profissional) return false;
      if (l.desde && ymd(l.desde) > d) return false;
      if (l.ate && ymd(l.ate) < d) return false;
      return true;
    });
    if (!cands.length) return { linha: null, aviso: '' };
    cands.sort(function (a, b) { return (b.linha || 0) - (a.linha || 0); });
    return { linha: cands[0], aviso: cands.length > 1 ? 'Há ' + cands.length + ' linhas vigentes pra ' + profissional + ': usando a mais recente. Avise a gestão.' : '' };
  }
  function linhasDoPaciente(linhas, paciente, data) {
    var d = ymd(data || new Date());
    return (linhas || []).map(linhaDe).filter(function (l) { return l && l.ativo && l.paciente === paciente && !(l.desde && ymd(l.desde) > d) && !(l.ate && ymd(l.ate) < d); });
  }
  // resumo de uma linha pro cadastro: "Juliana: sessão R$ 80, antecipado"
  function resumoLinha(l) {
    l = linhaDe(l); if (!l) return '';
    var nome = String(l.profissional || '').replace(/^Dra?\.\s+/, '').split(' ')[0], q = rotuloPagamento(l.pagamento).toLowerCase();
    if (l.cobranca === 'Por sessão') return nome + ': sessão ' + (l.valorSessao != null ? brl(l.valorSessao) : 'valor a definir') + (q ? ', ' + q : '');
    if (l.cobranca === 'Mensalidade fixa') return nome + ': mensalidade ' + (l.valorMensal != null ? brl(l.valorMensal) + '/mês' : 'valor a definir') + (q ? ', ' + q : '');
    if (l.cobranca === 'Convênio') return nome + ': convênio ' + (l.convenio || '');
    return nome + ': ' + l.cobranca.toLowerCase();
  }

  // procedimento que nunca cobra (aplicação de teste, retorno), independentemente da linha
  function tipoSemCobranca(procedimento, valorTabela) {
    var p = String(procedimento || '');
    if (/^(Aplicação de teste|Retorno)/i.test(p)) return /^Aplicação/i.test(p) ? 'aplicação de teste' : 'retorno';
    return '';
  }

  /* calcular(ctx) → bloco
     ctx = { linha (de linhaVigente, ou null), profissional, especialidade, valorCheio (tabela da especialidade), procedimento,
             oque ('Atendido' | falta…), competencia: { chave, pago, data, forma, nf, sessoes, valorCobrado, abatimentos:[{texto}],
             recebido, atendidas, aReceber }, hoje (Date ou dd/mm/aaaa), params, pagador, avisoLinha } */
  function calcular(ctx) {
    ctx = ctx || {};
    var hoje = dataObj(ctx.hoje) || new Date(), dia = hoje.getDate(), P = params(ctx.params), l = ctx.linha ? linhaDe(ctx.linha) : null;
    var c = ctx.competencia || {}, mes = c.chave ? c.chave.split('/')[0].toLowerCase() : mesNome(hoje), Mes = cap(mes), mesAb = c.chave ? cap(c.chave.split('/')[0].slice(0, 3).toLowerCase()) + '.' : cap(mesAbrev(hoje));
    var oque = String(ctx.oque || 'Atendido'), atendido = /^Atendido/i.test(oque), prof = ctx.profissional || (l && l.profissional) || '';
    var tipo = tipoSemCobranca(ctx.procedimento), decidido = l && l.decididoPor ? 'Valor definido por ' + l.decididoPor + (l.decididoEm ? ' em ' + l.decididoEm : '') : '';
    var b = { situacao: '', cor: 'cinza', frase: '', apoio: '', curto: '', recebeu: null, padraoRecebeu: null, valor: null, valorMes: null, pagoFixo: null, nf: false, guia: false, botaoPagarMes: false, detalhe: false, obsAuto: '', decidido: decidido, obsLinha: l ? l.obs : '', aviso: ctx.avisoLinha || '', competencia: c.chave || chaveMes(hoje), linha: l };
    if (!atendido) {
      var curtoO = oque.split(' (')[0];
      b.situacao = 'nao-atendido'; b.cor = 'cinza'; b.frase = 'Sem cobrança — ' + curtoO.toLowerCase() + '. A gestão decide.'; b.apoio = 'Escreva no Detalhe o que aconteceu (quem avisou, a que horas, como). A falta entra na lista "Faltas → Decidir".';
      b.curto = curtoO; b.pagoFixo = ''; b.detalhe = true; b.detalheObrigatorio = /sem aviso|em cima da hora/i.test(oque); b.obsAuto = 'Falta/desmarcação — ';
      return b;
    }
    if (tipo) { b.situacao = 'sem-cobranca-tipo'; b.cor = 'cinza'; b.frase = 'Não cobrar — ' + tipo; b.apoio = 'já incluído'; b.curto = cap(tipo) + ' · sem cobrança'; b.pagoFixo = PAGO.NA; b.valor = ''; return b; }
    if (!l) {
      var cheio = num(ctx.valorCheio);
      b.situacao = 'sem-linha'; b.cor = 'laranja'; b.frase = 'Sem cobrança cadastrada pra ' + prof + (cheio != null ? ' — cobrar ' + brl(cheio) : ''); b.apoio = 'avise a gestão' + (ctx.pagador ? ' · pagador: ' + ctx.pagador : '');
      b.curto = (cheio != null ? brl(cheio) + ' · cobrar' : 'cobrar') + ' · sem cadastro'; b.recebeu = 'sim-nao-parcial'; b.padraoRecebeu = 'Sim'; b.valor = cheio; b.nf = true; return b;
    }
    var cob = l.cobranca, pg = l.pagamento, v = l.valorSessao, vm = l.valorMensal, pago = String(c.pago || '').trim(), mesPago = pago === 'Sim', parcial = pago === 'Parcial';
    var atraso = dia > P.tolerancia_dia, venc = dia <= P.vencimento_dia ? 'vence dia ' + P.vencimento_dia : 'tolerância até ' + P.tolerancia_dia;
    if (cob === 'Convênio') { b.situacao = 'convenio'; b.cor = 'azul'; b.frase = 'Não cobrar — convênio ' + (l.convenio || ''); b.apoio = 'guia assinada obrigatória'; b.curto = 'Convênio ' + (l.convenio || '') + ' · guia'; b.pagoFixo = PAGO.CONVENIO; b.valor = 0; b.guia = true; return b; }
    if (cob === 'Pro bono' || cob === 'Permuta') { b.situacao = cob === 'Permuta' ? 'permuta' : 'pro-bono'; b.cor = 'cinza'; b.frase = 'Não cobrar — ' + cob.toLowerCase(); b.apoio = l.ate ? 'até ' + l.ate : ''; b.curto = cob + (l.ate ? ' até ' + l.ate.slice(0, 5) : ''); b.pagoFixo = PAGO.NA; b.valor = ''; return b; }
    if (cob === 'Mensalidade fixa') {
      b.valorMes = vm; b.pagoFixo = PAGO.INCLUIDA; b.valor = '';
      var apoioM = (vm != null ? brl(vm) + '/mês' : 'valor a definir') + ', independente do nº de sessões' + (mesPago && c.data ? ' · pago em ' + c.data + (c.forma ? ' (' + c.forma + ')' : '') : '');
      if (mesPago) { b.situacao = 'mensalidade-paga'; b.cor = 'verde'; b.frase = 'Não cobrar — mensalidade de ' + mes + ' paga'; b.curto = 'Mensalidade ' + mesAb.toLowerCase() + ' paga'; }
      else if (pg === 'Posterior') { b.situacao = 'mensalidade-fim-do-mes'; b.cor = 'azul'; b.frase = 'Não cobrar hoje — mensalidade de ' + mes + ' paga no fim do mês' + (vm != null ? ' (' + brl(vm) + ')' : ''); b.curto = 'Fim do mês · mensalidade' + (vm != null ? ' ' + brl(vm) : ''); b.botaoPagarMes = true; }
      else if (atraso) { b.situacao = 'mensalidade-atrasada'; b.cor = 'vermelho'; b.frase = 'Mensalidade de ' + mes + ' atrasada' + (vm != null ? ' (' + brl(vm) + ')' : '') + ' — chamar a gestão'; b.curto = 'Mensalidade ' + mesAb.toLowerCase() + ' atrasada' + (vm != null ? ' ' + brl(vm) : ''); b.botaoPagarMes = true; b.obsAuto = 'atendido com mês em atraso'; apoioM = 'regra: não atender sem a gestão liberar · ' + apoioM; }
      else { b.situacao = 'mensalidade-aberta'; b.cor = 'amarelo'; b.frase = 'Mensalidade de ' + mes + ' em aberto' + (vm != null ? ' — cobrar ' + brl(vm) : ''); b.curto = 'Mensalidade ' + mesAb.toLowerCase() + ' em aberto' + (vm != null ? ' ' + brl(vm) : ''); b.botaoPagarMes = true; apoioM = apoioM + ' · ' + venc; }
      if (parcial && !mesPago) { b.apoio = 'recebido ' + brl(c.recebido || 0) + ' de ' + brl(vm || 0) + ' · ' + apoioM; } else b.apoio = apoioM;
      return b;
    }
    // Por sessão
    b.valor = v;
    if (pg === 'Na hora') { b.situacao = 'na-hora'; b.cor = 'amarelo'; b.frase = 'Cobrar ' + (v != null ? brl(v) : 'o valor combinado') + ' agora'; b.apoio = ctx.pagador ? 'pagador: ' + ctx.pagador : ''; b.curto = (v != null ? brl(v) : 'valor') + ' · cobrar'; b.recebeu = 'sim-nao-parcial'; b.padraoRecebeu = 'Sim'; b.nf = true; return b; }
    if (pg === 'Posterior') {
      var n = c.atendidas || 0, aRec = c.aReceber || 0;
      b.situacao = 'fim-do-mes'; b.cor = 'azul'; b.frase = 'Não cobrar hoje — paga no fim do mês' + (v != null ? ' (' + brl(v) + '/sessão)' : ''); b.apoio = n + (n === 1 ? ' sessão' : ' sessões') + ' este mês até agora' + (aRec ? ' · a receber ' + brl(aRec) : '') + ' · entra em "a receber"; se quiser pagar agora, marque Sim';
      b.curto = 'Fim do mês' + (v != null ? ' ' + brl(v) : ''); b.recebeu = 'sim-nao'; b.padraoRecebeu = 'Não'; b.nf = true; return b;
    }
    // Antecipado: valor × sessões agendadas no mês (menos abatimentos)
    var sess = c.sessoes != null ? num(c.sessoes) : null, abat = (c.abatimentos || []), nAb = abat.reduce(function (a, x) { return a + (num(x.n) || 1); }, 0);
    var sessCobr = sess != null ? Math.max(0, sess - nAb) : null, total = c.valorCobrado != null && num(c.valorCobrado) != null ? num(c.valorCobrado) : (v != null && sessCobr != null ? Math.round(v * sessCobr * 100) / 100 : null);
    b.valorMes = total; b.pagoFixo = PAGO.INCLUIDA; b.valor = '';
    var conta = (sessCobr != null ? sessCobr + (sessCobr === 1 ? ' sessão' : ' sessões') : 'sessões agendadas') + (v != null ? ' × ' + brl(v) : '') + (abat.length ? ' (' + abat.map(function (x) { return x.texto || ('− ' + (x.n || 1) + ' sessão'); }).join('; ') + ')' : '');
    if (mesPago) { b.situacao = 'antecipado-pago'; b.cor = 'verde'; b.frase = 'Não cobrar — ' + mes + ' pago' + (sess != null ? ' (' + sess + (sess === 1 ? ' sessão)' : ' sessões)') : ''); b.apoio = (v != null ? brl(v) + '/sessão' : '') + (c.data ? ' · pago em ' + c.data + (c.forma ? ' (' + c.forma + ')' : '') : ''); b.curto = mesAb + ' pago'; return b; }
    if (atraso) { b.situacao = 'antecipado-atrasado'; b.cor = 'vermelho'; b.frase = Mes + ' atrasado' + (total != null ? ' (' + brl(total) + ')' : '') + ' — chamar a gestão'; b.apoio = 'regra: não atender sem a gestão liberar · ' + conta; b.curto = mesAb + ' atrasado' + (total != null ? ' ' + brl(total) : ''); b.botaoPagarMes = true; b.obsAuto = 'atendido com mês em atraso'; return b; }
    b.situacao = 'antecipado-aberto'; b.cor = 'amarelo'; b.frase = Mes + ' em aberto' + (total != null ? ' — cobrar ' + brl(total) : ''); b.apoio = conta + ' · ' + venc + (parcial ? ' · recebido ' + brl(c.recebido || 0) : ''); b.curto = mesAb + ' em aberto' + (total != null ? ' ' + brl(total) : ''); b.botaoPagarMes = true;
    return b;
  }

  // o que vai em Pago? (K) pela resposta "Recebeu?" (Sim · Não · Parcial) — só quando o bloco pergunta
  function pagoK(bloco, recebeu) {
    if (!bloco) return '';
    if (bloco.pagoFixo != null) return bloco.pagoFixo;
    recebeu = String(recebeu || bloco.padraoRecebeu || '');
    if (recebeu === 'Sim') return PAGO.SIM; if (recebeu === 'Parcial') return PAGO.PARCIAL; return PAGO.NAO;
  }
  // competência de uma data (mês/ano); o "mês seguinte" pros abatimentos
  function proximaCompetencia(chave) { var m = String(chave || '').split('/'), i = MESES.indexOf(m[0]), a = parseInt(m[1], 10); if (i < 0 || !a) return ''; return MESES[(i + 1) % 12] + '/' + (i === 11 ? a + 1 : a); }
  // situação da competência pra tela Cobrança do mês
  function situacaoCompetencia(l, c, hoje, p) {
    l = linhaDe(l); c = c || {}; hoje = dataObj(hoje) || new Date(); var P = params(p), dia = hoje.getDate(), pago = String(c.pago || '').trim(), atual = chaveMes(hoje) === c.chave, passada = ymd('01/' + ('0' + (MESES.indexOf(String(c.chave || '').split('/')[0]) + 1)).slice(-2) + '/' + String(c.chave || '').split('/')[1]) < ymd(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    if (pago === 'Sim') return { sit: 'em dia', cor: 'verde', txt: 'pago' + (c.data ? ' em ' + c.data : '') };
    if (l && l.pagamento === 'Posterior') return c.aReceber > 0 ? { sit: 'a receber', cor: passada ? 'vermelho' : 'amarelo', txt: 'a receber ' + brl(c.aReceber) } : { sit: 'em dia', cor: 'verde', txt: 'nada a receber' };
    if (passada) return { sit: 'atrasada', cor: 'vermelho', txt: 'atrasada (mês passado)' };
    if (!atual) return { sit: 'futura', cor: 'cinza', txt: 'ainda não vence' };
    if (dia <= P.vencimento_dia) return { sit: 'vence dia ' + P.vencimento_dia, cor: 'amarelo', txt: 'vence dia ' + P.vencimento_dia };
    if (dia <= P.tolerancia_dia) return { sit: 'tolerância até ' + P.tolerancia_dia, cor: 'amarelo', txt: 'venceu dia ' + P.vencimento_dia + ' · tolerância até ' + P.tolerancia_dia };
    return { sit: 'atrasada', cor: 'vermelho', txt: 'atrasada' + (pago === 'Parcial' ? ' (pago em parte)' : '') };
  }

  return { COBRANCAS: COBRANCAS, PAGAMENTOS: PAGAMENTOS, PAGO: PAGO, MESES: MESES, PARAMS_PADRAO: PARAMS_PADRAO, num: num, brl: brl, brlCheio: brlCheio, dataObj: dataObj, dataTxt: dataTxt, chaveMes: chaveMes, proximaCompetencia: proximaCompetencia,
    normCobranca: normCobranca, normPagamento: normPagamento, rotuloPagamento: rotuloPagamento, linhaDe: linhaDe, linhaVigente: linhaVigente, linhasDoPaciente: linhasDoPaciente, resumoLinha: resumoLinha,
    tipoSemCobranca: tipoSemCobranca, calcular: calcular, pagoK: pagoK, situacaoCompetencia: situacaoCompetencia, params: params };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Cobranca;
