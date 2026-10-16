/* ================= CONCILIAÇÃO (só gestão, Fase 2, 16/10) =================
   A gestão importa o extrato do PagBank (OFX) e as vendas no cartão (CSV "detalhado"); o servidor (API.conciliacao) cruza com
   os lançamentos pagos em Pix e cartão das abas de mês e devolve: o que bateu (sugestões a confirmar), o que entrou no banco sem
   lançamento, o que foi lançado e não entrou, e as vendas no cartão. Confirmar grava nas abas "Extrato bancário" / "Vendas no
   cartão" e na coluna "Conciliado" da aba do mês (API.conciliar). Dinheiro não entra aqui: fica no fechar o dia. */
var CC = null, ccData = null, ccGen = 0;
INICIAR.conciliacao = function () {
  if (!ehGestao()) { go('hoje'); return toast('Só a gestão vê a conciliação'); }
  if (!ccData) { var h = new Date(); ccData = new Date(h.getFullYear(), h.getMonth(), 1); }
  carregarConc();
};
function ccChave() { return MESES_PT[ccData.getMonth()] + '/' + ccData.getFullYear(); }
function carregarConc() {
  var gen = ++ccGen; $("#cc-mes").textContent = ccChave(); $("#cc-carregando").hidden = false; $("#cc-carregando").textContent = 'Carregando…';
  call('conciliacao', { chave: ccChave() }).then(function (r) {
    if (gen !== ccGen || !aindaNa('conciliacao', navGen)) return;
    $("#cc-carregando").hidden = true;
    if (!r.ok) { $("#cc-aviso").innerHTML = erroBox(r.erros || [], 'Não consegui conciliar'); return; }
    CC = r; renderConc();
  }).catch(function (e) { if (gen === ccGen) $("#cc-carregando").textContent = 'Não consegui carregar: ' + e.message; });
}
$("#cc-ant").addEventListener('click', function () { ccData = new Date(ccData.getFullYear(), ccData.getMonth() - 1, 1); carregarConc(); });
$("#cc-prox").addEventListener('click', function () { ccData = new Date(ccData.getFullYear(), ccData.getMonth() + 1, 1); carregarConc(); });
// arquivos: lidos no navegador e mandados como texto; se o acento vier quebrado, relê como Latin-1
function lerArquivoTexto(f) {
  var ler = function (enc) { return new Promise(function (ok, erro) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result || '')); }; fr.onerror = function () { erro(new Error('não consegui ler o arquivo')); }; fr.readAsText(f, enc); }); };
  return ler('UTF-8').then(function (t) { return t.indexOf('�') >= 0 ? ler('ISO-8859-1') : t; });
}
[['#cc-arq-ofx', 'importarExtrato', 'entradas novas do extrato'], ['#cc-arq-csv', 'importarVendasCartao', 'vendas novas no cartão']].forEach(function (x) {
  var inp = $(x[0]);
  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
    if (f.size > 5e6) return toast('Arquivo grande demais (máx. 5 MB)');
    toast('Importando ' + f.name + '…');
    lerArquivoTexto(f).then(function (t) { return call(x[1], { texto: t }); }).then(function (r) {
      if (!r.ok) { $("#cc-aviso").innerHTML = erroBox(r.erros || [], 'Não importei'); return; }
      toast(r.novos + ' ' + x[2] + (r.jaTinha ? ' · ' + r.jaTinha + ' já estavam' : '')); carregarConc();
    }).catch(function (e) { toast('Não consegui importar: ' + e.message); });
  });
  var lab = $('label[for="' + x[0].slice(1) + '"]'); lab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
});
function ccR(n) { return 'R$ ' + brl(n || 0); }
function ccDia(s) { return String(s || '').slice(0, 5); }
function ccLancHtml(r) { return '<span><a href="#" class="link-discreto cc-ficha" data-nome="' + esc(r.paciente) + '">' + esc(r.paciente) + '</a> <span class="muted">· ' + esc(ccDia(r.dataPag) + (r.dataPag !== r.data ? ' (sessão ' + ccDia(r.data) + ')' : '') + ' · ' + profCurto(r.profissional) + ' · ' + r.forma) + '</span> <b>' + esc(ccR(r.valor)) + '</b></span>'; }
function ccBancoHtml(e) { return '<span class="quem">' + esc(ccDia(e.data)) + ' · ' + esc(ccR(e.valor)) + '</span><span><span class="tag p">' + esc(e.tipo) + '</span> ' + esc(e.quem || e.desc || '') + '</span>'; }
function ccVendaHtml(v) { return '<span class="quem">' + esc(ccDia(v.data)) + ' · ' + esc(ccR(v.bruto)) + '</span><span><span class="tag p">Cartão</span> ' + esc([v.forma, v.parcelas, v.bandeira].filter(Boolean).join(' · ')) + (v.comprador ? ' · ' + esc(v.comprador) : '') + ' <span class="muted">· líquido ' + esc(ccR(v.liquido)) + (v.depositoSug ? ', caiu ' + esc(ccDia(v.depositoSug.data)) : ', sem depósito achado') + '</span></span>'; }
function ccItemVenda(v, recs, extra) { var it = { tipo: 'venda', id: v.id, recs: recs }; if (v.depositoSug && v.depositoSug.situacao === 'pendente') it.deposito = v.depositoSug.id; return Object.assign(it, extra || {}); }
function ccRecs(l) { return l.map(function (r) { return { aba: r.aba, linha: r.linha, id: r.id }; }); }
function ccSalvar(itens, btn) {
  if (btn) btn.disabled = true;
  return call('conciliar', { itens: itens }).then(function (r) {
    if (btn) btn.disabled = false;
    if (!r.ok) { toast((r.erros || ['Não salvei'])[0]); return; }
    toast(r.feitos + (r.feitos === 1 ? ' confirmada' : ' confirmadas') + (r.erros.length ? ' · ' + r.erros.length + ' com problema' : ''));
    if (r.erros.length) $("#cc-aviso").innerHTML = erroBox(r.erros, 'Algumas não foram'); else $("#cc-aviso").innerHTML = '';
    carregarConc();
  }).catch(function (e) { if (btn) btn.disabled = false; toast('Não salvei: ' + e.message); });
}
function renderConc() {
  var r = CC, s = r.resumo;
  if (!s.temExtrato) $("#cc-aviso").innerHTML = aviso('cinza', 'Importe o extrato do PagBank', 'No app ou site do PagBank: <b>Extrato → Exportar → OFX</b>, do começo do mês até hoje (pode pegar mais de um mês; o que já foi importado não repete). Para o cartão, em <b>Vendas → Exportar → CSV detalhado</b>.');
  else if (!s.entradas) $("#cc-aviso").innerHTML = aviso('cinza', 'Nenhuma entrada no extrato em ' + esc(r.chave), 'Importe um extrato que cubra esse mês.');
  else if ($("#cc-aviso").querySelector('.faixa.cinza')) $("#cc-aviso").innerHTML = '';
  $("#cc-resumo").innerHTML = '<div><b>' + s.entradas + '</b><span>entradas no banco · ' + esc(ccR(s.valorEntradas)) + '</span></div><div><b>' + s.resolvidas + '</b><span>resolvidas · faltam ' + s.pendentes + '</span></div><div class="' + (s.valorSemLanc ? 'atencao' : '') + '"><b>' + esc(brlCurto(s.valorSemLanc)) + '</b><span>no banco, sem lançamento</span></div><div class="' + (s.valorSemBanco ? 'atencao' : '') + '"><b>' + esc(brlCurto(s.valorSemBanco)) + '</b><span>lançado, sem entrar no banco</span></div><div><b>' + esc(brlCurto(s.taxasCartao)) + '</b><span>taxas do cartão no mês</span></div>';
  // 1) sugestões
  $("#cc-n-sug").textContent = r.sugestoes.length; $("#cc-sug-card").hidden = !r.sugestoes.length;
  var ls = $("#cc-sug"); ls.innerHTML = '';
  r.sugestoes.forEach(function (g, i) {
    var lado = g.venda ? ccVendaHtml(g.venda) : ccBancoHtml(g.ext);
    var it = el('<label class="fd-item cc-sug check"><input type="checkbox" data-i="' + i + '"' + (g.forca === 'forte' ? ' checked' : '') + '><span class="cc-lados"><span class="cc-lado">' + lado + '</span><span class="cc-seta" aria-hidden="true">→</span><span class="cc-lado cc-recs">' + g.recs.map(ccLancHtml).join('') + '</span></span>' + (g.aviso ? '<span class="tag laranja">' + esc(g.aviso) + '</span>' : g.forca === 'forte' ? '<span class="tag verde">bate</span>' : '') + '</label>');
    ls.appendChild(it);
  });
  // 2) no banco, sem lançamento (entradas do extrato e vendas no cartão)
  var sits = r.situacoes.filter(function (x) { return x !== 'conciliado' && x !== 'pendente'; });
  var semBancoOrd = function (valor, data) { return r.semBanco.slice().sort(function (a, b) { return Math.abs(a.valor - valor) - Math.abs(b.valor - valor) || Math.abs(diasCC(a.dataPag, data)) - Math.abs(diasCC(b.dataPag, data)); }); };
  var lsl = $("#cc-semlanc"); lsl.innerHTML = '';
  var pend = r.semLancamento.map(function (e) { return { e: e }; }).concat(r.vendasSemLancamento.map(function (v) { return { v: v }; }));
  $("#cc-n-semlanc").textContent = pend.length;
  pend.forEach(function (p) {
    var x = p.e || p.v, valor = p.e ? x.valor : x.bruto, sug = p.e ? x.sugestao : '';
    var opts = '<option value="">o que é?</option>' + sits.map(function (o) { return '<option' + (o === sug ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
    var lancs = '<option value="">ligar a um lançamento…</option>' + semBancoOrd(valor, x.data).map(function (l, j) { return '<option value="' + j + '">' + esc(l.paciente + ' · ' + ccDia(l.dataPag) + ' · ' + ccR(l.valor) + ' · ' + l.forma) + '</option>'; }).join('');
    var it = el('<div class="fd-item cc-pend"><span class="cc-lado">' + (p.e ? ccBancoHtml(x) : ccVendaHtml(x)) + '</span>' + (sug ? '<span class="tag lilas" title="' + (x.historico ? 'mesma situação das ' + x.historico + ' entrada(s) já resolvida(s) deste pagador' : '') + '">sugestão: ' + esc(sug) + (x.historico ? ' (como antes)' : '') + '</span>' : '') + ccIAHtml(x.ia) + '<span class="esp"></span><span class="cc-form"><select class="cc-sit" aria-label="O que é">' + opts + '</select>' + (r.semBanco.length ? '<select class="cc-lanc" aria-label="Ligar a um lançamento">' + lancs + '</select>' : '') + '<input class="cc-obs" placeholder="Observação (opcional)" aria-label="Observação"><button type="button" class="btn mini">Salvar</button></span></div>');
    var ord = semBancoOrd(valor, x.data), selL = $('.cc-lanc', it), selS = $('.cc-sit', it);
    if (selL) selL.addEventListener('change', function () { selS.disabled = !!selL.value; });
    $('button', it).addEventListener('click', function () {
      var l = selL && selL.value !== '' ? ord[+selL.value] : null, sit = selS.value, obs = $('.cc-obs', it).value.trim();
      if (!l && !sit) return toast('Escolha o que é, ou ligue a um lançamento');
      var recs = l ? ccRecs([l]) : [], extra = { situacao: l ? 'conciliado' : sit, obs: obs };
      ccSalvar([p.e ? Object.assign({ tipo: 'ext', id: x.id, recs: recs }, extra) : ccItemVenda(x, recs, extra)], this);
    });
    var bIA = $('.cc-ia-aceitar', it); if (bIA) bIA.addEventListener('click', function () { ccSalvar([ccItemIA(p)], this); });
    $$('.cc-ficha', it).forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); go('ficha', { nome: a.getAttribute('data-nome') }); }); });
    lsl.appendChild(it);
  });
  ccRenderIA(r, pend);
  if (!pend.length) lsl.innerHTML = '<div class="muted">' + (s.temExtrato ? 'Nada solto no banco neste mês.' : '—') + '</div>';
  // 3) lançado sem banco
  $("#cc-n-sembanco").textContent = r.semBanco.length;
  $("#cc-sembanco").innerHTML = r.semBanco.length ? r.semBanco.map(function (l) { return '<div class="fd-item">' + ccLancHtml(l) + '</div>'; }).join('') : '<div class="muted">' + (s.temExtrato ? 'Tudo que foi lançado em Pix e cartão entrou no banco.' : '—') + '</div>';
  // 4) vendas no cartão
  $("#cc-vendas-card").hidden = !r.vendas.length;
  $("#cc-taxas").textContent = r.vendas.length ? r.vendas.length + ' vendas · taxas ' + ccR(s.taxasCartao) : '';
  $("#cc-vendas").innerHTML = r.vendas.map(function (v) { return '<tr><td>' + esc(ccDia(v.data)) + '</td><td>' + esc([v.forma, v.parcelas].filter(Boolean).join(' · ')) + '<div class="sub">' + esc(v.bandeira || '') + '</div></td><td class="num">' + esc(brl(v.bruto)) + '</td><td class="num">' + esc(brl(v.taxa)) + '</td><td class="num"><b>' + esc(brl(v.liquido)) + '</b></td><td>' + (v.depositoSug ? esc(ccDia(v.depositoSug.data)) : '<span class="muted">não achei</span>') + '</td><td><span class="tag ' + (v.situacao === 'pendente' ? 'amarela' : 'verde') + '">' + esc(v.situacao) + '</span>' + (v.ligado ? '<div class="sub">' + esc(v.ligado) + '</div>' : '') + '</td></tr>'; }).join('');
  // 5) resolvidas
  $("#cc-n-res").textContent = r.resolvidos.length ? '(' + r.resolvidos.length + ')' : '';
  $("#cc-res-card").hidden = !r.resolvidos.length;
  $("#cc-res").innerHTML = r.resolvidos.map(function (e) { return '<div class="fd-item">' + ccBancoHtml(e) + '<span class="esp"></span><span class="tag ' + (e.situacao === 'conciliado' ? 'verde' : 'lilas') + '">' + esc(e.situacao) + '</span>' + (e.ligado || e.obs ? '<span class="muted" style="flex-basis:100%;font-size:12px">' + esc([e.ligado, e.obs].filter(Boolean).join(' · ')) + '</span>' : '') + '</div>'; }).join('');
  $$('.cc-ficha', $("#s-conciliacao")).forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); go('ficha', { nome: a.getAttribute('data-nome') }); }); });
  ccContarMarcados();
}
function diasCC(a, b) { var x = dataObj(a), y = dataObj(b); return x && y ? Math.round((x - y) / 864e5) : 99; }
function ccContarMarcados() { var n = $$('#cc-sug input:checked').length; $("#cc-confirmar").textContent = 'Confirmar marcados (' + n + ')'; $("#cc-confirmar").disabled = !n; }
$("#cc-sug").addEventListener('change', ccContarMarcados);
$("#cc-confirmar").addEventListener('click', function () {
  var itens = $$('#cc-sug input:checked').map(function (c) { var g = CC.sugestoes[+c.getAttribute('data-i')]; return g.venda ? ccItemVenda(g.venda, ccRecs(g.recs)) : { tipo: 'ext', id: g.ext.id, recs: ccRecs(g.recs) }; });
  if (itens.length) ccSalvar(itens, this);
});
/* ---------- conciliação assistida (IA parte 2, 17/10): o que sobrou das regras vai pro modelo; a sugestão aparece em cada entrada
   e só vale com o clique (Aceitar = o mesmo Salvar). Sugestões fixas (resgate, própria clínica, antes do 1º mês do app) confirmam em lote. ---------- */
function ccIAHtml(ia) {
  if (!ia) return '';
  var cab = '<span class="tag lilas">IA · ' + esc({ alta: 'confiança alta', media: 'confiança média', baixa: 'confiança baixa' }[ia.conf] || ia.conf || '') + '</span> ';
  if (ia.acao === 'nenhuma') return '<div class="cc-ia muted">IA: ' + esc(ia.motivo || 'não soube dizer') + '</div>';
  var corpo = '';
  if (ia.acao === 'ligar') corpo = '<span class="cc-recs">' + (ia.recs || []).map(ccLancHtml).join('') + '</span>';
  else if (ia.acao === 'situacao') corpo = '<b>' + esc(ia.sit) + '</b>';
  else if (ia.acao === 'em_aberto') corpo = '<span>parece pagar sessões em aberto: ' + (ia.abertos || []).map(function (a) { return '<a href="#" class="link-discreto cc-ficha" data-nome="' + esc(a.paciente) + '">' + esc(a.paciente) + '</a> <span class="muted">' + esc(ccDia(a.data) + ' · ' + ccR(a.valor)) + '</span>'; }).join(', ') + '. Registre o pagamento na Ficha; depois ele concilia aqui.</span>';
  var podeAceitar = ia.acao === 'ligar' || ia.acao === 'situacao';
  return '<div class="cc-ia faixa lilas">' + cab + esc(ia.motivo || '') + (ia.aviso ? ' <span class="tag laranja">' + esc(ia.aviso) + '</span>' : '') + '<div class="cc-ia-corpo">' + corpo + (podeAceitar ? ' <button type="button" class="btn mini cc-ia-aceitar">Aceitar</button>' : '') + '</div></div>';
}
function ccItemIA(p) {
  var x = p.e || p.v, ia = x.ia, extra = { obs: 'IA: ' + (ia.motivo || '') };
  if (ia.acao === 'ligar') return p.e ? Object.assign({ tipo: 'ext', id: x.id, recs: ccRecs(ia.recs) }, extra) : ccItemVenda(x, ccRecs(ia.recs), extra);
  extra.situacao = ia.sit; return p.e ? Object.assign({ tipo: 'ext', id: x.id, recs: [] }, extra) : ccItemVenda(x, [], extra);
}
function ccRenderIA(r, pend) {
  var ia = r.ia || {}, btn = $("#cc-ia-btn"), hint = $("#cc-ia-hint"), fixas = pend.filter(function (p) { return p.e && p.e.fixa; });
  var altas = pend.filter(function (p) { var a = (p.e || p.v).ia; return a && a.conf === 'alta' && !a.aviso && (a.acao === 'ligar' || a.acao === 'situacao'); });
  var bf = $("#cc-fixas"); bf.hidden = !fixas.length;
  if (fixas.length) { var cont = {}; fixas.forEach(function (p) { cont[p.e.sugestao] = (cont[p.e.sugestao] || 0) + 1; }); bf.textContent = 'Confirmar sugestões fixas (' + fixas.length + ')'; bf.title = Object.keys(cont).map(function (k) { return cont[k] + ' × ' + k; }).join(' · '); }
  bf.onclick = function () { var b = this; doisCliques(b, 'Confirmar: ' + fixas.length + ' (' + b.title + ')?', function () { ccSalvar(fixas.map(function (p) { return { tipo: 'ext', id: p.e.id, recs: [], situacao: p.e.sugestao, obs: 'regra fixa do app' }; }), b); }); };
  var ba = $("#cc-ia-altas"); ba.hidden = !altas.length; ba.textContent = 'Aceitar as da IA com confiança alta (' + altas.length + ')';
  ba.onclick = function () { var b = this; doisCliques(b, 'Confirmar: aceitar ' + altas.length + '?', function () { ccSalvar(altas.map(ccItemIA), b); }); };
  var refazer = !ia.aSugerir && ia.comIA > 0;
  btn.hidden = !ehGestao() || !(ia.aSugerir || ia.comIA); btn.disabled = !!ia.bloqueio; btn.textContent = refazer ? 'Pedir de novo à IA' : 'Sugerir com IA (' + (ia.aSugerir || 0) + ')';
  hint.textContent = ia.bloqueio ? 'IA indisponível: ' + ia.bloqueio : (ia.aSugerir || ia.comIA ? 'Uso da IA este mês: ' + usdTxt(ia.gastoMes) + ' de ' + usdTxt(ia.tetoMes) + ' · ' + (ia.modelo || '') : '');
  btn.onclick = function () {
    var b = this, vai = function () {
      b.disabled = true; b.textContent = 'IA lendo… (até 4 min)';
      call('conciliacaoIA', { chave: ccChave(), refazer: refazer }).then(function (x) {
        b.disabled = false;
        if (!x.ok) { $("#cc-aviso").innerHTML = erroBox(x.erros || ['A IA não respondeu'], 'IA'); carregarConc(); return; }
        toast(x.mensagem && !x.sugeridas && !x.semSugestao ? x.mensagem : x.sugeridas + ' sugestão(ões)' + (x.semSugestao ? ' · ' + x.semSugestao + ' sem sugestão' : '') + (x.custo ? ' · ' + usdTxt(x.custo) : ''));
        if (x.erros && x.erros.length) $("#cc-aviso").innerHTML = erroBox(x.erros, 'Parte não foi'); else if (x.mensagem && x.restantes) $("#cc-aviso").innerHTML = aviso('cinza', esc(x.mensagem), '');
        carregarConc();
      }).catch(function (e) { b.disabled = false; toast('A IA não respondeu: ' + e.message); carregarConc(); });
    };
    if (refazer) doisCliques(b, 'Confirmar: pedir de novo (refaz as sugestões soltas)?', vai); else vai();
  };
}
