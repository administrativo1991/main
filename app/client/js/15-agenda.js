/* ================= AGENDA (grade de horários na tela Agenda) =================
   Visão Lista | Agenda; na Agenda, Dia (todas as profissionais lado a lado) ou Semana (uma profissional).
   O expediente de cada profissional (aba Profissionais, colunas "Horário segunda"… e "Duração da sessão (min)")
   define o que é vaga (branco) e o que é intervalo/fechado (cinza). Clicar numa vaga abre o Encaixe no dia já preenchido. */
var diaVisao = store('rn-visao') === 'agenda' ? 'agenda' : 'lista', agVisao = store('rn-agvisao') === 'semana' ? 'semana' : 'dia', AGS = null;
var AG_PPM = 1.2, AG_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function emAgenda() { return diaVisao === 'agenda'; }
function emSemana() { return emAgenda() && agVisao === 'semana'; }
// "08:00-12:00, 13:00-19:00" → [[480,720],[780,1140]] (minutos); [] se vazio; null se inválido (mesma regra do servidor)
function faixasHorario(t) {
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
  for (var i = 1; i < out.length; i++) if (out[i][0] < out[i - 1][1]) return null;
  return out;
}
function hm(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
function minutos(h) { var m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; }
function profPorNome(n) { return (BOOT.profissionais || []).filter(function (p) { return p.nome === n; })[0] || null; }
function faixasDe(prof, diaSemana) { var p = profPorNome(prof); return (p && p.horarios && faixasHorario(p.horarios[diaSemana])) || []; }
function duracaoDe(prof) { var p = profPorNome(prof); return (p && p.duracao) || 30; }
function temExpediente(p) { return !!(p && p.horarios && AG_DIAS.some(function (d) { return (faixasHorario(p.horarios[d]) || []).length; })); }
function segundaDe(data) { var d = dataObj(data) || new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
function brData(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }

/* ---------- carga da semana (uma profissional) ---------- */
function profSemana() {
  if (diaProf) return diaProf;
  var com = (BOOT.profissionais || []).filter(temExpediente)[0] || (BOOT.profissionais || [])[0];
  diaProf = com ? com.nome : ''; return diaProf;
}
function carregarSemana(forcar) {
  var prof = profSemana(), ini = brData(segundaDe(diaEscolhido())), chave = ini + '|' + prof;
  if (!forcar && AGS && AGS.chave === chave) return Promise.resolve(AGS);
  return call('agendaSemana', { data: ini, profissional: prof }).then(function (r) { r.chave = chave; AGS = r; return r; });
}

/* ---------- desenho da grade ---------- */
// colunas: [{ titulo, sub, data, diaSemana, prof, faixas, dur, itens, semExp }]
function colunasDia() {
  var data = DIA.data, ds = DIA.diaSemana, profs = [];
  (BOOT.profissionais || []).forEach(function (p) {
    if (diaProf && p.nome !== diaProf) return;
    var tem = DIA.itens.some(function (i) { return i.profissional === p.nome; });
    if (faixasDe(p.nome, ds).length || tem) profs.push(p.nome);
  });
  DIA.itens.forEach(function (i) { if (profs.indexOf(i.profissional) < 0 && (!diaProf || i.profissional === diaProf)) profs.push(i.profissional); }); // nome fora da aba Profissionais
  return profs.map(function (n) {
    var f = faixasDe(n, ds), p = profPorNome(n);
    return { titulo: profCurto(n), sub: f.length ? f.map(function (x) { return hm(x[0]) + '–' + hm(x[1]); }).join(' · ') + ' · ' + duracaoDe(n) + ' min' : (p ? 'sem horário cadastrado' : 'não está em Profissionais'), data: data, diaSemana: ds, prof: n, faixas: f, dur: duracaoDe(n), itens: DIA.itens.filter(function (i) { return i.profissional === n; }), semExp: !f.length };
  });
}
function colunasSemana() {
  var prof = AGS.profissional, cols = [];
  AGS.dias.forEach(function (d) {
    var f = faixasDe(prof, d.diaSemana);
    if (d.diaSemana === 'Domingo' && !d.itens.length && !f.length) return;
    var dt = dataObj(d.data), itens = d.data === DIA.data ? DIA.itens.filter(function (i) { return i.profissional === prof; }) : d.itens; // o dia aberto usa a lista já carregada (situações atualizadas)
    cols.push({ titulo: DIAS_PT[dt.getDay()].slice(0, 3) + ' ' + d.data.slice(0, 5), sub: f.length ? f.map(function (x) { return hm(x[0]) + '–' + hm(x[1]); }).join(' · ') : 'não atende', data: d.data, diaSemana: d.diaSemana, prof: prof, faixas: f, dur: duracaoDe(prof), itens: itens, semExp: !f.length, hoje: d.data === hojeStr() });
  });
  return cols;
}
function classeAg(s) { return { atendido: 'verde', falta: 'cinza', naovem: 'vermelha', chegou: 'lilas', aguardando: 'roxo', aconfirmar: 'amarela' }[s] || 'roxo'; }
// itens que se sobrepõem no tempo dividem a largura da coluna
function raias(itens, dur) {
  var l = itens.map(function (it) { var a = minutos(it.hora); return { it: it, a: a, b: a + dur }; }).sort(function (x, y) { return x.a - y.a; }), grupo = [], fim = -1, out = [];
  var fecha = function () { var n = 0; grupo.forEach(function (g) { n = Math.max(n, g.raia + 1); }); grupo.forEach(function (g) { g.n = n; out.push(g); }); grupo = []; };
  l.forEach(function (x) {
    if (x.a >= fim && grupo.length) fecha();
    var usadas = grupo.filter(function (g) { return g.b > x.a; }).map(function (g) { return g.raia; }), r = 0; while (usadas.indexOf(r) >= 0) r++;
    x.raia = r; grupo.push(x); fim = Math.max(fim, x.b);
  });
  if (grupo.length) fecha();
  return out;
}
function renderAgenda() {
  var box = $("#d-ag-grade"); box.innerHTML = '';
  if (!DIA) return;
  if (emSemana() && !AGS) { box.innerHTML = '<div class="carregando">Carregando a semana…</div>'; return; }
  var cols = emSemana() ? colunasSemana() : colunasDia();
  if (!cols.length) { box.innerHTML = '<div class="vazio" style="padding:24px">' + (diaProf ? esc(profCurto(diaProf)) + ' não atende neste dia e não tem ninguém marcado.' : 'Nenhuma profissional com horário neste dia.') + ' Os horários de cada profissional ficam em <b>Horário das profissionais</b>.</div>'; $("#d-ag-rodape").textContent = ''; return; }
  // faixa de horas mostrada: do primeiro início ao último fim (expediente ou paciente marcado), em horas cheias
  var ini = 24 * 60, fim = 0;
  cols.forEach(function (c) {
    c.faixas.forEach(function (f) { ini = Math.min(ini, f[0]); fim = Math.max(fim, f[1]); });
    c.itens.forEach(function (it) { var m = minutos(it.hora); if (m != null) { ini = Math.min(ini, m); fim = Math.max(fim, m + c.dur); } });
  });
  if (fim <= ini) { ini = 8 * 60; fim = 19 * 60; }
  ini = Math.floor(ini / 60) * 60; fim = Math.ceil(fim / 60) * 60;
  var H = (fim - ini) * AG_PPM, px = function (m) { return Math.round((m - ini) * AG_PPM); };
  var grade = el('<div class="ag" style="grid-template-columns:56px repeat(' + cols.length + ',minmax(' + (emSemana() ? 130 : 150) + 'px,1fr))"></div>');
  grade.appendChild(el('<div class="ag-cab ag-canto"></div>'));
  cols.forEach(function (c) {
    var semHora = c.itens.filter(function (it) { return minutos(it.hora) == null; });
    var cab = el('<div class="ag-cab' + (c.hoje ? ' hoje' : '') + (c.data === DIA.data && emSemana() ? ' aberto' : '') + '"><b>' + esc(c.titulo) + '</b><span>' + esc(c.sub) + '</span>' + (semHora.length ? '<span class="ag-semhora">sem hora: ' + semHora.map(function (it) { return '<button type="button" data-k="' + esc(chaveItem(it)) + '">' + esc(primeiroNome(it.paciente)) + '</button>'; }).join(', ') + '</span>' : '') + '</div>');
    $$('.ag-semhora button', cab).forEach(function (b) { var it = semHora.filter(function (x) { return chaveItem(x) === b.dataset.k; })[0]; b.addEventListener('click', function () { abrirItemAg(it, c.data); }); });
    if (emSemana()) cab.addEventListener('click', function (e) { if (e.target.closest('button')) return; irParaDia(c.data); });
    grade.appendChild(cab);
  });
  var eixo = el('<div class="ag-eixo" style="height:' + H + 'px"></div>');
  for (var t = ini; t < fim; t += 60) eixo.appendChild(el('<span style="top:' + px(t) + 'px">' + hm(t) + '</span>'));
  grade.appendChild(eixo);
  var agora = new Date(), mAgora = agora.getHours() * 60 + agora.getMinutes();
  cols.forEach(function (c) {
    var col = el('<div class="ag-col' + (c.semExp ? ' semexp' : '') + '" style="height:' + H + 'px;background-size:100% ' + (60 * AG_PPM) + 'px"></div>');
    c.faixas.forEach(function (f, i) {
      col.appendChild(el('<div class="ag-aberto" style="top:' + px(f[0]) + 'px;height:' + (px(f[1]) - px(f[0])) + 'px"></div>'));
      var prox = c.faixas[i + 1]; if (prox && prox[0] - f[1] >= 20) col.appendChild(el('<div class="ag-intervalo" style="top:' + px(f[1]) + 'px;height:' + (px(prox[0]) - px(f[1])) + 'px"><span>intervalo</span></div>'));
    });
    // vagas: horários do expediente, no passo da duração da sessão, sem ninguém marcado (quem "não vem" libera o horário)
    var ocupa = c.itens.filter(function (it) { return minutos(it.hora) != null && statusItem(it, c.data) !== 'naovem'; }).map(function (it) { var a = minutos(it.hora); return [a, a + c.dur]; });
    var passado = c.data === hojeStr() ? mAgora : ((dataObj(c.data) < dataObj(hojeStr())) ? 24 * 60 : -1);
    c.faixas.forEach(function (f) {
      for (var s = f[0]; s + c.dur <= f[1]; s += c.dur) {
        var e = s + c.dur; if (ocupa.some(function (o) { return o[0] < e && o[1] > s; })) continue;
        var b = el('<button type="button" class="ag-livre' + (s + c.dur <= passado ? ' passou' : '') + '" style="top:' + (px(s) + 1) + 'px;height:' + (px(e) - px(s) - 2) + 'px" aria-label="Vaga ' + hm(s) + ' ' + esc(c.prof) + ' ' + c.data + '"><span>' + hm(s) + '</span><em>+ encaixe</em></button>');
        (function (hora) { b.addEventListener('click', function () { abrirEncaixe(c.prof, c.data, hora); }); })(hm(s));
        col.appendChild(b);
      }
    });
    raias(c.itens.filter(function (it) { return minutos(it.hora) != null; }), c.dur).forEach(function (g) {
      var it = g.it, s = statusItem(it, c.data), k = c.data + '|' + chaveItem(it), alt = Math.max(px(g.b) - px(g.a) - 2, 20);
      var b = el('<button type="button" class="ag-item ' + classeAg(s) + (s === 'naovem' ? ' fora' : '') + (selecionado && c.data === DIA.data && selecionado === chaveItem(it) ? ' sel' : '') + '" data-k="' + esc(k) + '" style="top:' + (px(g.a) + 1) + 'px;height:' + alt + 'px;left:calc(' + (100 * g.raia / g.n) + '% + 3px);width:calc(' + (100 / g.n) + '% - 6px)" title="' + esc(it.hora + ' · ' + it.paciente + ' · ' + it.profissional + (it.origem ? ' · ' + it.origem : '')) + '"><b>' + esc(it.hora) + ' ' + esc(it.paciente) + '</b>' + (alt >= 34 ? '<span>' + esc(rotuloAg(it, s)) + '</span>' : '') + '</button>');
      b.addEventListener('click', function () { abrirItemAg(it, c.data); });
      col.appendChild(b);
    });
    if (c.data === hojeStr() && mAgora > ini && mAgora < fim) col.appendChild(el('<div class="ag-agora" style="top:' + px(mAgora) + 'px"></div>'));
    grade.appendChild(col);
  });
  box.appendChild(grade);
  var vagas = $$('.ag-livre:not(.passou)', grade).length, ocup = $$('.ag-item:not(.fora)', grade).length;
  $("#d-ag-rodape").textContent = ocup + ' marcado' + (ocup === 1 ? '' : 's') + ' · ' + vagas + ' vaga' + (vagas === 1 ? '' : 's') + (emSemana() ? ' na semana' : '') + (cols.some(function (c) { return c.semExp && c.itens.length; }) && !emSemana() ? ' · coluna sem horário cadastrado não mostra vagas' : '');
}
function rotuloAg(it, s) {
  var t = { atendido: 'atendido', falta: (it.registro && it.registro.oque || 'falta').split(' (')[0], naovem: 'não vem', chegou: 'chegou', aconfirmar: 'a confirmar', aguardando: 'confirmado' }[s] || '';
  var o = it.origem && !/Semanal|Quinzenal|Registrado|Confirmado/.test(it.origem) ? it.origem : (it.origem === 'Quinzenal' ? 'quinzenal' : '');
  return [t, o].filter(Boolean).join(' · ');
}
/* ---------- cliques ---------- */
function irParaDia(data, depois) {
  if (data === diaEscolhido() && DIA && DIA.data === data) { if (depois) depois(); return; }
  $("#d-data").value = dataParaISO(dataObj(data));
  carregarDia(false).then(function () { if (depois) depois(); });
}
function abrirItemAg(it, data) {
  irParaDia(data, function () { var k = chaveItem(it), alvo = DIA.itens.filter(function (i) { return chaveItem(i) === k; })[0]; selecionar(alvo || it); if (emAgenda()) renderAgenda(); });
}
function abrirEncaixe(prof, data, hora) {
  irParaDia(data, function () {
    $("#d-addbox").hidden = false; $("#d-recbox").hidden = true; $("#d-expbox").hidden = true;
    if ([].some.call($("#d-add-prof").options, function (o) { return o.value === prof; })) $("#d-add-prof").value = prof;
    $("#d-add-hora").value = hora;
    $("#d-addbox").scrollIntoView({ behavior: 'smooth', block: 'start' });
    $("#d-add-pac").focus();
  });
}
/* ---------- alternância Lista | Agenda e Dia | Semana ---------- */
function aplicarVisao() {
  $$('#d-visao button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === diaVisao)); });
  $$('#d-agvisao button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === agVisao)); });
  $("#d-agvisao").hidden = !emAgenda();
  $("#d-agenda").hidden = !emAgenda(); $("#d-lista-card").hidden = emAgenda();
  $("#d-busca-wrap").hidden = emAgenda(); $("#d-exp-topo").hidden = !emAgenda();
  $("#d-ant").setAttribute('aria-label', emSemana() ? 'Semana anterior' : 'Dia anterior');
  $("#d-prox").setAttribute('aria-label', emSemana() ? 'Próxima semana' : 'Próximo dia');
}
$$('#d-visao button').forEach(function (b) { b.addEventListener('click', function () { if (diaVisao === b.dataset.v) return; diaVisao = b.dataset.v; store('rn-visao', diaVisao); aplicarVisao(); carregarDia(false); }); });
$$('#d-agvisao button').forEach(function (b) { b.addEventListener('click', function () { if (agVisao === b.dataset.v) return; agVisao = b.dataset.v; store('rn-agvisao', agVisao); aplicarVisao(); carregarDia(false); }); });
aplicarVisao();

/* ---------- Horário das profissionais (recepção mantém; grava na aba Profissionais) ---------- */
function alternarExp() {
  var box = $("#d-expbox"); box.hidden = !box.hidden; $("#d-addbox").hidden = true; $("#d-recbox").hidden = true;
  if (box.hidden) return;
  if (!$("#e-dias").children.length) AG_DIAS.forEach(function (d, i) { $("#e-dias").appendChild(el('<label class="campo">' + d + '<input id="e-d' + i + '" placeholder="ex.: 08:00-12:00, 13:00-19:00" autocomplete="off"></label>')); });
  preencherSelect($("#e-prof"), BOOT.profissionais);
  if (diaProf && profPorNome(diaProf)) $("#e-prof").value = diaProf;
  lerExp(); renderExp();
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function lerExp() {
  var p = profPorNome($("#e-prof").value) || {}; $("#e-erros").innerHTML = '';
  AG_DIAS.forEach(function (d, i) { $("#e-d" + i).value = (p.horarios || {})[d] || ''; });
  $("#e-dur").value = p.duracao || '';
  $("#e-hint").textContent = temExpediente(p) ? '' : 'Sem horário cadastrado ainda.';
}
function renderExp() {
  var tb = $("#e-lista"); tb.innerHTML = '';
  (BOOT.profissionais || []).forEach(function (p) {
    var tr = el('<tr><td><b>' + esc(p.nome) + '</b><div class="sub muted">' + esc(p.especialidade) + '</div></td>' + AG_DIAS.map(function (d) { var v = (p.horarios || {})[d] || ''; return '<td>' + (v ? esc(v.replace(/, /g, '\n')).replace(/\n/g, '<br>') : '<span class="muted">—</span>') + '</td>'; }).join('') + '<td>' + (p.duracao ? p.duracao + ' min' : '<span class="muted">—</span>') + '</td><td><button type="button" class="btn ter mini">Editar</button></td></tr>');
    $('button', tr).addEventListener('click', function () { $("#e-prof").value = p.nome; lerExp(); $("#d-expbox").scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    tb.appendChild(tr);
  });
}
$("#e-prof").addEventListener('change', lerExp);
$("#e-dur").addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
$("#e-salvar").addEventListener('click', function () {
  var horarios = {}, erros = [];
  AG_DIAS.forEach(function (d, i) { var v = $("#e-d" + i).value; if (faixasHorario(v) === null) erros.push(d + ': não entendi “' + v + '”. Use o formato 08:00-12:00, 13:00-19:00.'); horarios[d] = v.trim(); });
  var dur = $("#e-dur").value.trim(); if (dur && !(+dur >= 10 && +dur <= 240)) erros.push('Duração da sessão: minutos entre 10 e 240.');
  $("#e-erros").innerHTML = erroBox(erros); if (erros.length) return;
  var b = this, nome = $("#e-prof").value; b.disabled = true;
  call('salvarExpediente', { profissional: nome, horarios: horarios, duracao: dur }).then(function (r) {
    if (!r.ok) { $("#e-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
    BOOT.profissionais = r.profissionais; renderExp(); lerExp();
    $("#e-hint").textContent = 'Salvo: ' + nome + ' · já vale na Agenda.';
    toast('Horário de ' + profCurto(nome) + ' salvo');
    if (emAgenda()) { if (emSemana()) AGS = null; carregarDia(false); }
  }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; });
});
$("#d-exp").addEventListener('click', alternarExp);
$("#d-exp-topo").addEventListener('click', alternarExp);
$("#d-exp-fechar").addEventListener('click', function () { $("#d-expbox").hidden = true; });
