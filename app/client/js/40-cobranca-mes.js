/* ================= COBRANÇA DO MÊS (Fase 1, 15/10: substitui a tela Pacotes) =================
   Uma linha por paciente × profissional com Mensalidade fixa, Antecipado (valor × sessões agendadas) ou Fim do mês (Posterior).
   Lê e grava na aba Mensalistas (colunas por competência: sessões agendadas · valor cobrado · pago? · data · forma · NF)
   e lança o recebimento na aba do mês. Nada é apagado; a gestão edita as sessões quando a agenda não bate. */
var CM = null, cmChave = '', cmFiltro = 'todos', cmGen = 0;
INICIAR.cobranca = function (extra) {
  if (extra && extra.buscar) $("#cm-busca").value = extra.buscar;
  if (!cmChave) cmChave = Cobranca.chaveMes(new Date());
  quandoAT(carregarCobrancaMes);
};
function carregarCobrancaMes() {
  var gen = ++cmGen; $("#cm-carregando").hidden = false; $("#cm-list").innerHTML = ''; $("#cm-aviso").innerHTML = ''; $("#cm-chave").textContent = cmChave;
  call('cobrancaMes', { chave: cmChave }).then(function (r) {
    if (gen !== cmGen) return; $("#cm-carregando").hidden = true;
    if (!r.ok) return toast((r.erros || ['Não consegui carregar']).join(' '));
    CM = r; renderCobrancaMes();
  }).catch(function (e) { if (gen !== cmGen) return; $("#cm-carregando").hidden = true; $("#cm-list").innerHTML = '<div class="vazio">Não consegui carregar: ' + esc(e.message) + '</div>'; });
}
function grupoCM(it) { return it.situacao === 'em dia' ? 'ok' : /atrasad/.test(it.situacao) ? 'atr' : it.situacao === 'futura' ? 'fut' : 'atn'; }
function renderCobrancaMes() {
  var r = CM, q = semAcento($("#cm-busca").value || ''), itens = r.itens || [];
  var cont = { todos: itens.length, ok: 0, atn: 0, atr: 0, fut: 0 }; itens.forEach(function (it) { cont[grupoCM(it)]++; });
  var k = $("#cm-kpis"); k.innerHTML = '';
  [['todos', 'no mês', ''], ['ok', 'em dia', 'verde'], ['atn', 'a vencer · a receber', 'amarela'], ['atr', 'atrasados', 'vermelha']].forEach(function (x) {
    if (x[0] === 'atr' && !cont.atr) return;
    var b = el('<button type="button" class="kpi ' + x[2] + '" aria-pressed="' + (cmFiltro === x[0]) + '"><b>' + cont[x[0]] + '</b><span>' + x[1] + '</span></button>');
    b.addEventListener('click', function () { cmFiltro = cmFiltro === x[0] ? 'todos' : x[0]; renderCobrancaMes(); }); k.appendChild(b);
  });
  // aviso: colunas da competência ainda não existem na aba Mensalistas (a gestão cria; o app cria sozinho no 1º pagamento)
  var av = '';
  if (!r.colunasExistem) av += '<div class="faixa amarela"><div class="corpo"><div class="t">Colunas de ' + esc(r.chave) + ' ainda não existem na aba Mensalistas</div><div>O app cria sozinho no primeiro pagamento registrado' + (ehGestao() ? ', ou crie agora.' : '. A gestão também pode criar em Pendências → Virada do mês.') + '</div></div>' + (ehGestao() ? '<div class="acoes"><button type="button" class="btn ter" id="cm-criar" data-chave="' + esc(r.chave) + '">Criar colunas de ' + esc(r.chave) + '</button></div>' : '') + '</div>';
  $("#cm-aviso").innerHTML = av;
  var bc = $("#cm-criar"); if (bc) bc.addEventListener('click', function () { var b = this; b.disabled = true; call('criarColunasMes', { chave: b.dataset.chave }).then(function (r2) { if (!r2.ok) { b.disabled = false; return toast((r2.erros || ['Não criou']).join(' ')); } toast('Colunas de ' + r2.chave + ' criadas'); carregarCobrancaMes(); }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); }); });
  var lista = itens.filter(function (it) { return (cmFiltro === 'todos' || cmFiltro === grupoCM(it)) && (!q || semAcento(it.paciente).indexOf(q) >= 0 || semAcento(it.pagador || '').indexOf(q) >= 0 || semAcento(it.profissional).indexOf(q) >= 0); });
  var root = $("#cm-list"); root.innerHTML = '';
  if (!lista.length) { root.innerHTML = '<div class="vazio">' + (itens.length ? 'Ninguém neste filtro.' : 'Ninguém com mensalidade, antecipado ou fim do mês em ' + esc(r.chave) + '.') + '</div>'; return; }
  var totalMes = lista.reduce(function (a, it) { return a + (it.valorMes || 0); }, 0), pagoMes = lista.filter(function (it) { return it.pago === 'Sim'; }).reduce(function (a, it) { return a + (it.valorMes || 0); }, 0);
  var card = el('<div class="tabela-card"><div class="tabela-wrap"><table class="cm"><thead><tr><th>Paciente</th><th>Profissional · cobrança</th><th>Sessões</th><th>Valor do mês</th><th>Situação</th><th class="no-print"></th></tr></thead><tbody></tbody></table></div><div class="tabela-rodape"><span>Mostrando ' + lista.length + ' de ' + itens.length + '</span><span>' + esc(r.chave) + ': ' + esc(brlCurto(totalMes)) + ' no mês · ' + esc(brlCurto(pagoMes)) + ' já pago</span><span>vence dia ' + esc(String((r.params || {}).vencimento_dia || 10)) + ' · tolerância até dia ' + esc(String((r.params || {}).tolerancia_dia || 15)) + '</span></div></div>');
  var tb = $('tbody', card);
  lista.forEach(function (it) {
    var cor = COR_FAIXA[it.cor] || 'cinza';
    var sess = it.cobranca === 'Mensalidade fixa' ? '<span class="muted">não conta sessões</span>' + (it.atendidas ? '<div class="sub">' + it.atendidas + ' atendida' + (it.atendidas === 1 ? '' : 's') + '</div>' : '')
      : it.pagamento === 'Posterior' ? (it.atendidas || 0) + ' atendida' + (it.atendidas === 1 ? '' : 's') + '<div class="sub">a receber ' + esc(brlCurto(it.aReceber || 0)) + '</div>'
      : (it.sessoes == null ? '<span class="muted">sem agenda recorrente</span>' : it.sessoes + ' agendada' + (it.sessoes === 1 ? '' : 's') + (it.abatimentos.length ? '<div class="sub">' + it.abatimentos.map(function (a) { return esc(a.texto); }).join('<br>') + '<br><b>cobra ' + it.sessoesCobradas + '</b></div>' : ''));
    var valor = it.valorMes != null ? '<b>' + esc(brlCurto(it.valorMes)) + '</b>' + (it.valorCobradoEditado ? '<div class="sub">valor ajustado pela gestão</div>' : it.cobranca === 'Por sessão' && it.pagamento !== 'Posterior' && it.valor != null ? '<div class="sub">' + esc(brlCurto(it.valor)) + ' × ' + it.sessoesCobradas + '</div>' : '') : (it.pagamento === 'Posterior' ? '<span class="muted">soma das sessões</span>' : '<span class="muted">a definir</span>');
    var pg = it.pago === 'Sim' ? 'pago' + (it.data ? ' em ' + esc(it.data) : '') + (it.forma ? ' · ' + esc(it.forma) : '') + (it.nf ? '<div class="sub">NF: ' + esc(it.nf) + '</div>' : '<div class="sub">NF a emitir</div>') : it.pago === 'Parcial' ? 'pago em parte' + (it.recebido ? ' (' + esc(brlCurto(it.recebido)) + ')' : '') + (it.data ? ' em ' + esc(it.data) : '') : '<span class="muted">—</span>';
    var acao = it.pagamento === 'Posterior' ? (it.aReceber > 0 ? '<button type="button" class="btn mini" data-pg>Receber o mês</button>' : '') : '<button type="button" class="btn' + (it.pago === 'Sim' ? ' ter' : '') + ' mini" data-pg>' + (it.pago === 'Sim' ? 'Outro pagamento' : 'Registrar pagamento') + '</button>';
    if (ehGestao() && it.cobranca !== 'Mensalidade fixa' && it.pagamento !== 'Posterior') acao += '<button type="button" class="btn link mini" data-ed>Editar sessões</button>';
    acao += botaoCobrarCM(it);
    var tr = el('<tr><td class="td-pac"><a href="#" data-ficha>' + esc(it.paciente) + '</a><div class="sub">' + esc(it.pagador && it.pagador !== it.paciente ? 'pagador: ' + it.pagador : '') + '</div></td><td>' + esc(profCurto(it.profissional)) + '<div class="sub">' + esc(it.rotulo.replace(/^[^:]+: /, '')) + (it.obs ? ' · ' + esc(it.obs) : '') + '</div></td><td>' + sess + '</td><td>' + valor + '</td><td><span class="tag ' + cor + '">' + esc(it.situacaoTxt) + '</span>' + (it.pago ? '<div class="sub">' + pg + '</div>' : '') + '</td><td class="no-print" style="text-align:right"><div class="acoes">' + acao + '</div></td></tr>');
    var bp = $('[data-pg]', tr); if (bp) bp.addEventListener('click', function () { abrirPagamentoMes($("#cm-pagbox"), { paciente: it.paciente, profissional: it.profissional, cobranca: it.cobranca, pagamento: it.pagamento, valor: it.valor, valorMes: it.pagamento === 'Posterior' ? it.aReceber : it.valorMes, chave: CM.chave, pagador: it.pagador, proximas: [CM.proximaChave] }, function () { carregarCobrancaMes(); recarregarAT().catch(function () { }); }); });
    var be = $('[data-ed]', tr); if (be) be.addEventListener('click', function () { abrirEditarSessoes(it); });
    ligarCobrarCM(tr, it);
    $('[data-ficha]', tr).addEventListener('click', function (e) { e.preventDefault(); go('ficha', { nome: it.paciente }); });
    tb.appendChild(tr);
  });
  root.appendChild(card);
}
/* ---------- Cobrar no WhatsApp (gestão, 15/10): texto oficial da clínica (app/shared/mensagens.js; a gestão troca em Parâmetros)
   Mensalidade fixa e antecipado → "mensalidade referente a {mes}"; fim do mês por sessão → "consultas realizadas em {mes}".
   Abrir o WhatsApp grava "Cobrança …" na aba Mensagens WhatsApp (competência e valor) e a linha mostra "cobrado em …". */
function valorACobrarCM(it) {
  if (Mensagens.tipoCobranca(it) === 'consultas') return it.aReceber || 0;
  if (it.pago === 'Sim' || it.valorMes == null) return 0;
  return Math.max(0, Math.round((it.valorMes - (it.pago === 'Parcial' ? (it.recebido || 0) : 0)) * 100) / 100);
}
function botaoCobrarCM(it) {
  var v = valorACobrarCM(it); if (!(v > 0)) return '';
  var cob = it.cobrado ? '<div class="sub">cobrado ' + esc(String(it.cobrado.quando || '').replace(/^(\d{2}\/\d{2})\/\d{4}/, '$1')) + '</div>' : '';
  if (!it.fone) return '<button type="button" class="btn ter mini" data-cobrar title="Sem WhatsApp no cadastro: digite o número">' + ic('send', 13, 2.4) + ' Cobrar no WhatsApp</button>' + cob;
  var tipo = Mensagens.tipoCobranca(it), msg = Mensagens.cobranca(tipo, CM.modelos && CM.modelos[tipo], it.pagador || it.paciente, CM.chave, v);
  return '<a class="btn ' + (it.cobrado ? 'ter' : 'sec') + ' mini" data-cobrar target="_blank" rel="noopener" title="' + esc('WhatsApp ' + it.foneFmt + (it.foneDe !== 'pagador' ? ' (telefone do ' + it.foneDe + ')' : '') + ' · R$ ' + Mensagens.valorBR(v)) + '" href="' + esc(Mensagens.linkWhats(it.fone, msg)) + '">' + ic('send', 13, 2.4) + (it.cobrado ? ' Cobrar de novo' : ' Cobrar no WhatsApp') + '</a>' + cob;
}
function ligarCobrarCM(tr, it) {
  var b = $('[data-cobrar]', tr); if (!b) return;
  if (it.fone) return b.addEventListener('click', function () {
    var tipo = Mensagens.tipoCobranca(it), v = valorACobrarCM(it);
    call('marcarMensagemEnviada', { tipo: tipo === 'consultas' ? 'Cobrança consultas' : 'Cobrança mensalidade', competencia: CM.chave, pagador: it.pagador || it.paciente, fone: it.fone, itens: [{ paciente: it.paciente, profissional: it.profissional, valor: v }] }).then(function (r) {
      if (!r.ok) return toast((r.erros || ['Não registrei a cobrança']).join(' '));
      it.cobrado = { por: r.por, quando: r.quando }; setTimeout(function () { if (aindaNa('cobranca', navGen)) renderCobrancaMes(); }, 300);
    }).catch(function (e) { toast('Não registrei a cobrança: ' + e.message); });
  });
  b.addEventListener('click', function () {
    var n = window.prompt('WhatsApp de ' + (it.pagador || it.paciente) + ' (DDD + número). Vai para o cadastro do paciente:', '');
    if (n == null) return; if (!Mensagens.fone(n)) return toast('WhatsApp inválido: DDD + número, ex.: (32) 9 9999-9999.');
    b.disabled = true;
    call('salvarWhats', { pacientes: [it.paciente], whats: n }).then(function (r) {
      b.disabled = false; if (!r.ok) return toast((r.erros || ['Não gravou']).join(' '));
      it.fone = r.fone; it.foneFmt = r.foneFmt; it.foneDe = 'pagador'; renderCobrancaMes(); toast('WhatsApp salvo no cadastro. Clique em "Cobrar no WhatsApp".');
      if (typeof recarregarAT === 'function') recarregarAT().catch(function () { });
    }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
  });
}
function mudarChave(n) { var m = cmChave.split('/'), i = Cobranca.MESES.indexOf(m[0]), a = parseInt(m[1], 10); i += n; if (i < 0) { i = 11; a--; } if (i > 11) { i = 0; a++; } cmChave = Cobranca.MESES[i] + '/' + a; carregarCobrancaMes(); }
$("#cm-ant").addEventListener('click', function () { mudarChave(-1); });
$("#cm-prox").addEventListener('click', function () { mudarChave(1); });
$("#cm-atualizar").addEventListener('click', carregarCobrancaMes);
$("#cm-busca").addEventListener('input', function () { if (CM) renderCobrancaMes(); });

/* ---------- Registrar pagamento do mês (Registrar e Cobrança do mês usam o mesmo formulário) ----------
   item: { paciente, profissional, cobranca, pagamento, valor, valorMes, chave, pagador, proximas? } */
function abrirPagamentoMes(box, item, aoTerminar) {
  var mensal = item.cobranca === 'Mensalidade fixa', posterior = item.pagamento === 'Posterior', chaves = [item.chave], c = item.chave;
  for (var i = 0; i < 2; i++) { c = Cobranca.proximaCompetencia(c); if (c) chaves.push(c); } // adiantamento de até 3 meses
  var tit = posterior ? 'Receber o mês · ' : mensal ? 'Registrar pagamento da mensalidade · ' : 'Registrar pagamento do antecipado · ';
  box.innerHTML = '<div class="cab"><h2>' + esc(tit + item.paciente) + '</h2><span class="muted">' + esc(item.profissional) + '</span><span class="esp"></span><button type="button" class="btn icone p" data-fechar aria-label="Fechar">' + ic('fechar', 16) + '</button></div>' +
    '<p class="muted" style="margin:0">' + (posterior ? 'Marca como pagas as sessões do mês que ficaram “Não” (fim do mês).' : 'Grava em Mensalistas (competência) e lança o recebimento na aba do mês. ' + (mensal ? 'As sessões do mês ficam “Incluída na mensalidade”.' : 'Valor do mês = valor por sessão × sessões agendadas (menos os abatimentos).')) + '</p>' +
    (posterior ? '' : '<div class="grid g4"><div class="campo c4">Competência <span class="leg">— marque mais de um mês se pagou adiantado</span><div class="seg solto" data-r-comps>' + chaves.map(function (ch, i) { return '<label class="check" style="display:inline-flex;margin-right:12px"><input type="checkbox" value="' + esc(ch) + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(ch) + '</label>'; }).join('') + '</div></div></div>') +
    '<div class="grid">' +
    '<label class="campo">Valor recebido<div class="campo-wrap"><span class="prefixo">R$</span><input data-r="valor" class="dinheiro" inputmode="decimal" value="' + (item.valorMes != null ? brl(item.valorMes) : '') + '"></div><span class="hint" data-r-hint></span></label>' +
    '<label class="campo">Data do pagamento<input data-r="data" inputmode="numeric" maxlength="10" value="' + hojeStr() + '"></label>' +
    '<label class="campo">Forma<select data-r="forma"></select></label>' +
    '<label class="campo">Quem pagou<input data-r="quemPagou" list="dl-pagadores" autocomplete="off" value="' + esc(item.pagador || item.paciente) + '"></label>' +
    '<label class="check forte" style="align-self:end"><input type="checkbox" data-r="parcial"> Pagou só uma parte</label>' +
    '<label class="check forte" style="align-self:end"><input type="checkbox" data-r="nf"> NF emitida</label>' +
    '<label class="campo">Nº da NF<input data-r="nfNumero" autocomplete="off" placeholder="—"></label>' +
    '<label class="campo c2">Observação <span class="leg">(opcional)</span><input data-r="observacao" autocomplete="off"></label>' +
    '</div><div class="faixa nota" data-r-resumo></div><div data-r-erros></div>' +
    '<div class="acoes"><button type="button" class="btn" data-r-ok>' + (posterior ? 'Receber' : 'Registrar pagamento') + '</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div>';
  box.hidden = false;
  var v = function (n) { return $('[data-r=' + n + ']', box); };
  preencherSelect(v('forma'), BOOT.listas.formas || [], '—');
  var comps = function () { var cb = $$('[data-r-comps] input', box); return cb.length ? cb.filter(function (x) { return x.checked; }).map(function (x) { return x.value; }) : [item.chave]; };
  var resumo = function () {
    var cs = comps(), n = cs.length, val = num(v('valor').value), esperado = item.valorMes != null ? Math.round(item.valorMes * n * 100) / 100 : null;
    if (!v('valor').dataset.mexido && esperado != null) v('valor').value = brl(esperado);
    $('[data-r-hint]', box).textContent = esperado != null ? (n > 1 ? n + ' meses × ' + brlCurto(item.valorMes) : '') : 'valor do mês a definir: confirme com a gestão';
    $('[data-r-resumo]', box).innerHTML = (posterior ? 'Sessões de <b>' + esc(item.chave) + '</b> ficam pagas.' : (mensal ? 'Mensalidade' : 'Antecipado') + ' de <b>' + esc(cs.join(', ') || '—') + '</b> fica ' + (v('parcial').checked ? 'pago em parte' : 'pago') + '.') + (val != null && esperado != null && Math.abs(val - esperado) > 0.005 && !v('parcial').checked ? ' <b>Valor diferente do esperado (' + esc(brlCurto(esperado)) + '):</b> anote o motivo na Observação.' : '');
  };
  $$('[data-r-comps] input', box).forEach(function (x) { x.addEventListener('change', resumo); });
  v('valor').addEventListener('input', function () { this.dataset.mexido = '1'; resumo(); });
  v('parcial').addEventListener('change', resumo);
  v('data').addEventListener('input', function () { this.value = mascaraData(this.value); });
  v('nfNumero').addEventListener('input', function () { if (this.value.trim()) v('nf').checked = true; });
  resumo();
  $$('[data-fechar]', box).forEach(function (b) { b.addEventListener('click', function () { box.hidden = true; box.innerHTML = ''; }); });
  $('[data-r-ok]', box).addEventListener('click', function () {
    var d = { paciente: item.paciente, profissional: item.profissional, competencias: comps(), valor: v('valor').value.trim(), data: v('data').value.trim(), forma: v('forma').value, quemPagou: v('quemPagou').value.trim(), parcial: v('parcial').checked, nf: v('nf').checked ? 'Sim' : 'Não', nfNumero: v('nfNumero').value.trim(), observacao: v('observacao').value.trim() };
    var er = [];
    if (!d.competencias.length) er.push('Marque pelo menos uma competência.');
    if (!(num(d.valor) > 0)) er.push('Informe o valor recebido.');
    if (!dataValida(d.data)) er.push('Data do pagamento inválida (dd/mm/aaaa).');
    if (!d.forma) er.push('Escolha a forma de pagamento.');
    $('[data-r-erros]', box).innerHTML = erroBox(er); if (er.length) return;
    var b = this; b.disabled = true;
    call('registrarPagamentoMes', d).then(function (r) {
      if (!r.ok) { $('[data-r-erros]', box).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
      if (typeof invalidarResumo === 'function') invalidarResumo();
      box.hidden = true; box.innerHTML = '';
      toast((posterior ? 'Recebido: ' : 'Pagamento registrado: ') + d.competencias.join(', ') + (r.feitos && r.feitos[0] && r.feitos[0].sessoesMarcadas != null ? ' · ' + r.feitos[0].sessoesMarcadas + ' sessões marcadas' : ''));
      if (aoTerminar) aoTerminar(r);
    }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; });
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
/* ---------- gestão: sessões agendadas / valor cobrado da competência (entrou no meio do mês, quinzenal sem agenda…) ---------- */
function abrirEditarSessoes(it) {
  var box = $("#cm-pagbox");
  box.innerHTML = '<div class="cab"><h2>Sessões de ' + esc(CM.chave) + ' · ' + esc(it.paciente) + '</h2><span class="muted">' + esc(it.profissional) + '</span><span class="esp"></span><button type="button" class="btn icone p" data-fechar aria-label="Fechar">' + ic('fechar', 16) + '</button></div>' +
    '<p class="muted" style="margin:0">Hoje: ' + (it.sessoes == null ? 'sem agenda recorrente' : it.sessoes + ' agendadas' + (it.abatimentos.length ? ' − ' + (it.sessoes - it.sessoesCobradas) + ' abatidas' : '')) + ' · valor do mês ' + esc(it.valorMes != null ? brlCurto(it.valorMes) : 'a definir') + '. O que você mudar aqui fica registrado em "Alterações de lançamento".</p>' +
    '<div class="grid"><label class="campo">Sessões agendadas no mês<input data-e="sessoes" inputmode="numeric" value="' + (it.sessoes == null ? '' : it.sessoes) + '"></label><label class="campo">Valor cobrado no mês <span class="leg">— vazio = valor × sessões</span><div class="campo-wrap"><span class="prefixo">R$</span><input data-e="valorCobrado" class="dinheiro" inputmode="decimal" value="' + (it.valorCobradoEditado && it.valorMes != null ? brl(it.valorMes) : '') + '"></div></label><label class="campo c2">Motivo <span class="req">*</span><input data-e="motivo" autocomplete="off" placeholder="ex.: começou dia 18 · quinzenal · sessão extra combinada"></label></div><div data-e-erros></div>' +
    '<div class="acoes"><button type="button" class="btn" data-e-ok>Gravar</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div>';
  box.hidden = false;
  var v = function (n) { return $('[data-e=' + n + ']', box); };
  $$('[data-fechar]', box).forEach(function (b) { b.addEventListener('click', function () { box.hidden = true; box.innerHTML = ''; }); });
  $('[data-e-ok]', box).addEventListener('click', function () {
    var d = { paciente: it.paciente, profissional: it.profissional, chave: CM.chave, sessoes: v('sessoes').value.trim(), valorCobrado: v('valorCobrado').value.trim(), motivo: v('motivo').value.trim() }, er = [];
    if (d.sessoes !== '' && !(num(d.sessoes) >= 0)) er.push('Sessões: use um número.');
    if (d.sessoes === '' && d.valorCobrado === '') er.push('Informe as sessões ou o valor cobrado.');
    if (!d.motivo) er.push('Escreva o motivo.');
    $('[data-e-erros]', box).innerHTML = erroBox(er); if (er.length) return;
    var b = this; b.disabled = true;
    call('editarSessoesCompetencia', d).then(function (r) { if (!r.ok) { $('[data-e-erros]', box).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; } box.hidden = true; box.innerHTML = ''; toast('Sessões de ' + CM.chave + ' atualizadas'); carregarCobrancaMes(); recarregarAT().catch(function () { }); }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; });
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
