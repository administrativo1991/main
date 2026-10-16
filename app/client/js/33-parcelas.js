/* ================= PARCELAMENTOS NA FICHA (Fase 2, 16/10; gestão e recepção) =================
   Card "Parcelamentos" da Ficha: os acordos do paciente (serviço parcelado ou dívida renegociada) com as parcelas, registrar
   pagamento (API.pagarParcela), cancelar com motivo e criar um novo (API.criarParcelamento). Serviço parcelado: cada pagamento
   vira um lançamento no mês em que entrou; dívida: o pagamento é abatido nas sessões em aberto escolhidas, da mais antiga. */
var fpTipo = 'avaliacao';
function dataBR(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function hojeISO() { var h = new Date(); return h.getFullYear() + '-' + ('0' + (h.getMonth() + 1)).slice(-2) + '-' + ('0' + h.getDate()).slice(-2); }
// mesma conta do servidor (montarVenc_): mensal no mesmo dia, parcelas iguais, a última leva os centavos
function previaVenc(total, n, iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m || !(total > 0) || !(n >= 1)) return [];
  var cents = Math.round(total * 100), base = Math.floor(cents / n), out = [];
  for (var i = 0; i < n; i++) { var y = +m[1], mo = +m[2] - 1 + i, ult = new Date(y, mo + 1, 0).getDate(), d = new Date(y, mo, Math.min(+m[3], ult)); out.push({ venc: ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2), valor: (i === n - 1 ? cents - base * (n - 1) : base) / 100 }); }
  return out;
}
function renderParcFicha() {
  var l = (FI && FI.parcelamentos) || [], box = $("#fi-parc"); $("#fi-parc-form").hidden = true; $("#fi-parc-form").innerHTML = '';
  box.innerHTML = l.length ? '' : '<div class="muted">Nenhum parcelamento. Use quando uma avaliação (ou outro serviço) for paga em várias vezes, ou para parcelar sessões em aberto.</div>';
  l.forEach(function (a) {
    var tag = a.situacao === 'cancelado' ? '<span class="tag cinza">cancelado</span>' : a.situacao === 'quitado' ? '<span class="tag verde">quitado</span>' : a.atrasado ? '<span class="tag vermelha">atrasado</span>' : '<span class="tag verde">em dia</span>';
    var chips = a.parcelas.map(function (q) { var cor = q.situacao === 'paga' ? 'verde' : q.atrasada ? 'vermelha' : q.situacao === 'parcial' ? 'amarela' : 'cinza'; return '<span class="tag p ' + cor + '" title="' + esc(q.situacao + (q.pago && q.situacao !== 'paga' ? ': pago ' + brlCurto(q.pago) : '')) + '">' + q.n + '/' + a.n + ' · ' + esc(q.venc.slice(0, 5)) + ' · ' + esc(brlCurto(q.valor)) + '</span>'; }).join(' ');
    var it = el('<div class="fd-item fi-parc' + (a.situacao !== 'ativo' ? ' fi-off' : '') + '"><div class="fi-parc-cab"><span><b>' + esc(a.descricao) + '</b> <span class="muted">· ' + esc(a.tipoTxt || '') + ' · ' + esc(brlCurto(a.total)) + ' em ' + a.n + 'x' + (a.profissional ? ' · ' + esc(profCurto(a.profissional)) : '') + '</span></span><span class="esp"></span>' + tag + '</div>' +
      '<div class="sub">pago ' + esc(brlCurto(a.pago)) + ' · falta ' + esc(brlCurto(a.saldo)) + (a.proxima ? ' · próxima: ' + a.proxima.n + '/' + a.n + ' em ' + esc(a.proxima.venc) + ' (' + esc(brlCurto(a.proxima.valor - a.proxima.pago)) + ')' : '') + ' · ' + esc(a.id) + '</div>' +
      '<div class="fi-parc-chips">' + chips + '</div>' + (a.obs ? '<div class="sub">' + esc(a.obs) + '</div>' : '') +
      (a.situacao === 'ativo' ? '<div class="acoes no-print"><button type="button" class="btn mini" data-a="pagar">Registrar pagamento</button><button type="button" class="btn ter mini" data-a="cancelar">Cancelar parcelamento</button></div><div class="fi-parc-sub" hidden></div>' : '') + '</div>');
    if (a.situacao === 'ativo') {
      var sub = $('.fi-parc-sub', it);
      $('[data-a=pagar]', it).addEventListener('click', function () {
        var falta = a.proxima ? Math.round((a.proxima.valor - a.proxima.pago) * 100) / 100 : a.saldo;
        sub.hidden = false; sub.innerHTML = '<div class="fi-parc-form"><label class="campo">Valor recebido<input data-c="valor" inputmode="decimal" value="' + esc(brl(falta)) + '"></label><label class="campo">Data<input type="date" data-c="data" value="' + hojeISO() + '"></label><label class="campo">Forma<select data-c="forma"></select></label><label class="campo">Nº da NF <span class="leg">(se já emitiu)</span><input data-c="nf"></label><button type="button" class="btn mini" data-a="ok">Salvar pagamento</button></div><div class="muted" style="font-size:12px">' + (a.tipo === 'avaliacao' ? 'Vira um lançamento "' + esc(a.procedimento) + '" no mês do pagamento, com a parcela na Observação.' : 'É abatido nas sessões do acordo, da mais antiga para a mais nova.') + '</div>';
        preencherSelect($('[data-c=forma]', sub), (BOOT && BOOT.listas.formas) || ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'], 'escolha');
        $('[data-a=ok]', sub).addEventListener('click', function () {
          var b = this, v = $('[data-c=valor]', sub).value, f = $('[data-c=forma]', sub).value;
          if (!f) return toast('Escolha a forma de pagamento');
          b.disabled = true;
          call('pagarParcela', { id: a.id, valor: v, data: dataBR($('[data-c=data]', sub).value), forma: f, nfNumero: $('[data-c=nf]', sub).value.trim() }).then(function (r) {
            b.disabled = false;
            if (!r.ok) { sub.insertAdjacentHTML('beforeend', erroBox(r.erros || [], 'Não gravei')); return; }
            toast('Pagamento registrado: ' + r.parcelas + (r.quitado ? ' · parcelamento quitado' : '') + (r.erros && r.erros.length ? ' · ' + r.erros[0] : ''));
            abrirFicha(fiNome);
          }).catch(function (e) { b.disabled = false; toast('Não gravei: ' + e.message); });
        });
      });
      $('[data-a=cancelar]', it).addEventListener('click', function () {
        sub.hidden = false; sub.innerHTML = '<div class="fi-parc-form"><label class="campo" style="flex:1 1 260px">Motivo do cancelamento<input data-c="motivo" placeholder="ex.: refeito com outro valor"></label><button type="button" class="btn vermelho mini" data-a="ok">Cancelar parcelamento</button></div><div class="muted" style="font-size:12px">Os pagamentos já feitos continuam lançados. ' + (a.tipo === 'divida' ? 'As sessões que faltam voltam para o a receber.' : '') + '</div>';
        $('[data-a=ok]', sub).addEventListener('click', function () {
          var b = this, m = $('[data-c=motivo]', sub).value.trim(); if (!m) return toast('Escreva o motivo');
          doisCliques(b, 'Confirmar: cancelar?', function () { b.disabled = true; call('cancelarParcelamento', { id: a.id, motivo: m }).then(function (r) { b.disabled = false; if (!r.ok) return toast((r.erros || ['Não cancelei'])[0]); toast('Parcelamento cancelado'); abrirFicha(fiNome); }).catch(function (e) { b.disabled = false; toast('Não cancelei: ' + e.message); }); });
        });
      });
    }
    box.appendChild(it);
  });
}
$("#fi-parc-novo").addEventListener('click', function () {
  var f = $("#fi-parc-form"); if (!f.hidden) { f.hidden = true; f.innerHTML = ''; return; }
  var abertas = ((FI && FI.aberto) || []).filter(function (x) { return x.tipo === 'receber' && x.r.id && x.r.aba; });
  f.hidden = false;
  f.innerHTML = '<div class="fi-parc-novo"><div class="seg mini" id="fp-tipo" role="group" aria-label="Tipo de parcelamento"><button type="button" data-v="avaliacao">Serviço parcelado (ex.: avaliação)</button><button type="button" data-v="divida">Sessões em aberto</button></div>' +
    '<div data-t="avaliacao" class="fi-parc-form"><label class="campo" style="flex:2 1 220px">Procedimento <span class="leg">(sai em cada parcela paga)</span><select data-c="proc"></select></label><label class="campo" style="flex:1 1 160px">Profissional<select data-c="prof"></select></label><label class="campo" style="flex:1 1 120px">Valor total<input data-c="total" inputmode="decimal" placeholder="1.800,00"></label><label class="campo" style="flex:2 1 220px">Descrição <span class="leg">(opcional)</span><input data-c="desc" placeholder="ex.: Avaliação neuropsicológica (contrato 487)"></label></div>' +
    '<div data-t="divida" class="fi-parc-form" hidden><div style="flex:1 1 100%">' + (abertas.length ? '<div class="muted" style="font-size:13px;margin-bottom:6px">Marque as sessões em aberto que entram no acordo:</div>' + abertas.map(function (x, i) { return '<label class="check"><input type="checkbox" data-i="' + i + '" checked><span>' + esc(x.r.data.slice(0, 5) + ' · ' + profCurto(x.r.profissional) + ' · ' + (x.r.procedimento || '') + ' · ') + '<b>' + esc(brlCurto(x.r.saldo)) + '</b>' + (x.r.pago === 'Parcial' ? ' <span class="muted">(falta, de ' + esc(brlCurto(x.r.valor)) + ')</span>' : '') + '</span></label>'; }).join('') : '<div class="muted">Nenhuma sessão em aberto com ID neste paciente.</div>') + '</div></div>' +
    '<div class="fi-parc-form"><label class="campo" style="flex:0 1 110px">Parcelas<input type="number" data-c="n" min="1" max="24" value="3"></label><label class="campo" style="flex:0 1 170px">1º vencimento<input type="date" data-c="venc" value="' + hojeISO() + '"></label><label class="campo" style="flex:2 1 220px">Observação <span class="leg">(opcional)</span><input data-c="obs"></label></div>' +
    '<div class="muted" id="fp-previa" style="font-size:13px"></div><div class="acoes"><button type="button" class="btn mini" id="fp-criar">Criar parcelamento</button><button type="button" class="btn ter mini" id="fp-fechar">Fechar</button></div></div>';
  preencherSelect($('[data-c=proc]', f), ((AT && AT.procedimentos) || []).map(function (p) { return p.nome; }), 'escolha');
  preencherSelect($('[data-c=prof]', f), (BOOT && BOOT.profissionais) || [], 'escolha');
  var procs = ((AT && AT.procedimentos) || []).filter(function (p) { return /^Avalia/i.test(p.nome); }); if (procs[0]) $('[data-c=proc]', f).value = procs[0].nome;
  var total = function () { if (fpTipo === 'avaliacao') return numBRc($('[data-c=total]', f).value); return $$('[data-t=divida] input[type=checkbox]', f).filter(function (c) { return c.checked; }).reduce(function (s, c) { return s + abertas[+c.dataset.i].r.saldo; }, 0); };
  var previa = function () { var n = parseInt($('[data-c=n]', f).value, 10), l = previaVenc(total(), n, $('[data-c=venc]', f).value); $("#fp-previa").textContent = l.length ? brlCurto(total()) + ' em ' + n + 'x: ' + l.map(function (q) { return q.venc + ' ' + brlCurto(q.valor); }).join(' · ') : 'Preencha o valor, as parcelas e o 1º vencimento.'; };
  var tipo = function (t) { fpTipo = t; seg($("#fp-tipo"), t); $$('[data-t]', f).forEach(function (x) { x.hidden = x.dataset.t !== t; }); previa(); };
  $$('#fp-tipo button').forEach(function (b) { b.addEventListener('click', function () { tipo(b.dataset.v); }); });
  f.addEventListener('input', previa); f.addEventListener('change', previa); tipo(fpTipo);
  $("#fp-fechar").addEventListener('click', function () { f.hidden = true; f.innerHTML = ''; });
  $("#fp-criar").addEventListener('click', function () {
    var b = this, d = { tipo: fpTipo, paciente: FI.paciente.nome, parcelas: $('[data-c=n]', f).value, primeiroVencimento: dataBR($('[data-c=venc]', f).value), obs: $('[data-c=obs]', f).value.trim() };
    if (fpTipo === 'avaliacao') { d.procedimento = $('[data-c=proc]', f).value; d.profissional = $('[data-c=prof]', f).value; d.total = $('[data-c=total]', f).value; d.descricao = $('[data-c=desc]', f).value.trim(); }
    else d.linhas = $$('[data-t=divida] input[type=checkbox]', f).filter(function (c) { return c.checked; }).map(function (c) { var r = abertas[+c.dataset.i].r; return { aba: r.aba, id: r.id }; });
    b.disabled = true;
    call('criarParcelamento', d).then(function (r) {
      b.disabled = false;
      if (!r.ok) { var e = $('.faixa.erro', f); if (e) e.remove(); f.insertAdjacentHTML('beforeend', erroBox(r.erros || [], 'Falta corrigir')); return; }
      toast('Parcelamento criado: ' + brlCurto(r.total) + ' em ' + r.vencimentos.length + 'x'); abrirFicha(fiNome);
    }).catch(function (e) { b.disabled = false; toast('Não gravei: ' + e.message); });
  });
});
function numBRc(t) { t = String(t || '').trim().replace(/[R$\s]/g, ''); if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = parseFloat(t); return isNaN(n) ? 0 : n; }
