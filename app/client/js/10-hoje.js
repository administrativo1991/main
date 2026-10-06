/* ================= HOJE (lista do dia) ================= */
var DIA = null, diaFiltro = 'todos', diaProf = '', AGENDA = [], recEdit = null, painelAberto = null, resumoMes = {};
function diaEscolhido() { return isoParaBR($("#d-data").value); }
function chaveItem(it) { return it.paciente + '|' + it.profissional; }
function chegadas() { return store('rn-chegou:' + diaEscolhido()) || {}; }
function marcarChegou(it, on) { var c = chegadas(); if (on) c[chaveItem(it)] = agoraHora(); else delete c[chaveItem(it)]; store('rn-chegou:' + diaEscolhido(), c); }
function statusItem(it) {
  if (it.registro) return /^Atendido/.test(it.registro.oque) ? 'atendido' : 'falta';
  if (it.naoVem) return 'naovem';
  if (chegadas()[chaveItem(it)]) return 'chegou';
  if (it.confirmado) return 'aguardando';
  return 'aconfirmar';
}
function profCurto(n) { var m = String(n || '').match(/^(Dra?\.)\s+(\S+)/); return m ? m[1] + ' ' + m[2] : String(n || '').split(' ')[0]; }
function tituloDia(dt) { return DIAS_PT[dt.getDay()] + ', ' + dt.getDate() + ' de ' + MESES_PT[dt.getMonth()].toLowerCase(); }
function tituloDiaCurto(dt) { return DIAS_PT[dt.getDay()].slice(0, 3) + ', ' + dt.getDate() + ' ' + MESES_PT[dt.getMonth()].slice(0, 3).toLowerCase(); }

INICIAR.hoje = function () {
  if (!$("#d-data").value) $("#d-data").value = dataParaISO(new Date());
  quandoAT(function () {
    if (!$("#d-add-prof").options.length) { preencherSelect($("#d-add-prof"), BOOT.profissionais); preencherSelect($("#r-prof"), BOOT.profissionais); }
    if (BOOT.lembrete) { $("#d-lembrete").hidden = false; $("#d-lembrete-txt").textContent = BOOT.lembrete; }
    carregarDia();
  });
};
function carregarDia() {
  var data = diaEscolhido(); if (!dataObj(data)) return;
  $("#d-carregando").hidden = false; fecharPainel();
  var dt = dataObj(data), hoje = data === hojeStr();
  $("#d-titulo").textContent = tituloDia(dt); $("#d-pill-hoje").hidden = !hoje; $("#d-ir-hoje").hidden = hoje;
  $("#titulo-cel").textContent = tituloDiaCurto(dt);
  call('listaDoDia', { data: data }).then(function (r) {
    if (r.data !== diaEscolhido()) return; // mudou de dia enquanto carregava
    DIA = r; $("#d-carregando").hidden = true;
    $("#d-aviso-aba").hidden = r.abaMesExiste; if (!r.abaMesExiste) $("#d-aviso-aba").textContent = 'A aba "' + r.abaMes + '" ainda não existe na planilha. Peça à gestão para criar em Gestão → Virada do mês.';
    renderDia(); lerFimDia();
    if (ehGestao()) resumoGestaoDia();
  }).catch(function (e) { $("#d-carregando").textContent = 'Não consegui carregar a lista: ' + e.message; });
}
function itensFiltrados() {
  var itens = DIA.itens.slice().sort(function (a, b) { return (a.hora || '99').localeCompare(b.hora || '99') || a.paciente.localeCompare(b.paciente); });
  if (diaProf) itens = itens.filter(function (i) { return i.profissional === diaProf; });
  return itens;
}
function renderDia() {
  var r = DIA, todos = itensFiltrados(), cont = { todos: todos.length, aguardando: 0, chegou: 0, registrados: 0, aconfirmar: 0, naovem: 0 };
  todos.forEach(function (it) { var s = statusItem(it); if (s === 'atendido' || s === 'falta') cont.registrados++; else cont[s]++; });
  var f = $("#d-filtros"); f.innerHTML = '';
  [['todos', 'Todos'], ['aguardando', 'Aguardando'], ['chegou', 'Chegou'], ['registrados', 'Registrados'], ['aconfirmar', 'A confirmar'], ['naovem', 'Não vem']].forEach(function (x) {
    var b = el('<button type="button" class="filtro" aria-pressed="' + (diaFiltro === x[0]) + '">' + x[1] + ' <span>· ' + cont[x[0]] + '</span></button>');
    b.addEventListener('click', function () { diaFiltro = x[0]; renderDia(); }); f.appendChild(b);
  });
  f.appendChild(el('<span class="esp"></span>'));
  var profs = []; r.itens.forEach(function (i) { if (profs.indexOf(i.profissional) < 0) profs.push(i.profissional); }); profs.sort();
  var lab = el('<label>Profissional <select id="d-prof"><option value="">Todos</option></select></label>');
  profs.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = profCurto(p); lab.querySelector('select').appendChild(o); });
  lab.querySelector('select').value = diaProf; lab.querySelector('select').addEventListener('change', function () { diaProf = this.value; renderDia(); }); f.appendChild(lab);

  var root = $("#d-list"); root.innerHTML = '';
  var lista = todos.filter(function (it) { var s = statusItem(it); return diaFiltro === 'todos' || (diaFiltro === 'registrados' ? (s === 'atendido' || s === 'falta') : s === diaFiltro); });
  if (!r.itens.length) { root.innerHTML = '<div class="vazio">Ninguém na lista deste dia. Use <b>Encaixe no dia</b> ou cadastre os horários fixos em <b>Agenda recorrente</b>.</div>'; }
  else if (!lista.length) root.innerHTML = '<div class="vazio">Ninguém neste filtro.</div>';
  lista.forEach(function (it) { root.appendChild(linhaDia(it)); });
  renderResumo(cont);
}
function linhaDia(it) {
  var s = statusItem(it), p = pacInfo(it.paciente), tags = tagsDe(p);
  var sub = [profCurto(it.profissional)];
  if (p) { if (ehConvenio(p)) sub.push('Convênio ' + p.convenio); else if (p.modalidade) sub.push(p.modalidade); }
  else sub.push('não está em Pacientes');
  if (it.origem && !/Semanal|Quinzenal/.test(it.origem)) sub.push(it.origem);
  var pill = { atendido: '<span class="pill verde">' + ic('check', 14, 3) + 'Atendido</span>', falta: '<span class="pill cinza">' + esc((it.registro && it.registro.oque || '').split(' (')[0]) + '</span>', naovem: '<span class="pill vermelha">Não vem</span>', chegou: '<span class="pill lilas">Chegou ' + esc(chegadas()[chaveItem(it)] || '') + '</span>', aguardando: '<span class="pill cinza">Aguardando</span>', aconfirmar: '<span class="pill amarela">A confirmar</span>' }[s];
  var acao = { atendido: '<button type="button" class="btn link" data-ac="ver">Ver registro</button>', falta: '<button type="button" class="btn link" data-ac="ver">Ver registro</button>', naovem: '<button type="button" class="btn ter" data-ac="remarcar">Remarcar</button>', chegou: '<button type="button" class="btn" data-ac="registrar">Registrar atendimento ' + ic('seta', 16) + '</button>', aguardando: '<button type="button" class="btn sec" data-ac="chegou">Chegou</button>', aconfirmar: '<button type="button" class="btn ter" data-ac="confirmou">Confirmou</button>' }[s];
  var art = el('<article class="linha' + (s === 'chegou' ? ' destaque' : '') + (s === 'atendido' || s === 'falta' ? ' apagada' : '') + (s === 'naovem' ? ' fora' : '') + '">' +
    '<div class="hora">' + esc(it.hora || '—') + '</div>' +
    '<div class="quem"><div class="nome">' + esc(it.paciente) + '</div><div class="sub">' + esc(sub.join(' · ')) + '</div></div>' +
    '<div class="tags">' + tags.map(function (t) { return tagHtml(t); }).join('') + (it.naoVem ? '<span class="tag cinza">' + esc(it.naoVem.replace('Não vem · ', '')) + '</span>' : '') + '</div>' +
    pill + '<div class="acao">' + acao + '<div class="mais no-print"><button type="button" class="btn icone p" aria-label="Mais ações" aria-haspopup="menu">' + ic('pontos', 18, 2) + '</button></div></div></article>');
  $$('[data-ac]', art).forEach(function (b) { b.addEventListener('click', function () { acaoDia(b.dataset.ac, it, art); }); });
  $('.mais button', art).addEventListener('click', function (e) { e.stopPropagation(); menuMais(it, art, this); });
  return art;
}
function menuMais(it, art, btn) {
  var existe = $('.mais-menu', art); $$('.mais-menu').forEach(function (m) { m.remove(); }); if (existe) return;
  var s = statusItem(it), op = [];
  if (s === 'aguardando' || s === 'aconfirmar') op.push(['chegou', 'Chegou agora']);
  if (s === 'chegou') op.push(['deschegou', 'Desfazer “chegou”']);
  if (s === 'aconfirmar') op.push(['confirmou', 'Confirmou']);
  if (s !== 'atendido' && s !== 'falta') op.push(['registrar', 'Registrar atendimento']); else op.push(['registrar', 'Registrar outro atendimento']);
  if (s !== 'atendido' && s !== 'falta' && s !== 'naovem') { op.push(['naovem', 'Não vem hoje']); op.push(['remarcar', 'Remarcar']); }
  if (it.listaId && !it.registro) op.push(['remover', 'Remover da lista', 'perigo']);
  op.push(['cadastro', 'Ver cadastro']);
  var m = el('<div class="mais-menu" role="menu">' + op.map(function (o) { return '<button type="button" role="menuitem" data-ac="' + o[0] + '" class="' + (o[2] || '') + '">' + o[1] + '</button>'; }).join('') + '</div>');
  $$('button', m).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); m.remove(); acaoDia(b.dataset.ac, it, art); }); });
  btn.parentNode.appendChild(m);
}
function acaoDia(ac, it, art) {
  if (ac === 'chegou') { marcarChegou(it, true); renderDia(); toast(it.paciente + ' chegou · ' + agoraHora()); return; }
  if (ac === 'deschegou') { marcarChegou(it, false); renderDia(); return; }
  if (ac === 'confirmou') { call('confirmar', { data: DIA.data, hora: it.hora || '', paciente: it.paciente, profissional: it.profissional }).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast('Confirmado: ' + it.paciente); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); }); return; }
  if (ac === 'registrar') { go('registrar', { paciente: it.paciente, profissional: it.profissional, data: DIA.data, hora: it.hora || '' }); return; }
  if (ac === 'cadastro') { go('pacientes', { editar: it.paciente, voltar: 'hoje' }); return; }
  if (ac === 'ver') { var d = $('.detalhe', art); if (d) { d.remove(); return; } var r = it.registro; art.appendChild(el('<div class="detalhe">Registrado: <b>' + esc(r.oque) + '</b>' + (r.procedimento ? ' · ' + esc(r.procedimento) : '') + (r.hora ? ' · ' + esc(r.hora) : '') + (r.id ? ' · ID ' + esc(r.id) : '') + ' · aba ' + esc(DIA.abaMes) + '</div>')); return; }
  abrirPainel(it, ac, art);
}
function fecharPainel() { if (painelAberto) { painelAberto.remove(); painelAberto = null; } }
function abrirPainel(it, tipo, art) {
  fecharPainel();
  var titulo = { naovem: 'Não vem hoje', remarcar: 'Remarcar', remover: 'Remover da lista' }[tipo], html;
  if (tipo === 'naovem') html = '<div class="grid"><label class="campo">Motivo<select id="d-nv-motivo"></select></label><label class="campo c2">Observação<input id="d-nv-obs"></label></div><div class="acoes"><button type="button" class="btn" id="d-nv-ok">Gravar</button><span class="muted">Grava a falta na aba do mês, sem cobrança nesta linha.</span></div>';
  else if (tipo === 'remarcar') html = '<div class="grid"><label class="campo">Nova data<input id="d-rm-data" placeholder="dd/mm/aaaa" maxlength="10" inputmode="numeric"></label><label class="campo">Nova hora<input id="d-rm-hora" placeholder="hh:mm" maxlength="5" inputmode="numeric" value="' + esc(it.hora || '') + '"></label><label class="campo">Observação<input id="d-rm-obs"></label></div><div class="acoes"><button type="button" class="btn" id="d-rm-ok">Remarcar</button><span class="muted">Hoje fica como “não vem · remarcado”; o novo dia ganha a linha.</span></div>';
  else html = '<div class="grid"><label class="campo c2">Motivo da remoção <span class="leg">só agendamentos avulsos; horário fixo se pausa na Agenda recorrente</span><input id="d-rem-motivo" value="duplicado"></label></div><div class="acoes"><button type="button" class="btn vermelho" id="d-rem-ok">Remover da lista</button></div>';
  var pn = el('<div class="painel"><div class="cab"><h2>' + titulo + ' · ' + esc(it.paciente) + '</h2><span class="muted">' + esc(profCurto(it.profissional)) + (it.hora ? ' · ' + esc(it.hora) : '') + '</span><span class="esp"></span><button type="button" class="btn icone p" aria-label="Fechar">' + ic('fechar', 16) + '</button></div>' + html + '</div>');
  $('.cab button', pn).addEventListener('click', fecharPainel);
  art.parentNode.insertBefore(pn, art.nextSibling); painelAberto = pn;
  if (tipo === 'naovem') {
    preencherSelect($("#d-nv-motivo", pn), (BOOT.listas.oque || []).filter(function (x) { return !/^Atendido/.test(x); }));
    $("#d-nv-ok", pn).addEventListener('click', function () {
      var p = pacInfo(it.paciente), esps = espsDoProf(it.profissional), base = tiposDe(esps)[0], oque = $("#d-nv-motivo", pn).value;
      var d = { paciente: it.paciente, profissional: it.profissional, data: DIA.data, hora: it.hora || '', procedimento: base ? derivarProc(base.nome, p || {}) : '', oque: oque, pago: '', valor: '', forma: '', dataPagamento: '', quemPagou: '', nf: 'Não se aplica', nfNumero: '', guia: '', observacao: $("#d-nv-obs", pn).value.trim(), pacoteId: '', sessaoExtra: false, tornarPagadorHabitual: false };
      var pk = p && AT.pacotes[p.nome]; if (p && ehPacote(p) && pk && pk.status === 'ativo' && /sem aviso|em cima da hora/.test(oque)) d.pacoteId = pk.id;
      this.disabled = true;
      call('registrarAtendimento', d).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast('Gravado: ' + oque); invalidarResumo(); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); });
    });
  } else if (tipo === 'remarcar') {
    $("#d-rm-data", pn).addEventListener('input', function () { this.value = mascaraData(this.value); });
    $("#d-rm-hora", pn).addEventListener('input', function () { this.value = mascaraHora(this.value); });
    $("#d-rm-ok", pn).addEventListener('click', function () {
      var para = $("#d-rm-data", pn).value; if (!dataObj(para)) return toast('Informe a nova data (dd/mm/aaaa)');
      var d = { de: DIA.data, para: para, horaDe: it.hora || '', horaPara: $("#d-rm-hora", pn).value || it.hora || '', paciente: it.paciente, profissional: it.profissional, observacao: $("#d-rm-obs", pn).value.trim() };
      this.disabled = true;
      call('remarcar', d).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast('Remarcado para ' + para); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); });
    });
    $("#d-rm-data", pn).focus();
  } else {
    $("#d-rem-ok", pn).addEventListener('click', function () {
      this.disabled = true;
      call('removerDoDia', { id: it.listaId, motivo: $("#d-rem-motivo", pn).value.trim() || 'removido' }).then(function (r) { if (!r.ok) return toast((r.erros || ['Não removeu']).join(' ')); toast('Removido da lista: ' + it.paciente); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); });
    });
  }
  pn.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
/* resumo lateral */
function renderResumo(cont) {
  var tot = DIA.itens.length, reg = DIA.itens.filter(function (i) { return i.registro; }).length;
  var g = resumoMes[DIA.abaMes], dia = DIA.data, html = '';
  html += '<div><b>' + reg + '<small>/' + tot + '</small></b><span>registrados</span></div>';
  html += '<div><b>' + cont.chegou + '</b><span>na recepção</span></div>';
  if (ehGestao() && g) {
    // o servidor devolve só as listas de pendência do mês; aqui filtramos pelo dia escolhido
    var doDia = function (l) { return (l || []).filter(function (x) { return x.data === dia; }); };
    html += '<div class="' + (doDia(g.nfPendente).length ? 'atencao' : '') + '"><b>' + doDia(g.nfPendente).length + '</b><span>NF pendente</span></div>';
    html += '<div class="' + (doDia(g.semGuia).length ? 'atencao' : '') + '"><b>' + doDia(g.semGuia).length + '</b><span>guia a emitir</span></div>';
  } else {
    html += '<div><b>' + cont.aguardando + '</b><span>aguardando</span></div>';
    html += '<div class="' + (cont.naovem ? 'atencao' : '') + '"><b>' + cont.naovem + '</b><span>não vêm</span></div>';
  }
  $("#d-resumo").innerHTML = html;
}
function invalidarResumo() { resumoMes = {}; }
function resumoGestaoDia() {
  var mes = DIA.abaMes; if (resumoMes[mes]) { renderDia(); return; }
  call('gestaoResumo', { mes: mes }).then(function (r) { if (!r.ok) return; resumoMes[mes] = r; if (DIA && DIA.abaMes === mes) renderDia(); }).catch(function () { });
}
/* fim do dia (anotação local deste computador) */
function lerFimDia() { var f = store('rn-fimdia:' + diaEscolhido()) || {}; [1, 2, 3, 4].forEach(function (i) { $("#fd-" + i).checked = !!f['c' + i]; }); $("#fd-status").textContent = f.fechado ? 'Dia fechado às ' + f.fechado + ' por ' + (f.por || quemSou()) + ' (anotação deste computador).' : ''; }
function gravarFimDia(fechar) { var f = store('rn-fimdia:' + diaEscolhido()) || {}; [1, 2, 3, 4].forEach(function (i) { f['c' + i] = $("#fd-" + i).checked; }); if (fechar) { f.fechado = agoraHora(); f.por = quemSou(); } store('rn-fimdia:' + diaEscolhido(), f); lerFimDia(); }
[1, 2, 3, 4].forEach(function (i) { $("#fd-" + i).addEventListener('change', function () { gravarFimDia(false); }); });
$("#fd-fechar").addEventListener('click', function () {
  if (!DIA) return; var pend = DIA.itens.filter(function (i) { var s = statusItem(i); return s === 'aguardando' || s === 'chegou'; }).length;
  if (pend) toast(pend + ' paciente(s) ainda em “Aguardando” ou “Chegou”. Registre ou marque “não vem” antes de fechar.');
  else { gravarFimDia(true); toast('Dia fechado. Bom descanso.'); }
});
/* navegação de data */
function mudarDia(n) { var dt = dataObj(diaEscolhido()) || new Date(); dt.setDate(dt.getDate() + n); $("#d-data").value = dataParaISO(dt); carregarDia(); }
$("#d-ant").addEventListener('click', function () { mudarDia(-1); });
$("#d-prox").addEventListener('click', function () { mudarDia(1); });
$("#d-ir-hoje").addEventListener('click', function () { $("#d-data").value = dataParaISO(new Date()); carregarDia(); });
$("#d-cal").addEventListener('click', function () { var i = $("#d-data"); if (i.showPicker) { try { i.showPicker(); return; } catch (e) { } } i.classList.remove('sr'); i.focus(); });
$("#d-data").addEventListener('change', function () { this.classList.add('sr'); if (dataObj(diaEscolhido())) carregarDia(); });
/* encaixe no dia */
function infoPaciente(nome) { var p = pacInfo(nome); if (!p) return nome.trim() ? 'Não está em Pacientes. Cadastre antes em "Pacientes".' : ''; if (cadastroIncompleto(p)) return 'Cadastro incompleto: sem modalidade nem convênio. Confira como paga.'; var partes = []; if (ehConvenio(p)) partes.push('Convênio ' + p.convenio); else if (p.convenio) partes.push('Particular'); if (p.modalidade && !(ehConvenio(p) && /^Conv[êe]nio$/i.test(p.modalidade))) partes.push(p.modalidade); if (regraRelevante(p)) partes.push(modCurta(p.regra)); return 'Cadastro: ' + partes.join(' · '); }
function mostrarInfo(elHint, nome) { var p = pacInfo(nome); elHint.innerHTML = esc(infoPaciente(nome)) + (p ? ' <a href="#">' + (cadastroIncompleto(p) ? 'Completar cadastro' : 'editar cadastro') + '</a>' : ''); var a = elHint.querySelector('a'); if (a) a.addEventListener('click', function (e) { e.preventDefault(); go('pacientes', { editar: nome, voltar: 'hoje' }); }); }
$("#d-add").addEventListener('click', function () { $("#d-addbox").hidden = !$("#d-addbox").hidden; $("#d-recbox").hidden = true; if (!$("#d-addbox").hidden) $("#d-add-pac").focus(); });
$("#d-add-cancel").addEventListener('click', function () { $("#d-addbox").hidden = true; });
$("#d-add-hora").addEventListener('input', function () { this.value = mascaraHora(this.value); });
$("#d-add-pac").addEventListener('input', function () { mostrarInfo($("#d-add-pac-info"), this.value); });
function addDia(recorrente) {
  var pac = $("#d-add-pac").value.trim(), prof = $("#d-add-prof").value, hora = $("#d-add-hora").value;
  if (!pacInfo(pac)) return toast('Escolha um paciente da lista');
  $("#d-add-ok").disabled = true; $("#d-add-rec").disabled = true;
  var fn = recorrente ? call('salvarAgendaFixa', { paciente: pac, profissional: prof, diaSemana: DIAS_PT[dataObj(DIA.data).getDay()], hora: hora, frequencia: 'Semanal', comecaEm: DIA.data, ativo: true, observacao: $("#d-add-obs").value.trim() }) : call('acrescentarAoDia', { data: DIA.data, hora: hora, paciente: pac, profissional: prof, origem: $("#d-add-origem").value, observacao: $("#d-add-obs").value.trim() });
  fn.then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast(r.duplicado ? 'Já estava agendado (não duplicou)' : (recorrente ? 'Recorrência criada' : 'Agendado no dia')); $("#d-add-pac").value = ''; $("#d-add-pac-info").textContent = ''; $("#d-add-hora").value = ''; $("#d-add-obs").value = ''; $("#d-addbox").hidden = true; carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { $("#d-add-ok").disabled = false; $("#d-add-rec").disabled = false; });
}
$("#d-add-ok").addEventListener('click', function () { addDia(false); });
$("#d-add-rec").addEventListener('click', function () { addDia(true); });
/* agenda recorrente */
function carregarRec() { return call('agendaFixa').then(function (l) { AGENDA = l; renderRec(); return l; }); }
function renderRec() {
  var tb = $("#r-lista"); tb.innerHTML = '';
  AGENDA.slice().sort(function (a, b) { return (DIAS_PT.indexOf(a['Dia da semana']) * 10000 + (a['Hora'] || '').replace(':', '') * 1) - (DIAS_PT.indexOf(b['Dia da semana']) * 10000 + (b['Hora'] || '').replace(':', '') * 1); }).forEach(function (a) {
    var tr = el('<tr><td><b>' + esc(a['Paciente']) + '</b></td><td>' + esc(a['Profissional']) + '</td><td>' + esc(a['Dia da semana']) + '</td><td>' + esc(a['Hora']) + '</td><td>' + esc(a['Frequência'] || 'Semanal') + '</td><td>' + esc((a['Começa em'] || '…') + ' → ' + (a['Termina em'] || '…')) + '</td><td>' + (String(a['Ativo']) === 'Não' ? '<span class="tag cinza">pausado</span>' : '<span class="tag verde">ativo</span>') + '</td><td><button class="btn ter mini" type="button">Editar</button></td></tr>');
    tr.querySelector('button').addEventListener('click', function () { recEdit = a; $("#r-pac").value = a['Paciente']; $("#r-prof").value = a['Profissional']; $("#r-dia").value = a['Dia da semana']; $("#r-hora").value = a['Hora']; $("#r-freq").value = a['Frequência'] || 'Semanal'; $("#r-ini").value = a['Começa em'] || ''; $("#r-fim").value = a['Termina em'] || ''; $("#r-ativo").value = String(a['Ativo']) === 'Não' ? 'Não' : 'Sim'; $("#r-obs").value = a['Observação'] || ''; mostrarInfo($("#r-pac-info"), a['Paciente']); $("#r-hint").textContent = 'Editando ' + a['Paciente'] + '. Mudou dia, hora ou profissional? Ao salvar, o app pergunta se vale a partir de hoje.'; $("#d-recbox").scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    tb.appendChild(tr);
  });
}
function limparRec() { recEdit = null; ['r-pac', 'r-hora', 'r-ini', 'r-fim', 'r-obs'].forEach(function (id) { $("#" + id).value = ''; }); $("#r-pac-info").textContent = ''; $("#r-freq").value = 'Semanal'; $("#r-ativo").value = 'Sim'; $("#r-hint").textContent = 'Nova recorrência.'; }
$("#d-rec").addEventListener('click', function () { $("#d-recbox").hidden = !$("#d-recbox").hidden; $("#d-addbox").hidden = true; if (!$("#d-recbox").hidden) carregarRec(); });
$("#d-rec-fechar").addEventListener('click', function () { $("#d-recbox").hidden = true; });
$("#r-novo").addEventListener('click', limparRec);
$("#r-pac").addEventListener('input', function () { mostrarInfo($("#r-pac-info"), this.value); });
$("#r-hora").addEventListener('input', function () { this.value = mascaraHora(this.value); });
$("#r-ini").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#r-fim").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#r-salvar").addEventListener('click', function () {
  var pac = $("#r-pac").value.trim(); if (!pacInfo(pac)) return toast('Escolha um paciente da lista');
  var d = { id: recEdit ? recEdit.ID : '', paciente: pac, profissional: $("#r-prof").value, diaSemana: $("#r-dia").value, hora: $("#r-hora").value, frequencia: $("#r-freq").value, comecaEm: $("#r-ini").value, terminaEm: $("#r-fim").value, ativo: $("#r-ativo").value === 'Sim', observacao: $("#r-obs").value.trim() };
  if (recEdit && (recEdit['Dia da semana'] !== d.diaSemana || recEdit['Hora'] !== d.hora || recEdit['Profissional'] !== d.profissional)) {
    if (!$("#r-apartir")) { $("#r-hint").innerHTML = 'Dia, hora ou profissional mudou. <label class="check" style="display:inline-flex"><input type="checkbox" id="r-apartir" checked> vale a partir de hoje (encerra a antiga e guarda o histórico)</label> <button class="btn mini" type="button" id="r-confirma">Confirmar</button>'; $("#r-confirma").addEventListener('click', function () { d.encerrarAnterior = $("#r-apartir").checked; salvarRec(d); }); return; }
    d.encerrarAnterior = $("#r-apartir").checked;
  }
  salvarRec(d);
});
function salvarRec(d) { $("#r-salvar").disabled = true; call('salvarAgendaFixa', d).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast('Recorrência salva'); limparRec(); carregarRec(); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { $("#r-salvar").disabled = false; }); }
