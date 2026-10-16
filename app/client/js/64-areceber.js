/* ================= A RECEBER E PERDAS (só gestão, Fase 2, 16/10) =================
   Em aberto: o a receber de todas as abas de mês (API.aReceber, mesma regra de Pendências), com a idade de cada linha;
   a gestão marca várias como "Perdido / glosa" de uma vez, com motivo (API.darComoPerdido, que usa a correção da Fase 1).
   Perdas do ano: o que foi dado como perdido, por mês, motivo, convênio e profissional (API.perdasAno). */
var AR = null, ARP = null, arModo = 'aberto', arFaixa = '', arMarc = {}, arGen = 0, arConfirma = null;
INICIAR.areceber = function () {
  if (!ehGestao()) { go('hoje'); return toast('Só a gestão vê o a receber e as perdas'); }
  carregarAR();
};
function carregarAR() {
  var gen = ++arGen; $("#ar-carregando").hidden = false; $("#ar-carregando").textContent = 'Carregando…';
  $$('#ar-modo button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === arModo ? 'true' : 'false'); });
  call(arModo === 'aberto' ? 'aReceber' : 'perdasAno', {}).then(function (r) {
    if (gen !== arGen || !aindaNa('areceber', navGen)) return;
    $("#ar-carregando").hidden = true;
    if (!r.ok) { $("#ar-aviso").innerHTML = erroBox(r.erros || [], 'Não consegui carregar'); return; }
    $("#ar-aviso").innerHTML = '';
    if (arModo === 'aberto') { AR = r; arMarc = {}; renderAR(); } else { ARP = r; renderPerdas(); }
    $("#ar-aberto").hidden = arModo !== 'aberto'; $("#ar-perdas").hidden = arModo !== 'perdas';
  }).catch(function (e) { if (gen === arGen) $("#ar-carregando").textContent = 'Não consegui carregar: ' + e.message; });
}
$$('#ar-modo button').forEach(function (b) { b.addEventListener('click', function () { if (arModo === b.dataset.v) return; arModo = b.dataset.v; carregarAR(); }); });
var AR_FAIXAS = [['', 'em aberto'], ['ate30', 'até 30 dias'], ['ate60', '31 a 60 dias'], ['mais60', 'mais de 60 dias']];
function arVisiveis() {
  var q = Duplicatas.normalizar($("#ar-busca").value || '');
  return AR.linhas.filter(function (l) { return (!arFaixa || l.faixa === arFaixa) && (!q || Duplicatas.normalizar(l.paciente + ' ' + l.pagador).indexOf(q) >= 0); });
}
function renderAR() {
  var r = AR, cont = function (f) { return r.linhas.filter(function (l) { return !f || l.faixa === f; }).length; };
  $("#ar-faixas").innerHTML = AR_FAIXAS.map(function (f) { var v = f[0] ? r.faixas[f[0]] : r.total; return '<button type="button" class="ar-fx' + (f[0] === 'mais60' && v ? ' atencao' : '') + '" data-f="' + f[0] + '" aria-pressed="' + (arFaixa === f[0]) + '"><b>' + esc(brlCurto(v)) + '</b><span>' + esc(f[1]) + ' · ' + cont(f[0]) + (cont(f[0]) === 1 ? ' linha' : ' linhas') + '</span></button>'; }).join('');
  $$('#ar-faixas button').forEach(function (b) { b.addEventListener('click', function () { arFaixa = b.dataset.f; renderAR(); }); });
  $("#ar-motivos").innerHTML = r.motivos.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
  renderLinhasAR();
}
function renderLinhasAR() {
  var vis = arVisiveis();
  $("#ar-n").textContent = vis.length;
  $("#ar-linhas").innerHTML = vis.length ? vis.map(function (l) {
    var k = l.aba + '|' + l.id;
    return '<tr class="' + (arMarc[k] ? 'sel' : '') + '"><td class="ar-ck"><input type="checkbox" data-k="' + esc(k) + '"' + (arMarc[k] ? ' checked' : '') + (l.id ? '' : ' disabled title="Lançamento sem ID: corrija direto na planilha"') + ' aria-label="Marcar ' + esc(l.paciente + ' ' + l.data) + '"></td><td>' + esc(l.data.slice(0, 5)) + '<div class="sub">' + esc(l.aba) + '</div></td><td><a href="#" class="link-discreto ar-ficha" data-nome="' + esc(l.paciente) + '">' + esc(l.paciente) + '</a>' + (l.pagador && l.pagador !== l.paciente ? '<div class="sub">paga: ' + esc(l.pagador) + '</div>' : '') + '</td><td>' + esc(profCurto(l.profissional)) + '<div class="sub">' + esc(l.procedimento) + '</div></td><td class="num"><b>' + esc(brl(l.saldo)) + '</b>' + (l.saldo !== l.valor ? '<div class="sub">de ' + esc(brl(l.valor)) + '</div>' : '') + '</td><td>' + esc(l.pago) + '</td><td class="num"><span class="tag p ' + (l.faixa === 'mais60' ? 'vermelha' : l.faixa === 'ate60' ? 'laranja' : 'cinza') + '">' + l.dias + '</span></td></tr>';
  }).join('') : '<tr><td colspan="7" class="vazio">' + (AR.linhas.length ? 'Nada com esse filtro.' : 'Nenhum particular atendido em aberto.') + '</td></tr>';
  $$('#ar-linhas .ar-ficha').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go('ficha', { nome: a.dataset.nome }); }); });
  var marcaveis = vis.filter(function (l) { return l.id; });
  $("#ar-todos").checked = marcaveis.length > 0 && marcaveis.every(function (l) { return arMarc[l.aba + '|' + l.id]; });
  barraAR();
}
function arMarcadas() { return AR.linhas.filter(function (l) { return arMarc[l.aba + '|' + l.id]; }); }
function barraAR() {
  var m = arMarcadas(), tot = m.reduce(function (a, l) { return a + l.saldo; }, 0);
  $("#ar-barra").hidden = !m.length; arConfirma = null;
  $("#ar-sel").textContent = m.length + (m.length === 1 ? ' linha marcada · ' : ' linhas marcadas · ') + brlCurto(tot);
  $("#ar-perder").textContent = 'Dar como perdido'; $("#ar-perder").classList.remove('vermelho');
}
$("#ar-linhas").addEventListener('change', function (e) { var c = e.target; if (!c.dataset || !c.dataset.k) return; if (c.checked) arMarc[c.dataset.k] = 1; else delete arMarc[c.dataset.k]; c.closest('tr').classList.toggle('sel', c.checked); barraAR(); $("#ar-todos").checked = arVisiveis().filter(function (l) { return l.id; }).every(function (l) { return arMarc[l.aba + '|' + l.id]; }); });
$("#ar-todos").addEventListener('change', function () { var on = this.checked; arVisiveis().forEach(function (l) { if (!l.id) return; if (on) arMarc[l.aba + '|' + l.id] = 1; else delete arMarc[l.aba + '|' + l.id]; }); renderLinhasAR(); });
$("#ar-busca").addEventListener('input', function () { if (AR) renderLinhasAR(); });
$("#ar-perder").addEventListener('click', function () {
  var m = arMarcadas(), motivo = $("#ar-motivo").value.trim(), btn = this;
  if (!m.length) return;
  if (!motivo) { $("#ar-motivo").focus(); return toast('Escreva o motivo da perda'); }
  if (!arConfirma) { arConfirma = setTimeout(function () { arConfirma = null; barraAR(); }, 6000); btn.textContent = 'Confirmar: ' + m.length + (m.length === 1 ? ' linha' : ' linhas') + ' como perdidas'; btn.classList.add('vermelho'); return; }
  clearTimeout(arConfirma); arConfirma = null; btn.disabled = true; btn.textContent = 'Gravando…';
  call('darComoPerdido', { motivo: motivo, itens: m.map(function (l) { return { aba: l.aba, id: l.id, paciente: l.paciente, data: l.data }; }) }).then(function (r) {
    btn.disabled = false;
    if (!r.ok) { $("#ar-aviso").innerHTML = erroBox(r.erros || [], 'Não gravei'); barraAR(); return; }
    toast(r.feitos + (r.feitos === 1 ? ' linha dada como perdida' : ' linhas dadas como perdidas'));
    $("#ar-aviso").innerHTML = r.erros.length ? erroBox(r.erros, 'Estas não foram') : '';
    $("#ar-motivo").value = ''; carregarAR();
  }).catch(function (e) { btn.disabled = false; barraAR(); toast('Não gravei: ' + e.message); });
});
function renderPerdas() {
  var r = ARP, t = r.total, pct = function (a, b) { return b ? (Math.round(a / b * 1000) / 10).toString().replace('.', ',') + '%' : '—'; };
  $("#ar-p-resumo").innerHTML = '<div class="' + (t.perdido ? 'atencao' : '') + '"><b>' + esc(brlCurto(t.perdido)) + '</b><span>perdido no ano</span></div><div><b>' + esc(pct(t.perdido, t.atendido)) + '</b><span>do valor atendido (' + esc(brlCurto(t.atendido)) + ')</span></div><div><b>' + t.n + '</b><span>' + (t.n === 1 ? 'linha perdida' : 'linhas perdidas') + '</span></div>';
  $("#ar-p-meses").innerHTML = r.meses.map(function (m) { return '<tr><td>' + esc(m.mes) + '</td><td class="num">' + esc(brl(m.atendido)) + '</td><td class="num"><b>' + esc(brl(m.perdido)) + '</b></td><td class="num">' + esc(pct(m.perdido, m.atendido)) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="vazio">Nenhuma aba de mês.</td></tr>';
  var grupo = function (id, l) { $("#" + id).innerHTML = l.length ? l.map(function (g) { return '<div class="fd-item"><span class="quem">' + esc(g.nome) + '</span><span class="esp"></span><span class="muted">' + g.n + (g.n === 1 ? ' linha' : ' linhas') + '</span><b>' + esc(brlCurto(g.valor)) + '</b></div>'; }).join('') : '<div class="muted">Nada perdido no ano.</div>'; };
  grupo('ar-p-motivos', r.porMotivo); grupo('ar-p-conv', r.porConvenio); grupo('ar-p-prof', r.porProfissional);
  $("#ar-p-n").textContent = r.linhas.length;
  $("#ar-p-linhas").innerHTML = r.linhas.length ? r.linhas.map(function (l) { return '<tr><td>' + esc(l.data) + '</td><td><a href="#" class="link-discreto ar-ficha" data-nome="' + esc(l.paciente) + '">' + esc(l.paciente) + '</a></td><td>' + esc(profCurto(l.profissional)) + '<div class="sub">' + esc(l.procedimento) + '</div></td><td>' + esc(l.convenio) + '</td><td class="num">' + esc(brl(l.valor)) + '</td><td>' + esc(l.motivo) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="vazio">Nada dado como perdido no ano.</td></tr>';
  $$('#ar-p-linhas .ar-ficha').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go('ficha', { nome: a.dataset.nome }); }); });
}
