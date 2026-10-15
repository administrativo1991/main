/* ================= CONFIRMAÇÕES — WhatsApp (Fase 2, 15/10) =================
   A recepção escolhe o período (amanhã, daqui a 2 dias, a semana), vê as sessões agrupadas por pagador e abre o WhatsApp
   com a mensagem pronta (texto oficial em app/shared/mensagens.js; a gestão troca em Parâmetros!msg_confirmacao). Abrir o WhatsApp grava "mensagem enviada" (aba Mensagens
   WhatsApp); a resposta da família vira "Confirmou" (Lista do dia) ou "Não vem / remarcar" na Agenda do dia.
   Sem número no cadastro: a recepção digita o WhatsApp uma vez e ele vai para Pacientes (com log). */
var CF = null, cfPeriodo = 'amanha', cfMostrar = 'falta', cfProf = '', cfGen = 0;
INICIAR.confirmar = function () { quandoAT(carregarConfirmacoes); };
function ddmm(dt) { return ('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2) + '/' + dt.getFullYear(); }
function maisDias(dt, n) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n); }
function periodoCF() {
  var h = dataObj(hojeStr()) || new Date(), am = maisDias(h, 1);
  if (cfPeriodo === 'dois') return { de: ddmm(maisDias(h, 2)), ate: ddmm(maisDias(h, 2)) };
  if (cfPeriodo === 'semana') { var sab = maisDias(am, (6 - am.getDay() + 7) % 7); return { de: ddmm(am), ate: ddmm(sab) }; }
  if (cfPeriodo === 'proxima') { var seg2 = maisDias(h, ((8 - h.getDay()) % 7) || 7); return { de: ddmm(seg2), ate: ddmm(maisDias(seg2, 5)) }; }
  if (cfPeriodo === 'outro') return { de: $("#cf-de").value, ate: $("#cf-ate").value || $("#cf-de").value };
  return { de: ddmm(am), ate: ddmm(am) };
}
function carregarConfirmacoes() {
  var p = periodoCF(), gen = ++cfGen;
  if (cfPeriodo === 'outro' && !dataObj(p.de)) { $("#cf-carregando").hidden = true; $("#cf-status").textContent = 'Escolha as datas (dd/mm/aaaa) e clique em Ver.'; return; }
  $("#cf-carregando").hidden = false; $("#cf-lista").innerHTML = ''; $("#cf-resumo").hidden = true; $("#cf-status").textContent = '';
  call('confirmacoes', p).then(function (r) {
    if (!aindaNa('confirmar', navGen) || gen !== cfGen) return;
    $("#cf-carregando").hidden = true;
    if (!r.ok) { $("#cf-status").textContent = (r.erros || ['Não consegui carregar.']).join(' '); return; }
    CF = r; preencherProfsCF(); renderConfirmacoes();
  }).catch(function (e) { if (gen !== cfGen) return; $("#cf-carregando").hidden = true; $("#cf-status").textContent = 'Não consegui carregar: ' + e.message; });
}
function preencherProfsCF() {
  var profs = []; CF.grupos.forEach(function (g) { g.itens.forEach(function (x) { if (profs.indexOf(x.profissional) < 0) profs.push(x.profissional); }); });
  profs.sort(); var sel = $("#cf-prof"); sel.innerHTML = '<option value="">Todos os profissionais</option>';
  profs.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = profCurto(p); sel.appendChild(o); });
  if (profs.indexOf(cfProf) < 0) cfProf = ''; sel.value = cfProf;
}
function situacaoCF(x) {
  if (x.confirmado) return '<span class="tag verde">' + ic('check', 12, 3) + 'Confirmado</span>';
  if (x.enviado) return '<span class="tag lilas" title="por ' + esc(x.enviado.por) + '">Mensagem enviada ' + esc(String(x.enviado.quando || '').replace(/^(\d{2}\/\d{2})\/\d{4}/, '$1')) + '</span>';
  return '<span class="tag amarela">A confirmar</span>';
}
function renderConfirmacoes() {
  var gs = CF.grupos.map(function (g) { return { g: g, itens: g.itens.filter(function (x) { return !cfProf || x.profissional === cfProf; }) }; }).filter(function (o) { return o.itens.length; });
  var todos = [].concat.apply([], gs.map(function (o) { return o.itens; }));
  var conf = todos.filter(function (x) { return x.confirmado; }).length, env = todos.filter(function (x) { return !x.confirmado && x.enviado; }).length, semFone = gs.filter(function (o) { return !o.g.fone && o.itens.some(function (x) { return !x.confirmado; }); }).length;
  $("#cf-resumo").hidden = false;
  $("#cf-resumo").innerHTML = '<div><b>' + todos.length + '</b><span>sessões · ' + esc(CF.de === CF.ate ? CF.de.slice(0, 5) : CF.de.slice(0, 5) + ' a ' + CF.ate.slice(0, 5)) + '</span></div><div><b>' + conf + '</b><span>confirmadas</span></div><div><b>' + env + '</b><span>mensagem enviada, sem resposta</span></div><div><b>' + (todos.length - conf - env) + '</b><span>a confirmar</span></div><div class="' + (semFone ? 'atencao' : '') + '"><b>' + semFone + '</b><span>famílias sem WhatsApp</span></div>';
  var vis = gs.filter(function (o) { return cfMostrar === 'todos' || o.itens.some(function (x) { return !x.confirmado; }); });
  var box = $("#cf-lista"); box.innerHTML = '';
  if (!vis.length) { box.innerHTML = '<div class="card compacto"><div class="muted">' + (todos.length ? 'Todas as sessões do período estão confirmadas.' : 'Nenhuma sessão na agenda neste período.') + '</div></div>'; return; }
  vis.forEach(function (o) { box.appendChild(cardGrupoCF(o.g, o.itens)); });
}
function cardGrupoCF(g, itens) {
  var faltam = itens.filter(function (x) { return !x.confirmado; }), msgItens = faltam.length ? faltam : itens;
  var titulo = g.pagador ? esc(g.pagador) : esc(g.pacientes.join(', '));
  var fone = g.fone ? '<span class="muted">' + ic('phone', 13, 2.4) + ' ' + esc(g.foneFmt) + (g.foneDe && g.foneDe !== 'pagador' ? ' (telefone do ' + esc(g.foneDe) + ')' : '') + '</span>' : '<span class="tag laranja">sem WhatsApp no cadastro</span>';
  var c = el('<div class="card compacto cf-grupo' + (faltam.length ? '' : ' ok') + '"><div class="cf-cab"><div><b class="cf-quem">' + titulo + '</b>' + (g.pagador ? '<span class="muted"> · ' + esc(g.pacientes.map(primeiroNome).join(', ')) + '</span>' : '') + '</div>' + fone + '</div><div class="cf-itens"></div><div class="cf-acoes"></div><pre class="cf-msg" hidden></pre></div>');
  var li = $('.cf-itens', c);
  itens.forEach(function (x) {
    var r = el('<div class="fd-item"><span class="cf-quando">' + esc(x.diaSemana.slice(0, 3).toLowerCase() + ' ' + x.data.slice(0, 5) + (x.hora ? ' · ' + x.hora : '')) + '</span><span class="quem">' + esc(x.paciente) + '</span><span class="muted">' + esc(profCurto(x.profissional) + (x.tipo ? ' · ' + x.tipo.toLowerCase() : '')) + '</span><span class="esp"></span>' + situacaoCF(x) +
      (x.confirmado ? '' : '<button type="button" class="btn ter mini" data-ac="confirmou">Confirmou</button><button type="button" class="btn link mini" data-ac="naovem" title="Abre a Agenda do dia para marcar Não vem ou Remarcar">Não vem / remarcar</button>') + '</div>');
    $$('button', r).forEach(function (b) { b.addEventListener('click', function () { acaoItemCF(b.dataset.ac, x, b); }); });
    li.appendChild(r);
  });
  var ac = $('.cf-acoes', c), msg = mensagemCF(g, msgItens);
  if (g.fone) {
    var a = el('<a class="btn" target="_blank" rel="noopener">' + ic('send', 15, 2.4) + ' Abrir WhatsApp' + (faltam.length ? '' : ' (de novo)') + '</a>');
    a.href = 'https://wa.me/' + g.fone + '?text=' + encodeURIComponent(msg);
    a.addEventListener('click', function () { marcarEnviadaCF(g, msgItens); });
    ac.appendChild(a);
  } else {
    var f = el('<span class="cf-fone"><input placeholder="WhatsApp: (32) 9 9999-9999" inputmode="tel" maxlength="16" autocomplete="off" aria-label="WhatsApp do pagador"><button type="button" class="btn sec mini">Salvar no cadastro</button></span>');
    var inp = $('input', f); inp.addEventListener('input', function () { this.value = mascaraFone(this.value); });
    $('button', f).addEventListener('click', function () {
      var b = this; if (String(inp.value).replace(/\D/g, '').length < 10) { toast('Digite o DDD e o número.'); inp.focus(); return; }
      b.disabled = true;
      call('salvarWhats', { pacientes: g.pacientes, whats: inp.value }).then(function (r) {
        b.disabled = false; if (!r.ok) return toast((r.erros || ['Não gravou']).join(' '));
        g.fone = r.fone; g.foneFmt = r.foneFmt; g.foneDe = 'pagador'; toast('WhatsApp salvo no cadastro' + (r.salvos && r.salvos.length > 1 ? ' de ' + r.salvos.length + ' pacientes' : '')); renderConfirmacoes();
        if (typeof recarregarAT === 'function') recarregarAT();
      }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
    });
    ac.appendChild(f);
  }
  var bc = el('<button type="button" class="btn ter mini">' + ic('copy', 14, 2.2) + ' Copiar mensagem</button>');
  bc.addEventListener('click', function () {
    var ok = function () { toast('Mensagem copiada'); }, falha = function () { window.prompt('Copie a mensagem:', msg); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(ok, falha); else falha();
  });
  var bv = el('<button type="button" class="btn link mini">Ver mensagem</button>'), pre = $('.cf-msg', c);
  bv.addEventListener('click', function () { pre.hidden = !pre.hidden; pre.textContent = msg; bv.textContent = pre.hidden ? 'Ver mensagem' : 'Esconder mensagem'; });
  ac.appendChild(bc); ac.appendChild(bv);
  return c;
}
// a mesma função do servidor (app/shared/mensagens.js), só com as sessões mostradas (filtro de profissional)
function mensagemCF(g, itens) { return Mensagens.confirmacao(CF.modelo, g.pagador, itens); }
function marcarEnviadaCF(g, itens) {
  call('marcarMensagemEnviada', { pagador: g.pagador, fone: g.fone, itens: itens.map(function (x) { return { data: x.data, hora: x.hora, paciente: x.paciente, profissional: x.profissional }; }) }).then(function (r) {
    if (!r.ok) return toast((r.erros || ['Não registrei o envio']).join(' '));
    itens.forEach(function (x) { if (!x.confirmado) x.enviado = { por: r.por, quando: r.quando }; });
    if (aindaNa('confirmar', navGen)) renderConfirmacoes();
  }).catch(function (e) { toast('Não registrei o envio: ' + e.message); });
}
function acaoItemCF(ac, x, b) {
  if (ac === 'confirmou') {
    b.disabled = true;
    call('confirmar', { data: x.data, hora: x.hora || '', paciente: x.paciente, profissional: x.profissional }).then(function (r) {
      if (!r.ok) { b.disabled = false; return toast((r.erros || ['Não gravou']).join(' ')); }
      x.confirmado = { por: quemSou(), quando: agoraHora() }; toast('Confirmado: ' + x.paciente); renderConfirmacoes();
    }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
  } else if (ac === 'naovem') go('hoje', { data: x.data, paciente: x.paciente, profissional: x.profissional, form: 'naovem' });
}
$$('button', $("#cf-periodo")).forEach(function (b) { b.addEventListener('click', function () { cfPeriodo = b.dataset.v; seg($("#cf-periodo"), cfPeriodo); $("#cf-outro").hidden = cfPeriodo !== 'outro'; if (cfPeriodo === 'outro') { if (!$("#cf-de").value) $("#cf-de").focus(); else carregarConfirmacoes(); } else carregarConfirmacoes(); }); });
$$('button', $("#cf-mostrar")).forEach(function (b) { b.addEventListener('click', function () { cfMostrar = b.dataset.v; seg($("#cf-mostrar"), cfMostrar); if (CF) renderConfirmacoes(); }); });
["#cf-de", "#cf-ate"].forEach(function (s) { $(s).addEventListener('input', function () { this.value = mascaraData(this.value); }); $(s).addEventListener('keydown', function (e) { if (e.key === 'Enter') carregarConfirmacoes(); }); });
$("#cf-ver").addEventListener('click', carregarConfirmacoes);
$("#cf-prof").addEventListener('change', function () { cfProf = this.value; if (CF) renderConfirmacoes(); });
