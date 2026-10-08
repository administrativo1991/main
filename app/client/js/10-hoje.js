/* ================= AGENDA (antiga tela Hoje: lista do dia; a grade fica em 15-agenda.js) ================= */
var DIA = null, diaFiltro = 'todos', diaProf = '', diaBusca = '', AGENDA = [], recEdit = null, resumoMes = {}, selecionado = null, formAberto = null;
function diaEscolhido() { return isoParaBR($("#d-data").value); }
function chaveItem(it) { return it.paciente + '|' + it.profissional; }
function chegadas(data) { return store('rn-chegou:' + (data || diaEscolhido())) || {}; }
function marcarChegou(it, on) { var c = chegadas(); if (on) c[chaveItem(it)] = agoraHora(); else delete c[chaveItem(it)]; store('rn-chegou:' + diaEscolhido(), c); }
// situações possíveis de uma linha (não existe "Em atendimento"): o registro é feito inteiro na chegada
function statusItem(it, data) {
  if (it.registro) return /^Atendido/.test(it.registro.oque) ? 'atendido' : 'falta';
  if (it.naoVem) return 'naovem';
  if (chegadas(data)[chaveItem(it)]) return 'chegou';
  if (it.confirmado) return 'aguardando';
  return 'aconfirmar';
}
function profCurto(n) { var m = String(n || '').match(/^(Dra?\.)\s+(\S+)/); return m ? m[1] + ' ' + m[2] : String(n || '').split(' ')[0]; }
function tituloDia(dt) { return DIAS_PT[dt.getDay()] + ', ' + dt.getDate() + ' de ' + MESES_PT[dt.getMonth()].toLowerCase(); }
function tituloDiaCurto(dt) { return DIAS_PT[dt.getDay()].slice(0, 3) + ', ' + dt.getDate() + ' ' + MESES_PT[dt.getMonth()].slice(0, 3).toLowerCase(); }
function semAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
// o que vai na coluna "Profissional · modalidade" e no painel
function modalidadeCurta(p) { if (!p) return 'não está em Pacientes'; if (cobConvenio(p)) return 'Convênio ' + p.convenio; if (p.modalidade) return modCurta(cobDe(p)); return 'cobrança em branco'; }
function idadeCurta(p) { if (!p || !p.nasc) return ''; var i = idade(p.nasc); if (!i) return ''; var n = parseInt(i, 10); return n >= 18 ? 'adulto' : i; }

INICIAR.hoje = function () {
  if (!$("#d-data").value) $("#d-data").value = dataParaISO(new Date());
  quandoAT(function () {
    if (!$("#d-add-prof").options.length) { preencherSelect($("#d-add-prof"), BOOT.profissionais); preencherSelect($("#r-prof"), BOOT.profissionais); }
    mostrarLembrete();
    carregarDia();
  });
};
// faixa pêssego: o lembrete ativo que a gestão escreveu (aba Lembretes)
function mostrarLembrete() {
  var l = BOOT && BOOT.lembrete, tem = !!(l && l.texto);
  $("#d-lembrete").hidden = !tem; if (!tem) return;
  $("#d-lembrete-txt").textContent = l.texto;
  $("#d-lembrete-meta").textContent = 'Gestão · ' + String(l.data || '').slice(0, 5) + (l.validoAte ? ' · vale até ' + l.validoAte : '');
}
// forcarSemana === false: reaproveita a semana já carregada (só trocou o dia dentro dela)
function carregarDia(forcarSemana) {
  var data = diaEscolhido(); if (!dataObj(data)) return Promise.resolve();
  $("#d-carregando").hidden = false; fecharPainel();
  var dt = dataObj(data), hoje = data === hojeStr();
  if (emSemana()) { var sg = segundaDe(data), sb = new Date(sg.getFullYear(), sg.getMonth(), sg.getDate() + 5); $("#d-titulo").textContent = 'Semana de ' + sg.getDate() + (sg.getMonth() !== sb.getMonth() ? ' de ' + MESES_PT[sg.getMonth()].toLowerCase() : '') + ' a ' + sb.getDate() + ' de ' + MESES_PT[sb.getMonth()].toLowerCase(); }
  else $("#d-titulo").textContent = tituloDia(dt);
  $("#d-add-dia").textContent = tituloDiaCurto(dt);
  $("#d-titulo-print").textContent = 'Lista do dia · ' + tituloDia(dt) + ' · ' + data;
  $("#d-ir-hoje").disabled = hoje;
  $("#titulo-cel").textContent = tituloDiaCurto(dt);
  if (emSemana()) { profSemana(); if (forcarSemana !== false) AGS = null; }
  return Promise.all([call('listaDoDia', { data: data }), emSemana() ? carregarSemana(forcarSemana !== false) : null]).then(function (rr) {
    var r = rr[0];
    if (r.data !== diaEscolhido()) return; // mudou de dia enquanto carregava
    DIA = r; $("#d-carregando").hidden = true;
    $("#d-aviso-aba").hidden = r.abaMesExiste; if (!r.abaMesExiste) $("#d-aviso-aba").textContent = 'A aba "' + r.abaMes + '" ainda não existe na planilha. Peça à gestão para criar em Gestão → Virada do mês.';
    preencherProfs();
    renderDia(); lerFimDia();
    if (ehGestao()) resumoGestaoDia();
  }).catch(function (e) { $("#d-carregando").textContent = 'Não consegui carregar a lista: ' + e.message; });
}
function preencherProfs() {
  var sel = $("#d-prof"), profs = []; DIA.itens.forEach(function (i) { if (profs.indexOf(i.profissional) < 0) profs.push(i.profissional); });
  if (emAgenda()) (BOOT.profissionais || []).forEach(function (p) { if (profs.indexOf(p.nome) < 0) profs.push(p.nome); }); // na Agenda dá pra escolher quem não tem ninguém marcado (ver as vagas)
  profs.sort();
  sel.innerHTML = emSemana() ? '' : '<option value="">Todos os profissionais</option>';
  profs.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = profCurto(p); sel.appendChild(o); });
  if (profs.indexOf(diaProf) < 0) diaProf = ''; sel.value = diaProf;
}
function itensFiltrados() {
  var itens = DIA.itens.slice().sort(function (a, b) { return (a.hora || '99').localeCompare(b.hora || '99') || a.paciente.localeCompare(b.paciente); });
  if (diaProf) itens = itens.filter(function (i) { return i.profissional === diaProf; });
  if (diaBusca) { var q = semAcento(diaBusca); itens = itens.filter(function (i) { var p = pacInfo(i.paciente); return semAcento(i.paciente).indexOf(q) >= 0 || (p && semAcento(p.pagador).indexOf(q) >= 0); }); }
  return itens;
}
function contagem(itens) {
  var cont = { todos: itens.length, aguardando: 0, chegou: 0, registrados: 0, naovem: 0, aconfirmar: 0, atendido: 0, falta: 0 };
  itens.forEach(function (it) { var s = statusItem(it); cont[s]++; if (s === 'atendido' || s === 'falta') cont.registrados++; });
  return cont;
}
function passaFiltro(it) {
  var s = statusItem(it);
  if (diaFiltro === 'todos') return true;
  if (diaFiltro === 'registrados') return s === 'atendido' || s === 'falta';
  if (diaFiltro === 'aguardando') return s === 'aguardando' || s === 'aconfirmar';
  return s === diaFiltro;
}
function renderDia() {
  var r = DIA, todos = itensFiltrados(), cont = contagem(todos);
  // tiles-filtro com contagem (clicáveis); "aguardando" soma os "a confirmar"
  var f = $("#d-filtros"); f.innerHTML = '';
  [['todos', 'na lista', cont.todos, 'roxo'], ['aguardando', 'aguardando', cont.aguardando + cont.aconfirmar, 'cinza'], ['chegou', 'chegou', cont.chegou, 'roxo'], ['registrados', 'registrados', cont.registrados, 'verde'], ['naovem', 'não vem', cont.naovem, 'vermelho']].forEach(function (x) {
    var b = el('<button type="button" class="tile ' + x[3] + '" aria-pressed="' + (diaFiltro === x[0]) + '"><b>' + x[2] + '</b><span>' + x[1] + '</span></button>');
    b.addEventListener('click', function () { diaFiltro = diaFiltro === x[0] ? 'todos' : x[0]; renderDia(); }); f.appendChild(b);
  });
  renderResumo(cont);
  // tabela
  var tb = $("#d-list"); tb.innerHTML = '';
  var lista = todos.filter(passaFiltro);
  if (!r.itens.length) tb.innerHTML = '<tr class="vazia"><td colspan="6">Ninguém na lista deste dia. Use <b>Agendamento</b> ou cadastre os horários fixos em <b>Agenda recorrente</b>.</td></tr>';
  else if (!lista.length) tb.innerHTML = '<tr class="vazia"><td colspan="6">Ninguém ' + (diaBusca ? 'com “' + esc(diaBusca) + '”' : 'neste filtro') + '.</td></tr>';
  lista.forEach(function (it) { tb.appendChild(linhaDia(it)); });
  $("#d-rodape-n").textContent = lista.length === r.itens.length ? r.itens.length + ' na lista' : 'Mostrando ' + lista.length + ' de ' + r.itens.length;
  renderPend(todos);
  renderPainel();
  if (emAgenda()) renderAgenda();
}
function pillSituacao(it, s) {
  return { atendido: '<span class="pill verde">' + ic('check', 14, 3) + 'Atendido</span>', falta: '<span class="pill cinza">' + esc((it.registro && it.registro.oque || '').split(' (')[0]) + '</span>', naovem: '<span class="pill vermelha">Não vem</span>', chegou: '<span class="pill lilas">Chegou ' + esc(chegadas()[chaveItem(it)] || '') + '</span>', aguardando: '<span class="pill cinza">Aguardando</span>', aconfirmar: '<span class="pill amarela">A confirmar</span>' }[s];
}
// um único botão por linha, decidido pela situação
function botaoAcao(it, s) {
  return { atendido: '<button type="button" class="btn link" data-ac="ver">Ver registro</button>', falta: '<button type="button" class="btn link" data-ac="ver">Ver registro</button>', naovem: '<button type="button" class="btn ter mini" data-ac="remarcar">Remarcar</button>', chegou: '<button type="button" class="btn mini" data-ac="registrar">Registrar atendimento</button>', aguardando: '<button type="button" class="btn sec mini" data-ac="chegou">Chegou</button>', aconfirmar: '<button type="button" class="btn ter mini" data-ac="confirmou">Confirmou</button>' }[s];
}
// depois do registro, a etiqueta do convênio vira o estado da guia (vem da linha gravada na aba do mês)
function tagGuia(it, p) {
  var r = it.registro; if (!r || !/^Atendido/.test(r.oque)) return null;
  var conv = (p && ehConvenio(p)) || (r.convenio && !/^Particular$/i.test(r.convenio)) || /^Convênio/.test(r.pago);
  if (!conv) return null;
  return r.guia === 'Sim' ? { cor: 'verde', txt: 'Guia assinada' } : { cor: 'amarela', ic: 'alerta', txt: 'Guia a emitir' };
}
// pendências de sessões anteriores (servidor: mês do dia e o anterior) — sessão particular sem pagamento e guia sem assinatura
function pendDe(nome) { return (DIA && DIA.pendencias && DIA.pendencias[nome]) || []; }
function tagsPend(nome) {
  var l = pendDe(nome), pag = l.filter(function (x) { return x.tipo === 'pag'; }), guia = l.filter(function (x) { return x.tipo === 'guia'; }), t = [];
  if (pag.length) t.push({ cor: 'amarela', ic: 'alerta', txt: 'deve ' + (pag.length > 1 ? pag.length + ' sessões' : 'sessão de ' + pag[0].data.slice(0, 5)) + (pag.some(function (x) { return x.valor; }) ? ' · R$ ' + brl(pag.reduce(function (a, x) { return a + saldoReg(x); }, 0)).replace(',00', '') : '') });
  if (guia.length) t.push({ cor: 'lilas', ic: 'alerta', txt: 'guia a assinar · ' + guia.map(function (x) { return x.data.slice(0, 5); }).join(', ') });
  return t;
}
function cobrancaHtml(it, p) {
  var guia = tagGuia(it, p);
  var html = tagsDe(p).map(function (t) { return (guia && /^Convênio /.test(t.txt)) ? guia : t; }).map(function (t) { return tagHtml(t, true); }).join('');
  if (guia && !tagsDe(p).some(function (t) { return /^Convênio /.test(t.txt); })) html += tagHtml(guia, true);
  html += tagsPend(it.paciente).map(function (t) { return tagHtml(t, true); }).join('');
  if (it.naoVem) html += '<span class="tag p cinza">' + esc(it.naoVem.replace('Não vem · ', '')) + '</span>';
  return html || '<span class="muted">—</span>';
}
function linhaDia(it) {
  var s = statusItem(it), p = pacInfo(it.paciente), k = chaveItem(it);
  var sub1 = [], id = idadeCurta(p); if (id) sub1.push(id); if (!p) sub1.push('não está em Pacientes'); if (it.origem && !/Semanal|Quinzenal|Registrado/.test(it.origem)) sub1.push(it.origem);
  var tr = el('<tr class="' + (s === 'chegou' ? 'chegou' : '') + (s === 'atendido' || s === 'falta' ? ' apagada' : '') + (s === 'naovem' ? ' fora' : '') + (selecionado === k ? ' sel' : '') + '" tabindex="0" data-k="' + esc(k) + '">' +
    '<td class="td-hora">' + esc(it.hora || '—') + '</td>' +
    '<td class="td-quem"><div class="nome">' + esc(it.paciente) + '</div><div class="sub">' + esc(sub1.join(' · ')) + '<span class="so-cel">' + (sub1.length ? ' · ' : '') + esc(profCurto(it.profissional)) + ' · ' + esc(modalidadeCurta(p)) + '</span></div></td>' +
    '<td class="td-prof"><div>' + esc(profCurto(it.profissional)) + '</div><div class="sub">' + esc(modalidadeCurta(p)) + '</div></td>' +
    '<td class="td-cob"><div class="tags">' + cobrancaHtml(it, p) + '</div></td>' +
    '<td class="td-sit">' + pillSituacao(it, s) + '</td>' +
    '<td class="td-acao no-print">' + botaoAcao(it, s) + '<div class="mais"><button type="button" class="btn icone p" aria-label="Mais ações" aria-haspopup="menu">' + ic('pontos', 18, 2) + '</button></div></td></tr>');
  $$('[data-ac]', tr).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); acaoDia(b.dataset.ac, it); }); });
  $('.mais button', tr).addEventListener('click', function (e) { e.stopPropagation(); menuMais(it, this); });
  tr.addEventListener('click', function (e) { if (e.target.closest('button')) return; selecionar(it); });
  tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.target.closest('button')) selecionar(it); });
  return tr;
}
function menuMais(it, btn) {
  var existe = btn.parentNode.querySelector('.mais-menu'); $$('.mais-menu').forEach(function (m) { m.remove(); }); if (existe) return;
  var s = statusItem(it), op = [];
  if (s === 'aguardando' || s === 'aconfirmar') op.push(['chegou', 'Chegou agora']);
  if (s === 'chegou') op.push(['deschegou', 'Desfazer “chegou”']);
  if (s === 'aconfirmar') op.push(['confirmou', 'Confirmou']);
  if (s !== 'atendido' && s !== 'falta') op.push(['registrar', 'Registrar atendimento']); else op.push(['registrar', 'Registrar outro atendimento']);
  if (s !== 'atendido' && s !== 'falta' && s !== 'naovem') { op.push(['naovem', 'Não vem hoje']); op.push(['remarcar', 'Remarcar']); }
  if (it.listaId && !it.registro) op.push(['remover', 'Remover da lista', 'perigo']);
  if (it.registro && it.registro.id) op.push(['corrigir', 'Corrigir lançamento']);
  op.push(['cadastro', 'Ver cadastro']);
  var m = el('<div class="mais-menu" role="menu">' + op.map(function (o) { return '<button type="button" role="menuitem" data-ac="' + o[0] + '" class="' + (o[2] || '') + '">' + o[1] + '</button>'; }).join('') + '</div>');
  $$('button', m).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); m.remove(); acaoDia(b.dataset.ac, it); }); });
  btn.parentNode.appendChild(m);
}
function acaoDia(ac, it) {
  if (ac === 'chegou') { marcarChegou(it, true); renderDia(); toast(it.paciente + ' chegou · ' + agoraHora()); return; }
  if (ac === 'deschegou') { marcarChegou(it, false); renderDia(); return; }
  if (ac === 'confirmou') { call('confirmar', { data: DIA.data, hora: it.hora || '', paciente: it.paciente, profissional: it.profissional }).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); toast('Confirmado: ' + it.paciente); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); }); return; }
  if (ac === 'registrar') { go('registrar', { paciente: it.paciente, profissional: it.profissional, data: DIA.data, hora: it.hora || '' }); return; }
  if (ac === 'cadastro') { go('pacientes', { editar: it.paciente, voltar: 'hoje' }); return; }
  if (ac === 'ver') { selecionar(it); return; }
  selecionar(it, ac); // naovem · remarcar · remover · corrigir: formulário dentro do painel do paciente
}
/* ---------- painel do paciente (coluna da direita; folha de baixo no celular) ---------- */
function itemSelecionado() { if (!DIA || !selecionado) return null; return DIA.itens.filter(function (i) { return chaveItem(i) === selecionado; })[0] || null; }
function selecionar(it, form) {
  var mesmo = selecionado === chaveItem(it);
  selecionado = chaveItem(it); formAberto = form || (mesmo ? formAberto : null);
  $$('#d-list tr').forEach(function (tr) { tr.classList.remove('sel'); });
  renderPainel();
  if (form) { var fEl = $("#pp-form"); if (fEl.firstChild) fEl.firstChild.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function fecharPainel() { selecionado = null; formAberto = null; if (DIA) renderPainel(); }
function renderPainel() {
  var it = itemSelecionado(), aside = $("#d-painel");
  $("#pp-vazio").hidden = !!it; $("#pp-pac").hidden = !it; aside.classList.toggle('aberto', !!it);
  if (!it) { selecionado = null; $$('#d-ag-grade .ag-item.sel').forEach(function (b) { b.classList.remove('sel'); }); return; }
  var p = pacInfo(it.paciente), s = statusItem(it), reg = !!it.registro;
  $$('#d-list tr').forEach(function (tr) { tr.classList.toggle('sel', tr.dataset.k === selecionado); });
  $$('#d-ag-grade .ag-item').forEach(function (b) { b.classList.toggle('sel', b.dataset.k === DIA.data + '|' + selecionado); });
  $("#pp-av").textContent = it.paciente.charAt(0).toUpperCase();
  $("#pp-nome").textContent = it.paciente;
  var sub = []; if (p && p.nasc) { var i = idade(p.nasc); if (i) sub.push(i); sub.push('nasc. ' + p.nasc); } if (p && p.pagador && p.pagador !== p.nome) sub.push('pagador: ' + p.pagador); if (!p) sub.push('não está em Pacientes');
  $("#pp-sub").textContent = sub.join(' · ');
  var tipo = it.origem && !/Semanal|Quinzenal|Registrado/.test(it.origem) ? it.origem : 'sessão';
  $("#pp-dl").innerHTML = '<div><dt>Hoje</dt><dd>' + esc((it.hora || '—') + ' · ' + tipo) + '</dd></div><div><dt>Profissional</dt><dd>' + esc(it.profissional) + '</dd></div><div><dt>Cobrança</dt><dd>' + esc(p ? resumoCob(p, it.profissional)[1] : '—') + '</dd></div><div><dt>Valor da sessão</dt><dd>' + esc(valorSessaoTxt(p, it.profissional)) + '</dd></div><div><dt>Convênio</dt><dd>' + esc(p ? (p.convenio || 'Particular') : '—') + '</dd></div>' + (p && p.telPac ? '<div><dt>Telefone do paciente</dt><dd>' + esc(p.telPac) + '</dd></div>' : '') + (p && p.resp ? '<div><dt>Responsável</dt><dd>' + esc(p.resp + (p.respPar ? ' (' + p.respPar.toLowerCase() + ')' : '') + (p.respTel ? ' · ' + p.respTel : '')) + '</dd></div>' : '');
  var avisoHtml = '';
  if (p && cadastroIncompleto(p)) avisoHtml = aviso('laranja', 'Cadastro incompleto', 'Cobrança em branco. Confira como paga antes de registrar.');
  else if (p && ehPacoteCob(p) && pagDe(p) === 'Antecipado' && estPacote(p).disponiveis <= 0) avisoHtml = aviso('vermelha', 'Pacote esgotado — renovar antes de atender', esc(p.obsCobranca || ''));
  else if (p && p.obsCobranca && !cobConvenio(p)) avisoHtml = aviso(ehProBono(p) ? 'lilas' : 'laranja', ehProBono(p) ? cobDe(p) : 'Observação de cobrança', esc(p.obsCobranca));
  $("#pp-aviso").innerHTML = avisoHtml;
  // sessões anteriores em aberto: a recepção vê na chegada e resolve ali mesmo (grava na linha antiga, como a Gestão)
  var pendHtml = pendDe(it.paciente).map(function (x, i) {
    var quando = x.data + (x.hora ? ' ' + x.hora : '');
    return x.tipo === 'pag'
      ? aviso('amarela', x.pago === 'Parcial' ? 'Sessão anterior paga em parte' : 'Sessão anterior sem pagamento', esc([quando, x.procedimento, x.pago === 'Parcial' ? 'em aberto R$ ' + brl(saldoReg(x)) + ' (de R$ ' + brl(x.valor) + ')' : x.valor ? 'R$ ' + brl(x.valor) : 'valor não lançado', profCurto(x.profissional)].filter(Boolean).join(' · ')), '<button type="button" class="btn mini" data-pend="' + i + '">Receber</button>')
      : aviso('lilas', 'Guia sem assinatura · pedir pra imprimir', esc([quando, 'Convênio ' + (x.convenio || ''), x.procedimento, profCurto(x.profissional)].filter(Boolean).join(' · ')), '<button type="button" class="btn ter mini" data-pend="' + i + '">Guia assinada</button>');
  }).join('');
  $("#pp-pend").innerHTML = pendHtml; $("#pp-pend").hidden = !pendHtml;
  $$('[data-pend]', $("#pp-pend")).forEach(function (b) { b.addEventListener('click', function () { var k = 'pend:' + b.dataset.pend; formAberto = formAberto === k ? null : k; renderPainel(); var f = $("#pp-form"); if (f.firstChild) f.firstChild.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); });
  // etiquetas de cobrança (as mesmas da tabela), menos a laranja quando o bloco acima já a explica
  var tags = tagsDe(p).filter(function (t) { return !(t.cor === 'laranja' && avisoHtml); });
  $("#pp-tags").innerHTML = tags.map(function (t) { return tagHtml(t); }).join(''); $("#pp-tags").hidden = !tags.length;
  var r = it.registro;
  var cobr = r ? (r.pago === 'Parcial' ? 'pago R$ ' + brl(r.recebido) + ' de R$ ' + brl(r.valor) + ' · em aberto R$ ' + brl(saldoReg(r)) + (r.forma ? ' · ' + r.forma : '') : r.pago === 'Sim' ? 'pago R$ ' + brl(r.valor) + (r.forma ? ' · ' + r.forma : '') + (r.nf === 'Sim' ? ' · NF emitida' : ' · NF a emitir') : (r.pago ? r.pago : (r.valor ? 'R$ ' + brl(r.valor) + ' em aberto' : ''))) : '';
  $("#pp-registro").innerHTML = r ? '<div class="faixa cinza"><b>Registrado hoje:</b> ' + esc(r.oque) + (r.procedimento ? ' · ' + esc(r.procedimento) : '') + (r.hora ? ' · ' + esc(r.hora) : '') + (cobr ? '<br>' + esc(cobr) : '') + (r.id ? ' · ID ' + esc(r.id) : '') + ' · aba ' + esc(DIA.abaMes) + '</div>' : '';
  // 4 botões de situação; o atual fica marcado
  $("#pp-sit-box").hidden = reg;
  var ch = chegadas()[chaveItem(it)];
  var bts = [['confirmou', 'Confirmou', !!it.confirmado, it.naoVem || !!it.confirmado], [ch ? 'deschegou' : 'chegou', ch ? 'Chegou ' + ch : 'Chegou', !!ch, !!it.naoVem], ['naovem', 'Não vem hoje', s === 'naovem', s === 'naovem'], ['remarcar', 'Remarcar', formAberto === 'remarcar', false]];
  $("#pp-sit").innerHTML = bts.map(function (b) { return '<button type="button" data-ac="' + b[0] + '" aria-pressed="' + b[2] + '"' + (b[3] ? ' disabled' : '') + '>' + esc(b[1]) + '</button>'; }).join('');
  $$('button', $("#pp-sit")).forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.ac === 'naovem' || b.dataset.ac === 'remarcar') { formAberto = formAberto === b.dataset.ac ? null : b.dataset.ac; renderPainel(); } else acaoDia(b.dataset.ac, it); }); });
  $("#pp-registrar").innerHTML = (reg ? 'Registrar outro atendimento ' : 'Registrar atendimento ') + ic('seta', 18);
  $("#pp-registrar-leg").hidden = reg;
  $("#pp-remover").hidden = !(it.listaId && !it.registro);
  var podeCorrigir = !!(r && r.id); $("#pp-corrigir").hidden = !podeCorrigir; $("#pp-corrigir-sep").hidden = !podeCorrigir; $("#pp-corrigir").setAttribute('aria-pressed', String(formAberto === 'corrigir'));
  renderForm(it);
}
function renderForm(it) {
  var box = $("#pp-form"); box.innerHTML = ''; if (!formAberto) return;
  var tipo = formAberto, html, pend = /^pend:/.test(tipo) ? pendDe(it.paciente)[+tipo.slice(5)] : null;
  if (/^pend:/.test(tipo) && !pend) { formAberto = null; return; }
  if (tipo === 'naovem') html = '<h3>Não vem hoje</h3><div class="grid g1"><label class="campo">Motivo<select id="d-nv-motivo"></select></label><label class="campo">Observação<input id="d-nv-obs"></label></div><div class="acoes"><button type="button" class="btn" id="d-nv-ok">Gravar</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div><span class="muted">Grava a falta na aba do mês, sem cobrança nesta linha.</span>';
  else if (tipo === 'remarcar') html = '<h3>Remarcar</h3><div class="grid g2"><label class="campo">Nova data<input id="d-rm-data" placeholder="dd/mm/aaaa" maxlength="10" inputmode="numeric"></label><label class="campo">Nova hora<input id="d-rm-hora" placeholder="hh:mm" maxlength="5" inputmode="numeric" value="' + esc(it.hora || '') + '"></label><label class="campo c2">Observação<input id="d-rm-obs"></label></div><div class="acoes"><button type="button" class="btn" id="d-rm-ok">Remarcar</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div><span class="muted">Hoje fica como “não vem · remarcado”; o novo dia ganha a linha.</span>';
  else if (pend) html = '<h3>' + (pend.tipo === 'pag' ? 'Receber a sessão de ' : 'Guia da sessão de ') + esc(pend.data) + '</h3><div class="muted">Grava na linha dessa sessão na aba ' + esc(pend.aba) + (pend.id ? '' : ' (sem ID: corrija direto na planilha)') + '. Recebeu só uma parte? Ponha o valor recebido: o resto continua em aberto.</div><div data-form></div><div data-erros></div><div class="acoes">' + (pend.id ? '<button type="button" class="btn" id="d-pend-ok">Gravar</button>' : '') + '<button type="button" class="btn ter" data-fechar>Cancelar</button></div>';
  else if (tipo === 'corrigir') html = '<h3>Corrigir lançamento</h3><div class="muted">Corrige a linha já gravada na aba ' + esc(DIA.abaMes) + '. Mudou data, profissional, procedimento ou valores? Diga quem informou: fica registrado em "Alterações de lançamento".</div><div data-form></div><div data-erros></div><div class="acoes"><button type="button" class="btn" id="d-cor-ok">Gravar correção</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div>';
  else html = '<h3>Remover da lista</h3><div class="grid g1"><label class="campo">Motivo da remoção <span class="leg">só agendamentos avulsos; horário fixo se pausa na Agenda recorrente</span><input id="d-rem-motivo" value="duplicado"></label></div><div class="acoes"><button type="button" class="btn vermelho" id="d-rem-ok">Remover da lista</button><button type="button" class="btn ter" data-fechar>Cancelar</button></div>';
  var pn = el('<div class="pp-formbox">' + html + '</div>'); box.appendChild(pn);
  $('[data-fechar]', pn).addEventListener('click', function () { formAberto = null; renderPainel(); });
  if (tipo === 'naovem') {
    preencherSelect($("#d-nv-motivo", pn), (BOOT.listas.oque || []).filter(function (x) { return !/^Atendido/.test(x); }));
    $("#d-nv-ok", pn).addEventListener('click', function () {
      var p = pacInfo(it.paciente), esps = espsDoProf(it.profissional), base = tiposDe(esps)[0], oque = $("#d-nv-motivo", pn).value;
      var d = { paciente: it.paciente, profissional: it.profissional, data: DIA.data, hora: it.hora || '', procedimento: base ? derivarProc(base.nome, p || {}) : '', oque: oque, pago: '', valor: '', forma: '', dataPagamento: '', quemPagou: '', nf: 'Não se aplica', nfNumero: '', guia: '', observacao: $("#d-nv-obs", pn).value.trim(), tornarPagadorHabitual: false };
      // pacote no Posterior: a falta que gasta sessão fica lançada com o valor da sessão do pacote, não paga
      if (p && ehPacoteCob(p) && pagDe(p) !== 'Antecipado' && consumoPacote(oque, d.procedimento, false, estPacote(p).faltasAvisadasMes || 0).delta < 0 && valorSessaoPacote(p) != null) { d.valor = brl(valorSessaoPacote(p)); d.pago = 'Não'; }
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
  } else if (pend) {
    var pbox = corrigirForm(pend, pend.tipo, pacInfo(it.paciente)); $('[data-form]', pn).appendChild(pbox);
    var okp = $("#d-pend-ok", pn); if (okp) okp.addEventListener('click', function () {
      var c = corrigirCampos(pbox, pend), erros = corrigirValidar(c, pend); $('[data-erros]', pn).innerHTML = erroBox(erros); if (erros.length) return;
      var b = this; b.disabled = true;
      call('corrigirLancamento', { aba: pend.aba, id: pend.id, campos: c }).then(function (r) { if (!r.ok) { b.disabled = false; $('[data-erros]', pn).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; } toast('Gravado na sessão de ' + pend.data + ': ' + (r.alterados || []).join(', ')); formAberto = null; invalidarResumo(); carregarDia(); }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
    });
  } else if (tipo === 'corrigir') {
    var reg = Object.assign({ data: DIA.data, paciente: it.paciente, profissional: it.profissional }, it.registro), p0 = pacInfo(it.paciente), fbox = corrigirForm(reg, 'amplo', p0); $('[data-form]', pn).appendChild(fbox);
    $("#d-cor-ok", pn).addEventListener('click', function () {
      var c = corrigirCampos(fbox, reg), erros = corrigirValidar(c, reg); $('[data-erros]', pn).innerHTML = erroBox(erros); if (erros.length) return;
      var b = this; b.disabled = true;
      call('corrigirLancamento', { aba: DIA.abaMes, id: reg.id, campos: c }).then(function (r) { if (!r.ok) { b.disabled = false; $('[data-erros]', pn).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; } toast('Corrigido: ' + (r.alterados || []).join(', ') + (r.plano && r.plano.n ? ' · plano ' + r.plano.usadas + '/' + r.plano.n : '')); formAberto = null; invalidarResumo(); carregarDia(); }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
    });
  } else {
    $("#d-rem-ok", pn).addEventListener('click', function () {
      this.disabled = true;
      call('removerDoDia', { id: it.listaId, motivo: $("#d-rem-motivo", pn).value.trim() || 'removido' }).then(function (r) { if (!r.ok) return toast((r.erros || ['Não removeu']).join(' ')); toast('Removido da lista: ' + it.paciente); carregarDia(); }).catch(function (e) { toast('Erro: ' + e.message); });
    });
  }
}
$("#pp-fechar").addEventListener('click', fecharPainel);
$("#pp-registrar").addEventListener('click', function () { var it = itemSelecionado(); if (it) acaoDia('registrar', it); });
$("#pp-cadastro").addEventListener('click', function () { var it = itemSelecionado(); if (it) acaoDia('cadastro', it); });
$("#pp-remover").addEventListener('click', function () { var it = itemSelecionado(); if (it) selecionar(it, 'remover'); });
$("#pp-corrigir").addEventListener('click', function () { var it = itemSelecionado(); if (!it) return; if (formAberto === 'corrigir') { formAberto = null; renderPainel(); } else selecionar(it, 'corrigir'); });
/* ---------- tiles de resumo e resumo do painel ---------- */
function doDia(l, dia) { return (l || []).filter(function (x) { return x.data === dia; }); }
function renderResumo(cont) {
  var tot = DIA.itens.length, reg = DIA.itens.filter(function (i) { return i.registro; }).length, dia = DIA.data, g = resumoMes[DIA.abaMes];
  // resumo do painel (sem paciente selecionado)
  $("#pp-resumo").innerHTML = '<div><b>' + reg + '<small>/' + tot + '</small></b><span>registrados</span></div><div><b>' + cont.chegou + '</b><span>na recepção</span></div><div><b>' + (cont.aguardando + cont.aconfirmar) + '</b><span>aguardando</span></div><div class="' + (cont.naovem ? 'atencao' : '') + '"><b>' + cont.naovem + '</b><span>não vêm</span></div>';
  // tiles: valores do dia, lidos das linhas já registradas na aba do mês (recepção e gestão veem o mesmo)
  var regs = DIA.itens.filter(function (i) { return i.registro && /^Atendido/.test(i.registro.oque); }).map(function (i) { return i.registro; });
  var particular = function (r) { return !r.convenio || /^Particular$/i.test(r.convenio); };
  var recebido = regs.reduce(function (a, r) { return a + (r.pago === 'Sim' ? (Number(r.valor) || 0) : r.pago === 'Parcial' ? (Number(r.recebido) || 0) : 0); }, 0);
  var aRec = regs.filter(function (r) { return particular(r) && pendentePagamento(r); }).reduce(function (a, r) { return a + saldoReg(r); }, 0);
  var nfPend = regs.filter(function (r) { return (r.pago === 'Sim' || r.pago === 'Parcial') && r.nf !== 'Sim' && r.nf !== 'Não se aplica'; }).length;
  var guiaPend = regs.filter(function (r) { return (!particular(r) || /^Convênio/i.test(r.pago)) && r.guia !== 'Sim'; }).length;
  var rs = function (n) { return 'R$ ' + brl(n).replace(',00', ''); };
  var tiles = [[rs(recebido), 'recebido hoje', recebido ? 'verde' : 'cinza'], [rs(aRec), 'a receber hoje (particular)', aRec ? 'amarelo' : 'cinza'], [nfPend, 'NF a emitir hoje', nfPend ? 'laranja' : 'cinza', 'gestao'], [guiaPend, 'guia a emitir hoje', guiaPend ? 'amarelo' : 'cinza', 'gestao']];
  var box = $("#d-resumo"); box.innerHTML = '';
  tiles.forEach(function (t) {
    var b = el('<' + (t[3] ? 'button type="button"' : 'div') + ' class="tile info ' + t[2] + '"><b>' + esc(String(t[0])) + '</b><span>' + esc(t[1]) + '</span></' + (t[3] ? 'button' : 'div') + '>');
    if (t[3]) b.addEventListener('click', function () { go(t[3]); });
    box.appendChild(b);
  });
}
/* ---------- pendências de hoje (linhas clicáveis) ---------- */
function renderPend(itens) {
  var dia = DIA.data, g = resumoMes[DIA.abaMes], out = [];
  var pacs = itens.filter(function (i) { var p = pacInfo(i.paciente); return p && ehPacoteCob(p) && pagDe(p) === 'Antecipado' && estPacote(p).disponiveis <= 1; });
  if (pacs.length) out.push(['amarela', pacs.length, 'de hoje com pacote esgotado ou na última sessão · ' + pacs.map(function (i) { return primeiroNome(i.paciente); }).join(', '), 'pacotes']);
  var incompl = itens.filter(function (i) { var p = pacInfo(i.paciente); return p && cadastroIncompleto(p); });
  if (incompl.length) out.push(['laranja', incompl.length, 'cadastro com cobrança em branco · ' + incompl.map(function (i) { return primeiroNome(i.paciente); }).join(', '), 'pacientes', incompl[0].paciente]);
  var fora = itens.filter(function (i) { return !pacInfo(i.paciente); });
  if (fora.length) out.push(['laranja', fora.length, 'não está em Pacientes · ' + fora.map(function (i) { return primeiroNome(i.paciente); }).join(', '), 'pacientes']);
  var devem = itens.filter(function (i) { return pendDe(i.paciente).some(function (x) { return x.tipo === 'pag'; }); });
  if (devem.length) out.push(['amarela', devem.length, 'de hoje com sessão anterior sem pagamento · ' + devem.map(function (i) { return primeiroNome(i.paciente); }).join(', '), null]);
  var guiasAnt = itens.filter(function (i) { return pendDe(i.paciente).some(function (x) { return x.tipo === 'guia'; }); });
  if (guiasAnt.length) out.push(['lilas', guiasAnt.length, 'de hoje com guia anterior sem assinatura (pedir pra imprimir) · ' + guiasAnt.map(function (i) { return primeiroNome(i.paciente); }).join(', '), null]);
  var regs = itens.filter(function (i) { return i.registro && /^Atendido/.test(i.registro.oque); });
  var particular = function (r) { return !r.convenio || /^Particular$/i.test(r.convenio); }, dest = 'gestao';
  var sg = regs.filter(function (i) { var r = i.registro; return (!particular(r) || /^Convênio/i.test(r.pago)) && r.guia !== 'Sim'; });
  if (sg.length) out.push(['amarela', sg.length, 'guia a emitir hoje · ' + sg.map(function (i) { return primeiroNome(i.paciente) + (i.hora ? ' ' + i.hora : ''); }).join(', '), dest]);
  var nf = regs.filter(function (i) { var r = i.registro; return (r.pago === 'Sim' || r.pago === 'Parcial') && r.nf !== 'Sim' && r.nf !== 'Não se aplica'; });
  if (nf.length) out.push(['laranja', nf.length, 'NF a emitir hoje · ' + nf.map(function (i) { return primeiroNome(i.paciente) + (i.registro.valor ? ' R$ ' + brl(i.registro.valor).replace(',00', '') : ''); }).join(', '), dest]);
  var pp = regs.filter(function (i) { var r = i.registro; return particular(r) && pendentePagamento(r); });
  if (pp.length) out.push(['amarela', pp.length, 'particular sem “Pago?” hoje · ' + pp.map(function (i) { return primeiroNome(i.paciente); }).join(', '), dest]);
  if (ehGestao() && g) {
    var ontem = dataObj(dia); ontem.setDate(ontem.getDate() - 1); var dOntem = ('0' + ontem.getDate()).slice(-2) + '/' + ('0' + (ontem.getMonth() + 1)).slice(-2) + '/' + ontem.getFullYear();
    var nfO = (g.nfPendente || []).filter(function (x) { return x.data === dOntem; }); if (nfO.length) out.push(['laranja', nfO.length, 'NF de ontem a emitir · ' + nfO.map(function (x) { return primeiroNome(x.paciente) + (x.valor ? ' R$ ' + brl(x.valor).replace(',00', '') : ''); }).join(', '), 'gestao']);
  }
  var box = $("#d-pend"); box.innerHTML = '';
  if (!out.length) { box.innerHTML = '<div class="muted">Nada pendente por enquanto.</div>'; return; }
  out.forEach(function (o) {
    var b = el('<button type="button" class="pend-linha ' + o[0] + (o[3] ? '' : ' fixa') + '"><b>' + o[1] + '</b><span>' + esc(o[2]) + '</span>' + (o[3] ? ic('direita', 16, 2.4) : '') + '</button>');
    if (o[3]) b.addEventListener('click', function () { go(o[3], o[3] === 'pacientes' && o[4] ? { editar: o[4], voltar: 'hoje' } : undefined); });
    box.appendChild(b);
  });
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
/* navegação de data, filtros, busca, impressão */
function mudarDia(n) { var dt = dataObj(diaEscolhido()) || new Date(); dt.setDate(dt.getDate() + n * (emSemana() ? 7 : 1)); $("#d-data").value = dataParaISO(dt); carregarDia(); }
$("#d-ant").addEventListener('click', function () { mudarDia(-1); });
$("#d-prox").addEventListener('click', function () { mudarDia(1); });
$("#d-ir-hoje").addEventListener('click', function () { $("#d-data").value = dataParaISO(new Date()); carregarDia(); });
$("#d-cal").addEventListener('click', function () { var i = $("#d-data"); if (i.showPicker) { try { i.showPicker(); return; } catch (e) { } } i.classList.remove('sr'); i.focus(); });
$("#d-data").addEventListener('change', function () { this.classList.add('sr'); if (dataObj(diaEscolhido())) carregarDia(); });
$("#d-prof").addEventListener('change', function () { diaProf = this.value; if (emSemana()) carregarDia(false); else if (DIA) renderDia(); });
$("#d-busca").addEventListener('input', function () { diaBusca = this.value.trim(); if (DIA) renderDia(); });
$("#d-print").addEventListener('click', function () { window.print(); });
/* agendamento (antigo "encaixe no dia") */
function infoPaciente(nome) { var p = pacInfo(nome); if (!p) return nome.trim() ? 'Não está em Pacientes. Cadastre antes em "Pacientes".' : ''; if (cadastroIncompleto(p)) return 'Cadastro incompleto: cobrança em branco. Confira como paga.'; return 'Cobrança: ' + resumoCob(p)[1]; }
function mostrarInfo(elHint, nome) { var p = pacInfo(nome); elHint.innerHTML = esc(infoPaciente(nome)) + (p ? ' <a href="#">' + (cadastroIncompleto(p) ? 'Completar cadastro' : 'editar cadastro') + '</a>' : ''); var a = elHint.querySelector('a'); if (a) a.addEventListener('click', function (e) { e.preventDefault(); go('pacientes', { editar: nome, voltar: 'hoje' }); }); }
$("#d-add").addEventListener('click', function () { $("#d-addbox").hidden = !$("#d-addbox").hidden; $("#d-recbox").hidden = true; $("#d-expbox").hidden = true; if (!$("#d-addbox").hidden) $("#d-add-pac").focus(); });
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
/* agenda recorrente (link discreto no rodapé da tabela) */
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
function alternarRec() { $("#d-recbox").hidden = !$("#d-recbox").hidden; $("#d-addbox").hidden = true; $("#d-expbox").hidden = true; if (!$("#d-recbox").hidden) { carregarRec(); $("#d-recbox").scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
$("#d-rec").addEventListener('click', alternarRec);
$("#d-rec-topo").addEventListener('click', alternarRec); // botão visível no topo (gestão, 06/10): a recepção mantém os horários fixos
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
