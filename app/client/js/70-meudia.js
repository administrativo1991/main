/* ================= MEU DIA — Fechar o dia (Fase 1, 15/10) =================
   As 4 listas do dia (a cobrar · recebido · guias a pegar · NF a emitir) com a mesma conta da Agenda (fechamentoDia),
   resumo por forma de pagamento, "Copiar resumo" (texto pro grupo) e Imprimir. NF/guia dos últimos 7 dias vêm de gestaoResumo. */
var MD = null, mdData = '', mdGen = 0, mdAntigas = null;
INICIAR.meudia = function (extra) {
  mdData = (extra && extra.data) || mdData || hojeStr();
  quandoAT(carregarMeuDia);
};
function carregarMeuDia() {
  var gen = ++mdGen, dt = dataObj(mdData) || new Date(); if (!LD_RES_MANTER) LD = {}; LD_RES_MANTER = false;
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
  renderLancar();
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

/* ---------- Lançar o dia (Fase 2, 15/10) ----------
   Quem estava na agenda e não tem registro (aguardando · chegou · a confirmar): a recepção marca o que aconteceu e grava tudo
   numa chamada (registrarLote = o mesmo registrarAtendimento do Registrar, linha a linha). O procedimento é o padrão do
   profissional (o tipo da agenda, quando há); "Recebeu?" só aparece quando o bloco de cobrança pede, com o padrão do bloco.
   Pagou só uma parte, NF, outro pagador: pelo Registrar. Serve também pra lançar dias anteriores (setas do Meu dia). */
var LD = {}, LD_RES_MANTER = false;
var LD_OQUE = [[/^Atendido/, 'Veio'], [/^Faltou sem aviso/, 'Faltou'], [/em cima da hora/i, 'Em cima da hora'], [/^Desmarcou/, 'Desmarcou'], [/^Cancelado/, 'Clínica cancelou']];
function oqueReal(re) { return (BOOT.listas.oque || []).filter(function (x) { return re.test(x); })[0] || ''; }
function itensLancar() { return (MD && MD.itens || []).filter(function (i) { if (i.extra) return false; var s = statusItem(i, MD.data); return s === 'aguardando' || s === 'chegou' || s === 'aconfirmar'; }); }
// o procedimento que o Registrar escolheria vindo da Agenda: o tipo da agenda (aplicação de teste, retorno…) ou Sessão/Consulta
function procPadraoItem(it) {
  var tipos = tiposDe(espsDoProf(it.profissional)), base = null, t = semAcento(String(it.tipo || '')).split(' ')[0];
  if (t) base = tipos.filter(function (x) { return semAcento(x.nome).indexOf(t) === 0; })[0];
  if (!base) base = tipos.filter(function (x) { return /^(Sessão|Consulta)/.test(x.nome); })[0] || tipos[0];
  return base ? derivarProc(base.nome, pacInfo(it.paciente), it.profissional) : '';
}
function estadoLD(it) {
  var k = chaveItem(it); if (!LD[k]) LD[k] = { oque: statusItem(it, MD.data) === 'chegou' ? oqueReal(/^Atendido/) : '', proc: procPadraoItem(it) };
  var st = LD[k];
  st.bl = st.oque && pacInfo(it.paciente) ? blocoDe(it.paciente, it.profissional, dataObj(MD.data) || new Date(), st.proc, st.oque) : null;
  if (st.bl && st.bl.recebeu && !st.recebeu) st.recebeu = st.bl.padraoRecebeu || '';
  if (st.bl && st.bl.recebeu && st.valor == null) st.valor = st.bl.valor != null ? brl(st.bl.valor) : '';
  return st;
}
function renderLancar() {
  var itens = itensLancar(), card = $("#md-lancar-card"), box = $("#md-lancar");
  card.hidden = !itens.length; $("#md-n-lancar").textContent = itens.length; box.innerHTML = ''; $("#md-lancar-erros").innerHTML = '';
  if (!itens.length) return;
  itens.sort(function (a, b) { return String(a.hora || '99').localeCompare(String(b.hora || '99')) || a.paciente.localeCompare(b.paciente); });
  itens.forEach(function (it) {
    var st = estadoLD(it), bl = st.bl, ch = it.cobrancaHoje;
    var row = el('<div class="ld-item' + (st.oque ? ' marcado' : '') + (st.res && !st.res.ok ? ' erro' : '') + '"><div><span class="quem">' + esc((it.hora ? it.hora + ' · ' : '') + it.paciente) + '</span><div class="sub">' + esc(profCurto(it.profissional) + ' · ' + tipoCurto(it) + (ch && ch.curto ? ' · ' + ch.curto : '')) + '</div></div>' +
      '<div class="seg solto mini ld-oque" role="group" aria-label="O que aconteceu">' + LD_OQUE.map(function (o) { var v = oqueReal(o[0]); return v ? '<button type="button" data-oque="' + esc(v) + '" aria-pressed="' + (st.oque === v) + '">' + esc(o[1]) + '</button>' : ''; }).join('') + '</div><div class="ld-extra"></div></div>');
    var ex = $('.ld-extra', row);
    if (!st.oque) ex.innerHTML = '<span class="muted">não marcado: fica de fora</span>';
    else if (!bl) ex.innerHTML = '<span class="muted">' + (pacInfo(it.paciente) ? '' : 'não está em Pacientes: lance pelo Registrar') + '</span>';
    else {
      var h = '';
      if (bl.detalhe) h += '<input class="ld-det" data-f="detalhe" placeholder="Detalhe' + (bl.detalheObrigatorio ? ' (obrigatório)' : '') + ': quem avisou, a que horas, como" value="' + esc(st.detalhe || '') + '">';
      if (bl.recebeu) {
        h += '<span>Recebeu?</span><span class="seg mini" role="group"><button type="button" data-rec="Sim" aria-pressed="' + (st.recebeu === 'Sim') + '">Sim</button><button type="button" data-rec="Não" aria-pressed="' + (st.recebeu === 'Não') + '">Não</button></span>';
        if (st.recebeu === 'Sim') h += '<span>R$ <input data-f="valor" inputmode="decimal" style="width:80px" value="' + esc(st.valor || '') + '"></span><select data-f="forma"><option value="">forma…</option>' + (BOOT.listas.formas || []).map(function (f) { return '<option' + (st.forma === f ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('') + '</select>';
        else if (st.recebeu === 'Não') h += '<span class="muted">fica a receber R$ ' + esc(st.valor || '…') + '</span>';
      } else if (/^Atendido/.test(st.oque)) h += '<span class="muted">' + esc(bl.curto || bl.frase || '') + '</span>';
      if (bl.guia) h += '<label class="check"><input type="checkbox" data-f="guia"' + (st.guia ? ' checked' : '') + '> guia assinada</label>';
      if (!/^Atendido/.test(st.oque) && !bl.detalhe) h += '<span class="muted">sem cobrança · a gestão decide</span>';
      ex.innerHTML = h;
    }
    if (st.res && !st.res.ok) ex.appendChild(el('<div class="faixa erro" style="flex-basis:100%">' + esc((st.res.erros || ['Não gravou']).join(' ')) + '</div>'));
    $$('[data-oque]', row).forEach(function (b) { b.addEventListener('click', function () { st.oque = st.oque === b.dataset.oque ? '' : b.dataset.oque; st.recebeu = ''; st.valor = null; st.res = null; renderLancar(); }); });
    $$('[data-rec]', row).forEach(function (b) { b.addEventListener('click', function () { st.recebeu = b.dataset.rec; renderLancar(); }); });
    $$('[data-f]', row).forEach(function (inp) { var ev = inp.type === 'checkbox' || inp.tagName === 'SELECT' ? 'change' : 'input'; inp.addEventListener(ev, function () { st[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value; }); });
    box.appendChild(row);
  });
  contarLancar();
}
function contarLancar() {
  var n = itensLancar().filter(function (it) { var st = LD[chaveItem(it)]; return st && st.oque; }).length;
  $("#md-lancar-ok").disabled = !n; $("#md-lancar-ok").textContent = n ? 'Gravar ' + n + ' lançamento' + (n === 1 ? '' : 's') : 'Gravar';
  $("#md-lancar-cont").textContent = n ? 'os não marcados ficam de fora' : 'nada marcado';
}
function errosLD(it, st) {
  var e = [], bl = st.bl, nome = it.paciente.split(' ')[0] + ': ';
  if (!bl) return [nome + 'lance pelo Registrar.'];
  if (bl.detalheObrigatorio && !String(st.detalhe || '').trim()) e.push(nome + 'escreva o Detalhe (obrigatório em falta sem aviso e em cima da hora).');
  if (bl.recebeu && !st.recebeu) e.push(nome + 'responda Recebeu?');
  if (bl.recebeu && st.recebeu === 'Sim') { if (!(num(st.valor) > 0)) e.push(nome + 'Recebeu = Sim precisa de valor.'); if (!st.forma) e.push(nome + 'escolha a forma de pagamento.'); }
  return e;
}
$("#md-todos-veio").addEventListener('click', function () { var v = oqueReal(/^Atendido/); itensLancar().forEach(function (it) { var st = estadoLD(it); if (!st.oque) { st.oque = v; st.recebeu = ''; st.valor = null; } }); renderLancar(); });
$("#md-lancar-ok").addEventListener('click', function () {
  var marcados = itensLancar().filter(function (it) { var st = LD[chaveItem(it)]; return st && st.oque; }), erros = [];
  marcados.forEach(function (it) { erros = erros.concat(errosLD(it, estadoLD(it))); });
  $("#md-lancar-erros").innerHTML = erroBox(erros); if (erros.length) return;
  var itens = marcados.map(function (it) {
    var st = LD[chaveItem(it)], bl = st.bl, p = pacInfo(it.paciente) || {}, pagou = !!(bl.recebeu && st.recebeu === 'Sim');
    return { paciente: it.paciente, profissional: it.profissional, data: MD.data, hora: it.hora || '', procedimento: st.proc, oque: st.oque, recebeu: bl.recebeu ? st.recebeu : '', valor: bl.recebeu ? (st.valor || '') : '',
      valorRecebido: '', forma: pagou ? st.forma : '', dataPagamento: MD.data, quemPagou: pagou ? (p.pagador || p.nome || '') : '', nf: pagou ? 'Não' : '', nfNumero: '', guia: bl.guia ? (st.guia ? 'Sim' : 'Não') : '',
      observacao: '', detalhe: String(st.detalhe || '').trim(), tornarPagadorHabitual: false };
  });
  var b = this; b.disabled = true; b.textContent = 'Gravando ' + itens.length + '…';
  call('registrarLote', { itens: itens }).then(function (r) {
    if (!r.ok) { $("#md-lancar-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); contarLancar(); return; }
    (r.resultados || []).forEach(function (res, i) { var st = LD[chaveItem(marcados[i])]; st.res = res; });
    if (typeof invalidarResumo === 'function') invalidarResumo();
    recarregarAT().catch(function () { });
    toast(r.gravados + ' lançamento' + (r.gravados === 1 ? '' : 's') + ' gravado' + (r.gravados === 1 ? '' : 's') + (r.falharam ? ' · ' + r.falharam + ' com erro (em vermelho)' : ''));
    if (typeof DIA !== 'undefined' && DIA && DIA.data === MD.data) DIA = null; // a Agenda relê o dia
    LD_RES_MANTER = true; carregarMeuDia(); // os gravados saem da lista; os com erro ficam, com a mensagem
  }).catch(function (e) { $("#md-lancar-erros").innerHTML = erroBox(['Não consegui gravar: ' + e.message + '. Nada se perde: tente de novo.']); contarLancar(); });
});

