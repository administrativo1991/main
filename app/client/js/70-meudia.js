/* ================= MEU DIA — Fechar o dia (Fase 1, 15/10) =================
   As 4 listas do dia (a cobrar · recebido · guias a pegar · NF a emitir) com a mesma conta da Agenda (fechamentoDia),
   resumo por forma de pagamento, "Copiar resumo" (texto pro grupo) e Imprimir. NF/guia dos últimos 7 dias vêm de gestaoResumo. */
var MD = null, mdData = '', mdGen = 0, mdAntigas = null;
INICIAR.meudia = function (extra) {
  mdData = (extra && extra.data) || mdData || hojeStr();
  quandoAT(carregarMeuDia);
};
function carregarMeuDia() {
  var gen = ++mdGen, dt = dataObj(mdData) || new Date();
  $("#md-dia").textContent = (mdData === hojeStr() ? 'hoje · ' : '') + tituloDia(dt);
  $("#md-carregando").hidden = false; $("#md-corpo").hidden = true; $("#md-resumo").hidden = true; $("#md-status").textContent = '';
  var pDia = (typeof DIA !== 'undefined' && DIA && DIA.data === mdData) ? Promise.resolve(DIA) : call('listaDoDia', { data: mdData });
  var mes = MESES_PT[dt.getMonth()];
  var pMes = (typeof resumoMes !== 'undefined' && resumoMes[mes]) ? Promise.resolve(resumoMes[mes]) : call('gestaoResumo', { mes: mes }).then(function (r) { if (r && r.ok && typeof resumoMes !== 'undefined') resumoMes[mes] = r; return r; }).catch(function () { return null; });
  Promise.all([pDia, pMes]).then(function (rr) {
    if (!aindaNa('meudia', navGen) || gen !== mdGen) return;
    MD = rr[0]; mdAntigas = rr[1]; $("#md-carregando").hidden = true; renderMeuDia();
  }).catch(function (e) { if (gen !== mdGen) return; $("#md-carregando").hidden = true; $("#md-status").textContent = 'Não consegui carregar: ' + e.message; });
}
function quemHora(x) { return '<span class="quem">' + esc(x.it.paciente) + '</span><span class="muted">' + esc((x.it.hora || '—') + ' · ' + profCurto(x.it.profissional)) + '</span>'; }
function renderMeuDia() {
  var fd = fechamentoDia(MD), rs = function (n) { return brlCurto(n); };
  var pend = MD.itens.filter(function (i) { var s = statusItem(i, MD.data); return s === 'aguardando' || s === 'chegou' || s === 'aconfirmar'; }).length;
  $("#md-resumo").hidden = false;
  $("#md-resumo").innerHTML = '<div><b>' + esc(rs(fd.recebidoTotal)) + '</b><span>recebido</span></div><div><b>' + esc(rs(fd.aCobrarTotal)) + '</b><span>a cobrar</span></div><div><b>' + fd.guias.length + '</b><span>guias a pegar</span></div><div><b>' + fd.nfs.length + '</b><span>NF a emitir</span></div><div><b>' + pend + '</b><span>sem registro (aguardando · chegou)</span></div>';
  $("#md-corpo").hidden = false;
  var lista = function (id, itens, html, vazio) { var b = $("#" + id); b.innerHTML = itens.length ? itens.map(html).join('') : '<div class="muted">' + vazio + '</div>'; };
  $("#md-n-cobrar").textContent = fd.aCobrar.length; $("#md-n-recebido").textContent = fd.recebido.length; $("#md-n-guias").textContent = fd.guias.length; $("#md-n-nfs").textContent = fd.nfs.length;
  lista('md-cobrar', fd.aCobrar, function (x) { return '<div class="fd-item">' + quemHora(x) + '<span class="esp"></span><span class="tag ' + (x.registrado ? 'vermelha' : 'amarela') + '">' + esc(x.txt) + '</span><b>' + esc(rs(x.valor)) + '</b></div>'; }, 'Nada a cobrar.');
  lista('md-recebido', fd.recebido, function (x) { return '<div class="fd-item">' + quemHora(x) + '<span class="esp"></span><span class="muted">' + esc(x.forma || '') + '</span><span class="tag ' + (x.nf === 'Sim' ? 'verde' : 'laranja') + '">' + (x.nf === 'Sim' ? 'NF ' + esc(x.nfN || 'emitida') : 'NF a emitir') + '</span><b>' + esc(rs(x.valor)) + '</b></div>'; }, 'Nada recebido ainda.');
  var formas = Object.keys(fd.porForma); $("#md-formas").innerHTML = formas.length ? 'Por forma: ' + formas.map(function (f) { return '<b>' + esc(f) + '</b> ' + esc(rs(fd.porForma[f])); }).join(' · ') : '';
  lista('md-guias', fd.guias, function (x) { return '<div class="fd-item">' + quemHora(x) + '<span class="esp"></span><span class="tag lilas">' + esc(x.txt) + '</span></div>'; }, 'Nenhuma guia pendente.');
  lista('md-nfs', fd.nfs, function (x) { return '<div class="fd-item">' + quemHora(x) + '<span class="esp"></span><span class="muted">' + esc(x.forma || '') + '</span><b>' + esc(rs(x.valor)) + '</b></div>'; }, 'Nenhuma NF pendente.');
  // NF e guia dos últimos 7 dias (antes do dia mostrado), pra não ficar pra trás
  var ant = [], g = mdAntigas, dt = dataObj(MD.data); if (g && g.ok && dt) {
    var lim = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 7), dentro = function (x) { var d = dataObj(x.data); return d && d >= lim && d < dt; };
    (g.nfPendente || []).filter(dentro).forEach(function (x) { ant.push({ tipo: 'NF a emitir', cor: 'laranja', x: x }); });
    (g.semGuia || []).filter(dentro).forEach(function (x) { ant.push({ tipo: 'guia a assinar', cor: 'lilas', x: x }); });
  }
  $("#md-antigas-card").hidden = !ant.length;
  $("#md-antigas").innerHTML = ant.map(function (a) { return '<div class="fd-item"><span class="quem">' + esc(a.x.paciente) + '</span><span class="muted">' + esc(String(a.x.data || '').slice(0, 5) + (a.x.profissional ? ' · ' + profCurto(a.x.profissional) : '')) + '</span><span class="esp"></span><span class="tag ' + a.cor + '">' + esc(a.tipo) + '</span>' + (a.x.valor ? '<b>' + esc(rs(a.x.valor)) + '</b>' : '') + '</div>'; }).join('');
  var f = store('rn-fimdia:' + MD.data) || {};
  $("#md-status").textContent = f.fechado ? 'Dia fechado às ' + f.fechado + ' por ' + (f.por || quemSou()) + ' (anotação deste computador).' : (pend ? pend + ' paciente(s) ainda sem registro: registre ou marque "não vem" antes de fechar.' : '');
}
function textoResumoDia() {
  var fd = fechamentoDia(MD), rs = function (n) { return 'R$ ' + brl(n); }, dt = dataObj(MD.data), L = [];
  L.push('Fechamento do dia · ' + tituloDia(dt) + ' (' + MD.data + ')');
  L.push('Recebido: ' + rs(fd.recebidoTotal) + (Object.keys(fd.porForma).length ? ' (' + Object.keys(fd.porForma).map(function (f) { return f + ' ' + rs(fd.porForma[f]); }).join(', ') + ')' : ''));
  fd.recebido.forEach(function (x) { L.push('  · ' + x.it.paciente + ' — ' + rs(x.valor) + (x.forma ? ' ' + x.forma : '') + (x.nf === 'Sim' ? ' · NF ' + (x.nfN || 'emitida') : ' · NF a emitir')); });
  L.push('A cobrar: ' + rs(fd.aCobrarTotal));
  fd.aCobrar.forEach(function (x) { L.push('  · ' + x.it.paciente + ' — ' + rs(x.valor) + ' · ' + x.txt); });
  L.push('Guias a pegar: ' + fd.guias.length); fd.guias.forEach(function (x) { L.push('  · ' + x.it.paciente + ' · ' + x.txt); });
  L.push('NF a emitir: ' + fd.nfs.length); fd.nfs.forEach(function (x) { L.push('  · ' + x.it.paciente + ' — ' + rs(x.valor)); });
  return L.join('\n');
}
$("#md-copiar").addEventListener('click', function () {
  if (!MD) return; var t = textoResumoDia();
  var ok = function () { toast('Resumo copiado'); }, falha = function () { window.prompt('Copie o resumo:', t); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, falha); else falha();
});
$("#md-fechar").addEventListener('click', function () {
  if (!MD) return; var pend = MD.itens.filter(function (i) { var s = statusItem(i, MD.data); return s === 'aguardando' || s === 'chegou'; }).length;
  if (pend) return toast(pend + ' paciente(s) ainda em "Aguardando" ou "Chegou". Registre ou marque "não vem" antes de fechar.');
  var f = store('rn-fimdia:' + MD.data) || {}; f.fechado = agoraHora(); f.por = quemSou(); store('rn-fimdia:' + MD.data, f);
  renderMeuDia(); if (typeof lerFimDia === 'function' && typeof DIA !== 'undefined' && DIA && DIA.data === MD.data) lerFimDia();
  toast('Dia fechado. Bom descanso.');
});
function mudarDiaMD(n) { var dt = dataObj(mdData) || new Date(); dt.setDate(dt.getDate() + n); mdData = ('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2) + '/' + dt.getFullYear(); carregarMeuDia(); }
$("#md-ant").addEventListener('click', function () { mudarDiaMD(-1); });
$("#md-prox").addEventListener('click', function () { mudarDiaMD(1); });
