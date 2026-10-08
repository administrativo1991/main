/* ================= PACOTES (substitui Mensalistas; gestão, 07-08/10) =================
   Pacote + Antecipado: a renovação soma as sessões; cada sessão que gasta tira 1 (regra em consumoPacote).
   Pacote + Posterior: cada sessão fica lançada não paga, com o valor do pacote ÷ sessões, e é recebida no fim do mês. */
var PCT = null, pctFiltro = 'todos', pctIniciado = false;
var VALIDADE_PACOTE = { 4: 2, 12: 6 }, VALIDADE_PADRAO = 2; // meses de validade das sessões, pelo tamanho do pacote
INICIAR.pacotes = function (extra) {
  if (extra && extra.buscar) $("#k-busca").value = extra.buscar;
  quandoAT(function () { pctIniciado = true; carregarPacotes(); });
};
function carregarPacotes() {
  $("#k-carregando").hidden = false;
  call('pacotesPainel').then(function (r) { PCT = r; $("#k-carregando").hidden = true; renderPacotes(); })
    .catch(function (e) { $("#k-carregando").textContent = 'Não consegui carregar: ' + e.message; });
}
var SIT_PCT = { ok: ['verde', 'em dia'], renovar: ['amarela', 'última sessão'], esgotado: ['vermelha', 'pacote esgotado'], vencido: ['vermelha', 'validade vencida'], 'renovação do mês em aberto': ['amarela', 'renovação do mês em aberto'], 'a pagar no mês': ['amarela', 'a pagar no mês'] };
function grupoPct(it) { return it.situacao === 'ok' ? 'ok' : /esgotado|vencido/.test(it.situacao) ? 'esg' : 'atn'; }
function renderPacotes() {
  var q = semAcento($("#k-busca").value || ''), itens = PCT.itens || [];
  var cont = { todos: itens.length, ok: 0, atn: 0, esg: 0 }; itens.forEach(function (it) { cont[grupoPct(it)]++; });
  var k = $("#k-kpis"); k.innerHTML = '';
  [['todos', 'pacotes', ''], ['ok', 'em dia', 'verde'], ['atn', 'última sessão · a renovar · a pagar', 'amarela'], ['esg', 'esgotados ou vencidos', 'vermelha']].forEach(function (x) {
    var b = el('<button type="button" class="kpi ' + x[2] + '" aria-pressed="' + (pctFiltro === x[0]) + '"><b>' + cont[x[0]] + '</b><span>' + x[1] + '</span></button>');
    b.addEventListener('click', function () { pctFiltro = x[0]; renderPacotes(); }); k.appendChild(b);
  });
  var lista = itens.filter(function (it) { return (pctFiltro === 'todos' || pctFiltro === grupoPct(it)) && (!q || semAcento(it.paciente).indexOf(q) >= 0 || semAcento(it.pagador || '').indexOf(q) >= 0); });
  var root = $("#k-list"); root.innerHTML = '';
  if (!lista.length) { root.innerHTML = '<div class="vazio">' + (itens.length ? 'Ninguém neste filtro.' : 'Nenhum paciente com Cobrança = pacote.') + '</div>'; return; }
  var card = el('<div class="tabela-card pct-card"><div class="tabela-wrap"><table class="pct"><thead><tr><th>Paciente</th><th>Pacote</th><th>Pagamento</th><th>Sessões</th><th>Última renovação</th><th>Situação</th><th></th></tr></thead><tbody></tbody></table></div><div class="tabela-rodape"><span>Mostrando ' + lista.length + ' de ' + itens.length + '</span><span>Validade: 4 sessões = 2 meses · 12 sessões = 6 meses</span><span>Ninguém começa com sessões: elas entram na renovação</span></div></div>');
  var tb = $('tbody', card);
  lista.forEach(function (it) {
    var s = SIT_PCT[it.situacao] || ['cinza', it.situacao], ant = it.pagamento === 'Antecipado';
    var pacote = (it.cobranca === 'Pacote social' ? 'Pacote social · ' : '') + sessoesTxt(it.sessoes) + (it.valor ? ' · R$ ' + brl(it.valor) : '');
    var sess = ant ? '<b>' + esc(disponiveisTxt(it.disponiveis)) + '</b>' : esc('este mês: ' + sessoesTxt(it.sessoesMes || 0)) + (it.aPagarMes ? '<br><b>R$ ' + brl(it.aPagarMes) + ' a pagar</b>' : '');
    var ren = it.ultima ? esc(it.ultima) + (it.validade ? '<div class="muted">válidas até ' + esc(it.validade) + '</div>' : '') : '<span class="muted">—</span>';
    var acao = ant ? '<button type="button" class="btn' + (s[0] === 'verde' ? ' ter' : '') + '" data-ren>Registrar renovação</button>' : '<span class="muted">recebe no fim do mês (Agenda → Receber)</span>';
    var tr = el('<tr><td class="td-quem"><div style="font-weight:700">' + esc(it.paciente) + '</div><div class="muted">' + esc(it.pagador ? 'pagador: ' + it.pagador : '') + '</div></td><td class="td-pac">' + esc(pacote) + '<span class="so-tel"> · ' + esc(it.pagamento) + '</span></td><td class="td-pg">' + esc(it.pagamento) + '</td><td class="td-ses">' + sess + '</td><td class="td-ren">' + ren + '</td><td class="td-sit"><span class="tag ' + s[0] + '">' + esc(s[1]) + '</span></td><td class="td-acao" style="text-align:right">' + acao + '</td></tr>');
    var b = $('[data-ren]', tr); if (b) b.addEventListener('click', function () { var p = pacInfo(it.paciente); if (!p) return toast('Paciente não está em Pacientes'); abrirRenovacao($("#k-renbox"), p, carregarPacotes); });
    tb.appendChild(tr);
  });
  root.appendChild(card);
}
$("#k-busca").addEventListener('input', function () { if (PCT) renderPacotes(); });

/* ---------- renovação do pacote (Registrar e tela Pacotes usam o mesmo formulário) ---------- */
function dataMaisMeses(s, m) { var d = dataObj(s); if (!d) return ''; var x = new Date(d.getFullYear(), d.getMonth() + m, d.getDate()); return ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2) + '/' + x.getFullYear(); }
function abrirRenovacao(box, p, aoTerminar) {
  var k = pacoteDe(p), e = estPacote(p);
  box.innerHTML = '<div class="cab"><h2>Registrar renovação do pacote · ' + esc(p.nome) + '</h2><span class="esp"></span><button type="button" class="btn icone p" data-fechar aria-label="Fechar">' + ic('fechar', 16) + '</button></div>' +
    '<p class="muted" style="margin:0">Soma as sessões às sessões disponíveis (hoje: ' + esc(disponiveisTxt(e.disponiveis)) + '). Grava uma linha na aba <b>Renovações</b> (o Financeiro concilia) e o recebimento na aba do mês.</p>' +
    '<div class="grid">' +
    '<label class="campo">Sessões<input data-r="sessoes" inputmode="numeric" value="' + esc(k.n || '') + '"' + (cobDe(p) === 'Pacote social' ? ' readonly' : '') + '></label>' +
    '<label class="campo">Valor recebido<div class="campo-wrap"><span class="prefixo">R$</span><input data-r="valor" class="dinheiro" inputmode="decimal" value="' + (k.valor ? brl(k.valor) : '') + '"></div></label>' +
    '<label class="campo">Data do pagamento<input data-r="data" inputmode="numeric" maxlength="10" value="' + hojeStr() + '"></label>' +
    '<label class="campo">Forma<select data-r="forma"></select></label>' +
    '<label class="campo">Quem pagou<input data-r="quemPagou" list="dl-pagadores" autocomplete="off" value="' + esc(p.pagador || p.nome) + '"></label>' +
    '<label class="campo">NF emitida?<select data-r="nf"><option>Não</option><option>Sim</option></select></label>' +
    '<label class="campo">Nº da NF<input data-r="nfNumero" autocomplete="off"></label>' +
    '<label class="campo c2">Observação <span class="leg">(opcional)</span><input data-r="observacao" autocomplete="off"></label>' +
    '</div><div class="faixa nota" data-r-resumo></div><div data-r-erros></div>' +
    '<div class="acoes"><button type="button" class="btn" data-r-ok>Registrar renovação</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div>';
  box.hidden = false;
  var v = function (n) { return $('[data-r=' + n + ']', box); };
  preencherSelect(v('forma'), BOOT.listas.formas || [], '—');
  var resumo = function () { var n = parseInt(v('sessoes').value, 10) || 0, meses = VALIDADE_PACOTE[k.n || n] || VALIDADE_PADRAO; $('[data-r-resumo]', box).innerHTML = '+' + esc(sessoesTxt(n)) + (e.disponiveis + n === 1 ? ' · fica <b>' : ' · ficam <b>') + esc(disponiveisTxt(e.disponiveis + n)) + '</b> · válidas até ' + esc(dataMaisMeses(v('data').value, meses) || '—') + ' (' + meses + ' meses)'; };
  ['sessoes', 'data'].forEach(function (n) { v(n).addEventListener('input', resumo); });
  v('data').addEventListener('input', function () { this.value = mascaraData(this.value); });
  resumo();
  $$('[data-fechar]', box).forEach(function (b) { b.addEventListener('click', function () { box.hidden = true; box.innerHTML = ''; }); });
  $('[data-r-ok]', box).addEventListener('click', function () {
    var d = { paciente: p.nome }; ['sessoes', 'valor', 'data', 'forma', 'quemPagou', 'nf', 'nfNumero', 'observacao'].forEach(function (n) { d[n] = v(n).value.trim(); });
    if (typeof $ === 'function' && $("#a-prof") && telaAtual === 'registrar') d.profissional = $("#a-prof").value;
    var er = [];
    if (!(parseInt(d.sessoes, 10) > 0)) er.push('Informe quantas sessões entram.');
    if (!(num(d.valor) > 0)) er.push('Informe o valor recebido.');
    if (!dataValida(d.data)) er.push('Data do pagamento inválida (dd/mm/aaaa).');
    if (!d.forma) er.push('Escolha a forma de pagamento.');
    $('[data-r-erros]', box).innerHTML = erroBox(er); if (er.length) return;
    var b = this; b.disabled = true;
    call('renovarPacote', d).then(function (r) {
      if (!r.ok) { $('[data-r-erros]', box).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
      var ps = AT.pacotesSessoes = AT.pacotesSessoes || {}, ep = ps[p.nome] = ps[p.nome] || estPacote(p);
      if (r.disponiveis != null) ep.disponiveis = r.disponiveis; else ep.disponiveis = (ep.disponiveis || 0) + parseInt(d.sessoes, 10);
      ep.ultima = d.data; ep.validade = r.validade || ep.validade; ep.renovouMes = true; ep.vencido = false;
      if (typeof invalidarResumo === 'function') invalidarResumo();
      box.hidden = true; box.innerHTML = '';
      toast('Renovação registrada · ' + disponiveisTxt(ep.disponiveis) + (r.validade ? ' até ' + r.validade : ''));
      if (aoTerminar) aoTerminar(r);
    }).catch(function (er2) { toast('Erro: ' + er2.message); }).finally(function () { b.disabled = false; });
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
