/* ================= MENSALISTAS ================= */
var MEN = null, menFiltro = 'todos', menSel = null, menIniciado = false, menBusca = '', agendaPorPac = {};
INICIAR.mensalistas = function (extra) {
  if (extra && extra.buscar) { menBusca = extra.buscar; $("#m-busca").value = extra.buscar; }
  quandoAT(function () {
    if (!menIniciado) { menIniciado = true; preencherSelect($("#m-forma"), BOOT.listas.formas || []); preencherSelect($("#m-prof"), BOOT.profissionais, '—'); call('agendaFixa').then(function (l) { agendaPorPac = {}; (l || []).forEach(function (a) { if (String(a['Ativo'] || 'Sim') === 'Não') return; (agendaPorPac[a['Paciente']] = agendaPorPac[a['Paciente']] || []).push(a); }); if (MEN) renderMensal(); }).catch(function () { }); }
    carregarMensal();
  });
};
function carregarMensal(col) { $("#m-carregando").hidden = false; call('mensalistasPainel', { coluna: col || '' }).then(function (r) { MEN = r; $("#m-carregando").hidden = true; var sel = $("#m-col"); sel.innerHTML = ''; (r.colunas || []).forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = tituloCol(c); sel.appendChild(o); }); sel.value = r.coluna; $("#m-legenda").textContent = r.modeloNovo ? 'vence dia 10 · tolerância até o 15 · dia 16 pausa' : 'modelo antigo: paga no mês seguinte'; renderMensal(); }).catch(function (e) { $("#m-carregando").textContent = 'Não consegui carregar: ' + e.message; }); }
function tituloCol(c) { var m = String(c).replace(/\s*—\s*pago\??/i, '').trim(); return m.charAt(0) + m.slice(1).toLowerCase(); }
function situacaoMen(it) { var dia = new Date().getDate(); if (/^sim/i.test(it.pago)) return ['verde', 'em dia']; if (/^não/i.test(it.pago) || /deve/i.test(it.dataPago)) return (MEN.modeloNovo && dia >= 16) ? ['vermelha', 'atrasada'] : ['amarela', 'pendente']; if (MEN.modeloNovo) { if (dia >= 16) return ['vermelha', 'atrasada']; if (dia >= 11) return ['amarela', 'venceu dia 10']; return ['amarela', 'vence dia 10']; } return ['cinza', 'a receber']; }
function pillMes(it) {
  var s = it._s;
  if (s[0] === 'verde') { var d = String(it.dataPago || ''), m = d.match(/^(\d{2}\/\d{2})(?:\/\d{4})?/), forma = (d.match(/\b(Pix|Dinheiro|Cartão[^·(]*|Link[^·(]*)/i) || [])[1], nf = (d.match(/NF\s*#?\s*(\d+)/i) || [])[1]; return '<span class="tag verde">Pago' + (m ? ' ' + m[1] : '') + (forma ? ' · ' + forma.trim() : '') + (nf ? ' · NF #' + nf : '') + '</span>'; }
  if (s[0] === 'vermelha') return '<span class="tag vermelha">' + esc(tituloCol(MEN.coluna)) + ' em atraso · pausado</span>';
  if (s[1] === 'pendente') return '<span class="tag amarela">em aberto' + (/deve/i.test(it.dataPago) ? ' · ' + esc(it.dataPago.split('(')[0].trim()) : '') + '</span>';
  return '<span class="tag amarela">' + (s[1] === 'venceu dia 10' ? 'Venceu dia 10 · tolerância até 15' : s[1] === 'vence dia 10' ? 'Vence dia 10' : 'A receber') + '</span>';
}
function ehPacoteMensal(it) { return /pacote mensal|preexistente|^pacote|^plano/i.test(it.modalidade) && !/social|mensalidade fixa/i.test(it.modalidade); }
function horarioDe(nome) { var l = agendaPorPac[nome]; if (!l || !l.length) return ''; var a = l[0]; return profCurto(a['Profissional']) + ' · ' + String(a['Dia da semana'] || '').slice(0, 3).toLowerCase() + ' ' + String(a['Hora'] || '').replace(/:00$/, 'h').replace(':', 'h'); }
function renderMensal() {
  var r = MEN, q = ($("#m-busca").value || '').toLowerCase(), itens = r.itens.map(function (it) { it._s = situacaoMen(it); return it; });
  // faixa amarela: o mês anterior ainda tem pendência (clicar troca a competência)
  var an = r.anterior, fa = $("#m-anterior"); fa.innerHTML = '';
  if (an && an.pendentes > 0 && an.coluna !== r.coluna) { fa.innerHTML = aviso('amarela', esc(tituloCol(an.coluna)) + ': ' + an.pendentes + ' pendente' + (an.pendentes === 1 ? '' : 's') + ' — <a href="#" id="m-ver-ant">ver</a>', ''); $("#m-ver-ant").addEventListener('click', function (e) { e.preventDefault(); carregarMensal(an.coluna); }); }
  var cont = { todos: itens.length, ok: 0, pend: 0, atr: 0 }; itens.forEach(function (it) { if (it._s[0] === 'verde') cont.ok++; else if (it._s[0] === 'vermelha') cont.atr++; else cont.pend++; });
  var recebido = itens.filter(function (i) { return i._s[0] === 'verde'; }).reduce(function (a, i) { return a + i.valor; }, 0);
  var k = $("#m-kpis"); k.innerHTML = '';
  [['todos', 'mensalistas', 'roxo'], ['ok', 'em dia', 'verde'], ['pend', r.modeloNovo ? 'vencem dia 10' : 'a receber', 'amarela'], ['atr', r.modeloNovo ? 'atrasados' : 'devendo', 'vermelha']].forEach(function (x) {
    var b = el('<button type="button" class="kpi ' + (x[0] === 'todos' ? '' : x[2]) + '" aria-pressed="' + (menFiltro === x[0]) + '"><b>' + cont[x[0]] + '</b><span>' + x[1] + '</span></button>');
    b.addEventListener('click', function () { menFiltro = x[0]; renderMensal(); }); k.appendChild(b);
  });
  k.appendChild(el('<div class="kpi pessego"><b>' + esc(brlCurto(recebido)) + '</b><span>recebido · ' + esc(tituloCol(r.coluna).toLowerCase()) + '</span></div>'));
  var lista = itens.filter(function (it) { var kk = it._s[0] === 'verde' ? 'ok' : it._s[0] === 'vermelha' ? 'atr' : 'pend'; return (menFiltro === 'todos' || menFiltro === kk) && (!q || it.paciente.toLowerCase().indexOf(q) >= 0 || (it.pagador || '').toLowerCase().indexOf(q) >= 0); });
  var root = $("#m-list"); root.innerHTML = '';
  if (!lista.length) { root.innerHTML = '<div class="vazio">Ninguém neste filtro.</div>'; return; }
  var card = el('<div class="tabela-card mens-card"><div class="tabela-wrap"><table class="mens"><thead><tr><th>Paciente</th><th>Plano</th><th>Pagador</th><th class="num">Valor</th><th>' + esc(tituloCol(r.coluna)) + '</th><th>5ª semana</th><th></th></tr></thead><tbody></tbody></table></div><div class="tabela-rodape"><span>Mostrando ' + lista.length + ' de ' + itens.length + '</span><span>Pagamento antes do dia 10 = mês anterior (competência)</span><span>NF do mensalista: uma por mês, quando paga</span></div></div>');
  var tb = $('tbody', card);
  lista.forEach(function (it) {
    var pm = ehPacoteMensal(it), fixa = /mensalidade fixa/i.test(it.modalidade), antigo = /só até|preexistente|\b280\b/i.test(it.modalidade);
    var plano = esc(it.modalidade.split('·')[0].trim()) + (fixa ? ' <span class="tag p laranja">' + ic('alerta', 11, 2.5) + 'sem proporcional</span>' : '') + (antigo ? ' <span class="muted" style="font-size:11px">(antigo, até jan/27)</span>' : '');
    var quinta = pm ? '<label class="check" style="display:inline-flex;font-size:13px"><input type="checkbox" data-extra' + (it._extra ? ' checked' : '') + '> quer · + R$ ' + brl(Math.round(it.valor / 4)) + '</label>' : '<span class="muted">—' + (fixa ? ' (incluída)' : '') + '</span>';
    var acao = it._s[0] === 'verde' ? '<button type="button" class="btn link" data-ver>Ver</button>' : it._s[0] === 'vermelha' ? '<button type="button" class="btn vermelho" data-reg>Chamar a gestão</button>' : '<button type="button" class="btn" data-reg>Registrar pagamento</button>';
    var tr = el('<tr class="' + (it._s[0] === 'vermelha' ? 'atrasada' : '') + '"><td class="td-quem"><div class="nome" style="font-weight:700">' + esc(it.paciente) + '</div><div class="sub">' + esc(horarioDe(it.paciente) || (it.sessoes ? it.sessoes + ' sessões no mês' : '')) + '</div></td><td class="td-plano">' + plano + '</td><td class="td-pag"><span class="so-tel muted">Pagador: </span>' + esc(it.pagador || '—') + '</td><td class="num td-valor" style="font-weight:700">R$ ' + brl(it.valor) + '</td><td class="td-mes">' + pillMes(it) + (it.sessoes >= 5 ? ' <span class="tag p amarela">5ª sessão</span>' : '') + '</td><td class="td-quinta">' + quinta + '</td><td class="td-acao" style="text-align:right">' + acao + '</td></tr>');
    var cb = $('[data-extra]', tr); if (cb) cb.addEventListener('change', function () { it._extra = this.checked; });
    var bv = $('[data-ver]', tr); if (bv) bv.addEventListener('click', function () { toast(it.dataPago || 'Sem anotação'); });
    var br = $('[data-reg]', tr); if (br) br.addEventListener('click', function () { abrirMen(it); });
    tb.appendChild(tr);
  });
  root.appendChild(card);
}
function abrirMen(it) {
  menSel = it; var pn = $("#m-painel"); pn.hidden = false;
  $("#m-box-t").textContent = 'Registrar pagamento · ' + it.paciente + ' · ' + tituloCol(MEN.coluna).toLowerCase();
  $("#m-box-sub").textContent = it.modalidade; $("#m-box-col").textContent = MEN.coluna;
  $("#m-box-aviso").innerHTML = it._s[0] === 'vermelha' ? aviso('vermelha', 'Mensalidade atrasada desde o dia 16', 'Não atender até regularizar. Chame a gestão; ao receber, registre aqui.') : '';
  var pm = ehPacoteMensal(it); $("#m-quinta").hidden = !pm; $("#m-extra").checked = !!it._extra; $("#m-extra-v").textContent = 'R$ ' + brl(Math.round(it.valor / 4));
  $("#m-valor").value = brl(it.valor + (pm && it._extra ? Math.round(it.valor / 4) : 0)); $("#m-data").value = hojeStr(); $("#m-quem").value = it.pagador || it.paciente; $("#m-nfn").value = ''; $("#m-obs").value = '';
  $("#m-list").parentNode.insertBefore(pn, $("#m-list")); pn.scrollIntoView({ behavior: 'smooth', block: 'center' }); $("#m-valor").focus();
}
$("#m-extra").addEventListener('change', function () { if (!menSel) return; menSel._extra = this.checked; $("#m-valor").value = brl(menSel.valor + (this.checked ? Math.round(menSel.valor / 4) : 0)); });
$("#m-ok").addEventListener('click', function () {
  if (!menSel) return;
  var d = { paciente: menSel.paciente, coluna: MEN.coluna, valor: $("#m-valor").value, data: $("#m-data").value, forma: $("#m-forma").value, quemPagou: $("#m-quem").value.trim(), nf: $("#m-nfn").value.trim() ? 'Sim' : 'Não', nfNumero: $("#m-nfn").value.trim(), profissional: $("#m-prof").value, observacao: $("#m-obs").value.trim(), sessaoExtra: $("#m-extra").checked && !$("#m-quinta").hidden };
  if (!dataValida(d.data)) return toast('Data do pagamento inválida');
  $("#m-ok").disabled = true;
  call('registrarMensalidade', d).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast('Mensalidade registrada · recebimento na aba ' + r.aba); $("#m-painel").hidden = true; if (AT && AT.mensalistas[d.paciente]) { AT.mensalistas[d.paciente].pago = 'Sim'; AT.mensalistas[d.paciente].dataPago = d.data; } menSel = null; if (typeof invalidarResumo === 'function') invalidarResumo(); carregarMensal(MEN.coluna); }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { $("#m-ok").disabled = false; });
});
$("#m-cancel").addEventListener('click', function () { $("#m-painel").hidden = true; menSel = null; });
$("#m-col").addEventListener('change', function () { carregarMensal(this.value); });
$("#m-busca").addEventListener('input', function () { if (MEN) renderMensal(); });
$("#m-data").addEventListener('input', function () { this.value = mascaraData(this.value); });
