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
      // já normalizada (booleano) ou vinda da aba ("Sim"/"Não"; vazio = Sim). String(false) não começa com "N": por isso o caso booleano à parte
      ativo: typeof r.ativo === 'boolean' ? r.ativo : !/^n/i.test(String(r.ativo != null ? r.ativo : (r['Ativo'] != null ? r['Ativo'] : 'Sim')) || 'Sim'),
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
    // aplicação de teste de paciente de convênio (gestão, 15/10): faz parte do pacote da avaliação faturado ao convênio
    // (Sabin: 5 sessões; depois, adicionais autorizadas uma a uma) → Convênio (fatura), com guia. Particular: já pago na avaliação.
    var convAp = l ? (l.cobranca === 'Convênio' ? l.convenio : '') : (ctx.convenioPaciente && !/^Particular$/i.test(ctx.convenioPaciente) ? ctx.convenioPaciente : '');
    if (tipo === 'aplicação de teste' && convAp) { b.situacao = 'convenio'; b.cor = 'azul'; b.convenio = convAp; b.frase = 'Não cobrar — convênio ' + convAp + ' (aplicação de teste da avaliação)'; b.apoio = 'guia assinada obrigatória'; b.curto = 'Convênio ' + convAp + ' · aplicação'; b.pagoFixo = PAGO.CONVENIO; b.valor = 0; b.guia = true; return b; }
    if (tipo) { b.situacao = 'sem-cobranca-tipo'; b.cor = 'cinza'; b.frase = 'Não cobrar — ' + tipo; b.apoio = 'já incluído'; b.curto = cap(tipo) + ' · sem cobrança'; b.pagoFixo = PAGO.NA; b.valor = ''; return b; }
    if (!l) {
      var cheio = num(ctx.valorCheio);
      b.situacao = 'sem-linha'; b.cor = 'laranja'; b.frase = 'Sem cobrança cadastrada pra ' + prof + (cheio != null ? ' — cobrar ' + brl(cheio) : ''); b.apoio = 'avise a gestão' + (ctx.pagador ? ' · pagador: ' + ctx.pagador : '');
      b.curto = (cheio != null ? brl(cheio) + ' · cobrar' : 'cobrar') + ' · sem cadastro'; b.recebeu = 'sim-nao-parcial'; b.padraoRecebeu = 'Sim'; b.valor = cheio; b.nf = true; return b;
    }
    var cob = l.cobranca, pg = l.pagamento, v = l.valorSessao, vm = l.valorMensal, pago = String(c.pago || '').trim(), mesPago = pago === 'Sim', parcial = pago === 'Parcial';
    var atraso = dia > P.tolerancia_dia, venc = dia <= P.vencimento_dia ? 'vence dia ' + P.vencimento_dia : 'tolerância até ' + P.tolerancia_dia;
    if (cob === 'Convênio') { b.situacao = 'convenio'; b.cor = 'azul'; b.convenio = l.convenio || ''; b.frase = 'Não cobrar — convênio ' + (l.convenio || ''); b.apoio = 'guia assinada obrigatória'; b.curto = 'Convênio ' + (l.convenio || '') + ' · guia'; b.pagoFixo = PAGO.CONVENIO; b.valor = 0; b.guia = true; return b; }
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

/* Mensagens de WhatsApp (Fase 2) — o mesmo código no servidor e na tela, pra mensagem nunca divergir.
   Confirmação: texto oficial da clínica (gestão, 15/10). A gestão pode trocar em Parâmetros!msg_confirmacao, com:
   {pagador} = primeiro nome de quem paga (sem pagador, do paciente) · {da_sua_consulta} = "da sua consulta" / "das suas consultas"
   · {com_profissional} = " com Juliana Ribeiro" (vazio se forem profissionais diferentes) · {sessoes} = Data e Horário de cada
   sessão (com 👤 nome quando são vários pacientes, e "com profissional" quando são vários profissionais). "\n" escrito na
   célula também quebra linha. O profissional sai como na coluna "Nome na mensagem" da aba Profissionais (profMsg; ex.:
   Dra. Juliana Ribeiro); vazia, sai o nome da aba. */
var Mensagens = (function () {
  var CONFIRMACAO_PADRAO = 'Olá, {pagador}! Passando para lembrar {da_sua_consulta} na Clínica Nascente{com_profissional}:\n\n' +
    '{sessoes}\n📍 *Local:* Av. Andradas, 547 – Térreo, Loja 5\n\n' +
    '📋 *IMPORTANTE: É obrigatório passar pela recepção para registrar sua chegada antes de seguir para o consultório.*\n\n' +
    '⚠️ Caso não possa comparecer, avise a recepção com pelo menos *24 horas de antecedência*. A falta sem aviso impede que o profissional disponibilize esse horário para outro paciente.\n\n' +
    'Agradecemos a compreensão e a colaboração!';
  // cobrança (gestão, 15/10): mensalidade/antecipado e consultas do mês (fim do mês). {pagador} · {mes} ("novembro de 2026") ·
  // {valor} ("1.234,00"). A gestão troca em Parâmetros!msg_cobranca_mensalidade e msg_cobranca_consultas.
  var PIX = '📲 *Pix (CNPJ):* 52.763.088/0001-05\n🏦 *Favorecido:* Clínica Nascente LTDA.\n\n';
  var COBRANCA_MENSALIDADE_PADRAO = 'Olá, {pagador}! Tudo bem?\n\nPassando para lembrar do pagamento da mensalidade da Clínica Nascente referente a {mes}.\n\n' +
    '💳 *Valor:* R$ {valor}\n' + PIX + 'Após o pagamento, pedimos, por gentileza, que envie o comprovante por aqui.\n\nQualquer dúvida, estamos à disposição!';
  var COBRANCA_CONSULTAS_PADRAO = 'Olá, {pagador}! Tudo bem?\n\nEstamos entrando em contato para informar o valor referente às consultas realizadas na Clínica Nascente durante o mês de {mes}.\n\n' +
    '💳 *Valor total:* R$ {valor}\n' + PIX + 'Após o pagamento, pedimos, por gentileza, que envie o comprovante por aqui.\n\nAgradecemos a atenção e ficamos à disposição para qualquer dúvida!';
  // número pro link do WhatsApp: só dígitos com 55 na frente; vazio se não parece telefone do Brasil
  function fone(t) { var d = String(t || '').replace(/\D/g, ''); return /^55\d{10,11}$/.test(d) ? d : /^\d{10,11}$/.test(d) ? '55' + d : ''; }
  function foneFmt(t) { var d = fone(t).slice(2); if (!d) return ''; return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + ' ' + d.slice(3, 7) + '-' + d.slice(7) : '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); }
  // celular do Brasil (DDD + 9 + 8 dígitos): só ele serve pro WhatsApp; fixo é guardado pra ligar (gestão, 16/10)
  function ehCelular(t) { var d = fone(t).slice(2); return d.length === 11 && d.charAt(2) === '9'; }
  // o número de um paciente pro WhatsApp: WhatsApp do pagador; se vazio, telefone do responsável; depois o do paciente.
  // Só celular conta; o primeiro fixo achado volta em fixo/fixoFmt (a Ficha mostra pra ligar).
  function foneDoPaciente(p) {
    p = p || {}; var ord = [['whats', 'pagador'], ['respTel', 'responsável'], ['telPac', 'paciente']], fixo = '';
    for (var i = 0; i < ord.length; i++) { var f = fone(p[ord[i][0]]); if (!f) continue; if (ehCelular(f)) return { fone: f, foneFmt: foneFmt(f), de: ord[i][1], fixo: fixo, fixoFmt: foneFmt(fixo) }; if (!fixo) fixo = f; }
    return { fone: '', foneFmt: '', de: '', fixo: fixo, fixoFmt: foneFmt(fixo) };
  }
  // link que abre a conversa com o texto. wa.me trocava os emojis por "�" no WhatsApp (gestão, 15/10): api.whatsapp.com/send não
  function linkWhats(f, texto) { return 'https://api.whatsapp.com/send?phone=' + fone(f) + '&text=' + encodeURIComponent(texto); }
  // fim do mês por sessão = "consultas do mês"; mensalidade fixa e antecipado = "mensalidade"
  function tipoCobranca(it) { return it.pagamento === 'Posterior' && it.cobranca !== 'Mensalidade fixa' ? 'consultas' : 'mensalidade'; }
  function valorBR(n) { var v = Math.round((Number(n) || 0) * 100) / 100, i = Math.floor(v), c = Math.round((v - i) * 100); return String(i).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + ('0' + c).slice(-2); }
  function mesTxt(chave) { var m = String(chave || '').split('/'); return m.length === 2 ? m[0].toLowerCase() + ' de ' + m[1] : String(chave || ''); }
  function cobranca(tipo, modelo, pagador, chave, valor) {
    var padrao = tipo === 'consultas' ? COBRANCA_CONSULTAS_PADRAO : COBRANCA_MENSALIDADE_PADRAO;
    return String(modelo || padrao).replace(/\\n/g, '\n').replace(/\{pagador\}/g, primeiroNome(pagador)).replace(/,\s*!/g, '!')
      .replace(/\{mes\}/g, mesTxt(chave)).replace(/\{valor\}/g, valorBR(valor));
  }
  function primeiroNome(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function hora(h) { var m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? ('0' + m[1]).slice(-2) + 'h' + m[2] : String(h || '').trim(); }
  function unicos(l) { return l.filter(function (x, i) { return l.indexOf(x) === i; }); }
  // itens: [{ paciente, profissional, profMsg (opcional), data: 'dd/mm/aaaa', hora: 'hh:mm' }]
  function confirmacao(modelo, pagador, itens) {
    itens = itens || [];
    var pacs = unicos(itens.map(function (x) { return x.paciente; })), profs = unicos(itens.map(function (x) { return x.profMsg || x.profissional; })), umProf = profs.length === 1;
    var blocos = itens.map(function (x) {
      var l = [];
      if (pacs.length > 1 || !umProf) l.push('👤 *' + primeiroNome(x.paciente) + '*' + (umProf ? '' : ' com ' + (x.profMsg || x.profissional)));
      l.push('🗓️ *Data:* ' + x.data);
      if (x.hora) l.push('⏰ *Horário:* ' + hora(x.hora));
      return l.join('\n');
    });
    return String(modelo || CONFIRMACAO_PADRAO).replace(/\\n/g, '\n')
      .replace(/\{pagador\}/g, primeiroNome(pagador || pacs[0]))
      .replace(/\{da_sua_consulta\}/g, itens.length > 1 ? 'das suas consultas' : 'da sua consulta')
      .replace(/\{com_profissional\}/g, umProf && profs[0] ? ' com ' + profs[0] : '')
      .replace(/\{sessoes\}/g, blocos.join('\n\n'))
      .replace(/,\s*!/g, '!');
  }
  return { CONFIRMACAO_PADRAO: CONFIRMACAO_PADRAO, COBRANCA_MENSALIDADE_PADRAO: COBRANCA_MENSALIDADE_PADRAO, COBRANCA_CONSULTAS_PADRAO: COBRANCA_CONSULTAS_PADRAO,
    confirmacao: confirmacao, cobranca: cobranca, linkWhats: linkWhats, tipoCobranca: tipoCobranca, fone: fone, ehCelular: ehCelular, foneFmt: foneFmt, foneDoPaciente: foneDoPaciente, valorBR: valorBR, mesTxt: mesTxt, hora: hora };
})();

/* Recepção Nascente — servidor (Google Apps Script, runtime V8).
   Este arquivo é carregado pelo app/loader/Code.gs a partir do Drive e avaliado em tempo de execução,
   por isso define tudo dentro de `API` e termina com a expressão `API`.
   Toda gravação é append de linha ou update de célula específica. Nunca reescreve aba. Nunca apaga linha.
   As colunas são localizadas pelo CABEÇALHO, nunca pela letra. */

var CONFIG = {
  TZ: 'America/Sao_Paulo',
  PASTA_FINANCEIRO: '1TVCErWCv4bn0ed66T5eZSvcATPIoxboc', // Drive: Clínica Nascente/Controle Financeiro (as exportações vão em <ano>/<MM Mês_AA>/2_Atendimentos)
  GESTAO: ['administrativo@clinicanascente.com.br'],
  ABA: { PACIENTES: 'Pacientes', LISTAS: 'Listas', PROFISSIONAIS: 'Profissionais', PROCEDIMENTOS: 'Procedimentos', MENSALISTAS: 'Mensalistas', PACOTES: 'Planos', AGENDA: 'Agenda recorrente', DIA: 'Lista do dia', ALTERACOES: 'Alterações de cadastro', RENOVACOES: 'Renovações', LEMBRETES: 'Lembretes', ALT_LANC: 'Alterações de lançamento', CPP: 'Cobrança por profissional', VALORES: 'Valores por sessão', PARAMS: 'Parâmetros' },
  DIAS: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  HA: ['ID', 'Paciente', 'Profissional', 'Dia da semana', 'Hora', 'Frequência', 'Começa em', 'Termina em', 'Ativo', 'Observação', 'Registrado por (app)'],
  HD: ['ID', 'Data', 'Hora', 'Paciente', 'Profissional', 'Origem', 'Observação', 'Registrado por (app)'],
  HC: ['Data/hora', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)'],
  HL: ['Data/hora', 'Lembrete', 'Válido até', 'Quem escreveu', 'Registrado por (app)'],
  MESES: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  VIRADA: '2026-11-01', // a partir daqui a mensalidade é antecipada (vence dia 10, tolerância 15)
  // cabeçalhos da aba do mês (os existentes são lidos como estão; U e V são criados no fim se faltarem)
  HM: { DATA: 'Data', HORA: 'Hora', PACIENTE: 'Paciente', PROFISSIONAL: 'Profissional', PROCEDIMENTO: 'Procedimento', OQUE: 'O que aconteceu', VALOR: 'Valor (R$)', PAGO: 'Pago?', DATA_PAG: 'Data do pagamento', FORMA: 'Forma de pagamento', QUEM: 'Quem pagou (só se foi outra pessoa)', NF: 'NF emitida?', NF_N: 'Nº da NF', GUIA: 'Guia assinada? (convênio)', OBS: 'Observação', ID: 'ID', LOG: 'Registrado por (app)', PACOTE: 'Plano (ID)', RECEBIDO: 'Valor recebido (R$)', SESSOES: 'Sessões do pacote', DETALHE: 'Detalhe da falta', DECISAO: 'Decisão da gestão',
    // copiadas do cadastro na hora em que a linha é gravada (gestão, 10/10); o nome "(auto)" ficou do tempo da fórmula
    CONV: 'Convênio (auto)', MOD: 'Modalidade (auto)', ATENCAO: '⚠ Atenção na cobrança (auto)', PAGADOR_L: 'Pagador habitual (auto)' },
  // Renovação do pacote (gestão, 07-08/10): uma linha por pagamento antecipado; é o que o Financeiro concilia
  HR: ['ID', 'Data', 'Paciente', 'Sessões', 'Valor (R$)', 'Forma de pagamento', 'Quem pagou', 'NF emitida?', 'Nº da NF', 'Válido até', 'Observação', 'Registrado por (app)', 'Referente a'],
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
  LISTAS: { OQUE: 'O que aconteceu', PAGO: 'Pago?', FORMA: 'Forma de pagamento', CONVENIO: 'Convênio', REGRA: 'Regra de cobrança', MODALIDADE: 'Cobrança', PAGAMENTO: 'Pagamento', MODALIDADE_ESP: 'Especialidade (modalidade)', GESTAO: 'Gestão', COB_PROF: 'Cobrança (por profissional)', PAG_PROF: 'Pagamento (por profissional)', FERIADOS: 'Feriados' },
  // Cobrança por profissional (gestão, 15/10): uma linha por paciente × profissional; o app nunca recalcula o valor a partir da tabela
  HCPP: ['ID', 'Paciente', 'Profissional', 'Ativo', 'Cobrança', 'Convênio', 'Valor por sessão (R$)', 'Valor mensal (R$)', 'Pagamento', 'Vigente desde', 'Vigente até', 'Valor decidido por', 'Valor decidido em', 'Observação de cobrança', 'Registrado por (app)'],
  // Mensalistas: colunas novas por competência (no fim da aba), além de 'Profissional'
  COMP_COLS: ['sessões agendadas', 'valor cobrado', 'pago?', 'data', 'forma', 'NF']
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
// Listas: a aba inteira lida uma vez por chamada (e guardada em cache por alguns minutos); cada coluna vira uma lista
function listas_() {
  return cacheado_('listas', function () {
    var s = aba_(CONFIG.ABA.LISTAS), h = cabecalhos_(s), n = s.getLastRow(), out = {};
    if (n < 2) return out;
    var vals = s.getRange(2, 1, n - 1, s.getLastColumn()).getValues();
    Object.keys(h).forEach(function (k) { out[k] = vals.map(function (r) { var v = r[h[k] - 1]; return (v instanceof Date) ? fmtData_(v) : String(v == null ? '' : v).trim(); }).filter(Boolean); });
    return out;
  });
}
function colunaLista_(cabecalho) { return (listas_()[cabecalho] || []).slice(); }
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
function indicePacientes_() { return cacheado_('pac', lerPacientes_); }
function lerPacientes_() {
  var s = aba_(CONFIG.ABA.PACIENTES), h = cabecalhos_(s), n = s.getLastRow();
  if (n < 2) return [];
  var vals = s.getRange(2, 1, n - 1, s.getLastColumn()).getValues();
  var H = CONFIG.H, col = function (k) { return h[H[k]] ? h[H[k]] - 1 : -1; };
  var cNome = col('NOME'), cCpf = col('CPF'), cNasc = col('NASC'), cAtivo = col('ATIVO'), cMod = col('MODALIDADE'),
      cPag = col('PAGADOR'), cConv = col('CONVENIO'), cRegra = col('REGRA'), cObs = col('OBS_COBRANCA'), cVal = col('VALOR_COMB'),
      cResp = col('RESP'), cTel = col('TEL_PAC'), cWhats = col('WHATS'), cRespPar = col('RESP_PAR'), cRespTel = col('RESP_TEL'),
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
      telPac: cTel >= 0 ? String(r[cTel] || '').trim() : '', resp: cResp >= 0 ? String(r[cResp] || '').trim() : '', respPar: cRespPar >= 0 ? String(r[cRespPar] || '').trim() : '', respTel: cRespTel >= 0 ? String(r[cRespTel] || '').trim() : '', whats: cWhats >= 0 ? String(r[cWhats] || '').trim() : ''
    });
  });
  return out;
}
// Profissionais: A = nome, B = especialidade; o expediente (horário por dia da semana + duração da sessão) fica em colunas
// criadas no fim pela tela Agenda → "Horário dos profissionais". Formato da célula: "08:00-12:00, 13:00-19:00" (vazio = não atende)
var EXPEDIENTE = { DIAS: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], DURACAO: 'Duração da sessão (min)', LOG: 'Horário alterado por (app)' };
function colExpediente_(dia) { return 'Horário ' + dia.toLowerCase(); }
function profissionais_() { return cacheado_('prof', lerProfissionais_); }
function lerProfissionais_() {
  var s = planilha_().getSheetByName(CONFIG.ABA.PROFISSIONAIS), n = s ? s.getLastRow() : 0;
  if (!s || n < 2) return [];
  var h = cabecalhos_(s), vals = s.getRange(2, 1, n - 1, s.getLastColumn()).getValues();
  var txt = function (r, nome) { var c = h[nome]; return c ? String(r[c - 1] == null ? '' : r[c - 1]).trim() : ''; };
  return vals.map(function (r) {
    var horarios = {}; EXPEDIENTE.DIAS.forEach(function (d) { horarios[d] = txt(r, colExpediente_(d)); });
    var dur = parseInt(txt(r, EXPEDIENTE.DURACAO), 10);
    return { nome: String(r[0] || '').trim(), especialidade: String(r[1] || '').trim(), horarios: horarios, duracao: dur > 0 ? dur : null, ativo: !/^n/i.test(txt(r, 'Ativo') || 'Sim'), nomeMsg: txt(r, 'Nome na mensagem') }; // nomeMsg: como sai no WhatsApp (ex.: Dra. Juliana Ribeiro)
  }).filter(function (p) { return p.nome && p.ativo; }); // coluna "Ativo" = Não: saiu da clínica, some das listas (os lançamentos antigos ficam)
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
    invalidar_(['prof']);
    SpreadsheetApp.flush();
    return { ok: true, linha: linha, colunasCriadas: g.criadas, profissionais: profissionais_() };
  } finally { lock.releaseLock(); }
};

API.ping = function () { return { ok: true, hora: agora_(), usuario: usuario_(), planilha: planilha_().getName() }; };

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
// mensalidade = valor fixo do mês, independe do nº de sessões; a sessão fica "incluída na mensalidade"
function chaveMes_(d) { return CONFIG.MESES[d.getMonth()] + '/' + d.getFullYear(); }
// valida e normaliza os campos de cobrança (valores numéricos; pacote 4/12 com nº fixo e valor padrão; social R$ 200/mês)
function camposCobranca_(c, erros) {
  var cob = String(c.modalidade || '').trim(), num = function (v) { if (v === '' || v == null) return ''; var n = numBR_(v); return isNaN(n) ? NaN : n; };
  var out = { modalidade: cob };
  if (c.valorNum != null) out.valorNum = num(c.valorNum);
  if (c.pctN != null) out.pctN = num(c.pctN);
  if (c.pctV != null) out.pctV = num(c.pctV);
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
    invalidar_(['pac']);
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
/* ---------- Cadastro gravado na linha (gestão, 10/10) ----------
   Convênio, Modalidade (= Cobrança do cadastro), Atenção na cobrança e Pagador habitual (F, G, H e N da aba do mês) são
   GRAVADOS na linha, copiados do cadastro no momento em que o atendimento é salvo. Mudar o cadastro depois não mexe em
   nenhuma linha já gravada; só a gestão corrige uma linha (Corrigir lançamento). As abas antigas tinham ARRAYFORMULA na
   linha 2 dessas colunas, lendo o cadastro ATUAL: "Virar aba para o app" (Pendências, gestão) troca a fórmula pelos valores
   que ela mostrava. Enquanto a fórmula estiver lá, o app não grava na aba (um valor no meio da coluna quebra a fórmula). */
var COLS_AUTO = ['CONV', 'MOD', 'ATENCAO', 'PAGADOR_L'];
// mesmo resultado das fórmulas antigas: Convênio (Q), Cobrança (F), Regra (R) — Observação de cobrança (S), Pagador (O)
function autoDoCadastro_(pac) {
  pac = pac || {}; var HM = CONFIG.HM, o = {};
  o[HM.CONV] = pac.convenio || ''; o[HM.MOD] = pac.modalidade || '';
  o[HM.ATENCAO] = pac.regra ? pac.regra + ' — ' + (pac.obsCobranca || '') : (pac.obsCobranca || '');
  o[HM.PAGADOR_L] = pac.pagador || '';
  return o;
}
function comAuto_(pares, pac) { var a = autoDoCadastro_(pac); Object.keys(a).forEach(function (k) { pares[k] = a[k]; }); return pares; }
// colunas automáticas que ainda têm fórmula na linha 2 (aba em "modo planilha")
function formulasAuto_(s) {
  var h = cabecalhos_(s), HM = CONFIG.HM;
  return COLS_AUTO.filter(function (k) { return h[HM[k]] && String(s.getRange(2, h[HM[k]]).getFormula() || '') !== ''; }).map(function (k) { return HM[k]; });
}
function msgModoPlanilha_(nome) { return 'A aba ' + nome + ' ainda está em modo planilha — rodar \'Virar aba para o app\' na tela Gestão.'; }
// guarda: devolve o aviso se alguma das abas ainda estiver em modo planilha (nada é gravado)
function bloqueioPlanilha_(abas) {
  var vistos = {}, msg = '';
  (abas || []).forEach(function (s) { if (!msg && s && !vistos[s.getName()]) { vistos[s.getName()] = 1; if (formulasAuto_(s).length) msg = msgModoPlanilha_(s.getName()); } });
  return msg;
}
function letraCol_(c) { var t = ''; while (c > 0) { var m = (c - 1) % 26; t = String.fromCharCode(65 + m) + t; c = Math.floor((c - 1) / 26); } return t; }
var CAMPO_VIRADA = 'Virada para o app';
function viradaLog_(mes) {
  var sa = planilha_().getSheetByName(CONFIG.ABA.ALT_LANC), achou = null;
  linhasComo_(sa).forEach(function (r) { if (String(r['Aba'] || '') === mes && String(r['Campo'] || '') === CAMPO_VIRADA) achou = { quando: String(r['Data/hora'] || ''), texto: String(r['Quem informou'] || ''), por: String(r['Registrado por (app)'] || '') }; });
  return achou;
}
function estadoVirada_(mes) {
  var s = planilha_().getSheetByName(mes); if (!s) return null;
  var f = formulasAuto_(s), lg = f.length ? null : viradaLog_(mes);
  return { mes: mes, modo: f.length ? 'planilha' : 'app', formulas: f, viradaEm: lg ? lg.quando : '', texto: lg ? lg.texto : '' };
}
// Virar a aba para o app (só gestão): lê F2:H e N2:N com getValues e grava os mesmos valores com setValues (a fórmula vira
// valor). Antes, confere que nenhuma célula dessas colunas mostra erro (#REF!: alguém digitou no meio da coluna); se mostrar,
// para sem gravar. Depois confere com getFormula que a linha 2 ficou sem fórmula e registra em "Alterações de lançamento".
API.virarAbaMes = function (d) {
  d = d || {};
  var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão vira a aba para o app.'] };
  var mes = String(d.mes || '').trim(); if (CONFIG.MESES.indexOf(mes) < 0) return { ok: false, erros: ['Mês inválido.'] };
  var s = planilha_().getSheetByName(mes); if (!s) return { ok: false, erros: ['A aba "' + mes + '" não existe.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var h = cabecalhos_(s), HM = CONFIG.HM, cols = COLS_AUTO.filter(function (k) { return h[HM[k]]; }).map(function (k) { return h[HM[k]]; }).sort(function (a, b) { return a - b; });
    if (!cols.length) return { ok: false, erros: ['A aba ' + mes + ' não tem as colunas de convênio/modalidade/atenção/pagador.'] };
    if (!formulasAuto_(s).length) { var lg = viradaLog_(mes); return { ok: true, jaVirada: true, mes: mes, viradaEm: lg ? lg.quando : '', mensagem: 'Já virada' + (lg ? ' em ' + lg.quando : ' (sem fórmula na linha 2; data não registrada)') + '.' }; }
    // blocos de colunas vizinhas (F:H e N)
    var blocos = []; cols.forEach(function (c) { var b = blocos[blocos.length - 1]; if (b && b.c + b.n === c) b.n++; else blocos.push({ c: c, n: 1 }); });
    var n = Math.max(s.getLastRow() - 1, 1), erros = [];
    blocos.forEach(function (b) {
      var rg = s.getRange(2, b.c, n, b.n); b.vals = rg.getValues(); var disp = rg.getDisplayValues();
      disp.forEach(function (l, i) { l.forEach(function (v, j) { if (/^#(REF!|N\/A|VALUE!|ERROR!|NAME\?|DIV\/0!|NUM!|NULL!)/.test(String(v || ''))) erros.push(letraCol_(b.c + j) + (i + 2) + ' (' + String(v).split(' ')[0] + ')'); }); });
    });
    if (erros.length) return { ok: false, comErro: erros, erros: ['Parei sem gravar nada: ' + erros.length + ' célula(s) de ' + blocos.map(function (b) { return letraCol_(b.c) + (b.n > 1 ? ':' + letraCol_(b.c + b.n - 1) : ''); }).join(' e ') + ' mostram erro: ' + erros.slice(0, 8).join(', ') + (erros.length > 8 ? '…' : '') + '. Alguém digitou no meio da coluna automática: apague o valor digitado na planilha e rode de novo.'] };
    blocos.forEach(function (b) { s.getRange(2, b.c, n, b.n).setValues(b.vals); });
    SpreadsheetApp.flush();
    var resta = formulasAuto_(s);
    if (resta.length) return { ok: false, erros: ['Gravei os valores, mas a linha 2 ainda tem fórmula em: ' + resta.join(', ') + '. Avise o suporte antes de registrar nesta aba.'] };
    var dif = 0; blocos.forEach(function (b) { var lido = s.getRange(2, b.c, n, b.n).getValues(); lido.forEach(function (l, i) { l.forEach(function (v, j) { if (String(v) !== String(b.vals[i][j])) dif++; }); }); });
    var carimbo = (u.email || 'app') + ' · ' + agora_(), texto = mes + ' · virada para o app em ' + agora_() + ' por ' + (u.email || 'app');
    var faixas = blocos.map(function (b) { return letraCol_(b.c) + '2:' + letraCol_(b.c + b.n - 1); }).join(' e ');
    var sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa);
    gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': mes, 'ID': '(aba inteira)', 'Paciente': '', 'Campo': CAMPO_VIRADA, 'De': 'fórmula (ARRAYFORMULA em ' + faixas + ')', 'Para': n + ' linhas gravadas como valor' + (dif ? ' · ' + dif + ' célula(s) diferentes na releitura' : ''), 'Quem informou': texto, 'Registrado por (app)': carimbo });
    SpreadsheetApp.flush();
    return { ok: true, mes: mes, linhas: n, faixas: faixas, diferencas: dif, texto: texto };
  } finally { lock.releaseLock(); }
};
API.estadoVirada = function (d) { d = d || {}; return { ok: true, estado: estadoVirada_(String(d.mes || nomeAbaMes_(new Date()))) }; };

function procedimentos_() { return cacheado_('proc', lerProcedimentos_); }
function lerProcedimentos_() {
  var s = planilha_().getSheetByName(CONFIG.ABA.PROCEDIMENTOS);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 4).getValues().map(function (r) {
    var v = r[2]; if (typeof v === 'string') v = parseFloat(v.replace(/\./g, '').replace(',', '.'));
    return { nome: String(r[0] || '').trim(), especialidade: String(r[1] || '').trim(), valor: (v === '' || v == null || isNaN(v)) ? null : Number(v), obs: String(r[3] || '').trim() };
  }).filter(function (p) { return p.nome; });
}

// Corrigir um lançamento já gravado na aba do mês (gestão e recepção; aprovado pela Roberta em 06/10).
// Acha a linha pelo ID e só mexe nas colunas de cobrança preenchidas pela recepção: Pago?, Data do pagamento, Forma,
// Quem pagou, NF emitida?, Nº da NF, Guia assinada? e Observação (só acrescenta). Convênio e Modalidade da linha (F, G) só a
// gestão troca (10/10); paciente trocado regrava F, G, H e N com o cadastro do paciente certo. Nunca apaga nada; o carimbo da
// correção vai somado em "Registrado por (app)".
// Se a linha for a compra de um plano (Observação "Compra do plano P-…"), a aba Planos recebe o mesmo Pago?/Forma/NF.
API.corrigirLancamento = function (d) {
  d = d || {};
  var aba = String(d.aba || '').trim(), id = String(d.id || '').trim(), c = d.campos || {};
  if (CONFIG.MESES.indexOf(aba) < 0) return { ok: false, erros: ['Aba do mês inválida.'] };
  if (!id) return { ok: false, erros: ['Lançamento sem ID: corrija direto na planilha.'] };
  var s = planilha_().getSheetByName(aba); if (!s) return { ok: false, erros: ['A aba "' + aba + '" não existe.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var h = cabecalhos_(s), HM = CONFIG.HM, bloq = bloqueioPlanilha_([s]);
    if (bloq) return { ok: false, erros: [bloq] };
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
    var amplo = function (k, v, rotulo) { var m = mudar(k, v, rotulo); if (m) amplos.push({ campo: rotulo, de: m.de, para: m.para }); return m; };
    // correção ampla (recepção e gestão; gestão 07/10): dados da sessão e valores, sempre com "quem informou" e registro em "Alterações de lançamento"
    if (quer('data')) { var dt = parseData_(c.data); if (!dt) erros.push('Data da sessão inválida.'); else if (nomeAbaMes_(dt) !== aba) erros.push('A data nova é de outro mês: lance a sessão no mês certo (Registrar) e marque esta como "Cancelado pela clínica".'); else amplo('DATA', dt, 'Data'); }
    if (quer('hora')) { var hr = horaTxt_(c.hora); if (hr && !/^\d{2}:\d{2}$/.test(hr)) erros.push('Hora inválida (hh:mm).'); else amplo('HORA', hr, 'Hora'); }
    var pacNovo = null;
    if (quer('paciente')) { var np = String(c.paciente || '').trim(); pacNovo = indicePacientes_().filter(function (p) { return p.nome === np; })[0]; if (!pacNovo) erros.push('Paciente novo não está em Pacientes.'); else if (!amplo('PACIENTE', np, 'Paciente')) pacNovo = null; }
    // convênio e modalidade gravados na linha (gestão, 10/10): só a gestão troca; a recepção vê, mas não edita
    var cadLinha = [], muda = function (k, v, rotulo) { var m = mudar(k, v, rotulo); if (m) cadLinha.push({ campo: rotulo, de: m.de, para: m.para }); return m; };
    if ((quer('convenio') || quer('modalidade')) && u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão troca o convênio ou a modalidade de uma linha.'] };
    if (quer('convenio')) { var cv = String(c.convenio || '').trim(), lcv = colunaLista_(CONFIG.LISTAS.CONVENIO); if (cv && lcv.length && lcv.indexOf(cv) < 0) erros.push('Convênio fora da lista (aba Listas).'); else muda('CONV', cv, 'Convênio'); }
    if (quer('modalidade')) { var md = String(c.modalidade || '').trim(), lmd = colunaLista_(CONFIG.LISTAS.MODALIDADE); if (md && lmd.length && lmd.indexOf(md) < 0) erros.push('Modalidade fora da lista (aba Listas, Cobrança).'); else muda('MOD', md, 'Modalidade'); }
    // paciente trocado (lançado no paciente errado): a linha passa a levar o cadastro do paciente certo, salvo o que a gestão escolheu acima
    if (pacNovo) { var an = autoDoCadastro_(pacNovo), rot = { CONV: 'Convênio', MOD: 'Modalidade', ATENCAO: 'Atenção na cobrança', PAGADOR_L: 'Pagador habitual' };
      COLS_AUTO.forEach(function (k) { if ((k === 'CONV' && quer('convenio')) || (k === 'MOD' && quer('modalidade'))) return; muda(k, an[HM[k]], rot[k]); }); }
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
    if (amplos.length || cadLinha.length) {
      var sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa);
      cadLinha.forEach(function (m) { gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': aba, 'ID': id, 'Paciente': paciente, 'Campo': m.campo, 'De': m.de, 'Para': m.para, 'Quem informou': String(c.quemInformou || '').trim() || (pacNovo ? 'cadastro do paciente certo' : 'gestão'), 'Registrado por (app)': carimbo }); });
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
    invalidar_(['comp']);
    SpreadsheetApp.flush();
    var depois = {}; Object.keys(novos).forEach(function (k) { depois[k] = novos[k] instanceof Date ? fmtData_(novos[k]) : novos[k]; });
    return { ok: true, id: id, aba: aba, linha: linha, alterados: rotulos, novos: depois, plano: plano };
  } finally { lock.releaseLock(); }
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
var TIPOS_AGENDA = ['Aplicação de teste', 'Retorno']; // vazio = sessão ou consulta (o normal)
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
      'Ativo': d.ativo === false || d.ativo === 'Não' ? 'Não' : 'Sim', 'Observação': String(d.observacao || '').trim(), 'Registrado por (app)': (u.email || 'app') + ' · ' + agora_()  };
    // Tipo (coluna no fim, criada quando alguém escolhe): aplicação de teste e retorno saem sem cobrança na Agenda e não contam no antecipado
    var tipo = String(d.tipo || '').trim(); if (tipo && TIPOS_AGENDA.indexOf(tipo) < 0) return { ok: false, erros: ['Tipo inválido.'] };
    if (tipo || h['Tipo']) { h = garantirColunas_(s, ['Tipo']).h; pares['Tipo'] = tipo; }
    gravarCelulas_(s, linha, h, pares);
    ['Começa em', 'Termina em'].forEach(function (k) { if (h[k]) s.getRange(linha, h[k]).setNumberFormat('dd/MM/yyyy'); });
    if (h['Hora']) s.getRange(linha, h['Hora']).setNumberFormat('@');
    if (typeof invalidar_ === 'function') invalidar_(['comp']); // sessões agendadas do mês mudam
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
// linhas da aba do mês que não são sessão: recebimento do mês (app novo e antigo) e taxa de falta gerada pela gestão
function ehLinhaExtra_(proc) { return /^(Mensalidade (de |– |- )|Antecipado de |Pagamento de |Plano .*\(compra\)|Taxa de falta)/i.test(String(proc || '').trim()); }
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
    itens.push({ hora: r['Hora'], paciente: r['Paciente'], profissional: r['Profissional'], origem: /quinzen/i.test(String(r['Frequência'] || '')) ? 'Quinzenal' : 'Semanal', agendaId: r['ID'], obs: r['Observação'] || '', tipo: String(r['Tipo'] || '').trim() });
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
    // agendamento avulso com tipo "Aplicação de teste" ou "Retorno" (gestão, 15/10): o tipo vem da Origem
    itens.push({ hora: horaTxt_(r['Hora']), paciente: r['Paciente'], profissional: r['Profissional'], origem: origem, listaId: r['ID'], obs: r['Observação'] || '', tipo: String(r['Tipo'] || '').trim() || (/^(Aplicação de teste|Retorno)/i.test(origem) ? origem.split(' · ')[0] : '') });
  });
  // registros do dia na aba do mês
  var reg = {}, extras = [], nm = nomeAbaMes_(data);
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
      var o = { oque: String(g('OQUE') || ''), id: String(g('ID') || ''), procedimento: String(g('PROCEDIMENTO') || ''), hora: horaTxt_(g('HORA')),
        valor: numBR_(g('VALOR')), recebido: numBR_(g('RECEBIDO')), pago: String(g('PAGO') || '').trim(), forma: String(g('FORMA') || ''), nf: String(g('NF') || '').trim(), guia: String(g('GUIA') || '').trim(), convenio: String(g('Convênio (auto)') || '').trim() };
      // pagamento do mês e taxa de falta são linhas à parte: não tomam o lugar da sessão do mesmo paciente × profissional
      if (ehLinhaExtra_(o.procedimento)) { extras.push({ paciente: pac, profissional: k.split('|')[1], registro: o }); return; }
      reg[k] = o;
      if (!reg[pac]) reg[pac] = reg[k];
    });
  }
  itens.forEach(function (it) { it.registro = reg[it.paciente + '|' + it.profissional] || null; });
  // registrados hoje que não estavam na lista (encaixes feitos direto no Atendimento)
  Object.keys(reg).forEach(function (k) {
    if (k.indexOf('|') < 0) return; var pac = k.split('|')[0], prof = k.split('|')[1];
    if (!itens.some(function (it) { return it.paciente === pac && it.profissional === prof; })) itens.push({ hora: reg[k].hora || '', paciente: pac, profissional: prof, origem: 'Registrado', registro: reg[k] });
  });
  extras.forEach(function (x) { var taxa = /^Taxa de falta/i.test(x.registro.procedimento); itens.push({ hora: x.registro.hora || '', paciente: x.paciente, profissional: x.profissional, origem: taxa ? 'Taxa de falta' : 'Pagamento do mês', tipo: taxa ? 'taxa de falta' : 'pagamento do mês', extra: true, registro: x.registro }); });
  itens.sort(function (a, b) { return (a.profissional + a.hora).localeCompare(b.profissional + b.hora); });
  return { data: chave, diaSemana: diaSemana, itens: itens, abaMes: nomeAbaMes_(data), abaMesExiste: cm.existe };
}
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
    var its = r.itens.filter(function (it) { return !it.extra; }); // a grade mostra horários; pagamento do mês e taxa de falta ficam na lista
    dias.push({ data: r.data, diaSemana: r.diaSemana, itens: prof ? its.filter(function (it) { return it.profissional === prof; }) : its });
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
    invalidar_(['pac']);
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
// Mudança de convênio/cobrança no cadastro (gestão, 10/10): o passado não muda. Opcional: as linhas do mês aberto
// (aba do mês de hoje) com data a partir de hoje podem levar o cadastro novo, se a gestão confirmar. Nunca meses anteriores.
function linhasAbertas_(nome) {
  var hoje = new Date(), aba = nomeAbaMes_(hoje), s = planilha_().getSheetByName(aba), hk = Utilities.formatDate(hoje, CONFIG.TZ, 'yyyyMMdd');
  if (!s) return { aba: aba, s: null, linhas: [] };
  var linhas = linhasMes_(aba).linhas.filter(function (r) { var dt = parseData_(r.data); return r.paciente === nome && r.id && dt && dt.getFullYear() === hoje.getFullYear() && Utilities.formatDate(dt, CONFIG.TZ, 'yyyyMMdd') >= hk; });
  return { aba: aba, s: s, linhas: linhas };
}
API.linhasAbertasPaciente = function (d) {
  d = d || {}; if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] };
  var p = linhaPaciente_(d.nome); if (!p) return { ok: false, erros: ['Paciente não encontrado em Pacientes.'] };
  var a = autoDoCadastro_(p), HM = CONFIG.HM, la = linhasAbertas_(p.nome);
  var dif = la.linhas.filter(function (r) { return r.convenio !== a[HM.CONV] || r.modalidade !== a[HM.MOD]; });
  return { ok: true, aba: la.aba, paciente: p.nome, convenio: a[HM.CONV], modalidade: a[HM.MOD], linhas: dif.map(function (r) { return { id: r.id, data: r.data, hora: r.hora, profissional: r.profissional, convenio: r.convenio, modalidade: r.modalidade }; }) };
};
API.atualizarLinhasDoCadastro = function (d) {
  d = d || {}; var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão.'] };
  var p = linhaPaciente_(d.nome); if (!p) return { ok: false, erros: ['Paciente não encontrado em Pacientes.'] };
  var quer = {}; (d.ids || []).forEach(function (x) { quer[String(x)] = 1; });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var la = linhasAbertas_(p.nome); if (!la.s) return { ok: false, erros: ['A aba ' + la.aba + ' não existe.'] };
    var bloq = bloqueioPlanilha_([la.s]); if (bloq) return { ok: false, erros: [bloq] };
    var h = cabecalhos_(la.s), HM = CONFIG.HM, a = autoDoCadastro_(p), carimbo = (u.email || 'app') + ' · ' + agora_(), feitas = [];
    var rot = { CONV: 'Convênio', MOD: 'Modalidade', ATENCAO: 'Atenção na cobrança', PAGADOR_L: 'Pagador habitual' };
    var sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa);
    la.linhas.forEach(function (r) {
      if (!quer[r.id]) return; // só as que a gestão confirmou, e só se ainda forem do mês aberto, de hoje em diante
      var atual = la.s.getRange(r.linha, 1, 1, la.s.getLastColumn()).getValues()[0], pares = {}, mud = [];
      COLS_AUTO.forEach(function (k) { var c = h[HM[k]]; if (!c) return; var de = String(atual[c - 1] == null ? '' : atual[c - 1]).trim(); if (de !== a[HM[k]]) { pares[HM[k]] = a[HM[k]]; mud.push({ campo: rot[k], de: de, para: a[HM[k]] }); } });
      if (!mud.length) return;
      if (h[HM.LOG]) pares[HM.LOG] = (String(atual[h[HM.LOG] - 1] || '').trim() ? String(atual[h[HM.LOG] - 1]).trim() + ' | ' : '') + 'corrigido por ' + carimbo + ' (' + mud.map(function (m) { return m.campo; }).join(', ') + ' — cadastro novo)';
      gravarCelulas_(la.s, r.linha, h, pares);
      mud.forEach(function (m) { gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': la.aba, 'ID': r.id, 'Paciente': p.nome, 'Campo': m.campo, 'De': m.de, 'Para': m.para, 'Quem informou': 'mudança no cadastro (linhas de hoje em diante)', 'Registrado por (app)': carimbo }); });
      feitas.push(r.id);
    });
    SpreadsheetApp.flush();
    return { ok: true, aba: la.aba, atualizadas: feitas };
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
      convenio: String(g(r, 'CONV') || ''), modalidade: String(g(r, 'MOD') || ''), oque: String(g(r, 'OQUE') || ''), valor: numBR_(g(r, 'VALOR')), recebido: numBR_(g(r, 'RECEBIDO')), pago: String(g(r, 'PAGO') || '').trim(), dataPag: fmtData_(g(r, 'DATA_PAG')),
      forma: String(g(r, 'FORMA') || ''), quem: String(g(r, 'QUEM') || ''), nf: String(g(r, 'NF') || '').trim(), nfN: String(g(r, 'NF_N') || ''), guia: String(g(r, 'GUIA') || '').trim(), obs: String(g(r, 'OBS') || ''), id: String(g(r, 'ID') || ''), log: String(g(r, 'LOG') || ''), detalhe: String(g(r, 'DETALHE') || ''), decisao: String(g(r, 'DECISAO') || '').trim() });
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
    // Faltas → Decidir (gestão, 15/10): TODA falta e desmarcação entra, com o Detalhe da recepção e a decisão da gestão
    faltas: L.filter(function (r) { return /^(Faltou|Desmarcou)/i.test(r.oque) && !ehPerdido_(r.pago); }),
    cadastroIncompleto: cadastroIncompletoMes_(atend),
    // aplicações de teste (gestão, 15/10): sem número fixo; quem fez aplicação nos últimos 60 dias, com quantas já fez
    avaliacoes: avaliacoesEmAndamento_(),
    // relatório "Perdidos e glosas" (só gestão): o Valor é a referência do que se perdeu
    perdidos: usuario_().perfil === 'gestao' ? L.filter(function (r) { return ehPerdido_(r.pago); }) : [],
    descontos: L.filter(function (r) { return /^Desconto:/i.test(r.obs); }),
    extras: L.filter(function (r) { return /^Sessão extra liberada/i.test(r.obs); }),
    pagadorDiferente: atend.filter(function (r) { return r.quem; }),
    // linhas de convênio sem convênio gravado (gestão, 10/10): sem o nome, o Repasse joga em "Convênio (sem nome)" sem regra
    semConvenio: usuario_().perfil === 'gestao' ? L.filter(function (r) { return (/^Convênio/i.test(r.pago) || ehPerdido_(r.pago)) && !String(r.convenio || '').trim(); }) : [],
    virada: m.existe ? estadoVirada_(mes) : null,
    alteracoes: []
  };
  var sl = planilha_().getSheetByName(CONFIG.ABA.ALTERACOES);
  if (sl && sl.getLastRow() >= 2) {
    var idx = CONFIG.MESES.indexOf(mes), mm = ('0' + (idx + 1)).slice(-2);
    linhasComo_(sl).forEach(function (r) { var dt = String(r['Data/hora'] || ''); if (dt.slice(3, 5) === mm) out.alteracoes.push({ quando: dt, paciente: r['Paciente'], campo: r['Campo'], de: r['De'], para: r['Para'], quem: r['Quem informou'], por: r['Registrado por (app)'] }); });
  }
  out.mesesExistentes = CONFIG.MESES.filter(function (x) { return !!planilha_().getSheetByName(x); });
  out.competencias = competenciasExistentes_();
  return out;
};
/* ---------- Repasse (só gestão, 10/10) ----------
   As regras ficam na aba "Regras de repasse" e a gestão muda na tela Repasse (ou direto na aba). Nada é fixo no código.
   Uma regra = profissional (ou "Todos") + convênio ("Particular", o nome do convênio ou "Qualquer") + procedimento (trecho, opcional) → %.
   Vale a regra mais específica: procedimento (exceção) > profissional > convênio; empate fica com a de baixo. "Ativa = Não" desliga sem apagar.
   "Valor da sessão (convênio)" é a base quando a linha do convênio está sem valor (R$ 0 na aba do mês).
   % negativo = a profissional deve à clínica (ex.: PLASC que a Luciana fatura e recebe: −40% abate do repasse).
   Convênio "Desconto mensal" + valor = abatimento fixo do mês (ex.: pró-labore da Juliana R$ 1.621), mostrado à parte. */
var HR_REPASSE = ['Ativa', 'Profissional', 'Convênio', 'Procedimento (contém)', '% repasse', 'Valor da sessão (convênio) (R$)', 'Observação', 'Alterado por (app)'];
var ABA_REPASSE = 'Regras de repasse';
function semAcento_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function regrasRepasse_() { return cacheado_('rep', lerRegrasRepasse_); }
function lerRegrasRepasse_() {
  var s = planilha_().getSheetByName(ABA_REPASSE);
  return linhasComo_(s).map(function (r) {
    var bruto = String(r['% repasse'] == null ? '' : r['% repasse']).trim(), pct = bruto === '' ? null : numBR_(bruto.replace('%', ''));
    if (typeof r['% repasse'] === 'number' && r['% repasse'] > 0 && r['% repasse'] <= 1) pct = r['% repasse'] * 100; // célula em formato %
    return { linha: r._linha, ativa: !/^n/i.test(String(r['Ativa'] || 'Sim')), profissional: String(r['Profissional'] || '').trim(), convenio: String(r['Convênio'] || '').trim(),
      procedimento: String(r['Procedimento (contém)'] || '').trim(), pct: pct, valorRef: numBR_(r['Valor da sessão (convênio) (R$)']), obs: String(r['Observação'] || '').trim() };
  }).filter(function (g) { return g.profissional || g.convenio; });
}
function ehDescontoMensal_(g) { return semAcento_(g.convenio) === 'desconto mensal'; }
function convenioDaLinha_(l) { if (/^PLASC/i.test(l.pago)) return 'PLASC'; var c = String(l.convenio || '').trim(); if (c && !/^Particular$/i.test(c)) return c; return /^Convênio/i.test(l.pago) ? (c || 'Convênio (sem nome)') : 'Particular'; }
// soValor: procura só o "valor da sessão (convênio)" (regra pode não ter %)
function regraPara_(regras, prof, conv, proc, soValor) {
  var melhor = null, nota = -1, P = semAcento_(prof), C = semAcento_(conv), PR = semAcento_(proc);
  regras.forEach(function (g) {
    if (!g.ativa || ehDescontoMensal_(g) || (soValor ? !(g.valorRef > 0) : g.pct == null)) return;
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
  // setembro foi importado sem procedimento: a aplicação de teste (reconhecida pela observação) usa a regra da avaliação
  var procR = l.procedimento || (typeof ehAplicacaoLinha_ === 'function' && ehAplicacaoLinha_(l) ? 'Aplicação de teste – avaliação neuropsicológica' : '');
  var conv = convenioDaLinha_(l), g = regraPara_(regras, l.profissional, conv, procR), pct = g ? g.pct : null, gv = regraPara_(regras, l.profissional, conv, procR, true);
  var sit, basePago = 0, basePrev = 0, v = Number(l.valor) || 0;
  if (ehPerdido_(l.pago)) sit = 'perdido';
  else if (/fatura d[ao] /i.test(l.pago)) { basePago = basePrev = v || (gv ? gv.valorRef : 0); sit = 'faturado pela profissional'; } // ela recebeu direto: o % (negativo) abate
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
  // descontos fixos do mês (regra com convênio "Desconto mensal"), por profissional
  regras.forEach(function (g) { if (!g.ativa || !ehDescontoMensal_(g) || !(g.valorRef > 0)) return; var p = por[g.profissional] = por[g.profissional] || { profissional: g.profissional, sessoes: 0, basePago: 0, repassePago: 0, basePrev: 0, repassePrev: 0, semRegra: 0, perdido: 0, porConvenio: {} }; p.desconto = (p.desconto || 0) + g.valorRef; p.descontoObs = (p.descontoObs ? p.descontoObs + ' · ' : '') + (g.obs || 'desconto mensal'); });
  var lista = Object.keys(por).sort().map(function (k) { var p = por[k]; p.desconto = p.desconto || 0; ['basePago', 'repassePago', 'basePrev', 'repassePrev', 'perdido', 'desconto'].forEach(function (f) { p[f] = r2(p[f]); }); p.liquidoPago = r2(p.repassePago - p.desconto); p.liquidoPrev = r2(p.repassePrev - p.desconto);
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
    else if (!semPct && !(pct >= -100 && pct <= 100)) erros.push('Regra ' + (i + 1) + ': % de repasse entre −100 e 100 (negativo = a profissional deve à clínica).');
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
    invalidar_(['rep']);
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
// Gestão: cria a aba de um mês copiando a estrutura da aba-modelo: só cabeçalho, validações e formatação.
// Nasce SEM fórmula em F/G/H/N (10/10): o app grava o cadastro em cada linha na hora de salvar.
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
    var max = nova.getMaxRows();
    // limpa os dados de todas as colunas, inclusive as fórmulas antigas de F/G/H/N (clearContent mantém validações e formatação)
    if (max > 1) nova.getRange(2, 1, max - 1, nova.getMaxColumns()).clearContent();
    ss.setActiveSheet(nova); ss.moveActiveSheet(CONFIG.MESES.indexOf(nome) < CONFIG.MESES.indexOf(modelo.getName()) ? modelo.getIndex() : modelo.getIndex() + 1);
    SpreadsheetApp.flush();
    return { ok: true, aba: nome, modelo: modelo.getName(), formulas: formulasAuto_(nova) };
  } finally { lock.releaseLock(); }
};


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
  d = d || {}; var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão muda as sessões da competência.'] };
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

/* ---------- Cobrança por profissional: cadastro (gestão edita; recepção lê) ---------- */
API.cobrancasDoPaciente = function (d) { d = d || {}; var nome = String(d.nome || '').trim(); return { ok: true, linhas: cobrancasProf_().filter(function (l) { return l.paciente === nome; }).map(function (l) { l.resumo = Cobranca.resumoLinha(l); return l; }), valores: valoresSessao_() }; };
API.salvarCobrancaProf = function (d) {
  d = d || {}; var u = usuario_(); if (u.perfil !== 'gestao') return { ok: false, erros: ['Só a gestão altera a cobrança por profissional.'] };
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

API;
